import { NextResponse } from "next/server";
import { db } from "@/db";
import type { Project, ProjectDeliverable, ProjectDoc } from "@/db";
import { getNeonSql, isNeonConfigured } from "@/lib/neon";
import { getStaff } from "@/lib/staffAuth";
import { badRequest, dateOnly, money, readJsonObject, serverError, str, unavailable } from "@/lib/apiUtil";
import { hostMatches, isHttpsUrl } from "@/lib/scheduling";

export const dynamic = "force-dynamic";

// Admins see and edit every project. Team members (TEAM_API in middleware) see only projects they have a task on,
// without the budget, and may change only progress, phase and risk on those.

const PHASES: Project["phase"][] = ["Discover", "Design", "Build", "Deliver", "Support"];
const RISKS: Project["riskLevel"][] = ["On Track", "Needs Review", "At Risk"];
const DELIVERABLE_STATUSES: ProjectDeliverable["status"][] = ["Pending", "In Review", "Approved"];
const TEAM_FIELDS = new Set(["id", "progress", "phase", "riskLevel"]);

type Sql = NonNullable<ReturnType<typeof getNeonSql>>;
const neon = (): Sql | null => (isNeonConfigured() ? getNeonSql() : null);

async function selectProjects(sql: Sql, id?: string): Promise<Project[]> {
  const rows = id
    ? await sql`
        SELECT id, client_id AS "clientId", client_name AS "clientName", title, phase, progress, risk_level AS "riskLevel",
               budget::float8 AS budget, to_char(start_date, 'YYYY-MM-DD') AS "startDate", to_char(target_date, 'YYYY-MM-DD') AS "targetDate",
               lead_name AS "leadName", lead_role AS "leadRole", pod_name AS "podName", team_members AS "teamMembers", docs, deliverables
        FROM projects WHERE id = ${id} LIMIT 1`
    : await sql`
        SELECT id, client_id AS "clientId", client_name AS "clientName", title, phase, progress, risk_level AS "riskLevel",
               budget::float8 AS budget, to_char(start_date, 'YYYY-MM-DD') AS "startDate", to_char(target_date, 'YYYY-MM-DD') AS "targetDate",
               lead_name AS "leadName", lead_role AS "leadRole", pod_name AS "podName", team_members AS "teamMembers", docs, deliverables
        FROM projects ORDER BY created_at DESC`;
  // Optional fields stay absent rather than null, so the view's fallbacks keep working.
  return (rows as Record<string, unknown>[]).map((r) => {
    const p = Object.fromEntries(Object.entries(r).filter(([, v]) => v !== null)) as unknown as Project;
    return { ...p, startDate: p.startDate ?? "", targetDate: p.targetDate ?? "", budget: p.budget ?? 0, progress: Number(p.progress ?? 0) };
  });
}

/** Ids of the projects where this team member has at least one task. */
async function memberProjectIds(sql: Sql | null, member: string): Promise<Set<string>> {
  const rows = sql
    ? ((await sql`SELECT DISTINCT project_id AS "projectId", assignee FROM tasks WHERE project_id IS NOT NULL`) as { projectId: string; assignee: string }[])
    : db.getTasks().map((t) => ({ projectId: t.projectId ?? "", assignee: t.assignee }));
  return new Set(rows.filter((r) => r.projectId && hostMatches(r.assignee, member)).map((r) => r.projectId));
}

export async function GET() {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const sql = neon();
  try {
    const all = sql ? await selectProjects(sql) : db.getProjects();
    if (staff.role === "admin") return NextResponse.json({ ok: true, data: all });
    const mine = await memberProjectIds(sql, staff.memberLabel ?? staff.name);
    return NextResponse.json({ ok: true, data: all.filter((p) => mine.has(p.id)).map((p) => ({ ...p, budget: 0 })) });
  } catch (err) {
    return sql ? unavailable("GET /api/projects error", err) : serverError("GET /api/projects error", err);
  }
}

const optionalLabel = (value: unknown, max: number) => (value === "" || value === null ? null : str(value, max));

function parseDocs(value: unknown): ProjectDoc[] | null {
  if (!Array.isArray(value) || value.length > 50) return null;
  const docs: ProjectDoc[] = [];
  for (const d of value) {
    const doc = d as Record<string, unknown>;
    const title = str(doc?.title, 200);
    const url = str(doc?.url, 500);
    const type = str(doc?.type, 40) ?? "Link";
    if (!title || !url || !(isHttpsUrl(url) || url.startsWith("/"))) return null;
    docs.push({ title, url, type, ...(str(doc.size, 40) ? { size: str(doc.size, 40)! } : {}) });
  }
  return docs;
}

