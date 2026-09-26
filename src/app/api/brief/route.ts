import { NextResponse } from "next/server";
import { db } from "@/db";
import { calculateAgencyQuote } from "@/lib/quotationEngine";
import { clientIp, isBlocked, recordFailure } from "@/lib/rateLimit";
import {
  CONTACTS,
  LIMITS,
  SERVICE_QUESTIONS,
  STAGES,
  TIMELINES,
  isService,
  isValidPhone,
  type InquiryField,
  type Service,
} from "@/lib/inquiryOptions";

const MAX_BODY_BYTES = 16 * 1024;
const ALLOWED_FIELDS = new Set<string>([
  "name",
  "email",
  "service",
  "scope",
  "extra",
  "stage",
  "timeline",
  "contact",
  "phone",
  "company",
  "link",
  "message",
]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = Partial<Record<InquiryField, string>>;

function failure(status: number, code: string, message: string, fields?: FieldErrors) {
  return NextResponse.json(
    { ok: false, error: { code, message, ...(fields ? { fields } : {}) } },
    { status }
  );
}

const normalize = (value: string) => value.normalize("NFC").replace(/\r\n/g, "\n").trim();

function pick<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function optionalText(value: unknown, max: number, tooLong: string, errors: FieldErrors, key: InquiryField) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    errors[key] = "This must be text.";
    return undefined;
  }
  const text = normalize(value);
  if (text.length > max) {
    errors[key] = tooLong;
    return undefined;
  }
  return text || undefined;
}

let detailColumnsReady: Promise<void> | null = null;

export async function POST(request: Request) {
  // Public endpoint: cap submissions per IP so the admin Leads list cannot be flooded.
  const ipKey = `brief:${clientIp(request)}`;
  if (isBlocked(ipKey, 10)) {
    return NextResponse.json(
      { ok: false, error: { code: "RATE_LIMITED", message: "Too many submissions. Please try again later." } },
      { status: 429, headers: { "Retry-After": "3600" } }
    );
  }
  recordFailure(ipKey, 60 * 60 * 1000);

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return failure(415, "UNSUPPORTED_MEDIA_TYPE", "Send the inquiry as application/json.");
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return failure(413, "PAYLOAD_TOO_LARGE", "That request is too large.");
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
  const unknownKeys = Object.keys(input).filter((key) => !ALLOWED_FIELDS.has(key));
  if (unknownKeys.length > 0) {
    return failure(400, "VALIDATION_ERROR", `Unexpected field: ${unknownKeys[0]}.`);
  }

  const errors: FieldErrors = {};

  const name = typeof input.name === "string" ? normalize(input.name) : "";
  if (!name) errors.name = "Enter your name.";
  else if (name.length > LIMITS.name) errors.name = "Keep your name under 100 characters.";

  const email = typeof input.email === "string" ? normalize(input.email).toLowerCase() : "";
  if (!email) errors.email = "Enter your email address.";
  else if (email.length > LIMITS.email || !EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";

  const service: Service | null = isService(input.service) ? input.service : null;
  if (!service) errors.service = "Choose a service.";

  let scope: string | null = null;
  let extra: string | null = null;
  if (service) {
    const questions = SERVICE_QUESTIONS[service];
    scope = pick(input.scope, questions.scope.options);
    extra = pick(input.extra, questions.extra.options);
    if (!scope) errors.scope = "Choose one of the options.";
    if (!extra) errors.extra = "Choose one of the options.";
  }

  const stage = pick(input.stage, STAGES);
  if (!stage) errors.stage = "Choose one of the options.";
  const timeline = pick(input.timeline, TIMELINES);
  if (!timeline) errors.timeline = "Choose one of the options.";
  const contact = pick(input.contact, CONTACTS);
  if (!contact) errors.contact = "Choose one of the options.";

  const phone = optionalText(input.phone, LIMITS.phone, "Keep the number under 30 characters.", errors, "phone");
  if (contact === "A call") {
    if (!phone && !errors.phone) errors.phone = "Enter a phone number so we can call you.";
  }
  if (phone && !errors.phone && !isValidPhone(phone)) errors.phone = "Enter a valid phone number.";

  const company = optionalText(input.company, LIMITS.company, "Keep the company name under 100 characters.", errors, "company");
  const message = optionalText(input.message, LIMITS.message, "Keep details under 2,000 characters.", errors, "message");

  let link = optionalText(input.link, LIMITS.link, "Keep the link under 300 characters.", errors, "link");
  if (link && !errors.link) {
    try {
      const url = new URL(link);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("protocol");
      link = url.toString();
    } catch {
      errors.link = "Enter a valid website or social link.";
    }
  }

  if (Object.keys(errors).length > 0 || !service || !scope || !extra || !stage || !timeline || !contact) {
    return failure(400, "VALIDATION_ERROR", "Please check the highlighted fields.", errors);
  }

  const questions = SERVICE_QUESTIONS[service];
  const summary = [
    `Service: ${service}`,
    `${questions.scope.label} ${scope}`,
    `${questions.extra.label} ${extra}`,
    `Stage: ${stage}`,
    `Timeline: ${timeline}`,
    `Best way to reach: ${contact}`,
    phone ? `Phone: ${phone}` : null,
    link ? `Existing link: ${link}` : null,
    message ? `\nNotes:\n${message}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  // Internal estimate only. Never returned to the browser.
  const estimate = calculateAgencyQuote({ needs: [service] });

  let opportunityId: string | null = null;
  try {
    const opportunity = db.addOpportunity({
      name,
      company: company || `${name}'s Project`,
      email,
      phone,
      stage: "new_inquiry",
      dealValue: Math.round((estimate.minPrice + estimate.maxPrice) / 2),
      recommendedTier: estimate.recommendedTier,
      needs: [service],
      timeline,
      budgetBracket: "Not provided",
      message: summary,
      deliverables: estimate.deliverables,
    });
    opportunityId = opportunity.id;

    const { isNeonConfigured, getNeonSql, ensureOpportunityDetailColumns } = await import("@/lib/neon");
    if (isNeonConfigured()) {
      const sql = getNeonSql();
      if (!sql) throw new Error("Neon is configured but no SQL client is available.");
      // Older databases predate the detail columns. Add them once per instance.
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
          ${opportunity.phone ?? null},
          ${opportunity.budgetBracket},
          ${opportunity.message ?? null},
          ${JSON.stringify(opportunity.deliverables ?? [])}::jsonb
        )
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    return NextResponse.json({ ok: true, inquiryId: opportunity.id }, { status: 201 });
  } catch (error) {
    if (opportunityId) db.removeOpportunity(opportunityId);
    console.error("API /api/brief persistence error:", error);
    return failure(503, "UNAVAILABLE", "We could not save your inquiry. Please try again shortly.");
  }
}
