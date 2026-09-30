import { NextResponse } from "next/server";
import { db } from "@/db";
import type { Booking } from "@/db";
import { getNeonSql, isNeonConfigured } from "@/lib/neon";
import { getStaff } from "@/lib/staffAuth";
import { StoreUnavailableError, addAudit, listStaff, type StaffUser } from "@/lib/staffStore";
import { EMAIL_PATTERN, badRequest, dateOnly, readJsonObject, serverError, str, unavailable } from "@/lib/apiUtil";
import {
  BOOKING_STATUSES,
  formatWindow,
  holdsSlot,
  hostMatches,
  isHttpsUrl,
  overlaps,
  parseClock,
  parseWindow,
  sessionMinutes,
  type BookingStatus,
} from "@/lib/scheduling";

export const dynamic = "force-dynamic";

type Sql = NonNullable<ReturnType<typeof getNeonSql>>;
type Row = Omit<Booking, "status"> & { status: string };

const neon = (): Sql | null => (isNeonConfigured() ? getNeonSql() : null);

// DATE is formatted in SQL so the calendar day never shifts with the server's timezone.
async function selectAll(sql: Sql): Promise<Row[]> {
  return (await sql`
    SELECT id, client_name AS "clientName", company, email, booking_type AS "bookingType",
           to_char(date, 'YYYY-MM-DD') AS date, time, host, meeting_url AS "meetingUrl", status, notes,
           to_char(created_at, 'YYYY-MM-DD') AS "createdAt"
    FROM bookings ORDER BY date ASC, time ASC`) as Row[];
}

async function selectOne(sql: Sql, id: string): Promise<Row | null> {
  const rows = (await sql`
    SELECT id, client_name AS "clientName", company, email, booking_type AS "bookingType",
           to_char(date, 'YYYY-MM-DD') AS date, time, host, meeting_url AS "meetingUrl", status, notes,
           to_char(created_at, 'YYYY-MM-DD') AS "createdAt"
    FROM bookings WHERE id = ${id} LIMIT 1`) as Row[];
  return rows[0] ?? null;
}

async function sameDayForHost(sql: Sql | null, date: string, host: string): Promise<Row[]> {
  if (!sql) {
    return db.getBookings().filter((b) => b.date === date && b.host.toLowerCase() === host.toLowerCase());
  }
  return (await sql`
    SELECT id, client_name AS "clientName", time, status FROM bookings
    WHERE date = ${date} AND lower(host) = lower(${host})`) as Row[];
}

/** The first live booking of this host that overlaps the window, ignoring the booking being edited. */
async function findClash(sql: Sql | null, date: string, host: string, window: { start: number; end: number }, exceptId?: string) {
  const rows = await sameDayForHost(sql, date, host);
  return rows.find((r) => {
    if (r.id === exceptId || !holdsSlot(r.status)) return false;
    const other = parseWindow(r.time);
    return other !== null && overlaps(window, other);
  });
}

const clashResponse = (clash: Row, host: string) =>
  NextResponse.json(
    { ok: false, error: `${host} already has ${clash.clientName} at ${clash.time}. Pick another time or host.`, field: "startTime" },
    { status: 409 }
  );

