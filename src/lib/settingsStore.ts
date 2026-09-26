// Runtime settings an admin can change without editing environment variables or redeploying.
//
// Scope is deliberately narrow. Anything the app needs BEFORE it can reach the database (DATABASE_URL,
// SESSION_SECRET) must stay in the environment, so those are not managed here.
//
// Invite codes are stored as salted PBKDF2 hashes, never in plain text. The app only ever compares a typed code
// against the hash, so the stored value cannot be read back. Base64 is used only to write the random salt and the
// derived hash as text. It is not the protection. The hash and the salt are.
import { getNeonSql, isNeonConfigured } from "@/lib/neon";
import { safeEqual } from "@/lib/session";

export class SettingsUnavailableError extends Error {
  constructor(message = "Settings need a database.") {
    super(message);
  }
}

export interface StoredSecret {
  /** `pbkdf2-sha256$<iterations>$<salt base64>$<hash base64>` */
  value: string;
  updatedAt: string;
  updatedBy: string;
}

export interface AppSettings {
  inviteTeam?: StoredSecret;
  inviteAdmin?: StoredSecret;
  emailDomains?: { value: string[]; updatedAt: string; updatedBy: string };
  demoAccess?: { value: boolean; updatedAt: string; updatedBy: string };
}

export type SettingKey = keyof AppSettings;

const ITERATIONS = 210_000;
const enc = new TextEncoder();

// ---- base64 helpers (standard alphabet, padded) ----

export const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array<ArrayBuffer> | null => {
  try {
    const binary = atob(value);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
};

async function derive(secret: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await globalThis.crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(
    await globalThis.crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256)
  );
}

/** Hashes a secret with a fresh random 16 byte salt. */
export async function hashSecretSalted(secret: string): Promise<string> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(secret, salt, ITERATIONS);
  return `pbkdf2-sha256$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

/** Constant-time check of a typed secret against a stored hash. */
export async function verifySecretSalted(secret: string, stored: string): Promise<boolean> {
  const [scheme, iterations, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2-sha256" || !iterations || !salt || !hash) return false;
  const saltBytes = fromBase64(salt);
  if (!saltBytes) return false;
  const actual = toBase64(await derive(secret, saltBytes, Number(iterations)));
  return safeEqual(actual, hash);
}

/** A random invite code: 18 random bytes as base64url, so 24 URL-safe characters (144 bits). */
export function generateInviteCode(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(18));
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ---- storage ----

interface Cache {
  value: AppSettings;
  at: number;
}

/** How long settings are reused before the database is read again. A save clears it on this instance at once. */
export const SETTINGS_CACHE_TTL_MS = 60_000;

const g = globalThis as unknown as {
  __settingsLocal?: Map<string, unknown>;
  __settingsCache?: Cache | null;
  __settingsSchemaReady?: boolean;
  __settingsLoading?: Promise<AppSettings> | null;
};
const localStore = g.__settingsLocal ?? (g.__settingsLocal = new Map<string, unknown>());

async function backend() {
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (!sql) throw new SettingsUnavailableError();
    if (!g.__settingsSchemaReady) {
      await sql`
        CREATE TABLE IF NOT EXISTS app_settings (
          key VARCHAR(64) PRIMARY KEY,
          value JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );`;
      g.__settingsSchemaReady = true;
    }
    return sql;
  }
  if (process.env.NODE_ENV === "production") throw new SettingsUnavailableError();
  return null;
}

export function invalidateSettings(): void {
  g.__settingsCache = null;
  g.__settingsLoading = null;
}

async function load(): Promise<AppSettings> {
  const sql = await backend();
  if (!sql) return Object.fromEntries(localStore) as AppSettings;
  const rows = await sql`SELECT key, value FROM app_settings`;
  return Object.fromEntries(rows.map((r) => [r.key as string, r.value])) as AppSettings;
}

/**
 * Cached read. Within the TTL this costs nothing, so requests never hit the database just to check settings.
 * Concurrent callers share one in-flight read. Errors are not cached.
 */
export async function getSettings(): Promise<AppSettings> {
  const cached = g.__settingsCache;
  if (cached && Date.now() - cached.at < SETTINGS_CACHE_TTL_MS) return cached.value;
  if (g.__settingsLoading) return g.__settingsLoading;
  const pending = load()
    .then((value) => {
      g.__settingsCache = { value, at: Date.now() };
      return value;
    })
    .finally(() => {
      g.__settingsLoading = null;
    });
  g.__settingsLoading = pending;
  return pending;
}

export async function saveSetting<K extends SettingKey>(key: K, value: NonNullable<AppSettings[K]>): Promise<void> {
  const sql = await backend();
  if (!sql) localStore.set(key, value);
  else {
    await sql`
      INSERT INTO app_settings (key, value, updated_at) VALUES (${key}, ${JSON.stringify(value)}::jsonb, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
  }
  invalidateSettings();
}

export async function removeSetting(key: SettingKey): Promise<void> {
  const sql = await backend();
  if (!sql) localStore.delete(key);
  else await sql`DELETE FROM app_settings WHERE key = ${key}`;
  invalidateSettings();
}

// ---- resolved values: a saved setting wins, the environment is the fallback ----

const DEFAULT_DOMAINS = "*";

export const parseDomains = (raw: string): string[] =>
  raw.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);

export async function getAllowedEmailDomains(): Promise<string[]> {
  const saved = (await getSettings()).emailDomains?.value;
  return saved && saved.length > 0 ? saved : parseDomains(process.env.STAFF_EMAIL_DOMAINS || DEFAULT_DOMAINS);
}

/** Whether the seeded demo clients may sign in when the app runs in production. */
export async function getDemoAccess(): Promise<boolean> {
  try {
    const saved = (await getSettings()).demoAccess?.value;
    if (typeof saved === "boolean") return saved;
  } catch {
    // Fall through to the environment. Client auth needs the database anyway and fails on its own.
  }
  return process.env.ALLOW_DEMO_ACCESS === "true";
}
