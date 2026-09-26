// Staff accounts, invites, reset tokens and audit log.
// Neon when DATABASE_URL is set, otherwise an in-memory store for local development only.
import { getNeonSql, isNeonConfigured } from "@/lib/neon";

export type StaffRole = "team" | "admin";

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: StaffRole;
  memberLabel: string | null;
  status: "active" | "disabled";
  sessionVersion: number;
  createdAt: string;
  lastLoginAt: string | null;
}

/** Staff record safe to send to the browser. */
export type StaffSummary = Omit<StaffUser, "passwordHash">;

export interface StaffInvite {
  id: string;
  tokenHash: string;
  email: string | null;
  role: StaffRole;
  createdBy: string;
  expiresAt: string;
  usedAt: string | null;
}

export interface StaffResetToken {
  id: string;
  staffId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
}

export interface StaffAuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
}

export class StoreUnavailableError extends Error {
  constructor(message = "Staff accounts need a database.") {
    super(message);
  }
}

interface LocalStore {
  users: StaffUser[];
  invites: StaffInvite[];
  resets: StaffResetToken[];
  audit: StaffAuditEntry[];
}

const globalForStaff = globalThis as unknown as { __staffStore?: LocalStore; __staffSchemaReady?: boolean };
const local: LocalStore =
  globalForStaff.__staffStore ?? (globalForStaff.__staffStore = { users: [], invites: [], resets: [], audit: [] });