/** Hosts an admin can schedule: active staff (task-board profile first, else name) plus hosts already on bookings. */
async function hostOptions(rows: Row[]): Promise<string[]> {
  let staff: StaffUser[] = [];
  try {
    staff = (await listStaff()).filter((u) => u.status === "active");
  } catch (err) {
    if (!(err instanceof StoreUnavailableError)) throw err;
  }
  const names = [...staff.map((u) => u.memberLabel ?? u.name), ...rows.map((r) => r.host)];
  return [...new Set(names.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

const optionalText = (value: unknown, max: number): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return "";
  return typeof value === "string" && value.trim().length <= max ? value.trim() : null;
};

// ---- GET: admins see every booking, team members only calls they host ----

export async function GET() {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const sql = neon();
  try {
    const all: Row[] = sql ? await selectAll(sql) : db.getBookings();
    const isAdmin = staff.role === "admin";
    const member = staff.memberLabel ?? staff.name;
    const bookings = isAdmin ? all : all.filter((b) => hostMatches(b.host, member));
    return NextResponse.json({
      ok: true,
      data: { bookings, hosts: isAdmin ? await hostOptions(all) : [], canSchedule: isAdmin },
    });
  } catch (err) {
    return sql ? unavailable("GET /api/bookings error", err) : serverError("GET /api/bookings error", err);
  }
}

// ---- POST: schedule a call (admin) ----

export async function POST(request: Request) {
  const admin = await getStaff(["admin"]);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");

  const clientName = str(body.clientName, 200);
  const email = str(body.email, 200)?.toLowerCase() ?? null;
  const company = optionalText(body.company, 200);
  const bookingType = str(body.bookingType, 120);
  const minutes = bookingType ? sessionMinutes(bookingType) : null;
  const date = dateOnly(body.date);
  const start = parseClock(body.startTime);
  const host = str(body.host, 120);
  const meetingUrl = optionalText(body.meetingUrl, 500);
  const notes = optionalText(body.notes, 2000);
  const status = body.status === undefined ? "Confirmed" : BOOKING_STATUSES.find((s) => s === body.status);

  if (!clientName) return badRequest("Enter the client name.", "clientName");
  if (!email || !EMAIL_PATTERN.test(email)) return badRequest("Enter a valid client email.", "email");
  if (company === null) return badRequest("Keep the company under 200 characters.", "company");
  if (!bookingType || minutes === null) return badRequest("Choose a session type.", "bookingType");
  if (!date) return badRequest("Enter the date as YYYY-MM-DD.", "date");
  if (start === null) return badRequest("Enter a start time.", "startTime");
  if (start + minutes > 24 * 60) return badRequest("The call must end before midnight.", "startTime");
  if (!host) return badRequest("Choose a host.", "host");
  if (meetingUrl === null || (meetingUrl && !isHttpsUrl(meetingUrl))) {
    return badRequest("The meeting link must start with https://", "meetingUrl");
  }
  if (notes === null) return badRequest("Keep notes under 2,000 characters.", "notes");
  if (!status) return badRequest("Choose a valid status.", "status");

  const booking: Omit<Booking, "id" | "createdAt"> = {
    clientName,
    company: company || clientName,
    email,
    bookingType,
    date,
    time: formatWindow(start, minutes),
    host,
    meetingUrl: meetingUrl ?? "",
    status,
    notes: notes || undefined,
  };

  const sql = neon();
  try {
    if (holdsSlot(status)) {
      const clash = await findClash(sql, date, host, { start, end: start + minutes });
      if (clash) return clashResponse(clash, host);
    }

    let created: Row;
    if (sql) {
      const id = `book-${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
      await sql`
        INSERT INTO bookings (id, client_name, company, email, booking_type, date, time, host, meeting_url, status, notes)
        VALUES (${id}, ${booking.clientName}, ${booking.company}, ${booking.email}, ${booking.bookingType}, ${booking.date},
                ${booking.time}, ${booking.host}, ${booking.meetingUrl}, ${booking.status}, ${booking.notes ?? null})`;
      const row = await selectOne(sql, id);
      if (!row) throw new Error("Inserted booking could not be read back.");
      created = row;
    } else {
      created = db.addBooking(booking);
    }

    await addAudit(admin.email, "booking_created", `${created.clientName} ${created.date} ${created.time} (${created.host})`);
    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (err) {
    return sql ? unavailable("POST /api/bookings error", err) : serverError("POST /api/bookings error", err);
  }
}

// ---- PATCH: reschedule, reassign, change status, add a meeting link or notes (admin) ----

export async function PATCH(request: Request) {
  const admin = await getStaff(["admin"]);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");
  const id = str(body.id, 64);
  if (!id) return badRequest("Missing id.", "id");

  const sql = neon();
  try {
    const current: Row | null = sql ? await selectOne(sql, id) : db.getBookings().find((b) => b.id === id) ?? null;
    if (!current) return NextResponse.json({ ok: false, error: "Booking not found." }, { status: 404 });

    const next: Row = { ...current };

    if (body.status !== undefined) {
      const status = BOOKING_STATUSES.find((s) => s === body.status);
      if (!status) return badRequest("Choose a valid status.", "status");
      next.status = status;
    }
    if (body.host !== undefined) {
      const host = str(body.host, 120);
      if (!host) return badRequest("Choose a host.", "host");
      next.host = host;
    }
    if (body.date !== undefined) {
      const date = dateOnly(body.date);
      if (!date) return badRequest("Enter the date as YYYY-MM-DD.", "date");
      next.date = date;
    }
    if (body.bookingType !== undefined) {
      const type = str(body.bookingType, 120);
      if (!type || sessionMinutes(type) === null) return badRequest("Choose a session type.", "bookingType");
      next.bookingType = type;
    }
    if (body.meetingUrl !== undefined) {
      const url = optionalText(body.meetingUrl, 500);
      if (url === null || (url && !isHttpsUrl(url))) return badRequest("The meeting link must start with https://", "meetingUrl");
      next.meetingUrl = url ?? "";
    }
    if (body.notes !== undefined) {
      const notes = optionalText(body.notes, 2000);
      if (notes === null) return badRequest("Keep notes under 2,000 characters.", "notes");
      next.notes = notes || undefined;
    }

    // Any change to when, who or how long rebuilds the window and re-checks the host's calendar.
    const timing = ["startTime", "date", "bookingType", "host"].some((k) => body[k] !== undefined);
    const reopened = holdsSlot(next.status) && !holdsSlot(current.status);
    if (timing || reopened) {
      const minutes = sessionMinutes(next.bookingType);
      const start = body.startTime !== undefined ? parseClock(body.startTime) : parseWindow(current.time)?.start ?? null;
      if (start === null) return badRequest("Enter a start time.", "startTime");
      if (minutes !== null) {
        if (start + minutes > 24 * 60) return badRequest("The call must end before midnight.", "startTime");
        next.time = formatWindow(start, minutes);
      }
      const window = parseWindow(next.time);
      if (window && holdsSlot(next.status)) {
        const clash = await findClash(sql, next.date, next.host, window, id);
        if (clash) return clashResponse(clash, next.host);
      }
    }

    let saved: Row | null;
    if (sql) {
      await sql`
        UPDATE bookings SET status = ${next.status}, host = ${next.host}, date = ${next.date}, time = ${next.time},
          booking_type = ${next.bookingType}, meeting_url = ${next.meetingUrl}, notes = ${next.notes ?? null}
        WHERE id = ${id}`;
      saved = await selectOne(sql, id);
    } else {
      saved = db.updateBooking(id, { ...next, status: next.status as BookingStatus });
    }
    if (!saved) return NextResponse.json({ ok: false, error: "Booking not found." }, { status: 404 });

    const changes = Object.keys(body).filter((k) => k !== "id").join(",");
    await addAudit(admin.email, "booking_updated", `${saved.clientName} ${saved.date} ${saved.time} [${changes}]`);
    return NextResponse.json({ ok: true, data: saved });
  } catch (err) {
    return sql ? unavailable("PATCH /api/bookings error", err) : serverError("PATCH /api/bookings error", err);
  }
}
