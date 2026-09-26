import { NextResponse } from "next/server";
import { clientIp, isBlocked, recordFailure } from "@/lib/rateLimit";
import { hashPassword, hashSecret, passwordProblem } from "@/lib/staffAuth";
import {
  StoreUnavailableError,
  addAudit,
  consumeReset,
  getStaffById,
  peekReset,
  updateStaff,
} from "@/lib/staffStore";

export const dynamic = "force-dynamic";

const HOUR_MS = 60 * 60 * 1000;
const BAD_LINK = "This reset link is invalid or has expired. Ask an admin for a new one.";

export async function POST(request: Request) {
  const ipKey = `staff-reset:${clientIp(request)}`;
  if (isBlocked(ipKey, 8)) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Try again later." }, { status: 429 });
  }

  let body: { token?: unknown; password?: unknown };
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object") throw new Error("bad body");
    body = parsed as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  if (typeof body.token !== "string" || !body.token) {
    recordFailure(ipKey, HOUR_MS);
    return NextResponse.json({ ok: false, error: BAD_LINK }, { status: 400 });
  }

  try {
    const tokenHash = await hashSecret(body.token);
    const staffId = await peekReset(tokenHash);
    const user = staffId ? await getStaffById(staffId) : null;
    if (!user) {
      recordFailure(ipKey, HOUR_MS);
      return NextResponse.json({ ok: false, error: BAD_LINK }, { status: 400 });
    }

    // Check the password first so a typo does not burn the single-use link.
    const problem = passwordProblem(body.password, user.email, user.name);
    if (problem) return NextResponse.json({ ok: false, error: problem, field: "password" }, { status: 400 });

    if (!(await consumeReset(tokenHash))) {
      return NextResponse.json({ ok: false, error: BAD_LINK }, { status: 400 });
    }
    await updateStaff(user.id, { passwordHash: await hashPassword(body.password as string), bumpSession: true });
    await addAudit(user.email, "password_reset", user.email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof StoreUnavailableError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
    }
    console.error("POST /api/staff/reset error:", err);
    return NextResponse.json({ ok: false, error: "Something went wrong. Try again." }, { status: 500 });
  }
}
