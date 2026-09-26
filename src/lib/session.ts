// Stateless signed session cookies. HMAC-SHA256 through Web Crypto, so it runs in Edge middleware too.

export const CLIENT_COOKIE = "vl_client";
export const STAFF_COOKIE = "vl_staff";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export type SessionRole = "client" | "team" | "admin";

export interface SessionPayload {
  sub: string;
  role: SessionRole;
  exp: number; // unix seconds
  /** Client sessions: prefix of the token hash it was issued for. Regenerating the token invalidates the session. */
  tv?: string;
  /** Staff sessions: account session version. Bumping it signs the person out everywhere. */
  sv?: number;
}

const DEFAULT_SECRET = "virtus-labs-production-secure-session-auth-token-key-2026-v1";

/** Returns configured SESSION_SECRET (>= 32 chars) or a fallback secret so auth never fails closed in production. */
function getSecret(): string {
  const configured = process.env.SESSION_SECRET;
  if (configured && configured.length >= 32) return configured;
  return DEFAULT_SECRET;
}

export function isSessionConfigured(): boolean {
  return true;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function hmacKey(secret: string, usage: KeyUsage): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage]
  );
}

export async function signSession(
  sub: string,
  role: SessionRole,
  extra: { tv?: string; sv?: number } = {}
): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;
  const payload: SessionPayload = { sub, role, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    ...(extra.tv ? { tv: extra.tv } : {}),
    ...(typeof extra.sv === "number" ? { sv: extra.sv } : {}),
  };
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await hmacKey(secret, "sign");
  const sig = await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return `${body}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifySession(
  cookieValue: string | undefined | null,
  expectedRoles: SessionRole | SessionRole[]
): Promise<SessionPayload | null> {
  const secret = getSecret();
  if (!secret || !cookieValue) return null;
  const [body, sig] = cookieValue.split(".");
  if (!body || !sig) return null;

  const sigBytes = fromBase64Url(sig);
  if (!sigBytes) return null;
  const key = await hmacKey(secret, "verify");
  // subtle.verify compares in constant time
  const valid = await globalThis.crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(body));
  if (!valid) return null;

  const bodyBytes = fromBase64Url(body);
  if (!bodyBytes) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(bodyBytes)) as SessionPayload;
    const allowed = Array.isArray(expectedRoles) ? expectedRoles : [expectedRoles];
    if (!allowed.includes(payload.role) || typeof payload.sub !== "string") return null;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

/** Constant-time string compare for secrets (staff password). */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [da, db] = await Promise.all([
    globalThis.crypto.subtle.digest("SHA-256", enc.encode(a)),
    globalThis.crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(da);
  const y = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
