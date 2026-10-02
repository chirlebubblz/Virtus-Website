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

export async function POST(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid JSON request body.");

  const leadsArray = Array.isArray(body.leads)
    ? (body.leads as Record<string, unknown>[])
    : [body as Record<string, unknown>];

  if (leadsArray.length === 0) return badRequest("No leads provided for import.");

  const validStages: Opportunity["stage"][] = [
    "new_inquiry",
    "qualified",
    "proposal_sent",
    "in_review",
    "won",
    "lost",
  ];
  const validTiers: Opportunity["recommendedTier"][] = ["Focused", "Growth", "Integrated"];
  const validScores: NonNullable<Opportunity["leadScore"]>[] = ["Hot", "Warm", "Cold"];

  const inserted: Opportunity[] = [];
  const sql = isNeonConfigured() ? getNeonSql() : null;

  if (sql) {
    await ensureOpportunityDetailColumns(sql).catch(() => {});
  }

  for (const item of leadsArray) {
    const company = str(item.company, 200) || str(item.name, 200) || "Unnamed Prospect";
    const name = str(item.name, 200) || company;
    const email = str(item.email, 200) || `${company.toLowerCase().replace(/[^a-z0-9]/g, "") || "lead"}@example.com`;
    const phone = str(item.phone, 64) || undefined;

    let stage: Opportunity["stage"] = "new_inquiry";
    if (typeof item.stage === "string") {
      const cleaned = item.stage.toString().toLowerCase().replace(/[^a-z_]/g, "");
      const match = validStages.find((s) => s.toLowerCase() === cleaned);
      if (match) {
        stage = match;
      } else if (cleaned.includes("qual")) {
        stage = "qualified";
      } else if (cleaned.includes("prop")) {
        stage = "proposal_sent";
      } else if (cleaned.includes("review")) {
        stage = "in_review";
      } else if (cleaned.includes("won")) {
        stage = "won";
      } else if (cleaned.includes("lost")) {
        stage = "lost";
      }
    }

    let dealValue = 0;
    if (typeof item.dealValue === "number" || typeof item.dealValue === "string") {
      const parsed = Number(String(item.dealValue).replace(/[^0-9.]/g, ""));
      if (!isNaN(parsed) && parsed >= 0) dealValue = parsed;
    }

    let recommendedTier: Opportunity["recommendedTier"] = "Growth";
    if (typeof item.recommendedTier === "string") {
      const match = validTiers.find((t) => t.toLowerCase() === item.recommendedTier?.toString().toLowerCase());
      if (match) recommendedTier = match;
    }

    let leadScore: Opportunity["leadScore"] = "Warm";
    if (typeof item.leadScore === "string") {
      const match = validScores.find((sc) => sc.toLowerCase() === item.leadScore?.toString().toLowerCase());
      if (match) leadScore = match;
    }

    const needs = Array.isArray(item.needs)
      ? item.needs.filter((n): n is string => typeof n === "string")
      : typeof item.needs === "string"
      ? (item.needs as string).split(/[,;]/).map((s) => s.trim()).filter(Boolean)
      : ["Web", "Brand"];

    const timeline = str(item.timeline, 100) || "4 Weeks";
    const budgetBracket = str(item.budgetBracket, 100) || (dealValue > 0 ? `$${dealValue.toLocaleString()}` : "To Be Discussed");
    const message = str(item.message, 2000) || str(item.notes, 2000) || undefined;
    const deliverables = Array.isArray(item.deliverables) ? item.deliverables.filter((d): d is string => typeof d === "string") : needs;
    const location = str(item.location, 100) || undefined;
    const websiteUrl = str(item.websiteUrl, 200) || str(item.website, 200) || undefined;
    const industry = str(item.industry, 100) || undefined;
    const currentBottleneck = str(item.currentBottleneck, 500) || undefined;
    const growthGoal = str(item.growthGoal, 500) || undefined;
    const roleLeader = str(item.roleLeader, 100) || "Kai (Brand Lead)";
    const internalNotes = str(item.internalNotes, 2000) || undefined;
    const tags = Array.isArray(item.tags)
      ? item.tags.filter((t): t is string => typeof t === "string")
      : ["#CSVImport"];

    const newOpp = db.addOpportunity({
      name,
      company,
      email,
      phone,
      stage,
      dealValue,
      recommendedTier,
      needs,
      timeline,
      budgetBracket,
      message,
      deliverables,
      location,
      websiteUrl,
      industry,
      currentBottleneck,
      growthGoal,
      roleLeader,
      leadScore,
      tags,
      internalNotes,
    });

    if (sql) {
      try {
        await sql`
          INSERT INTO opportunities (
            id, name, company, email, stage, deal_value, recommended_tier, needs, timeline, phone, budget_bracket, message, deliverables
          ) VALUES (
            ${newOpp.id},
            ${newOpp.name},
            ${newOpp.company},
            ${newOpp.email},
            ${newOpp.stage},
            ${newOpp.dealValue},
            ${newOpp.recommendedTier},
            ${JSON.stringify(newOpp.needs)},
            ${newOpp.timeline},
            ${newOpp.phone ?? null},
            ${newOpp.budgetBracket},
            ${newOpp.message ?? null},
            ${JSON.stringify(newOpp.deliverables ?? [])}::jsonb
          ) ON CONFLICT (id) DO NOTHING;
        `;
      } catch (sqlErr) {
        console.warn("Neon SQL lead insert warning:", sqlErr);
      }
    }

    inserted.push(newOpp);
  }

  return NextResponse.json(
    {
      ok: true,
      imported: inserted.length,
      data: inserted,
    },
    { status: 201 }
  );
}

