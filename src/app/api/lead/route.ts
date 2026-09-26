import { NextResponse } from "next/server";
import { db } from "@/db";
import { clientIp, isBlocked, recordFailure } from "@/lib/rateLimit";
import { LIMITS } from "@/lib/inquiryOptions";

const MAX_BODY_BYTES = 4 * 1024;
const ALLOWED_FIELDS = new Set<string>(["name", "email", "message", "website"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LeadField = "name" | "email" | "message";

function failure(status: number, code: string, message: string, fields?: Partial<Record<LeadField, string>>) {
  return NextResponse.json({ ok: false, error: { code, message, ...(fields ? { fields } : {}) } }, { status });
}

const normalize = (value: string) => value.normalize("NFC").replace(/\r\n/g, "\n").trim();

let detailColumnsReady: Promise<void> | null = null;

export async function POST(request: Request) {
  // Public endpoint: cap submissions per IP so the admin Leads list cannot be flooded.
  const ipKey = `lead:${clientIp(request)}`;
  if (isBlocked(ipKey, 10)) {
    return NextResponse.json(
      { ok: false, error: { code: "RATE_LIMITED", message: "Too many submissions. Please try again later." } },
      { status: 429, headers: { "Retry-After": "3600" } }
    );
  }
  recordFailure(ipKey, 60 * 60 * 1000);

  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return failure(415, "UNSUPPORTED_MEDIA_TYPE", "Send the request as application/json.");
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return failure(400, "BAD_REQUEST", "The request body could not be read.");
  }
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return failure(413, "PAYLOAD_TOO_LARGE", "That request is too large.");
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return failure(400, "MALFORMED_JSON", "The request body is not valid JSON.");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return failure(400, "VALIDATION_ERROR", "Please check the highlighted fields.");
  }

  const input = body as Record<string, unknown>;
  const unknownKey = Object.keys(input).find((key) => !ALLOWED_FIELDS.has(key));
  if (unknownKey) return failure(400, "VALIDATION_ERROR", `Unexpected field: ${unknownKey}.`);

  // Honeypot: real visitors never fill this. Pretend success so bots learn nothing.
  if (typeof input.website === "string" && input.website.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const errors: Partial<Record<LeadField, string>> = {};

  const email = typeof input.email === "string" ? normalize(input.email).toLowerCase() : "";
  if (!email) errors.email = "Enter your email address.";
  else if (email.length > LIMITS.email || !EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";

  let name = "";
  if (input.name !== undefined && input.name !== null && input.name !== "") {
    if (typeof input.name !== "string") errors.name = "This must be text.";
    else {
      name = normalize(input.name);
      if (name.length > LIMITS.name) errors.name = "Keep your name under 100 characters.";
    }
  }

  let message = "";
  if (input.message !== undefined && input.message !== null && input.message !== "") {
    if (typeof input.message !== "string") errors.message = "This must be text.";
    else {
      message = normalize(input.message);
      if (message.length > LIMITS.message) errors.message = "Keep details under 2,000 characters.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return failure(400, "VALIDATION_ERROR", "Please check the highlighted fields.", errors);
  }

  const displayName = name || email.split("@")[0];
  let opportunityId: string | null = null;
  try {
    const opportunity = db.addOpportunity({
      name: displayName,
      company: name ? `${name}'s Project` : "Website lead",
      email,
      stage: "new_inquiry",
      dealValue: 0,
      recommendedTier: "Focused",
      needs: [],
      timeline: "Not provided",
      budgetBracket: "Not provided",
      message: ["Source: website lead form", message ? `\nNotes:\n${message}` : null].filter(Boolean).join("\n"),
      deliverables: [],
    });
    opportunityId = opportunity.id;

    const { isNeonConfigured, getNeonSql, ensureOpportunityDetailColumns } = await import("@/lib/neon");
    if (isNeonConfigured()) {
      const sql = getNeonSql();
      if (!sql) throw new Error("Neon is configured but no SQL client is available.");
      detailColumnsReady ??= ensureOpportunityDetailColumns(sql).catch((err) => {
        detailColumnsReady = null;
        throw err;
      });
      await detailColumnsReady;
      await sql`
        INSERT INTO opportunities (id, name, company, email, stage, deal_value, recommended_tier, needs, timeline, phone, budget_bracket, message, deliverables)
        VALUES (
          ${opportunity.id},
          ${opportunity.name},
          ${opportunity.company},
          ${opportunity.email},
          ${opportunity.stage},
          ${opportunity.dealValue},
          ${opportunity.recommendedTier},
          ${JSON.stringify(opportunity.needs)},
          ${opportunity.timeline},
          ${null},
          ${opportunity.budgetBracket},
          ${opportunity.message ?? null},
          ${JSON.stringify(opportunity.deliverables ?? [])}::jsonb
        )
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (opportunityId) db.removeOpportunity(opportunityId);
    console.error("API /api/lead persistence error:", error);
    return failure(503, "UNAVAILABLE", "We could not save your details. Please try again shortly.");
  }
}
