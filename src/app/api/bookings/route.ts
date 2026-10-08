import { NextResponse } from "next/server";
import { db } from "@/db";
import type { Booking } from "@/db";
import { sendAutomatedEmail } from "@/lib/mailer";
import { dispatchWebhook } from "@/lib/webhooks";
import { getNeonSql, isNeonConfigured, ensureOpportunityDetailColumns } from "@/lib/neon";
import { clientIp, isBlocked, recordFailure } from "@/lib/rateLimit";
import { getStaff } from "@/lib/staffAuth";
import { StoreUnavailableError, addAudit, listStaff, type StaffUser } from "@/lib/staffStore";
import { EMAIL_PATTERN, badRequest, dateOnly, readJsonObject, serverError, str, unavailable } from "@/lib/apiUtil";
import {
  BOOKING_STATUSES,
  PUBLIC_HOST,
  PUBLIC_SESSION_TYPE,
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

// Public route (listed in middleware PUBLIC_API). Every handler decides what the caller may do:
//   GET   staff: bookings (team members only the calls they host). Visitors: taken slots only, no client data.
//   POST  with `startTime`: staff scheduling, admin only. Without: the public website calendar.
//   PATCH admins: any change. Team members: the status of calls they host.

type Sql = NonNullable<ReturnType<typeof getNeonSql>>;
type Row = Omit<Booking, "status"> & { status: string };

const neon = (): Sql | null => (isNeonConfigured() ? getNeonSql() : null);

const todayIso = () => new Date().toISOString().slice(0, 10);

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

const loadAll = async (sql: Sql | null): Promise<Row[]> => (sql ? selectAll(sql) : db.getBookings());
const loadOne = async (sql: Sql | null, id: string): Promise<Row | null> =>
  sql ? selectOne(sql, id) : db.getBookings().find((b) => b.id === id) ?? null;

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

/** Saves a new booking to Neon, or to the dev store without a database. */
async function insertBooking(sql: Sql | null, booking: Omit<Booking, "id" | "createdAt">): Promise<Row> {
  if (!sql) return db.addBooking(booking);
  const id = `book-${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  await sql`
    INSERT INTO bookings (id, client_name, company, email, booking_type, date, time, host, meeting_url, status, notes)
    VALUES (${id}, ${booking.clientName}, ${booking.company}, ${booking.email}, ${booking.bookingType}, ${booking.date},
            ${booking.time}, ${booking.host}, ${booking.meetingUrl}, ${booking.status}, ${booking.notes ?? null})`;
  const row = await selectOne(sql, id);
  if (!row) throw new Error("Inserted booking could not be read back.");
  return row;
}

/** Hosts an admin can schedule: active staff (task-board profile first, else name) plus hosts already on bookings. */
async function hostOptions(rows: Row[]): Promise<string[]> {
  let staff: StaffUser[] = [];
  try {
    staff = (await listStaff()).filter((u) => u.status === "active");
  } catch (err) {
    if (!(err instanceof StoreUnavailableError)) throw err;
  }
  const names = [PUBLIC_HOST, ...staff.map((u) => u.memberLabel ?? u.name), ...rows.map((r) => r.host)];
  return [...new Set(names.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

const optionalText = (value: unknown, max: number): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return "";
  return typeof value === "string" && value.trim().length <= max ? value.trim() : null;
};

// ---- GET ----

export async function GET() {
  const staff = await getStaff(["admin", "team"]);
  const sql = neon();
  try {
    const all = await loadAll(sql);

    if (staff) {
      const isAdmin = staff.role === "admin";
      const member = staff.memberLabel ?? staff.name;
      return NextResponse.json({
        ok: true,
        role: staff.role,
        bookings: isAdmin ? all : all.filter((b) => hostMatches(b.host, member)),
        hosts: isAdmin ? await hostOptions(all) : [],
        canSchedule: isAdmin,
      });
    }

    // Visitors only learn which public discovery slots are taken. No ids, names or emails.
    const reservedSlots = all
      .filter((b) => holdsSlot(b.status) && b.host === PUBLIC_HOST && b.date >= todayIso())
      .map((b) => ({ date: b.date, time: b.time }));
    return NextResponse.json({ ok: true, reservedSlots });
  } catch (err) {
    return sql ? unavailable("GET /api/bookings error", err) : serverError("GET /api/bookings error", err);
  }
}

// ---- POST ----

export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) return badRequest("Missing booking details.");
  return body.startTime !== undefined ? scheduleAsStaff(body) : bookFromWebsite(request, body);
}

/** Staff scheduling from the Bookings view. */
async function scheduleAsStaff(body: Record<string, unknown>) {
  const admin = await getStaff(["admin"]);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

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

  const sql = neon();
  try {
    if (holdsSlot(status)) {
      const clash = await findClash(sql, date, host, { start, end: start + minutes });
      if (clash) return clashResponse(clash, host);
    }
    const booking = await insertBooking(sql, {
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
    });
    await addAudit(admin.email, "booking_created", `${booking.clientName} ${booking.date} ${booking.time} (${booking.host})`);
    return NextResponse.json({ ok: true, booking }, { status: 201 });
  } catch (err) {
    return sql ? unavailable("POST /api/bookings error", err) : serverError("POST /api/bookings error", err);
  }
}

/** A visitor booking a discovery call from the website calendar (LeadCapture). */
async function bookFromWebsite(request: Request, body: Record<string, unknown>) {
  const ipKey = `booking:${clientIp(request)}`;
  if (isBlocked(ipKey, 8)) {
    return NextResponse.json(
      { ok: false, error: "Too many booking attempts. Please try again shortly." },
      { status: 429 }
    );
  }
  recordFailure(ipKey, 60 * 60 * 1000);

  const cleanName = str(body.name, 100);
  const cleanEmail = str(body.email, 254)?.toLowerCase() ?? null;
  const cleanCompany = str(body.company, 100) ?? (cleanName ? `${cleanName}'s Project` : "");
  const cleanPhone = str(body.phone, 30) ?? "";
  const cleanNotes = str(body.notes, 2000) ?? "";
  const cleanDate = dateOnly(body.date);
  const window = typeof body.time === "string" ? parseWindow(body.time) : null;
  // The website only offers one session type. Never let a visitor pick a label or length.
  const service = PUBLIC_SESSION_TYPE;

  if (!cleanName) return NextResponse.json({ ok: false, error: "Please enter your name" }, { status: 400 });
  if (!cleanEmail || !EMAIL_PATTERN.test(cleanEmail)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid business email" }, { status: 400 });
  }
  if (!cleanDate || !window) {
    return NextResponse.json({ ok: false, error: "Please select both a date and time slot" }, { status: 400 });
  }
  if (cleanDate < todayIso()) {
    return NextResponse.json({ ok: false, error: "Please choose a date from today onward" }, { status: 400 });
  }

  const cleanTime = formatWindow(window.start, window.end - window.start);
  const host = PUBLIC_HOST;
  // Generate meeting URL (supports permanent STUDIO_MEETING_URL / GOOGLE_MEET_URL from env)
  const studioMeetUrl = (process.env.STUDIO_MEETING_URL || process.env.GOOGLE_MEET_URL || "").trim();
  const roomHash = Math.random().toString(36).substring(2, 7);
  const meetingUrl = studioMeetUrl || `https://meet.google.com/tvl-disc-${roomHash}`;

  const sql = neon();
  let booking: Row;
  try {
    // Two visitors can see the same open slot. The first save wins; the second is told to pick another.
    const clash = await findClash(sql, cleanDate, host, window);
    if (clash) {
      return NextResponse.json(
        { ok: false, error: "That time was just booked. Please pick another slot." },
        { status: 409 }
      );
    }

    // 1. Save Booking in Studio DB
    booking = await insertBooking(sql, {
      clientName: cleanName,
      company: cleanCompany,
      email: cleanEmail,
      bookingType: service,
      date: cleanDate,
      time: cleanTime,
      host,
      meetingUrl,
      status: "Confirmed",
      notes: cleanNotes,
    });
  } catch (err) {
    console.error("[Booking API] booking save error:", err);
    return NextResponse.json(
      { ok: false, error: "We could not reserve your slot. Please try again shortly." },
      { status: 503 }
    );
  }

  // 2. Add as Qualified Opportunity in Leads Pipeline
  const dealValue = 6500;
  const opp = db.addOpportunity({
    name: cleanName,
    company: cleanCompany,
    email: cleanEmail,
    phone: cleanPhone,
    stage: "qualified",
    dealValue,
    recommendedTier: "Focused",
    needs: [service],
    timeline: "Immediate",
    budgetBracket: "$5k - $10k",
    message: `Scheduled Discovery Call on ${cleanDate} at ${cleanTime}.\nMeeting URL: ${meetingUrl}\nObjective / Notes: ${cleanNotes || "Direct discovery booking."}`,
    deliverables: ["Strategic Architecture Audit", "Discovery Roadmap", "Executive Proposal"],
    tags: ["#CalendarBooked", "#DiscoveryCall"],
    roleLeader: "Paks (Studio Director)",
    leadScore: "Hot",
    currentBottleneck: cleanNotes || "Discovery Call Scheduled",
    howWeAssist: ["Provide comprehensive brand & tech audit and proposal during discovery call."],
  });

  // 3. Neon database sync if enabled
  try {
    if (sql) {
      await ensureOpportunityDetailColumns(sql);
      await sql`
        INSERT INTO opportunities (
          id, name, company, email, stage, deal_value, recommended_tier, needs, timeline, phone, budget_bracket, message, deliverables
        ) VALUES (
          ${opp.id},
          ${opp.name},
          ${opp.company},
          ${opp.email},
          ${opp.stage},
          ${opp.dealValue},
          ${opp.recommendedTier},
          ${JSON.stringify(opp.needs)},
          ${opp.timeline},
          ${opp.phone ?? null},
          ${opp.budgetBracket},
          ${opp.message ?? null},
          ${JSON.stringify(opp.deliverables ?? [])}::jsonb
        )
        ON CONFLICT (id) DO UPDATE SET
          deal_value = EXCLUDED.deal_value,
          stage = EXCLUDED.stage;
      `;
    }
  } catch (neonErr) {
    console.error("[Booking API] Neon sync error (non-fatal):", neonErr);
  }

  // 4. Trigger Automated Confirmation Emails via PrivateEmail SMTP
  void sendAutomatedEmail({
    templateId: "booking_confirmation",
    recipient: cleanEmail,
    variables: {
      clientName: cleanName,
      company: cleanCompany,
      bookingDate: cleanDate,
      bookingTime: cleanTime,
      meetingUrl,
      hostName: host,
    },
  });

  // Internal team inbound alert
  const internalRecipient = process.env.SMTP_USER || "hello@thevirtuslabs.com";
  void sendAutomatedEmail({
    templateId: "internal_alert",
    recipient: internalRecipient,
    variables: {
      clientName: cleanName,
      company: cleanCompany,
      clientEmail: cleanEmail,
      phone: cleanPhone || "None provided",
      service,
      dealValue: `$${dealValue.toLocaleString()}`,
      bottleneck: cleanNotes || "Discovery Call Booked",
    },
  });

  // 5. Asynchronous Webhook Dispatch (Discord / Slack / CRM)
  void dispatchWebhook({
    event: "calendar_booking_created",
    title: `Discovery Call Booked: ${cleanCompany}`,
    description: `A new discovery strategy session was scheduled by **${cleanName}** for **${cleanDate}** at **${cleanTime}**.`,
    data: {
      clientName: cleanName,
      company: cleanCompany,
      email: cleanEmail,
      phone: cleanPhone || "None",
      service,
      date: cleanDate,
      time: cleanTime,
      meetingUrl,
      host,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      booking: { id: booking.id, date: booking.date, time: booking.time, bookingType: booking.bookingType },
      opportunityId: opp.id,
      dealValue,
      meetingUrl,
    },
    { status: 201 }
  );
}

// ---- PATCH: reschedule, reassign, change status, add a meeting link or notes ----

export async function PATCH(request: Request) {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const isAdmin = staff.role === "admin";

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");
  const id = str(body.id, 64);
  if (!id) return badRequest("Missing booking id.", "id");

  const changes = Object.keys(body).filter((k) => k !== "id");
  // Team members may only mark their own calls (for example Completed). Everything else is for admins.
  if (!isAdmin && changes.some((k) => k !== "status")) {
    return NextResponse.json({ ok: false, error: "Only admins can change booking details." }, { status: 403 });
  }

  const sql = neon();
  try {
    const current = await loadOne(sql, id);
    if (!current || (!isAdmin && !hostMatches(current.host, staff.memberLabel ?? staff.name))) {
      return NextResponse.json({ ok: false, error: "Booking not found." }, { status: 404 });
    }

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

    await addAudit(staff.email, "booking_updated", `${saved.clientName} ${saved.date} ${saved.time} [${changes.join(",")}]`);
    return NextResponse.json({ ok: true, booking: saved });
  } catch (err) {
    return sql ? unavailable("PATCH /api/bookings error", err) : serverError("PATCH /api/bookings error", err);
  }
}
