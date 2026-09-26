import { NextResponse } from "next/server";
import { db } from "@/db";
import type { Opportunity } from "@/db";
import { isNeonConfigured, getNeonSql, ensureOpportunityDetailColumns } from "@/lib/neon";
import { denyUnlessStaff } from "@/lib/staffAuth";
import { badRequest, readJsonObject, serverError, str, unavailable } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

const STAGES: Opportunity["stage"][] = ["new_inquiry", "qualified", "proposal_sent", "in_review", "won", "lost"];

export async function GET() {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const sql = isNeonConfigured() ? getNeonSql() : null;
  if (!sql) return NextResponse.json({ ok: true, source: "local", data: db.getOpportunities() });
  try {
    await ensureOpportunityDetailColumns(sql); // older databases predate these columns
    const rows = await sql`
      SELECT id, name, company, email, stage, deal_value::float8 as "dealValue", recommended_tier as "recommendedTier", needs, timeline, phone, budget_bracket as "budgetBracket", message, deliverables, created_at as "createdAt"
      FROM opportunities
      ORDER BY created_at DESC;
    `;
    return NextResponse.json({ ok: true, source: "neon", data: rows });
  } catch (err) {
    return unavailable("GET /api/pipeline error", err);
  }
}

export async function PATCH(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");
  const id = str(body.id, 64);
  const stage = STAGES.find((s) => s === body.stage);
  if (!id) return badRequest("Missing id.", "id");
  if (!stage) return badRequest("Unknown stage.", "stage");

  const sql = isNeonConfigured() ? getNeonSql() : null;
  try {
    if (sql) {
      const rows = await sql`UPDATE opportunities SET stage = ${stage} WHERE id = ${id} RETURNING id;`;
      if (rows.length === 0) return NextResponse.json({ ok: false, error: "Opportunity not found." }, { status: 404 });
    }
    const updated = db.updateOpportunityStage(id, stage);
    if (!sql && !updated) return NextResponse.json({ ok: false, error: "Opportunity not found." }, { status: 404 });
    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    return sql ? unavailable("PATCH /api/pipeline error", err) : serverError("PATCH /api/pipeline error", err);
  }
}
