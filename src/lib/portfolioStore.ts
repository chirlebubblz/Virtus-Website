import { getNeonSql, isNeonConfigured } from "@/lib/neon";

export interface TeamPortfolio {
  id: number;
  staffId: string;
  subdomain: string;
  title: string | null;
  entryFile: string;
  fileCount: number;
  totalSizeBytes: number;
  isActive: boolean;
  deployedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface LocalStore {
  portfolios: TeamPortfolio[];
}

const globalForPortfolio = globalThis as unknown as {
  __portfolioStore?: LocalStore;
  __portfolioSchemaReady?: boolean;
};

const local: LocalStore =
  globalForPortfolio.__portfolioStore ??
  (globalForPortfolio.__portfolioStore = {
    portfolios: [],
  });

let nextLocalId = 1;

const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());

async function getSql() {
  if (!isNeonConfigured()) return null;
  const sql = getNeonSql();
  if (!sql) return null;

  if (!globalForPortfolio.__portfolioSchemaReady) {
    await sql`
      CREATE TABLE IF NOT EXISTS team_portfolios (
        id SERIAL PRIMARY KEY,
        staff_id VARCHAR(64) NOT NULL,
        subdomain VARCHAR(64) NOT NULL UNIQUE,
        title TEXT,
        entry_file TEXT DEFAULT 'index.html',
        file_count INTEGER DEFAULT 0,
        total_size_bytes BIGINT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        deployed_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS team_portfolios_staff_id_idx ON team_portfolios (staff_id);`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS team_portfolios_subdomain_idx ON team_portfolios (subdomain);`;
    globalForPortfolio.__portfolioSchemaReady = true;
  }
  return sql;
}

function rowToPortfolio(row: Record<string, unknown>): TeamPortfolio {
  return {
    id: Number(row.id),
    staffId: String(row.staff_id),
    subdomain: String(row.subdomain),
    title: row.title ? String(row.title) : null,
    entryFile: String(row.entry_file ?? "index.html"),
    fileCount: Number(row.file_count ?? 0),
    totalSizeBytes: Number(row.total_size_bytes ?? 0),
    isActive: Boolean(row.is_active ?? true),
    deployedAt: iso(row.deployed_at),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export async function getPortfolioByStaffId(staffId: string): Promise<TeamPortfolio | null> {
  const sql = await getSql();
  if (sql) {
    const rows = await sql`
      SELECT * FROM team_portfolios
      WHERE staff_id = ${staffId}
      LIMIT 1;
    `;
    return rows.length > 0 ? rowToPortfolio(rows[0]) : null;
  }

  const p = local.portfolios.find((item) => item.staffId === staffId);
  return p ? { ...p } : null;
}

export async function getPortfolioBySubdomain(subdomain: string): Promise<TeamPortfolio | null> {
  const norm = subdomain.trim().toLowerCase();
  const sql = await getSql();
  if (sql) {
    const rows = await sql`
      SELECT * FROM team_portfolios
      WHERE LOWER(subdomain) = ${norm}
      LIMIT 1;
    `;
    return rows.length > 0 ? rowToPortfolio(rows[0]) : null;
  }

  const p = local.portfolios.find((item) => item.subdomain.toLowerCase() === norm);
  return p ? { ...p } : null;
}

export async function isSubdomainAvailable(subdomain: string, staffId: string): Promise<boolean> {
  const existing = await getPortfolioBySubdomain(subdomain);
  if (!existing) return true;
  return existing.staffId === staffId;
}

export async function upsertPortfolio(data: {
  staffId: string;
  subdomain: string;
  title?: string | null;
  entryFile?: string;
  fileCount: number;
  totalSizeBytes: number;
  isActive?: boolean;
}): Promise<TeamPortfolio> {
  const normSubdomain = data.subdomain.trim().toLowerCase();
  const entryFile = data.entryFile || "index.html";
  const isActive = data.isActive ?? true;
  const now = new Date().toISOString();

  const sql = await getSql();
  if (sql) {
    const rows = await sql`
      INSERT INTO team_portfolios (
        staff_id,
        subdomain,
        title,
        entry_file,
        file_count,
        total_size_bytes,
        is_active,
        deployed_at,
        created_at,
        updated_at
      )
      VALUES (
        ${data.staffId},
        ${normSubdomain},
        ${data.title ?? null},
        ${entryFile},
        ${data.fileCount},
        ${data.totalSizeBytes},
        ${isActive},
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (subdomain) DO UPDATE SET
        staff_id = EXCLUDED.staff_id,
        title = EXCLUDED.title,
        entry_file = EXCLUDED.entry_file,
        file_count = EXCLUDED.file_count,
        total_size_bytes = EXCLUDED.total_size_bytes,
        is_active = EXCLUDED.is_active,
        deployed_at = NOW(),
        updated_at = NOW()
      RETURNING *;
    `;
    return rowToPortfolio(rows[0]);
  }

  const index = local.portfolios.findIndex(
    (item) => item.subdomain.toLowerCase() === normSubdomain || item.staffId === data.staffId
  );

  const updated: TeamPortfolio = {
    id: index >= 0 ? local.portfolios[index].id : nextLocalId++,
    staffId: data.staffId,
    subdomain: normSubdomain,
    title: data.title ?? null,
    entryFile,
    fileCount: data.fileCount,
    totalSizeBytes: data.totalSizeBytes,
    isActive,
    deployedAt: now,
    createdAt: index >= 0 ? local.portfolios[index].createdAt : now,
    updatedAt: now,
  };

  if (index >= 0) {
    local.portfolios[index] = updated;
  } else {
    local.portfolios.push(updated);
  }

  return { ...updated };
}

export async function deletePortfolioByStaffId(staffId: string): Promise<boolean> {
  const sql = await getSql();
  if (sql) {
    const result = await sql`
      DELETE FROM team_portfolios
      WHERE staff_id = ${staffId}
      RETURNING id;
    `;
    return result.length > 0;
  }

  const index = local.portfolios.findIndex((item) => item.staffId === staffId);
  if (index >= 0) {
    local.portfolios.splice(index, 1);
    return true;
  }
  return false;
}

export async function listAllPortfolios(): Promise<TeamPortfolio[]> {
  const sql = await getSql();
  if (sql) {
    const rows = await sql`
      SELECT * FROM team_portfolios
      ORDER BY updated_at DESC;
    `;
    return rows.map(rowToPortfolio);
  }

  return [...local.portfolios];
}
