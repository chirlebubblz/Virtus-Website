import { NextResponse } from "next/server";
import { clearFailures, isBlocked, recordFailure } from "@/lib/rateLimit";
import { verifyPassword } from "@/lib/staffAuth";
import { addAudit, type StaffUser } from "@/lib/staffStore";

export const WRONG_PASSWORD = "Password is incorrect. Nothing was changed.";

/**
 * Re-checks the signed-in admin's own password before a sensitive change, so a borrowed or left-open session cannot
 * make it. Returns a response to send back when the check fails, or null when it passes. Five wrong tries lock the
 * admin out of these confirmations for 15 minutes.
 */
export async function confirmAdminPassword(
  admin: StaffUser,
  password: unknown,
  scope: string
): Promise<NextResponse | null> {
  if (typeof password !== "string" || !password) {
    return NextResponse.json({ ok: false, error: "Enter your password to confirm.", field: "password" }, { status: 400 });
  }
  const key = `admin-confirm:${admin.id}`;
  if (isBlocked(key, 5)) {
    return NextResponse.json(
      { ok: false, error: "Too many wrong passwords. Try again in 15 minutes." },
      { status: 429, headers: { "Retry-After": "900" } }
    );
  }
  if (!(await verifyPassword(password, admin.passwordHash))) {
    recordFailure(key);
    await addAudit(admin.email, `${scope}_password_failed`, scope);
    return NextResponse.json({ ok: false, error: WRONG_PASSWORD, field: "password" }, { status: 403 });
  }
  clearFailures(key);
  return null;
}
