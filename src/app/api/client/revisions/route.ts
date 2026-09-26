import { NextResponse } from "next/server";
import { getClientSessionId } from "@/lib/clientSession";
import { PortalUnavailableError, getClientPortalData, saveRevision } from "@/lib/clientPortal";
import { isBlocked, recordFailure } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;
const PRIORITIES = new Set(["routine", "important", "blocker"]);
const CATEGORIES = new Set([
  "Visual & UI Styling",
  "Copy & Typography",
  "Functionality & Interactions",
  "Mobile Responsiveness",
  "Brand Assets & Colors",
]);

const text = (value: unknown, max: number): string | null =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max ? value.trim() : null;

export async function POST(request: Request) {
  const clientId = await getClientSessionId();
  if (!clientId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  // Per-client cap: 10 requests per hour.
  const writeKey = `client-revision:${clientId}`;
  if (isBlocked(writeKey, 10)) {
    return NextResponse.json({ ok: false, error: "Too many requests. Try again later." }, { status: 429 });
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "Request too large" }, { status: 413 });
  }
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("bad body");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const details = text(body.details, 4000);
  const targetArea = text(body.targetArea, 200);
  const categories = Array.isArray(body.categories)
    ? body.categories.filter((c): c is string => typeof c === "string" && CATEGORIES.has(c))
    : [];
  const priority = typeof body.priority === "string" && PRIORITIES.has(body.priority) ? body.priority : null;
  const attachments = Array.isArray(body.attachments)
    ? body.attachments.map((a) => text(a, 200)).filter((a): a is string => a !== null).slice(0, 10)
    : [];
  const referenceUrl = typeof body.referenceUrl === "string" ? body.referenceUrl.trim().slice(0, 500) : "";

  if (!details || !targetArea || categories.length === 0 || !priority) {
    const missing = [
      !details && "what to change",
      !targetArea && "where it applies",
      categories.length === 0 && "a category",
      !priority && "a priority",
    ].filter(Boolean);
    return NextResponse.json({ ok: false, error: `Please add ${missing.join(", ")}.` }, { status: 400 });
  }
  if (referenceUrl && !/^https?:\/\//i.test(referenceUrl)) {
    return NextResponse.json({ ok: false, error: "Reference link must start with http:// or https://" }, { status: 400 });
  }

  try {
    const portal = await getClientPortalData(clientId);
    if (!portal) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const ticket = await saveRevision({
      clientId,
      categories,
      targetArea,
      priority: priority as "routine" | "important" | "blocker",
      details,
      referenceUrl,
      attachments,
      submittedBy: portal.client.contactName,
      submittedEmail: portal.client.email,
    });
    recordFailure(writeKey, 60 * 60 * 1000);
    return NextResponse.json({ ok: true, data: ticket });
  } catch (err) {
    if (err instanceof PortalUnavailableError) return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
    throw err;
  }
}
