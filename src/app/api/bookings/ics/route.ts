import { NextResponse } from "next/server";
import { db } from "@/db";
import { getNeonSql, isNeonConfigured } from "@/lib/neon";
import { getStaff } from "@/lib/staffAuth";
import { hostMatches } from "@/lib/scheduling";
import { buildIcsContent, BookingCalendarInfo } from "@/lib/calendarInvite";

export const dynamic = "force-dynamic";

/**
 * Generates standard RFC 5545 iCalendar (.ics) format for one studio booking.
 * Accessible to authorized staff, or to the client using their unique booking id.
 */
export async function GET(request: Request) {
  const staff = await getStaff(["admin", "team"]);

  const id = new URL(request.url).searchParams.get("id");
  if (!id || id.length > 64) {
    return new NextResponse("Missing booking id", { status: 400 });
  }

  const sql = isNeonConfigured() ? getNeonSql() : null;
  let booking: BookingCalendarInfo | null;
  try {
    booking = sql
      ? (((await sql`
          SELECT id, client_name AS "clientName", company, email, booking_type AS "bookingType",
                 to_char(date, 'YYYY-MM-DD') AS date, time, host, meeting_url AS "meetingUrl", notes
          FROM bookings WHERE id = ${id} LIMIT 1`) as BookingCalendarInfo[])[0] ?? null)
      : (db.getBookings().find((b) => b.id === id) as BookingCalendarInfo | undefined) ?? null;
  } catch (err) {
    console.error("GET /api/bookings/ics error:", err);
    return new NextResponse("The calendar file is unavailable. Try again shortly.", { status: 503 });
  }

  if (!booking) {
    return new NextResponse("Booking not found", { status: 404 });
  }

  // If staff is requesting, verify they are admin or host
  if (staff && staff.role !== "admin" && !hostMatches(booking.host, staff.memberLabel ?? staff.name)) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  const icsContent = buildIcsContent(booking);

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="virtus-${booking.id.replace(/[^a-zA-Z0-9-]/g, "")}.ics"`,
    },
  });
}
