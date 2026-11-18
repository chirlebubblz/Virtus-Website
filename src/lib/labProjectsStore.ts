import { getNeonSql, isNeonConfigured } from "@/lib/neon";

export type LabProjectStatus = "draft" | "pending_approval" | "approved" | "rejected";

export const LAB_PROJECT_PILLARS = [
  "Brand & Creative",
  "Web & Digital",
  "Content & Video",
  "AI & Automation",
] as const;

export type LabProjectPillar = (typeof LAB_PROJECT_PILLARS)[number];

export interface LabProject {
  id: string;
  title: string;
  pillar: LabProjectPillar;
  summary: string;
  liveUrl: string | null;
  coverUrl?: string | null;
  status: LabProjectStatus;
  submittedBy: string | null;
  submittedByName: string | null;
  reviewedBy: string | null;
  reviewedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

type NeonSql = NonNullable<ReturnType<typeof getNeonSql>>;

interface LocalLabProjectsStore {
  projects: LabProject[];
}

const globalForLabProjects = globalThis as unknown as {
  __labProjectsStore?: LocalLabProjectsStore;
  __labProjectsSchemaReady?: boolean;
};

const localStore: LocalLabProjectsStore =
  globalForLabProjects.__labProjectsStore ??
  (globalForLabProjects.__labProjectsStore = {
    projects: [],
  });

const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());

function normalizePillarValue(value: unknown): LabProjectPillar {
  const raw = typeof value === "string" ? value.trim() : "";
  const match = LAB_PROJECT_PILLARS.find((p) => p === raw);
  return match ?? "Web & Digital";
}

function normalizeStatusValue(value: unknown): LabProjectStatus {
  switch (value) {
    case "draft":
    case "pending_approval":
    case "approved":
    case "rejected":
      return value;
    default:
      return "draft";
  }
}

