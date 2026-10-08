import { NextResponse } from "next/server";
import { db } from "@/db";
import { getNeonSql, isNeonConfigured } from "@/lib/neon";
import { getStaff } from "@/lib/staffAuth";
import { hostMatches, parseWindow } from "@/lib/scheduling";

export const dynamic = "force-dynamic";

/** Booking times are entered in studio time. */
const STUDIO_TZ = "Asia/Manila";

interface IcsBooking {
  id: string;
  clientName: string;
  company: string;
  email: string;
  bookingType: string;
  date: string;
  time: string;
  host: string;
  meetingUrl: string;
  notes?: string | null;
}

/** RFC 5545 text escaping. */
const esc = (value: string) => value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const pad = (n: number) => String(n).padStart(2, "0");
const stamp = (date: string, minutes: number) => `${date.replace(/-/g, "")}T${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}00`;

/**
 * Generates standard RFC 5545 iCalendar (.ics) format for one studio booking. Staff only: the file holds the
 * client's name, email and meeting link. Team members can download only the calls they host.
 */
export async function GET(request: Request) {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return new NextResponse("Unauthorized", { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id || id.length > 64) {
    return new NextResponse("Missing booking id", { status: 400 });
  }

  const sql = isNeonConfigured() ? getNeonSql() : null;
  let booking: IcsBooking | null;
  try {
    booking = sql
      ? (((await sql`
          SELECT id, client_name AS "clientName", company, email, booking_type AS "bookingType",
                 to_char(date, 'YYYY-MM-DD') AS date, time, host, meeting_url AS "meetingUrl", notes
          FROM bookings WHERE id = ${id} LIMIT 1`) as IcsBooking[])[0] ?? null)
      : db.getBookings().find((b) => b.id === id) ?? null;
  } catch (err) {
    console.error("GET /api/bookings/ics error:", err);
    return new NextResponse("The calendar file is unavailable. Try again shortly.", { status: 503 });
  }

  if (!booking || (staff.role !== "admin" && !hostMatches(booking.host, staff.memberLabel ?? staff.name))) {
    return new NextResponse("Booking not found", { status: 404 });
  }

  // Older free-text times fall back to a 30 minute call at 10:00.
  const window = parseWindow(booking.time) ?? { start: 10 * 60, end: 10 * 60 + 30 };

  const summary = `The Virtus Labs · ${booking.bookingType} with ${booking.clientName}`;
  const description = [
    booking.bookingType,
    "",
    `Client: ${booking.clientName} (${booking.company})`,
    `Email: ${booking.email}`,
    `Meeting URL: ${booking.meetingUrl || "Not set yet"}`,
    "",
    `Host: ${booking.host}`,
    `Notes: ${booking.notes || "None"}`,
  ].join("\n");

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Virtus Labs//Agency Operations OS//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${booking.id}@thevirtuslabs.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART;TZID=${STUDIO_TZ}:${stamp(booking.date, window.start)}`,
    `DTEND;TZID=${STUDIO_TZ}:${stamp(booking.date, window.end)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    `LOCATION:${esc(booking.meetingUrl || "Zoom")}`,
    `ORGANIZER;CN=${esc(booking.host)}:mailto:hello@thevirtuslabs.com`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${esc(booking.clientName)}:mailto:${booking.email}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="virtus-${booking.id.replace(/[^a-zA-Z0-9-]/g, "")}.ics"`,
    },
  });
}
