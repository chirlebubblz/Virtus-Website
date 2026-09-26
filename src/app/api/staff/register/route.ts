import { NextResponse } from "next/server";
import { isSessionConfigured } from "@/lib/session";
import { clientIp, isBlocked, recordFailure } from "@/lib/rateLimit";
import {
  attachStaffSession,
  hashPassword,
  hashSecret,
  homeFor,
  allowedEmailDomains,
  isAllowedEmail,
  normalizeEmail,
  passwordProblem,
  roleForInviteCode,
  validateName,
} from "@/lib/staffAuth";
import {
  StoreUnavailableError,
  addAudit,
  consumeInvite,
  createStaff,
  findInvite,
  getStaffByEmail,
  restoreInvite,
  updateStaff,
  type StaffRole,
} from "@/lib/staffStore";

export const dynamic = "force-dynamic";

const HOUR_MS = 60 * 60 * 1000;
const MAX_FAILURES_PER_HOUR = 8;
const BAD_INVITE = "That invitation is invalid or has expired. Ask an admin for a new one.";

const fail = (status: number, error: string, field?: string) =>
  NextResponse.json({ ok: false, error, ...(field ? { field } : {}) }, { status });

export async function POST(request: Request) {
  const ipKey = `staff-register:${clientIp(request)}`;
  if (isBlocked(ipKey, MAX_FAILURES_PER_HOUR)) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": "3600" } }
    );
  }
  // Only count attempts that probe invitations or emails. Validation typos must not lock a real invitee out.
  const reject = (status: number, error: string, field?: string) => {
    recordFailure(ipKey, HOUR_MS);
    return fail(status, error, field);
  };

  if (!isSessionConfigured()) return fail(503, "Registration is temporarily unavailable.");

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object") return reject(400, "Invalid request.");
    body = parsed as Record<string, unknown>;
  } catch {
    return reject(400, "Invalid request.");
  }

  const name = validateName(body.name);
  if (!name) return fail(400, "Enter your Discord name.", "name");
  const email = normalizeEmail(body.email);
  if (!email) return fail(400, "Enter a valid email address.", "email");
  if (!isAllowedEmail(email, await allowedEmailDomains())) return fail(400, "Enter an authorized email address to register.", "email");
  const problem = passwordProblem(body.password, email, name);
  if (problem) return fail(400, problem, "password");

  try {
    // Work out the role from either a personal invite or the shared env code.
    let role: StaffRole | null = null;
    let inviteId: string | null = null;
    if (typeof body.invite === "string" && body.invite) {
      const invite = await findInvite(await hashSecret(body.invite));
      const valid = invite && !invite.usedAt && new Date(invite.expiresAt).getTime() > Date.now();
      if (!valid || (invite.email && invite.email !== email)) return reject(403, BAD_INVITE, "code");
      role = invite.role;
      inviteId = invite.id;
    } else {
      role = await roleForInviteCode(body.code);
      if (!role) return reject(403, BAD_INVITE, "code");
    }

    if (await getStaffByEmail(email)) return reject(409, "An account with this email already exists. Log in instead.", "email");

    if (inviteId && !(await consumeInvite(inviteId))) return reject(403, BAD_INVITE, "code");

    let created;
    try {
      created = await createStaff({ name, email, passwordHash: await hashPassword(body.password as string), role });
    } catch (err) {
      // Do not burn a single-use invite when the account was never created.
      if (inviteId) await restoreInvite(inviteId).catch(() => undefined);
      throw err;
    }
    if (!created) {
      if (inviteId) await restoreInvite(inviteId);
      return reject(409, "An account with this email already exists. Log in instead.", "email");
    }

    const user = (await updateStaff(created.id, { touchLogin: true })) ?? created;
    const response = NextResponse.json({ ok: true, data: { role: user.role, redirect: homeFor(user.role) } });
    if (!(await attachStaffSession(response, user))) return fail(503, "Registration is temporarily unavailable.");
    await addAudit(user.email, "register", `${user.email} (${user.role})`);
    return response;
  } catch (err) {
    if (err instanceof StoreUnavailableError) return fail(503, err.message);
    console.error("POST /api/staff/register error:", err);
    return fail(500, "Something went wrong. Try again.");
  }
}
