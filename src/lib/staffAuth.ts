// Staff password hashing, registration rules and server-side session guards. Node runtime only.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  STAFF_COOKIE,
  safeEqual,
  sessionCookieOptions,
  signSession,
  verifySession,
  type SessionRole,
} from "@/lib/session";
import { getStaffById, type StaffRole, type StaffUser } from "@/lib/staffStore";
import { hashToken } from "@/lib/tokens";
import { getAllowedEmailDomains, getSettings, verifySecretSalted } from "@/lib/settingsStore";

const PBKDF2_ITERATIONS = 210_000;
const enc = new TextEncoder();

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex: string): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
};

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await globalThis.crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
  );
  return new Uint8Array(bits);
}

/** Stored as `pbkdf2$iterations$salt$hash` (hex). */
export async function hashPassword(password: string): Promise<string> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterations || !salt || !hash) return false;
  const actual = toHex(await derive(password, fromHex(salt), Number(iterations)));
  return safeEqual(actual, hash);
}

/** A hash to compare against when the account does not exist, so login timing does not reveal accounts. */
let dummyHash: Promise<string> | null = null;
export function dummyPasswordHash(): Promise<string> {
  return (dummyHash ??= hashPassword("not-a-real-password-for-timing"));
}

// ---- registration rules ----

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Allowed sign-up domains: the Settings value when saved, otherwise STAFF_EMAIL_DOMAINS, otherwise Gmail. */
export const allowedEmailDomains = getAllowedEmailDomains;

/** Lowercases, and for Gmail removes dots and +tags so one mailbox cannot register twice. Null if invalid. */
export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim().toLowerCase();
  if (value.length > 254 || !EMAIL_PATTERN.test(value)) return null;
  let [local, domain] = value.split("@");
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.split("+")[0].replace(/\./g, "");
    domain = "gmail.com";
    if (!local) return null;
  }
  return `${local}@${domain}`;
}

export function isAllowedEmail(email: string, allowed: string[]): boolean {
  if (allowed.length === 0 || allowed.includes("*")) return true;
  const domain = email.split("@")[1];
  return allowed.includes(domain) || (domain === "gmail.com" && allowed.includes("googlemail.com"));
}

export function validateName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const name = input.trim().replace(/\s+/g, " ");
  return name.length >= 2 && name.length <= 40 ? name : null;
}

/** Returns an error message, or null when the password is acceptable. */
export function passwordProblem(password: unknown, email: string, name: string): string | null {
  if (typeof password !== "string") return "Enter a password.";
  if (password.length < 12) return "Use at least 12 characters.";
  if (password.length > 128) return "Use at most 128 characters.";
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (classes < 2) return "Mix at least two of: lowercase, uppercase, numbers, symbols.";
  const lower = password.toLowerCase();
  if (lower.includes(email.split("@")[0]) && email.split("@")[0].length >= 4) return "Do not include your email in the password.";
  if (name.length >= 4 && lower.replace(/\s/g, "").includes(name.toLowerCase().replace(/\s/g, ""))) {
    return "Do not include your name in the password.";
  }
  return null;
}

/** Resolves an environment invitation code to a role, comparing every secret in constant time. */
export async function roleForInviteCode(code: unknown): Promise<StaffRole | null> {
  if (typeof code !== "string" || code.length === 0 || code.length > 200) return null;
  // A code saved in Settings (stored only as a salted hash) replaces the environment variable for that role.
  const saved = await getSettings();
  const adminCode = process.env.ADMIN_INVITE_CODE;
  const teamCode = process.env.STAFF_INVITE_CODE;
  const [isAdmin, isTeam] = await Promise.all([
    saved.inviteAdmin
      ? verifySecretSalted(code, saved.inviteAdmin.value)
      : adminCode
      ? safeEqual(code, adminCode)
      : Promise.resolve(false),
    saved.inviteTeam
      ? verifySecretSalted(code, saved.inviteTeam.value)
      : teamCode
      ? safeEqual(code, teamCode)
      : Promise.resolve(false),
  ]);
  return isAdmin ? "admin" : isTeam ? "team" : null;
}

export function newSecretToken(prefix: string): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(24));
  return `${prefix}_${toHex(bytes)}`;
}

export const hashSecret = hashToken;

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const RESET_TTL_MS = 60 * 60 * 1000;

// ---- session guards ----

export function homeFor(role: StaffRole): string {
  return role === "admin" ? "/admin" : "/team";
}

/** Signed-in staff for server components and route handlers. Rejects disabled accounts and stale sessions. */
export async function getStaff(roles: SessionRole[] = ["admin", "team"]): Promise<StaffUser | null> {
  const store = await cookies();
  const session = await verifySession(store.get(STAFF_COOKIE)?.value, roles);
  if (!session) return null;
  try {
    const user = await getStaffById(session.sub);
    if (!user || user.status !== "active" || user.sessionVersion !== session.sv || !roles.includes(user.role)) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

/** Route-handler guard: returns a 401/403 response, or null when the caller may continue. */
export async function denyUnlessStaff(roles: SessionRole[] = ["admin"]): Promise<NextResponse | null> {
  const user = await getStaff(roles);
  return user ? null : NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

/** Signs the person in by setting the staff cookie on the response. False when sessions are not configured. */
export async function attachStaffSession(response: NextResponse, user: StaffUser): Promise<boolean> {
  const session = await signSession(user.id, user.role, { sv: user.sessionVersion });
  if (!session) return false;
  response.cookies.set(STAFF_COOKIE, session, sessionCookieOptions());
  return true;
}
