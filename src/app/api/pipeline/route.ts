import { NextResponse } from "next/server";
import { db } from "@/db";
import type { Opportunity } from "@/db";
import { isNeonConfigured, getNeonSql, ensureOpportunityDetailColumns, seedNeonDemo } from "@/lib/neon";
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
    let rows = await sql`
      SELECT id, name, company, email, stage, deal_value::float8 as "dealValue", recommended_tier as "recommendedTier", needs, timeline, phone, budget_bracket as "budgetBracket", message, deliverables, created_at as "createdAt"
      FROM opportunities
      ORDER BY created_at DESC;
    `;
    if (rows.length === 0) {
      await seedNeonDemo(sql).catch(() => {});
      rows = await sql`
        SELECT id, name, company, email, stage, deal_value::float8 as "dealValue", recommended_tier as "recommendedTier", needs, timeline, phone, budget_bracket as "budgetBracket", message, deliverables, created_at as "createdAt"
        FROM opportunities
        ORDER BY created_at DESC;
      `;
    }
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
  if (!id) return badRequest("Missing id.", "id");

  const stage = body.stage ? STAGES.find((s) => s === body.stage) : undefined;
  const updates: Partial<Opportunity> = {};
  if (stage) updates.stage = stage;
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.company === "string") updates.company = body.company.trim();
  if (typeof body.email === "string") updates.email = body.email.trim();
  if (typeof body.phone === "string") updates.phone = body.phone.trim();
  if (typeof body.dealValue === "number" || typeof body.dealValue === "string") {
    const val = Number(body.dealValue);
    if (!isNaN(val)) updates.dealValue = val;
  }
  if (typeof body.roleLeader === "string") updates.roleLeader = body.roleLeader;
  if (typeof body.internalNotes === "string") updates.internalNotes = body.internalNotes;
  if (typeof body.leadScore === "string") updates.leadScore = body.leadScore as Opportunity["leadScore"];
  if (typeof body.location === "string") updates.location = body.location;
  if (typeof body.websiteUrl === "string") updates.websiteUrl = body.websiteUrl;
  if (Array.isArray(body.tags)) updates.tags = body.tags.filter((t): t is string => typeof t === "string");
  if (typeof body.industry === "string") updates.industry = body.industry;
  if (typeof body.currentBottleneck === "string") updates.currentBottleneck = body.currentBottleneck;
  if (typeof body.growthGoal === "string") updates.growthGoal = body.growthGoal;
  if (typeof body.timeline === "string") updates.timeline = body.timeline;
  if (typeof body.budgetBracket === "string") updates.budgetBracket = body.budgetBracket;
  if (typeof body.message === "string") updates.message = body.message;
  if (Array.isArray(body.howWeAssist)) updates.howWeAssist = body.howWeAssist.filter((item): item is string => typeof item === "string");
  if (Array.isArray(body.deliverables)) updates.deliverables = body.deliverables.filter((item): item is string => typeof item === "string");

  const sql = isNeonConfigured() ? getNeonSql() : null;
  try {
    if (sql) {
      if (stage) {
        await sql`UPDATE opportunities SET stage = ${stage} WHERE id = ${id};`;
      }
      if (updates.dealValue !== undefined) {
        await sql`UPDATE opportunities SET deal_value = ${updates.dealValue} WHERE id = ${id};`;
      }
    }
    const updated = db.updateOpportunity(id, updates);
    if (!sql && !updated) return NextResponse.json({ ok: false, error: "Opportunity not found." }, { status: 404 });
    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    return sql ? unavailable("PATCH /api/pipeline error", err) : serverError("PATCH /api/pipeline error", err);
  }
}
