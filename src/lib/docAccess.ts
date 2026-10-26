import { ensureShareTokenColumns, getNeonSql, isNeonConfigured } from "@/lib/neon";
import {
  hashShareToken,
  isShareToken,
  issueShareToken,
  isSingleUse,
  shareTtlDays,
  shareUrl,
  type IssuedShareToken,
  type ShareKind,
} from "@/lib/shareTokens";

type Sql = NonNullable<ReturnType<typeof getNeonSql>>;

/** Why a share link was refused. The public routes turn these into their own wording. */
export type ShareState = "ok" | "invalid" | "missing" | "used" | "expired";

function neonSql(): Sql | null {
  return isNeonConfigured() ? getNeonSql() : null;
}

/** Never interpolated from request input: `kind` only ever selects one of three literals. */
function tableFor(kind: ShareKind): "contracts" | "proposals" | "invoices" {
  switch (kind) {
    case "contract":
      return "contracts";
    case "proposal":
      return "proposals";
    case "invoice":
      return "invoices";
  }
}

/** Dev-only mirror, same module-level pattern as the other local stores. Neon is the source of truth. */
interface LocalShareToken {
  hash: string;
  expiresAt: string;
  usedAt?: string;
}
const g = globalThis as unknown as { __shareTokens?: Map<string, LocalShareToken> };
const localTokens = g.__shareTokens ?? (g.__shareTokens = new Map());

function localKey(kind: ShareKind, id: string): string {
  return `${kind}:${id}`;
}

function classify(expiresAt: unknown, usedAt: unknown, now = Date.now()): ShareState {
  if (usedAt) return "used";
  const expiry = expiresAt ? new Date(String(expiresAt)).getTime() : Number.NaN;
  if (Number.isNaN(expiry)) return "missing";
  return expiry > now ? "ok" : "expired";
}

/** Viewing stays open after the decision, so the signer can still open their signed copy on the same link. */
export function canViewShare(state: ShareState): boolean {
  return state === "ok" || state === "used";
}

/** One message for every refusal so a caller cannot probe which part of the link was wrong. */
export function shareRefusal(state: ShareState, document: string): string {
  switch (state) {
    case "expired":
      return `This ${document} link has expired. Ask your Virtus contact for a new one.`;
    case "used":
      return `This ${document} link has already been used. Ask your Virtus contact for a new one.`;
    default:
      return `This ${document} link is not valid. Open the link from the email your Virtus contact sent.`;
  }
}

/** Checks a share token without spending it, so a page load does not consume the single-use signing token. */
export async function authorizeShare(kind: ShareKind, id: string, token: unknown): Promise<ShareState> {
  if (!id || !isShareToken(token)) return "invalid";
  const hash = await hashShareToken(token);
  const sql = neonSql();

  if (sql) {
    try {
      const rows = await sql`
        SELECT share_token_expires_at AS "expiresAt", share_token_used_at AS "usedAt"
        FROM ${sql.unsafe(tableFor(kind))}
        WHERE id = ${id} AND share_token_hash = ${hash} LIMIT 1`;
      const row = rows[0];
      if (!row) return "invalid";
      return classify(row.expiresAt, row.usedAt);
    } catch (err) {
      // Fail closed. A transient database error must never read as an authorised document.
      console.error(`Neon share token lookup failed (${kind}/${id}):`, err);
      return "invalid";
    }
  }

  const entry = localTokens.get(localKey(kind, id));
  if (!entry || entry.hash !== hash) return "invalid";
  return classify(entry.expiresAt, entry.usedAt);
}

/**
 * Spends a single-use share token. The Neon path is one conditional UPDATE, so two racing requests cannot both
 * win. Returns false when the token is missing, wrong, expired or already spent.
 */
export async function consumeShare(kind: ShareKind, id: string, token: unknown): Promise<boolean> {
  if (!isSingleUse(kind)) return (await authorizeShare(kind, id, token)) === "ok";
  if (!id || !isShareToken(token)) return false;
  const hash = await hashShareToken(token);
  const sql = neonSql();

  if (sql) {
    try {
      const rows = await sql`
        UPDATE ${sql.unsafe(tableFor(kind))}
        SET share_token_used_at = NOW()
        WHERE id = ${id}
          AND share_token_hash = ${hash}
          AND share_token_used_at IS NULL
          AND (share_token_expires_at IS NULL OR share_token_expires_at > NOW())
        RETURNING id`;
      return rows.length > 0;
    } catch (err) {
      console.error(`Neon share token consume failed (${kind}/${id}):`, err);
      return false;
    }
  }

  const key = localKey(kind, id);
  const entry = localTokens.get(key);
  if (!entry || entry.hash !== hash || classify(entry.expiresAt, entry.usedAt) !== "ok") return false;
  entry.usedAt = new Date().toISOString();
  return true;
}

/**
 * Staff-only. Issues a fresh link, invalidating any previous one. Returns the plaintext exactly once.
 * `exists` is only consulted on the local dev store, where there is no single table to check rows against.
 */
export async function issueShare(
  kind: ShareKind,
  id: string,
  exists?: () => boolean
): Promise<IssuedShareToken | null> {
  if (!id) return null;
  const issued = await issueShareToken(shareTtlDays(kind));
  const sql = neonSql();

  if (sql) {
    try {
      await ensureShareTokenColumns(sql);
      const rows = await sql`
        UPDATE ${sql.unsafe(tableFor(kind))}
        SET share_token_hash = ${issued.hash},
            share_token_last4 = ${issued.last4},
            share_token_expires_at = ${issued.expiresAt},
            share_token_used_at = NULL
        WHERE id = ${id} RETURNING id`;
      if (rows.length === 0) return null;
    } catch (err) {
      // Never hand back a link that was not stored.
      console.error(`Neon share token issue failed (${kind}/${id}):`, err);
      throw new Error("Could not create the share link. Please try again.");
    }
  } else if (exists && !exists()) {
    return null;
  }

  localTokens.set(localKey(kind, id), { hash: issued.hash, expiresAt: issued.expiresAt });
  return issued;
}

/** Staff-only. Builds the link for the clipboard. The token is never persisted in plaintext anywhere. */
export async function createShareLink(
  kind: ShareKind,
  id: string,
  origin: string,
  exists?: () => boolean
): Promise<{ url: string; expiresAt: string } | null> {
  const issued = await issueShare(kind, id, exists);
  if (!issued) return null;
  return { url: `${origin}${shareUrl(kind, id, issued.token)}`, expiresAt: issued.expiresAt };
}

/** Staff-only. Kills the current link without touching the document. */
export async function revokeShare(kind: ShareKind, id: string): Promise<void> {
  const sql = neonSql();
  if (sql) {
    try {
      await sql`
        UPDATE ${sql.unsafe(tableFor(kind))}
        SET share_token_hash = NULL, share_token_expires_at = NULL
        WHERE id = ${id}`;
    } catch (err) {
      console.error(`Neon share token revoke failed (${kind}/${id}):`, err);
    }
  }
  localTokens.delete(localKey(kind, id));
}
