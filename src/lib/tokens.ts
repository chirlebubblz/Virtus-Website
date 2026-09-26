// Client access token helpers. Web Crypto only, so this is safe in the browser, Node and Edge.

export const PORTAL_TOKEN_PATTERN = /^clitk_[a-f0-9]{24}$/;
export const PORTAL_TOKEN_TTL_DAYS = 30;

export function generatePortalToken(): string {
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  return "clitk_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 hex digest. Tokens carry 96 bits of entropy, so an unsalted hash is sufficient at rest. */
export async function hashToken(token: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function tokenLast4(token: string): string {
  return token.slice(-4);
}

export function newTokenExpiry(from: Date = new Date()): string {
  return new Date(from.getTime() + PORTAL_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export interface IssuedToken {
  token: string;
  hash: string;
  last4: string;
  expiresAt: string;
}

/** Creates a fresh token. The plaintext must be shown once and never stored. */
export async function issuePortalToken(): Promise<IssuedToken> {
  const token = generatePortalToken();
  return { token, hash: await hashToken(token), last4: tokenLast4(token), expiresAt: newTokenExpiry() };
}
