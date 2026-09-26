import { NextResponse } from "next/server";
import { getClientSessionId } from "@/lib/clientSession";
import { PortalUnavailableError, saveApproval } from "@/lib/clientPortal";
import { isBlocked, recordFailure } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const clientId = await getClientSessionId();
  if (!clientId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  // Per-client write cap so a stolen session cannot spam activity rows.
  const key = `client-write:${clientId}`;
  if (isBlocked(key, 30)) {
    return NextResponse.json({ ok: false, error: "Too many updates. Try again later." }, { status: 429 });
  }

  let status: unknown;
  try {
    const parsed: unknown = await request.json();
    status = parsed && typeof parsed === "object" ? (parsed as { status?: unknown }).status : undefined;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  // Clients can approve or reset. "changes_requested" is only set by submitting a revision.
  if (status !== "approved" && status !== "pending") {
    return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
  }
  recordFailure(key, 60 * 60 * 1000);
  try {
    return NextResponse.json({ ok: true, data: { approval: await saveApproval(clientId, status) } });
  } catch (err) {
    if (err instanceof PortalUnavailableError) return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
    throw err;
  }
}
