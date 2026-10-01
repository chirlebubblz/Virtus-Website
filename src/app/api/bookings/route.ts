import { NextResponse } from "next/server";
import { db } from "@/db";
import { sendAutomatedEmail } from "@/lib/mailer";
import { clientIp, isBlocked, recordFailure } from "@/lib/rateLimit";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  const bookings = db.getBookings();
  // Return confirmed bookings' date and time slots so the public calendar knows reserved times
  const reservedSlots = bookings
    .filter((b) => b.status === "Confirmed" || b.status === "Pending")
    .map((b) => ({
      date: b.date,
      time: b.time,
    }));

  return NextResponse.json({
    ok: true,
    reservedSlots,
    bookings: bookings.map((b) => ({
      id: b.id,
      date: b.date,
      time: b.time,
      bookingType: b.bookingType,
      status: b.status,
    })),
  });
}

export async function POST(request: Request) {
  const ipKey = `booking:${clientIp(request)}`;
  if (isBlocked(ipKey, 8)) {
    return NextResponse.json(
      { ok: false, error: "Too many booking attempts. Please try again shortly." },
      { status: 429 }
    );
  }
  recordFailure(ipKey, 60 * 60 * 1000);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON format" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, error: "Missing booking details" }, { status: 400 });
  }

  const {
    name,
    email,
    phone,
    company,
    date,
    time,
    service = "Discovery Call (30 min)",
    notes = "",
  } = body as Record<string, string>;

  if (!name?.trim()) {
    return NextResponse.json({ ok: false, error: "Please enter your name" }, { status: 400 });
  }

  if (!email?.trim() || !EMAIL_PATTERN.test(email.trim())) {
    return NextResponse.json({ ok: false, error: "Please enter a valid business email" }, { status: 400 });
  }

  if (!date?.trim() || !time?.trim()) {
    return NextResponse.json({ ok: false, error: "Please select both a date and time slot" }, { status: 400 });
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanCompany = company?.trim() || `${cleanName}'s Project`;
  const cleanPhone = phone?.trim() || "";
  const cleanDate = date.trim();
  const cleanTime = time.trim();
  const cleanNotes = notes?.trim() || "";

  // Generate meeting URL
  const roomHash = Math.random().toString(36).substring(2, 7);
  const meetingUrl = `https://meet.google.com/tvl-disc-${roomHash}`;
  const host = "Paks (Studio Director)";

  // 1. Save Booking in Studio DB
  const booking = db.addBooking({
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
    const { isNeonConfigured, getNeonSql, ensureOpportunityDetailColumns } = await import("@/lib/neon");
    if (isNeonConfigured()) {
      const sql = getNeonSql();
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
    }
  } catch (neonErr) {
    console.error("[Booking API] Neon sync error (non-fatal):", neonErr);
  }

  // 4. Trigger Automated Confirmation Emails via PrivateEmail SMTP
  // Client confirmation email
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

  return NextResponse.json(
    {
      ok: true,
      booking,
      opportunityId: opp.id,
      dealValue,
      meetingUrl,
    },
    { status: 201 }
  );
}
