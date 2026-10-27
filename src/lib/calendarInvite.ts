import { parseWindow } from "./scheduling";

export interface BookingCalendarInfo {
  id: string;
  clientName: string;
  company?: string;
  email: string;
  bookingType: string;
  date: string; // YYYY-MM-DD (Studio date in Asia/Manila)
  time: string; // "10:00 AM - 10:30 AM"
  host: string;
  meetingUrl?: string;
  notes?: string;
}

const STUDIO_TZ = "Asia/Manila";

/** RFC 5545 text escaping. */
const esc = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Converts date "YYYY-MM-DD" and window minutes from Asia/Manila (UTC+8) into UTC Date objects.
 */
export function getBookingUtcDates(dateStr: string, timeStr: string): { startUtc: string; endUtc: string; startDate: Date; endDate: Date } {
  const window = parseWindow(timeStr) || { start: 10 * 60, end: 10 * 60 + 30 };
  const [year, month, day] = dateStr.split("-").map(Number);

  const startHour = Math.floor(window.start / 60);
  const startMin = window.start % 60;
  const endHour = Math.floor(window.end / 60);
  const endMin = window.end % 60;

  // Manila is UTC+8: UTC hour = Manila hour - 8
  const startDate = new Date(Date.UTC(year, month - 1, day, startHour - 8, startMin));
  const endDate = new Date(Date.UTC(year, month - 1, day, endHour - 8, endMin));

  const formatUtc = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  return {
    startUtc: formatUtc(startDate),
    endUtc: formatUtc(endDate),
    startDate,
    endDate,
  };
}

/**
 * Builds RFC 5545 standard iCalendar (.ics) format with METHOD:REQUEST for universal calendar integration.
 * Supported natively by Apple Calendar (iOS/macOS), Google Calendar, Outlook, and Android.
 */
export function buildIcsContent(booking: BookingCalendarInfo): string {
  const window = parseWindow(booking.time) || { start: 10 * 60, end: 10 * 60 + 30 };
  const stamp = (date: string, minutes: number) =>
    `${date.replace(/-/g, "")}T${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}00`;

  const summary = `The Virtus Labs · ${booking.bookingType} with ${booking.clientName}`;
  const description = [
    `Discovery Strategy Session with The Virtus Labs`,
    ``,
    `Client: ${booking.clientName}${booking.company ? ` (${booking.company})` : ""}`,
    `Email: ${booking.email}`,
    `Host / Pod Lead: ${booking.host}`,
    `Direct Video Room: ${booking.meetingUrl || "https://thevirtuslabs.com"}`,
    ``,
    `Agenda:`,
    `1. Diagnose current business bottlenecks & tech architecture`,
    `2. Clarify scope, deliverables, and target launch timeline`,
    `3. Formulate tailored strategic recommendations`,
    ``,
    booking.notes ? `Notes: ${booking.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const nowIso = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  return [
    "BEGIN:VCALENDAR",
    "PRODID:-//The Virtus Labs//Agency Operations OS//EN",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${booking.id}@thevirtuslabs.com`,
    `DTSTAMP:${nowIso}`,
    `DTSTART;TZID=${STUDIO_TZ}:${stamp(booking.date, window.start)}`,
    `DTEND;TZID=${STUDIO_TZ}:${stamp(booking.date, window.end)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    `LOCATION:${esc(booking.meetingUrl || "Direct Video Room")}`,
    `ORGANIZER;CN=${esc(booking.host)}:mailto:hello@thevirtuslabs.com`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=TRUE;CN=${esc(booking.clientName)}:mailto:${booking.email}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Builds 1-click Google Calendar web URL.
 */
export function buildGoogleCalendarUrl(booking: BookingCalendarInfo): string {
  const { startUtc, endUtc } = getBookingUtcDates(booking.date, booking.time);
  const title = `The Virtus Labs · Discovery Strategy Session (${booking.clientName})`;
  const details = [
    `Discovery Strategy Session with The Virtus Labs`,
    ``,
    `Video Link: ${booking.meetingUrl || "Not set yet"}`,
    `Host: ${booking.host}`,
    `Company: ${booking.company || booking.clientName}`,
    ``,
    `Agenda:`,
    `1. Diagnose current business bottlenecks & tech architecture`,
    `2. Clarify scope, deliverables, and target launch timeline`,
    `3. Formulate tailored strategic recommendations`,
  ].join("\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startUtc}/${endUtc}`,
    details,
    location: booking.meetingUrl || "https://thevirtuslabs.com",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Builds 1-click Outlook web calendar URL (works on Outlook.com & Office 365).
 */
export function buildOutlookCalendarUrl(booking: BookingCalendarInfo): string {
  const { startDate, endDate } = getBookingUtcDates(booking.date, booking.time);
  const title = `The Virtus Labs · Discovery Strategy Session (${booking.clientName})`;
  const details = `Discovery Strategy Session with The Virtus Labs\n\nVideo Link: ${booking.meetingUrl || "https://thevirtuslabs.com"}\nHost: ${booking.host}`;

  const params = new URLSearchParams({
    rru: "addevent",
    subject: title,
    startdt: startDate.toISOString(),
    enddt: endDate.toISOString(),
    body: details,
    location: booking.meetingUrl || "https://thevirtuslabs.com",
  });

  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;
}

/**
 * Builds client-side data URI for instant 1-click download/import into Apple Calendar (iOS/macOS) or desktop iCal.
 */
export function buildIcsDataUri(booking: BookingCalendarInfo): string {
  const ics = buildIcsContent(booking);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
