import { NextResponse } from "next/server";
import { db } from "@/db";
import type { Project, Task } from "@/db";
import { getNeonSql, isNeonConfigured } from "@/lib/neon";
import { denyUnlessStaff } from "@/lib/staffAuth";
import { serverError } from "@/lib/apiUtil";
import { holdsSlot, parseWindow } from "@/lib/scheduling";

export const dynamic = "force-dynamic";

// Admin only. Every number and list comes from the same store the other workspace pages save to: Neon when
// DATABASE_URL is set, otherwise the dev in-memory store.

type PulseProject = Pick<Project, "id" | "clientName" | "title" | "riskLevel" | "progress">;
type FocusTask = Pick<Task, "id" | "title" | "assignee" | "priority">;
interface UpcomingBooking {
  id: string;
  clientName: string;
  date: string;
  time: string;
  meetingUrl: string;
}
interface Activity {
  id: string;
  description: string;
  at: string; // ISO timestamp
}

export interface OverviewData {
  pipelineValue: number;
  openLeadsCount: number;
  activeProjectsCount: number;
  collectedTotal: number;
  deliveryPulse: PulseProject[];
  focusTasks: FocusTask[];
  upcomingBookings: UpcomingBooking[];
  recentActivity: Activity[];
  database: { status: "connected" | "local"; latencyMs?: number };
}

const PRIORITY_ORDER: Record<Task["priority"], number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const today = () => new Date().toISOString().slice(0, 10);

/** Next calls by date, then start time ("10:00 AM" text does not sort as a string). */
function nextBookings(rows: UpcomingBooking[], limit: number): UpcomingBooking[] {
  const start = (b: UpcomingBooking) => parseWindow(b.time)?.start ?? 0;
  return [...rows].sort((a, b) => a.date.localeCompare(b.date) || start(a) - start(b)).slice(0, limit);
}

const byPriority = (a: FocusTask, b: FocusTask) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];

export async function GET() {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const sql = isNeonConfigured() ? getNeonSql() : null;
  try {
    if (!sql) {
      const m = db.getOverviewMetrics();
      const data: OverviewData = {
        pipelineValue: m.pipelineValue,
        openLeadsCount: m.openLeadsCount,
        activeProjectsCount: m.activeProjectsCount,
        collectedTotal: m.collectedTotal,
        deliveryPulse: m.deliveryPulse.filter((p) => p.phase !== "Support").slice(0, 6),
        focusTasks: [...m.focusTasks].sort(byPriority).slice(0, 5),
        upcomingBookings: nextBookings(db.getBookings().filter((b) => holdsSlot(b.status) && b.date >= today()), 3),
        recentActivity: [],
        database: { status: "local" },
      };
      return NextResponse.json({ ok: true, data });
    }

    const started = Date.now();
    await sql`SELECT 1`;
    const latencyMs = Date.now() - started;

    const [[leads], [projectCount], [collected], pulse, focus, bookings, activity] = await Promise.all([
      sql`SELECT COALESCE(SUM(deal_value), 0)::float8 AS value, COUNT(*)::int AS count FROM opportunities WHERE stage NOT IN ('won', 'lost')`,
      sql`SELECT COUNT(*)::int AS count FROM projects WHERE phase <> 'Support'`,
      sql`SELECT COALESCE(SUM(amount), 0)::float8 AS total FROM invoices WHERE status = 'Paid'`,
      sql`
        SELECT id, client_name AS "clientName", title, risk_level AS "riskLevel", progress
        FROM projects WHERE phase <> 'Support' ORDER BY created_at DESC LIMIT 6`,
      sql`
        SELECT id, title, assignee, priority FROM tasks WHERE status <> 'done'
        ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at ASC
        LIMIT 5`,
      sql`
        SELECT id, client_name AS "clientName", to_char(date, 'YYYY-MM-DD') AS date, time, meeting_url AS "meetingUrl"
        FROM bookings WHERE status IN ('Confirmed', 'Pending') AND date >= CURRENT_DATE
        ORDER BY date ASC LIMIT 20`,
      // Recent activity is read from the records themselves, so it is never out of step with them.
      sql`
        SELECT * FROM (
          SELECT 'lead-' || id AS id, 'New lead: ' || company AS description, created_at AS at FROM opportunities
          UNION ALL SELECT 'prop-' || id, 'Proposal ' || proposal_number || ' (' || status || '): ' || company, created_at FROM proposals
          UNION ALL SELECT 'cont-' || id, 'Contract ' || contract_number || ' drafted: ' || company, created_at FROM contracts
          UNION ALL SELECT 'sign-' || id, 'Contract ' || contract_number || ' signed by ' || signer_name, signed_at FROM contracts WHERE signed_at IS NOT NULL
          UNION ALL SELECT 'inv-' || id, 'Invoice ' || invoice_number || ' issued to ' || client_name, created_at FROM invoices
          UNION ALL SELECT 'paid-' || id, 'Invoice ' || invoice_number || ' paid by ' || client_name, paid_at FROM invoices WHERE paid_at IS NOT NULL
          UNION ALL SELECT 'book-' || id, 'Call booked with ' || client_name || ' on ' || to_char(date, 'Mon DD'), created_at FROM bookings
          UNION ALL SELECT 'proj-' || id, 'Project started: ' || title, created_at FROM projects
        ) a
        WHERE at IS NOT NULL ORDER BY at DESC LIMIT 6`,
    ]);

    const data: OverviewData = {
      pipelineValue: Number(leads.value),
      openLeadsCount: Number(leads.count),
      activeProjectsCount: Number(projectCount.count),
      collectedTotal: Number(collected.total),
      deliveryPulse: (pulse as PulseProject[]).map((p) => ({ ...p, progress: Number(p.progress ?? 0) })),
      focusTasks: focus as FocusTask[],
      upcomingBookings: nextBookings(bookings as UpcomingBooking[], 3),
      recentActivity: (activity as { id: string; description: string; at: string | Date }[]).map((a) => ({
        id: a.id,
        description: a.description,
        at: new Date(a.at).toISOString(),
      })),
      database: { status: "connected", latencyMs },
    };
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return serverError("GET /api/overview error", err);
  }
}