function parseDeliverables(value: unknown): ProjectDeliverable[] | null {
  if (!Array.isArray(value) || value.length > 50) return null;
  const out: ProjectDeliverable[] = [];
  for (const d of value) {
    const item = d as Record<string, unknown>;
    const title = str(item?.title, 200);
    const status = DELIVERABLE_STATUSES.find((s) => s === item?.status);
    const url = item?.url === undefined || item.url === "" ? undefined : str(item.url, 500);
    if (!title || !status || url === null || (url && !isHttpsUrl(url))) return null;
    out.push({ title, status, ...(url ? { url } : {}), ...(str(item.approvedAt, 40) ? { approvedAt: str(item.approvedAt, 40)! } : {}) });
  }
  return out;
}

export async function PATCH(request: Request) {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const isAdmin = staff.role === "admin";

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");
  const id = str(body.id, 64);
  if (!id) return badRequest("Missing project id.", "id");
  if (!isAdmin && Object.keys(body).some((k) => !TEAM_FIELDS.has(k))) {
    return NextResponse.json({ ok: false, error: "Only admins can change those project details." }, { status: 403 });
  }

  const updates: Partial<Omit<Project, "id">> = {};
  if (body.title !== undefined) {
    const title = str(body.title, 200);
    if (!title) return badRequest("Enter a title.", "title");
    updates.title = title;
  }
  if (body.phase !== undefined) {
    const phase = PHASES.find((p) => p === body.phase);
    if (!phase) return badRequest("Choose a valid phase.", "phase");
    updates.phase = phase;
  }
  if (body.progress !== undefined) {
    const progress = Number(body.progress);
    if (!Number.isInteger(progress) || progress < 0 || progress > 100) return badRequest("Progress must be 0 to 100.", "progress");
    updates.progress = progress;
  }
  if (body.riskLevel !== undefined) {
    const risk = RISKS.find((r) => r === body.riskLevel);
    if (!risk) return badRequest("Choose a valid risk level.", "riskLevel");
    updates.riskLevel = risk;
  }
  if (body.targetDate !== undefined) {
    const target = dateOnly(body.targetDate);
    if (!target) return badRequest("Enter the target date as YYYY-MM-DD.", "targetDate");
    updates.targetDate = target;
  }
  if (body.budget !== undefined) {
    const budget = money(body.budget);
    if (budget === null) return badRequest("Enter a valid budget.", "budget");
    updates.budget = budget;
  }
  for (const key of ["leadName", "leadRole", "podName"] as const) {
    if (body[key] === undefined) continue;
    const value = optionalLabel(body[key], 120);
    if (value === null && body[key] !== "" && body[key] !== null) return badRequest("Keep it under 120 characters.", key);
    updates[key] = value ?? undefined;
  }
  if (body.teamMembers !== undefined) {
    if (!Array.isArray(body.teamMembers) || body.teamMembers.length > 30) return badRequest("Team must be a list of names.", "teamMembers");
    updates.teamMembers = body.teamMembers.map((m) => str(m, 120)).filter((m): m is string => Boolean(m));
  }
  if (body.docs !== undefined) {
    const docs = parseDocs(body.docs);
    if (!docs) return badRequest("Each document needs a title and an https link.", "docs");
    updates.docs = docs;
  }
  if (body.deliverables !== undefined) {
    const deliverables = parseDeliverables(body.deliverables);
    if (!deliverables) return badRequest("Each deliverable needs a title, a valid status and an optional https link.", "deliverables");
    updates.deliverables = deliverables;
  }

  const sql = neon();
  try {
    if (!isAdmin && !(await memberProjectIds(sql, staff.memberLabel ?? staff.name)).has(id)) {
      return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    }

    if (!sql) {
      const saved = db.updateProject(id, updates);
      if (!saved) return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
      return NextResponse.json({ ok: true, data: saved });
    }

    const [current] = await selectProjects(sql, id);
    if (!current) return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    const next = { ...current, ...updates };
    await sql`
      UPDATE projects SET title = ${next.title}, phase = ${next.phase}, progress = ${next.progress}, risk_level = ${next.riskLevel},
        target_date = ${next.targetDate || null}, budget = ${next.budget}, lead_name = ${next.leadName ?? null},
        lead_role = ${next.leadRole ?? null}, pod_name = ${next.podName ?? null},
        team_members = ${JSON.stringify(next.teamMembers ?? [])}::jsonb, docs = ${JSON.stringify(next.docs ?? [])}::jsonb,
        deliverables = ${JSON.stringify(next.deliverables ?? [])}::jsonb
      WHERE id = ${id}`;
    const [saved] = await selectProjects(sql, id);
    return NextResponse.json({ ok: true, data: isAdmin ? saved : { ...saved, budget: 0 } });
  } catch (err) {
    return sql ? unavailable("PATCH /api/projects error", err) : serverError("PATCH /api/projects error", err);
  }
}