function rowToLabProject(row: Record<string, unknown>): LabProject {
  return {
    id: String(row.id),
    title: String(row.title),
    pillar: normalizePillarValue(row.pillar),
    summary: String(row.summary),
    liveUrl: row.live_url ? String(row.live_url) : null,
    coverUrl: row.cover_url ? String(row.cover_url) : null,
    status: normalizeStatusValue(row.status),
    submittedBy: row.submitted_by ? String(row.submitted_by) : null,
    submittedByName: row.submitted_by_name ? String(row.submitted_by_name) : null,
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedByName: row.reviewed_by_name ? String(row.reviewed_by_name) : null,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

/**
 * Ensures the lab_projects table exists in Neon Postgres.
 * Safe to call repeatedly; cached in-memory per process.
 */
export async function ensureLabProjectsTable(sqlArg?: NeonSql): Promise<boolean> {
  if (!isNeonConfigured()) return false;
  const sql = sqlArg ?? getNeonSql();
  if (!sql) return false;

  if (globalForLabProjects.__labProjectsSchemaReady) return true;

  await sql`
    CREATE TABLE IF NOT EXISTS lab_projects (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      pillar VARCHAR(80) NOT NULL,
      summary TEXT NOT NULL,
      live_url TEXT,
      cover_url TEXT,
      status VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected')),
      submitted_by VARCHAR(120),
      reviewed_by VARCHAR(120),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS cover_url TEXT;`;
  await sql`ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS submitted_by_name VARCHAR(120);`;
  await sql`ALTER TABLE lab_projects ADD COLUMN IF NOT EXISTS reviewed_by_name VARCHAR(120);`;
  await sql`CREATE INDEX IF NOT EXISTS lab_projects_status_idx ON lab_projects (status);`;
  await sql`CREATE INDEX IF NOT EXISTS lab_projects_submitted_by_idx ON lab_projects (submitted_by);`;

  globalForLabProjects.__labProjectsSchemaReady = true;
  return true;
}

async function getReadySql(): Promise<NeonSql | null> {
  if (!isNeonConfigured()) return null;
  const sql = getNeonSql();
  if (!sql) return null;
  await ensureLabProjectsTable(sql);
  return sql;
}

export interface ListLabProjectsOptions {
  status?: LabProjectStatus;
  submittedBy?: string;
  /** Returns approved projects plus any project submitted by this user id. */
  approvedOrSubmittedBy?: string;
}

export async function listLabProjects(options: ListLabProjectsOptions = {}): Promise<LabProject[]> {
  const sql = await getReadySql();
  if (sql) {
    let rows: Record<string, unknown>[];
    if (options.approvedOrSubmittedBy) {
      rows = (await sql`
        SELECT * FROM lab_projects
        WHERE status = 'approved' OR submitted_by = ${options.approvedOrSubmittedBy}
        ORDER BY updated_at DESC, created_at DESC;
      `) as Record<string, unknown>[];
    } else if (options.status && options.submittedBy) {
      rows = (await sql`
        SELECT * FROM lab_projects
        WHERE status = ${options.status} AND submitted_by = ${options.submittedBy}
        ORDER BY updated_at DESC, created_at DESC;
      `) as Record<string, unknown>[];
    } else if (options.status) {
      rows = (await sql`
        SELECT * FROM lab_projects
        WHERE status = ${options.status}
        ORDER BY updated_at DESC, created_at DESC;
      `) as Record<string, unknown>[];
    } else if (options.submittedBy) {
      rows = (await sql`
        SELECT * FROM lab_projects
        WHERE submitted_by = ${options.submittedBy}
        ORDER BY updated_at DESC, created_at DESC;
      `) as Record<string, unknown>[];
    } else {
      rows = (await sql`
        SELECT * FROM lab_projects
        ORDER BY updated_at DESC, created_at DESC;
      `) as Record<string, unknown>[];
    }
    return rows.map(rowToLabProject);
  }

  let items = [...localStore.projects];
  if (options.approvedOrSubmittedBy) {
    items = items.filter(
      (p) => p.status === "approved" || p.submittedBy === options.approvedOrSubmittedBy
    );
  } else {
    if (options.status) {
      items = items.filter((p) => p.status === options.status);
    }
    if (options.submittedBy) {
      items = items.filter((p) => p.submittedBy === options.submittedBy);
    }
  }
  return items
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((p) => ({ ...p }));
}

export async function getLabProjectById(id: string): Promise<LabProject | null> {
  const sql = await getReadySql();
  if (sql) {
    const rows = (await sql`
      SELECT * FROM lab_projects WHERE id = ${id} LIMIT 1;
    `) as Record<string, unknown>[];
    return rows.length > 0 ? rowToLabProject(rows[0]) : null;
  }

  const found = localStore.projects.find((p) => p.id === id);
  return found ? { ...found } : null;
}

export interface CreateLabProjectInput {
  title: string;
  pillar: LabProjectPillar;
  summary: string;
  liveUrl?: string | null;
  coverUrl?: string | null;
  status: LabProjectStatus;
  submittedBy: string;
  submittedByName?: string | null;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
}

export async function createLabProject(input: CreateLabProjectInput): Promise<LabProject> {
  const id = `lab-${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const liveUrl = input.liveUrl ?? null;
  const coverUrl = input.coverUrl ?? null;
  const submittedByName = input.submittedByName ?? null;
  const reviewedBy = input.reviewedBy ?? null;
  const reviewedByName = input.reviewedByName ?? null;

  const sql = await getReadySql();
  if (sql) {
    const rows = (await sql`
      INSERT INTO lab_projects (
        id, title, pillar, summary, live_url, cover_url, status,
        submitted_by, submitted_by_name, reviewed_by, reviewed_by_name,
        created_at, updated_at
      )
      VALUES (
        ${id}, ${input.title}, ${input.pillar}, ${input.summary}, ${liveUrl}, ${coverUrl}, ${input.status},
        ${input.submittedBy}, ${submittedByName}, ${reviewedBy}, ${reviewedByName},
        NOW(), NOW()
      )
      RETURNING *;
    `) as Record<string, unknown>[];
    return rowToLabProject(rows[0]);
  }

  const now = new Date().toISOString();
  const created: LabProject = {
    id,
    title: input.title,
    pillar: input.pillar,
    summary: input.summary,
    liveUrl,
    coverUrl,
    status: input.status,
    submittedBy: input.submittedBy,
    submittedByName,
    reviewedBy,
    reviewedByName,
    createdAt: now,
    updatedAt: now,
  };
  localStore.projects.unshift(created);
  return { ...created };
}

export interface UpdateLabProjectInput {
  title?: string;
  pillar?: LabProjectPillar;
  summary?: string;
  liveUrl?: string | null;
  coverUrl?: string | null;
  status?: LabProjectStatus;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
}

export async function updateLabProject(
  id: string,
  patch: UpdateLabProjectInput
): Promise<LabProject | null> {
  const existing = await getLabProjectById(id);
  if (!existing) return null;

  const nextTitle = patch.title !== undefined ? patch.title : existing.title;
  const nextPillar = patch.pillar !== undefined ? patch.pillar : existing.pillar;
  const nextSummary = patch.summary !== undefined ? patch.summary : existing.summary;
  const nextLiveUrl = patch.liveUrl !== undefined ? patch.liveUrl : existing.liveUrl;
  const nextCoverUrl = patch.coverUrl !== undefined ? patch.coverUrl : (existing.coverUrl ?? null);
  const nextStatus = patch.status !== undefined ? patch.status : existing.status;
  const nextReviewedBy = patch.reviewedBy !== undefined ? patch.reviewedBy : existing.reviewedBy;
  const nextReviewedByName =
    patch.reviewedByName !== undefined ? patch.reviewedByName : existing.reviewedByName;

  const sql = await getReadySql();
  if (sql) {
    const rows = (await sql`
      UPDATE lab_projects
      SET
        title = ${nextTitle},
        pillar = ${nextPillar},
        summary = ${nextSummary},
        live_url = ${nextLiveUrl},
        cover_url = ${nextCoverUrl},
        status = ${nextStatus},
        reviewed_by = ${nextReviewedBy},
        reviewed_by_name = ${nextReviewedByName},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *;
    `) as Record<string, unknown>[];
    return rows.length > 0 ? rowToLabProject(rows[0]) : null;
  }

  const index = localStore.projects.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const updated: LabProject = {
    ...localStore.projects[index],
    title: nextTitle,
    pillar: nextPillar,
    summary: nextSummary,
    liveUrl: nextLiveUrl,
    coverUrl: nextCoverUrl,
    status: nextStatus,
    reviewedBy: nextReviewedBy,
    reviewedByName: nextReviewedByName,
    updatedAt: new Date().toISOString(),
  };
  localStore.projects[index] = updated;
  return { ...updated };
}

export async function deleteLabProject(id: string): Promise<boolean> {
  const sql = await getReadySql();
  if (sql) {
    const rows = (await sql`
      DELETE FROM lab_projects WHERE id = ${id} RETURNING id;
    `) as Record<string, unknown>[];
    return rows.length > 0;
  }

  const index = localStore.projects.findIndex((p) => p.id === id);
  if (index === -1) return false;
  localStore.projects.splice(index, 1);
  return true;
}
