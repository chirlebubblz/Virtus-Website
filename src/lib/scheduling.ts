// Booking rules shared by /api/bookings and the Bookings view. Pure functions only, so it is safe in the browser.

export const SESSION_TYPES = [
  { label: "15-Min Quick Alignment", minutes: 15 },
  { label: "Discovery Call (30 min)", minutes: 30 },
  { label: "Strategy & Scope (45 min)", minutes: 45 },
  { label: "Sprint Kickoff (60 min)", minutes: 60 },
  { label: "Sprint Demo (30 min)", minutes: 30 },
] as const;

export type SessionType = (typeof SESSION_TYPES)[number]["label"];

export const BOOKING_STATUSES = ["Confirmed", "Pending", "Completed", "Cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Statuses that hold the host's time. Cancelled and completed calls never block a new booking. */
const BLOCKING: readonly string[] = ["Confirmed", "Pending"];
export const holdsSlot = (status: string) => BLOCKING.includes(status);

export const sessionMinutes = (type: string): number | null =>
  SESSION_TYPES.find((t) => t.label === type)?.minutes ?? null;

/** "HH:MM" (24h) to minutes after midnight, or null. */
export function parseClock(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Minutes after midnight to "HH:MM" (24h), for <input type="time">. */
export const toClock = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** Minutes after midnight to "10:00 AM". */
function to12h(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const suffix = h < 12 ? "AM" : "PM";
  return `${pad(h % 12 === 0 ? 12 : h % 12)}:${pad(minutes % 60)} ${suffix}`;
}

/** The stored display window, for example "10:00 AM - 10:30 AM". */
export const formatWindow = (start: number, minutes: number) => `${to12h(start)} - ${to12h(start + minutes)}`;

/**
 * Reads a stored window back into minutes. Accepts the format written by formatWindow and older free-text rows
 * such as "02:00 PM - 02:30 PM". Returns null when the text cannot be read, in which case it is not conflict-checked.
 */
export function parseWindow(text: string): { start: number; end: number } | null {
  const part = String.raw`(\d{1,2}):(\d{2})\s*(AM|PM)`;
  const m = new RegExp(`^\\s*${part}\\s*-\\s*${part}\\s*$`, "i").exec(text);
  if (!m) return null;
  const read = (h: string, min: string, ap: string) => {
    const hour = Number(h);
    const minute = Number(min);
    if (hour < 1 || hour > 12 || minute > 59) return NaN;
    return ((hour % 12) + (ap.toUpperCase() === "PM" ? 12 : 0)) * 60 + minute;
  };
  const start = read(m[1], m[2], m[3]);
  const end = read(m[4], m[5], m[6]);
  return Number.isNaN(start) || Number.isNaN(end) || end <= start ? null : { start, end };
}

/** Half-open overlap: a call ending at 10:30 touches, but does not clash with, one starting at 10:30. */
export const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  a.start < b.end && b.start < a.end;

/** Whole-word first-name match, so "Ren" never matches "Karen". */
export function hostMatches(host: string, member: string): boolean {
  const tokens = (v: string) => v.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const first = tokens(member)[0];
  return Boolean(first) && tokens(host).includes(first);
}

export const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};
