import { NextResponse } from "next/server";
import { db } from "@/db";
import { denyUnlessStaff } from "@/lib/staffAuth";

export async function GET() {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  try {
    const { isNeonConfigured, getNeonSql } = await import("@/lib/neon");

    if (isNeonConfigured()) {
      const sql = getNeonSql();
      if (sql) {
        try {
          const [oppStats] = await sql`
            SELECT 
              COALESCE(SUM(deal_value), 0)::int as pipeline_value,
              COUNT(*)::int as open_leads
            FROM opportunities 
            WHERE stage NOT IN ('won', 'lost');
          `;

          const [projStats] = await sql`
            SELECT COUNT(*)::int as active_projects
            FROM projects 
            WHERE phase != 'Support';
          `;

          const [invStats] = await sql`
            SELECT COALESCE(SUM(amount), 0)::int as collected_total
            FROM invoices 
            WHERE status = 'Paid';
          `;

          return NextResponse.json({
            ok: true,
            provider: "Neon Serverless PostgreSQL (Cloud)",
            metrics: {
              pipelineValue: Number(oppStats?.pipeline_value || 0),
              openLeadsCount: Number(oppStats?.open_leads || 0),
              activeProjectsCount: Number(projStats?.active_projects || 0),
              collectedTotal: Number(invStats?.collected_total || 0),
              deliveryPulse: db.getProjects(),
              focusTasks: db.getTasks().slice(0, 3),
              recentActivity: db.getOverviewMetrics().recentActivity,
            },
          });
        } catch (neonQueryErr) {
          console.warn("Neon query fallback:", neonQueryErr);
        }
      }
    }

    const metrics = db.getOverviewMetrics();
    return NextResponse.json({
      ok: true,
      provider: "Local Storage / Memory Bridge",
      metrics,
    });
  } catch (error) {
    console.error("API /api/overview error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
