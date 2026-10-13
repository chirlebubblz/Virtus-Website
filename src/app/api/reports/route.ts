import { NextResponse } from "next/server";
import { db } from "@/db";
import type { ClientSummary, Invoice, Opportunity, Project, Task } from "@/db";
import { getNeonSql, isNeonConfigured } from "@/lib/neon";
import { getStaff } from "@/lib/staffAuth";
import { listStaff, StoreUnavailableError } from "@/lib/staffStore";
import { serverError, unavailable } from "@/lib/apiUtil";
import { hostMatches } from "@/lib/scheduling";

export const dynamic = "force-dynamic";

type Sql = NonNullable<ReturnType<typeof getNeonSql>>;

export interface ReportsPayload {
  role: "admin" | "team";
  source: "neon" | "local";
  projects: Project[];
  tasks: Task[];
  invoices: Invoice[];
  opportunities: Opportunity[];
  clients: ClientSummary[];
  staffMembers: { name: string; roleTitle: string; teamName?: string }[];
}

export async function GET() {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const isAdmin = staff.role === "admin";
  const memberLabel = staff.memberLabel ?? staff.name;
  const sql: Sql | null = isNeonConfigured() ? getNeonSql() : null;

  try {
    let staffMembers: { name: string; roleTitle: string; teamName?: string }[] = [];
    try {
      const users = (await listStaff()).filter((u) => u.status === "active");
      staffMembers = users.map((u) => ({
        name: u.memberLabel ?? u.name,
        roleTitle: u.role === "admin" ? "Studio Director / Admin" : "Specialist",
        teamName: u.role === "admin" ? "Executive Leadership" : "Delivery Pod",
      }));
    } catch (err) {
      if (!(err instanceof StoreUnavailableError)) throw err;
    }

    if (!sql) {
      const allTasks = db.getTasks();
      const allProjects = db.getProjects();
      const myTasks = isAdmin ? allTasks : allTasks.filter((t) => hostMatches(t.assignee, memberLabel));
      const myProjectIds = new Set(myTasks.map((t) => t.projectId).filter(Boolean));
      const myProjects = isAdmin
        ? allProjects
        : allProjects.filter((p) => myProjectIds.has(p.id)).map((p) => ({ ...p, budget: 0 }));

      const payload: ReportsPayload = {
        role: staff.role,
        source: "local",
        projects: myProjects,
        tasks: myTasks,
        invoices: isAdmin ? db.getInvoices() : [],
        opportunities: isAdmin ? db.getOpportunities() : [],
        clients: isAdmin ? db.getClients() : [],
        staffMembers,
      };
      return NextResponse.json({ ok: true, data: payload });
    }

    const [rawProjects, rawTasks, rawInvoices, rawOpportunities, rawClients] = await Promise.all([
      sql`
        SELECT id, client_id AS "clientId", client_name AS "clientName", title, phase, progress, risk_level AS "riskLevel",
               budget::float8 AS budget, to_char(start_date, 'YYYY-MM-DD') AS "startDate", to_char(target_date, 'YYYY-MM-DD') AS "targetDate",
               lead_name AS "leadName", lead_role AS "leadRole", pod_name AS "podName", team_members AS "teamMembers", docs, deliverables
        FROM projects ORDER BY created_at DESC`,
      sql`
        SELECT id, project_id AS "projectId", COALESCE(project_title, '') AS "projectTitle", title, assignee,
               status, priority, COALESCE(due_date, '') AS "dueDate"
        FROM tasks ORDER BY created_at DESC`,
      isAdmin
        ? sql`
            SELECT id, client_id AS "clientId", client_name AS "clientName", invoice_number AS "invoiceNumber",
                   amount::float8 AS amount, status, COALESCE(to_char(due_date, 'YYYY-MM-DD'), '') AS "dueDate",
                   to_char(paid_at, 'YYYY-MM-DD') AS "paidAt"
            FROM invoices ORDER BY created_at DESC`
        : Promise.resolve([]),
      isAdmin
        ? sql`
            SELECT id, name, company, email, stage, deal_value::float8 AS "dealValue",
                   recommended_tier AS "recommendedTier", needs, timeline,
                   to_char(created_at, 'YYYY-MM-DD') AS "createdAt"
            FROM opportunities ORDER BY created_at DESC`
        : Promise.resolve([]),
      isAdmin
        ? sql`
            SELECT id, name, contact_name AS "contactName", company, email, status,
                   COALESCE(total_revenue, 0)::float8 AS "totalRevenue",
                   COALESCE(active_projects_count, 0)::int AS "activeProjectsCount",
                   to_char(created_at, 'YYYY-MM-DD') AS "joinedAt"
            FROM clients ORDER BY created_at DESC`
        : Promise.resolve([]),
    ]);

    const allProjects: Project[] = (rawProjects as Record<string, unknown>[]).map((r) => {
      const p = Object.fromEntries(Object.entries(r).filter(([, v]) => v !== null)) as unknown as Project;
      return {
        ...p,
        startDate: p.startDate ?? "",
        targetDate: p.targetDate ?? "",
        budget: Number(p.budget ?? 0),
        progress: Number(p.progress ?? 0),
      };
    });

    const allTasks = rawTasks as Task[];
    const visibleTasks = isAdmin ? allTasks : allTasks.filter((t) => hostMatches(t.assignee, memberLabel));
    const visibleProjectIds = new Set(visibleTasks.map((t) => t.projectId).filter(Boolean));
    const visibleProjects = isAdmin
      ? allProjects
      : allProjects.filter((p) => visibleProjectIds.has(p.id)).map((p) => ({ ...p, budget: 0 }));

    const payload: ReportsPayload = {
      role: staff.role,
      source: "neon",
      projects: visibleProjects,
      tasks: visibleTasks,
      invoices: (rawInvoices as Invoice[]).map((i) => ({ ...i, amount: Number(i.amount ?? 0) })),
      opportunities: (rawOpportunities as Opportunity[]).map((o) => ({ ...o, dealValue: Number(o.dealValue ?? 0) })),
      clients: (rawClients as ClientSummary[]).map((c) => ({
        ...c,
        totalRevenue: Number(c.totalRevenue ?? 0),
        activeProjectsCount: Number(c.activeProjectsCount ?? 0),
      })),
      staffMembers,
    };

    return NextResponse.json({ ok: true, data: payload });
  } catch (err) {
    return sql ? unavailable("GET /api/reports error", err) : serverError("GET /api/reports error", err);
  }
}
