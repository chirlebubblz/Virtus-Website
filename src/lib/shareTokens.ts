// Share tokens for the public document pages (proposals, contracts, invoices). A share link carries one of
// these so that knowing a record id is not enough to read, sign or accept a document.

export const SHARE_TOKEN_PATTERN = /^vt_sht_[a-f0-9]{32}$/;
export const SHARE_TOKEN_TTL_DAYS = 30;
export const SHARE_TOKEN_INVOICE_TTL_DAYS = 90;

/** 128 bits of CSPRNG entropy. Guessing one is not feasible, so the hash can be stored unsalted. */
export function generateShareToken(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return "vt_sht_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function isShareToken(value: unknown): value is string {
  return typeof value === "string" && SHARE_TOKEN_PATTERN.test(value);
}

export async function hashShareToken(token: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface IssuedShareToken {
  token: string;
  hash: string;
  last4: string;
  expiresAt: string;
}

/** Creates a fresh token. Only the hash is persisted; the plaintext is returned once to be emailed or copied. */
export async function issueShareToken(ttlDays: number = SHARE_TOKEN_TTL_DAYS): Promise<IssuedShareToken> {
  const token = generateShareToken();
  return {
    token,
    hash: await hashShareToken(token),
    last4: token.slice(-4),
    expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export type ShareKind = "contract" | "proposal" | "invoice";

/** Contracts and proposals are signed once, so their token is consumed by the decision. An invoice stays readable. */
export function isSingleUse(kind: ShareKind): boolean {
  return kind !== "invoice";
}

export function shareTtlDays(kind: ShareKind): number {
  return kind === "invoice" ? SHARE_TOKEN_INVOICE_TTL_DAYS : SHARE_TOKEN_TTL_DAYS;
}

/** Public page path for a document, so staff and the email templates build the same URL. */
export function sharePath(kind: ShareKind, id: string): string {
  const base = kind === "contract" ? "/sign" : kind === "proposal" ? "/proposals" : "/invoices";
  return `${base}/${encodeURIComponent(id)}`;
}

export function shareUrl(kind: ShareKind, id: string, token: string): string {
  return `${sharePath(kind, id)}?token=${encodeURIComponent(token)}`;
}