const newId = (prefix: string) => `${prefix}-${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
const iso = (v: unknown): string | null => (v ? new Date(v as string).toISOString() : null);

export function toSummary(user: StaffUser): StaffSummary {
  const { passwordHash: _hash, ...rest } = user;
  return rest;
}

/** Returns a Neon client, null for the local dev store, or throws when production has no database. */
async function backend() {
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (!sql) throw new StoreUnavailableError();
    if (!globalForStaff.__staffSchemaReady) {
      await sql`
        CREATE TABLE IF NOT EXISTS staff_users (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role VARCHAR(16) NOT NULL,
          member_label VARCHAR(120),
          status VARCHAR(16) NOT NULL DEFAULT 'active',
          session_version INT NOT NULL DEFAULT 1,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          last_login_at TIMESTAMPTZ
        );`;
      await sql`
        CREATE TABLE IF NOT EXISTS staff_invites (
          id VARCHAR(64) PRIMARY KEY,
          token_hash VARCHAR(64) NOT NULL UNIQUE,
          email VARCHAR(255),
          role VARCHAR(16) NOT NULL,
          created_by VARCHAR(64) NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ
        );`;
      await sql`
        CREATE TABLE IF NOT EXISTS staff_resets (
          id VARCHAR(64) PRIMARY KEY,
          staff_id VARCHAR(64) NOT NULL,
          token_hash VARCHAR(64) NOT NULL UNIQUE,
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ
        );`;
      await sql`
        CREATE TABLE IF NOT EXISTS staff_audit (
          id VARCHAR(64) PRIMARY KEY,
          actor VARCHAR(255) NOT NULL,
          action VARCHAR(64) NOT NULL,
          target VARCHAR(255) NOT NULL,
          at TIMESTAMPTZ DEFAULT NOW()
        );`;
      globalForStaff.__staffSchemaReady = true;
    }
    return sql;
  }
  if (process.env.NODE_ENV === "production") throw new StoreUnavailableError();
  return null;
}

function rowToUser(r: Record<string, unknown>): StaffUser {
  return {
    id: r.id as string,
    name: r.name as string,
    email: r.email as string,
    passwordHash: r.passwordHash as string,
    role: r.role as StaffRole,
    memberLabel: (r.memberLabel as string | null) ?? null,
    status: r.status as "active" | "disabled",
    sessionVersion: Number(r.sessionVersion),
    createdAt: iso(r.createdAt) ?? "",
    lastLoginAt: iso(r.lastLoginAt),
  };
}

// The tagged-template client cannot take dynamic column lists, so reads use fixed queries.
async function selectUsers(where: "email" | "id" | "all", value?: string): Promise<StaffUser[]> {
  const sql = await backend();
  if (!sql) {
    if (where === "email") return local.users.filter((u) => u.email === value);
    if (where === "id") return local.users.filter((u) => u.id === value);
    return [...local.users];
  }
  const rows =
    where === "email"
      ? await sql`SELECT id, name, email, password_hash AS "passwordHash", role, member_label AS "memberLabel", status, session_version AS "sessionVersion", created_at AS "createdAt", last_login_at AS "lastLoginAt" FROM staff_users WHERE email = ${value} LIMIT 1`
      : where === "id"
      ? await sql`SELECT id, name, email, password_hash AS "passwordHash", role, member_label AS "memberLabel", status, session_version AS "sessionVersion", created_at AS "createdAt", last_login_at AS "lastLoginAt" FROM staff_users WHERE id = ${value} LIMIT 1`
      : await sql`SELECT id, name, email, password_hash AS "passwordHash", role, member_label AS "memberLabel", status, session_version AS "sessionVersion", created_at AS "createdAt", last_login_at AS "lastLoginAt" FROM staff_users ORDER BY created_at ASC`;
  return rows.map(rowToUser);
}
export async function getStaffByEmail(email: string): Promise<StaffUser | null> {
  return (await selectUsers("email", email))[0] ?? null;
}

export async function getStaffById(id: string): Promise<StaffUser | null> {
  return (await selectUsers("id", id))[0] ?? null;
}

export async function listStaff(): Promise<StaffUser[]> {
  return selectUsers("all");
}

export async function countActiveAdmins(): Promise<number> {
  return (await listStaff()).filter((u) => u.role === "admin" && u.status === "active").length;
}

/** Returns null when the email is already registered. */
export async function createStaff(input: {
  name: string;
  email: string;
  passwordHash: string;
  role: StaffRole;
  memberLabel?: string | null;
}): Promise<StaffUser | null> {
  const sql = await backend();
  const user: StaffUser = {
    id: newId("stf"),
    name: input.name,
    email: input.email,
    passwordHash: input.passwordHash,
    role: input.role,
    memberLabel: input.memberLabel ?? null,
    status: "active",
    sessionVersion: 1,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  };
  if (!sql) {
    if (local.users.some((u) => u.email === user.email)) return null;
    local.users.push(user);
    return user;
  }
  const rows = await sql`
    INSERT INTO staff_users (id, name, email, password_hash, role, member_label, status, session_version)
    VALUES (${user.id}, ${user.name}, ${user.email}, ${user.passwordHash}, ${user.role}, ${user.memberLabel}, 'active', 1)
    ON CONFLICT (email) DO NOTHING RETURNING id`;
  return rows.length > 0 ? user : null;
}

export interface StaffPatch {
  passwordHash?: string;
  role?: StaffRole;
  status?: "active" | "disabled";
  memberLabel?: string | null;
  bumpSession?: boolean;
  touchLogin?: boolean;
}

export async function updateStaff(id: string, patch: StaffPatch): Promise<StaffUser | null> {
  const current = await getStaffById(id);
  if (!current) return null;
  const next: StaffUser = {
    ...current,
    passwordHash: patch.passwordHash ?? current.passwordHash,
    role: patch.role ?? current.role,
    status: patch.status ?? current.status,
    memberLabel: patch.memberLabel === undefined ? current.memberLabel : patch.memberLabel,
    sessionVersion: current.sessionVersion + (patch.bumpSession ? 1 : 0),
    lastLoginAt: patch.touchLogin ? new Date().toISOString() : current.lastLoginAt,
  };
  const sql = await backend();
  if (!sql) {
    const index = local.users.findIndex((u) => u.id === id);
    local.users[index] = next;
    return next;
  }
  await sql`
    UPDATE staff_users SET password_hash = ${next.passwordHash}, role = ${next.role}, status = ${next.status},
      member_label = ${next.memberLabel}, session_version = ${next.sessionVersion}, last_login_at = ${next.lastLoginAt}
    WHERE id = ${id}`;
  return next;
}

// ---- invites ----

export async function createInvite(input: {
  tokenHash: string;
  email: string | null;
  role: StaffRole;
  createdBy: string;
  expiresAt: string;
}): Promise<StaffInvite> {
  const invite: StaffInvite = { id: newId("inv"), ...input, usedAt: null };
  const sql = await backend();
  if (!sql) {
    local.invites.push(invite);
    return invite;
  }
  await sql`
    INSERT INTO staff_invites (id, token_hash, email, role, created_by, expires_at)
    VALUES (${invite.id}, ${invite.tokenHash}, ${invite.email}, ${invite.role}, ${invite.createdBy}, ${invite.expiresAt})`;
  return invite;
}

export async function findInvite(tokenHash: string): Promise<StaffInvite | null> {
  const sql = await backend();
  if (!sql) return local.invites.find((i) => i.tokenHash === tokenHash) ?? null;
  const rows = await sql`
    SELECT id, token_hash AS "tokenHash", email, role, created_by AS "createdBy", expires_at AS "expiresAt", used_at AS "usedAt"
    FROM staff_invites WHERE token_hash = ${tokenHash} LIMIT 1`;
  const r = rows[0];
  return r
    ? {
        id: r.id,
        tokenHash: r.tokenHash,
        email: r.email,
        role: r.role,
        createdBy: r.createdBy,
        expiresAt: iso(r.expiresAt) ?? "",
        usedAt: iso(r.usedAt),
      }
    : null;
}

export async function listPendingInvites(): Promise<Omit<StaffInvite, "tokenHash">[]> {
  const sql = await backend();
  const now = Date.now();
  if (!sql) {
    return local.invites
      .filter((i) => !i.usedAt && new Date(i.expiresAt).getTime() > now)
      .map(({ tokenHash: _t, ...rest }) => rest);
  }
  const rows = await sql`
    SELECT id, email, role, created_by AS "createdBy", expires_at AS "expiresAt", used_at AS "usedAt"
    FROM staff_invites WHERE used_at IS NULL AND expires_at > NOW() ORDER BY expires_at ASC`;
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    createdBy: r.createdBy,
    expiresAt: iso(r.expiresAt) ?? "",
    usedAt: null,
  }));
}

/** Atomically marks an invite as used. Returns false if it was already used. */
export async function consumeInvite(id: string): Promise<boolean> {
  const sql = await backend();
  if (!sql) {
    const invite = local.invites.find((i) => i.id === id);
    if (!invite || invite.usedAt) return false;
    invite.usedAt = new Date().toISOString();
    return true;
  }
  const rows = await sql`UPDATE staff_invites SET used_at = NOW() WHERE id = ${id} AND used_at IS NULL RETURNING id`;
  return rows.length > 0;
}

export async function restoreInvite(id: string): Promise<void> {
  const sql = await backend();
  if (!sql) {
    const invite = local.invites.find((i) => i.id === id);
    if (invite) invite.usedAt = null;
    return;
  }
  await sql`UPDATE staff_invites SET used_at = NULL WHERE id = ${id}`;
}

// ---- password resets ----

export async function createReset(input: { staffId: string; tokenHash: string; expiresAt: string }): Promise<void> {
  const reset: StaffResetToken = { id: newId("rst"), ...input, usedAt: null };
  const sql = await backend();
  if (!sql) {
    local.resets.push(reset);
    return;
  }
  await sql`
    INSERT INTO staff_resets (id, staff_id, token_hash, expires_at)
    VALUES (${reset.id}, ${reset.staffId}, ${reset.tokenHash}, ${reset.expiresAt})`;
}

/** Looks up a valid reset token without using it. Returns the staff id, or null. */
export async function peekReset(tokenHash: string): Promise<string | null> {
  const sql = await backend();
  if (!sql) {
    const reset = local.resets.find((r) => r.tokenHash === tokenHash);
    return reset && !reset.usedAt && new Date(reset.expiresAt).getTime() > Date.now() ? reset.staffId : null;
  }
  const rows = await sql`
    SELECT staff_id AS "staffId" FROM staff_resets
    WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > NOW() LIMIT 1`;
  return rows[0]?.staffId ?? null;
}

/** Atomically consumes a valid reset token and returns the staff id, or null. */
export async function consumeReset(tokenHash: string): Promise<string | null> {
  const sql = await backend();
  if (!sql) {
    const reset = local.resets.find((r) => r.tokenHash === tokenHash);
    if (!reset || reset.usedAt || new Date(reset.expiresAt).getTime() <= Date.now()) return null;
    reset.usedAt = new Date().toISOString();
    return reset.staffId;
  }
  const rows = await sql`
    UPDATE staff_resets SET used_at = NOW()
    WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > NOW() RETURNING staff_id AS "staffId"`;
  return rows[0]?.staffId ?? null;
}

// ---- audit ----

export async function addAudit(actor: string, action: string, target: string): Promise<void> {
  try {
    const sql = await backend();
    const entry: StaffAuditEntry = { id: newId("aud"), actor, action, target, at: new Date().toISOString() };
    if (!sql) {
      local.audit.unshift(entry);
      local.audit.length = Math.min(local.audit.length, 500);
      return;
    }
    await sql`INSERT INTO staff_audit (id, actor, action, target) VALUES (${entry.id}, ${actor}, ${action}, ${target})`;
  } catch (err) {
    console.warn("Staff audit write failed (non-fatal):", err);
  }
}

export async function listAudit(limit = 50): Promise<StaffAuditEntry[]> {
  const sql = await backend();
  if (!sql) return local.audit.slice(0, limit);
  const rows = await sql`SELECT id, actor, action, target, at FROM staff_audit ORDER BY at DESC LIMIT ${limit}`;
  return rows.map((r) => ({ id: r.id, actor: r.actor, action: r.action, target: r.target, at: iso(r.at) ?? "" }));
}
