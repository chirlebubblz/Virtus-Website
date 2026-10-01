import { NextResponse } from "next/server";
import { db } from "@/db";

export const dynamic = "force-dynamic";

/**
 * Generates standard RFC 5545 iCalendar (.ics) format for any studio booking.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new NextResponse("Missing booking id", { status: 400 });
  }

  const booking = db.getBookings().find((b) => b.id === id);
  if (!booking) {
    return new NextResponse("Booking not found", { status: 404 });
  }

  // Parse date and time e.g. "2026-10-15" and "10:00 AM"
  const dateStr = booking.date.replace(/-/g, "");
  // Simple time parser
  const match = booking.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  let startHour = 10;
  let startMin = 0;
  if (match) {
    startHour = parseInt(match[1], 10);
    startMin = parseInt(match[2], 10);
    if (match[3].toUpperCase() === "PM" && startHour < 12) startHour += 12;
    if (match[3].toUpperCase() === "AM" && startHour === 12) startHour = 0;
  }

  const endHour = startMin + 30 >= 60 ? (startHour + 1) % 24 : startHour;
  const endMin = (startMin + 30) % 60;

  const dtStart = `${dateStr}T${String(startHour).padStart(2, "0")}${String(startMin).padStart(2, "0")}00Z`;
  const dtEnd = `${dateStr}T${String(endHour).padStart(2, "0")}${String(endMin).padStart(2, "0")}00Z`;

  const summary = `The Virtus Labs · ${booking.bookingType} with ${booking.clientName}`;
  const description = `Discovery Strategy Call\\n\\nClient: ${booking.clientName} (${booking.company})\\nEmail: ${booking.email}\\nMeeting URL: ${booking.meetingUrl}\\n\\nHost: ${booking.host}\\nNotes: ${booking.notes || "None"}`;

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Virtus Labs//Agency Operations OS//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${booking.id}@thevirtuslabs.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${booking.meetingUrl || "Google Meet"}`,
    `ORGANIZER;CN=${booking.host}:mailto:hello@thevirtuslabs.com`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${booking.clientName}:mailto:${booking.email}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="virtus-${booking.id}.ics"`,
    },
  });
}
