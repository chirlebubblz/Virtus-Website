import { NextResponse } from "next/server";
import { INVITE_TTL_MS, allowedEmailDomains, getStaff, hashSecret, isAllowedEmail, newSecretToken, normalizeEmail } from "@/lib/staffAuth";
import { StoreUnavailableError, addAudit, createInvite, listPendingInvites } from "@/lib/staffStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getStaff(["admin"]);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, data: await listPendingInvites() });
  } catch (err) {
    if (err instanceof StoreUnavailableError) return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
    throw err;
  }
}

// Creates a single-use invite. The plaintext token is returned once and stored only as a hash.
export async function POST(request: Request) {
  const admin = await getStaff(["admin"]);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { email?: unknown; role?: unknown };
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object") throw new Error("bad body");
    body = parsed as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const role = body.role === "admin" ? "admin" : body.role === "team" ? "team" : null;
  if (!role) return NextResponse.json({ ok: false, error: "Choose a role." }, { status: 400 });

  if (role === "admin" && !(typeof body.email === "string" && body.email.trim())) {
    return NextResponse.json({ ok: false, error: "Admin invites must be tied to an email address." }, { status: 400 });
  }

  let email: string | null = null;
  if (typeof body.email === "string" && body.email.trim()) {
    email = normalizeEmail(body.email);
    if (!email || !isAllowedEmail(email, await allowedEmailDomains())) {
      return NextResponse.json({ ok: false, error: "Enter a valid Gmail address." }, { status: 400 });
    }
  }

  try {
    const token = newSecretToken("stfinv");
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
    await createInvite({ tokenHash: await hashSecret(token), email, role, createdBy: admin.id, expiresAt });
    await addAudit(admin.email, "invite_created", `${email ?? "any email"} (${role})`);
    return NextResponse.json({ ok: true, data: { token, email, role, expiresAt } });
  } catch (err) {
    if (err instanceof StoreUnavailableError) return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
    throw err;
  }
}
