import { NextResponse } from "next/server";
import { db } from "@/db";
import type { Opportunity } from "@/db";
import { isNeonConfigured, getNeonSql, ensureOpportunityDetailColumns, seedNeonDemo } from "@/lib/neon";
import { denyUnlessStaff } from "@/lib/staffAuth";
import { badRequest, readJsonObject, serverError, str, unavailable } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

const STAGES: Opportunity["stage"][] = ["new_inquiry", "qualified", "proposal_sent", "in_review", "won", "lost"];

type Sql = NonNullable<ReturnType<typeof getNeonSql>>;

const inDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const newId = (prefix: string) => `${prefix}-${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

/**
 * A lead just moved to Won: make it a client (or reactivate the client with that email) and start its project,
 * in Neon. Runs only for the request whose stage change flipped the lead to Won.
 */
async function convertWonLead(sql: Sql, lead: { name: string; company: string; email: string; dealValue: number; tier: string }) {
  const [existing] = await sql`SELECT id FROM clients WHERE lower(email) = lower(${lead.email}) LIMIT 1`;
  const clientId = existing ? (existing.id as string) : newId("cli");
  if (existing) {
    await sql`
      UPDATE clients SET status = 'Active', total_revenue = COALESCE(total_revenue, 0) + ${lead.dealValue},
        active_projects_count = COALESCE(active_projects_count, 0) + 1
      WHERE id = ${clientId}`;
  } else {
    await sql`
      INSERT INTO clients (id, name, contact_name, company, email, status, total_revenue, active_projects_count)
      VALUES (${clientId}, ${lead.name}, ${lead.name}, ${lead.company}, ${lead.email.toLowerCase()}, 'Active', ${lead.dealValue}, 1)`;
  }
  await sql`
    INSERT INTO projects (id, client_id, client_name, title, phase, progress, risk_level, budget, start_date, target_date)
    VALUES (${newId("proj")}, ${clientId}, ${lead.company}, ${`${lead.company} - ${lead.tier} System`}, 'Discover', 10, 'On Track',
            ${lead.dealValue}, ${inDays(0)}, ${inDays(30)})`;
}

export async function GET() {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const sql = isNeonConfigured() ? getNeonSql() : null;
  if (!sql) return NextResponse.json({ ok: true, source: "local", data: db.getOpportunities() });
  try {
    await ensureOpportunityDetailColumns(sql); // older databases predate these columns
    let rows = await sql`
      SELECT id, name, company, email, stage, deal_value::float8 as "dealValue", recommended_tier as "recommendedTier",
             needs, timeline, phone, budget_bracket as "budgetBracket", message, deliverables,
             location, website_url as "websiteUrl", industry, current_bottleneck as "currentBottleneck",
             growth_goal as "growthGoal", how_we_assist as "howWeAssist", role_leader as "roleLeader",
             lead_score as "leadScore", tags, internal_notes as "internalNotes",
             created_at as "createdAt"
      FROM opportunities
      ORDER BY created_at DESC;
    `;
    if (rows.length === 0) {
      await seedNeonDemo(sql).catch(() => {});
      rows = await sql`
        SELECT id, name, company, email, stage, deal_value::float8 as "dealValue", recommended_tier as "recommendedTier",
               needs, timeline, phone, budget_bracket as "budgetBracket", message, deliverables,
               location, website_url as "websiteUrl", industry, current_bottleneck as "currentBottleneck",
               growth_goal as "growthGoal", how_we_assist as "howWeAssist", role_leader as "roleLeader",
               lead_score as "leadScore", tags, internal_notes as "internalNotes",
               created_at as "createdAt"
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
      await ensureOpportunityDetailColumns(sql);
      if (stage) {
        // One statement: change the stage and report the one it replaced, under a row lock, so a lead is converted
        // to a client and project once even when two people move it to Won at the same moment.
        const [row] = await sql`
          UPDATE opportunities o SET stage = ${stage}
          FROM (SELECT stage FROM opportunities WHERE id = ${id} FOR UPDATE) old
          WHERE o.id = ${id}
          RETURNING old.stage AS "oldStage", o.name, o.company, o.email, o.deal_value::float8 AS "dealValue", o.recommended_tier AS tier`;
        if (!row) return NextResponse.json({ ok: false, error: "Opportunity not found." }, { status: 404 });
        if (stage === "won" && row.oldStage !== "won") {
          try {
            await convertWonLead(sql, row as { name: string; company: string; email: string; dealValue: number; tier: string });
          } catch (err) {
            // Put the stage back so the admin can try again instead of a Won lead with no client.
            await sql`UPDATE opportunities SET stage = ${row.oldStage as string} WHERE id = ${id}`.catch(() => undefined);
            throw err;
          }
        }
      }

      // Persist all other updated fields to Neon
      const [current] = await sql`SELECT * FROM opportunities WHERE id = ${id} LIMIT 1`;
      if (!current) return NextResponse.json({ ok: false, error: "Opportunity not found." }, { status: 404 });

      const nextName = updates.name ?? (current.name as string);
      const nextCompany = updates.company ?? (current.company as string);
      const nextEmail = updates.email ?? (current.email as string);
      const nextPhone = updates.phone !== undefined ? updates.phone : ((current.phone as string | null) ?? null);
      const nextDealValue = updates.dealValue !== undefined ? updates.dealValue : Number(current.deal_value ?? 0);
      const nextTimeline = updates.timeline !== undefined ? updates.timeline : ((current.timeline as string | null) ?? null);
      const nextBudget = updates.budgetBracket !== undefined ? updates.budgetBracket : ((current.budget_bracket as string | null) ?? null);
      const nextMessage = updates.message !== undefined ? updates.message : ((current.message as string | null) ?? null);
      const nextDeliverables = updates.deliverables !== undefined ? JSON.stringify(updates.deliverables) : JSON.stringify(current.deliverables ?? []);
      const nextLocation = updates.location !== undefined ? updates.location : ((current.location as string | null) ?? null);
      const nextWebsite = updates.websiteUrl !== undefined ? updates.websiteUrl : ((current.website_url as string | null) ?? null);
      const nextIndustry = updates.industry !== undefined ? updates.industry : ((current.industry as string | null) ?? null);
      const nextBottleneck = updates.currentBottleneck !== undefined ? updates.currentBottleneck : ((current.current_bottleneck as string | null) ?? null);
      const nextGrowthGoal = updates.growthGoal !== undefined ? updates.growthGoal : ((current.growth_goal as string | null) ?? null);
      const nextAssist = updates.howWeAssist !== undefined ? JSON.stringify(updates.howWeAssist) : JSON.stringify(current.how_we_assist ?? []);
      const nextRoleLeader = updates.roleLeader !== undefined ? updates.roleLeader : ((current.role_leader as string | null) ?? null);
      const nextLeadScore = updates.leadScore !== undefined ? updates.leadScore : ((current.lead_score as string | null) ?? null);
      const nextTags = updates.tags !== undefined ? JSON.stringify(updates.tags) : JSON.stringify(current.tags ?? []);
      const nextInternalNotes = updates.internalNotes !== undefined ? updates.internalNotes : ((current.internal_notes as string | null) ?? null);

      const [savedRow] = await sql`
        UPDATE opportunities
        SET name = ${nextName},
            company = ${nextCompany},
            email = ${nextEmail},
            phone = ${nextPhone},
            deal_value = ${nextDealValue},
            timeline = ${nextTimeline},
            budget_bracket = ${nextBudget},
            message = ${nextMessage},
            deliverables = ${nextDeliverables}::jsonb,
            location = ${nextLocation},
            website_url = ${nextWebsite},
            industry = ${nextIndustry},
            current_bottleneck = ${nextBottleneck},
            growth_goal = ${nextGrowthGoal},
            how_we_assist = ${nextAssist}::jsonb,
            role_leader = ${nextRoleLeader},
            lead_score = ${nextLeadScore},
            tags = ${nextTags}::jsonb,
            internal_notes = ${nextInternalNotes}
        WHERE id = ${id}
        RETURNING id, name, company, email, stage, deal_value::float8 as "dealValue", recommended_tier as "recommendedTier",
                  needs, timeline, phone, budget_bracket as "budgetBracket", message, deliverables,
                  location, website_url as "websiteUrl", industry, current_bottleneck as "currentBottleneck",
                  growth_goal as "growthGoal", how_we_assist as "howWeAssist", role_leader as "roleLeader",
                  lead_score as "leadScore", tags, internal_notes as "internalNotes",
                  created_at as "createdAt";
      `;
      db.updateOpportunity(id, updates);
      return NextResponse.json({ ok: true, data: savedRow });
    }
    const updated = db.updateOpportunity(id, updates);
    if (!updated) return NextResponse.json({ ok: false, error: "Opportunity not found." }, { status: 404 });
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
            id, name, company, email, stage, deal_value, recommended_tier, needs, timeline, phone, budget_bracket, message, deliverables,
            location, website_url, industry, current_bottleneck, growth_goal, how_we_assist, role_leader, lead_score, tags, internal_notes
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
            ${JSON.stringify(newOpp.deliverables ?? [])}::jsonb,
            ${newOpp.location ?? null},
            ${newOpp.websiteUrl ?? null},
            ${newOpp.industry ?? null},
            ${newOpp.currentBottleneck ?? null},
            ${newOpp.growthGoal ?? null},
            ${JSON.stringify(newOpp.howWeAssist ?? [])}::jsonb,
            ${newOpp.roleLeader ?? null},
            ${newOpp.leadScore ?? null},
            ${JSON.stringify(newOpp.tags ?? [])}::jsonb,
            ${newOpp.internalNotes ?? null}
          ) ON CONFLICT (id) DO NOTHING;
        `;
      } catch (sqlErr) {
        console.warn("Neon SQL lead insert warning:", sqlErr);
      }
    }

    inserted.push(newOpp);

    const shouldNotify = item.notifyTeam === true || (item.notifyTeam !== false && body.notifyTeam === true);
    if (shouldNotify) {
      try {
        const needsText = (newOpp.needs && newOpp.needs.length > 0) ? newOpp.needs.join(", ") : "Full Studio Scope";
        const emailNotice = db.sendEmail({
          sender: "Website Brief Engine",
          senderEmail: "briefs@thevirtuslabs.com",
          recipient: "leads@thevirtuslabs.com",
          subject: `New Inbound Inquiry: ${newOpp.company} ($${newOpp.dealValue.toLocaleString()})`,
          preview: `New project brief submitted for ${newOpp.company}...`,
          body: `New Lead Intake Details:\n\nContact: ${newOpp.name}\nCompany: ${newOpp.company}\nNeeds: ${needsText}\nUrgency: ${newOpp.timeline || "In a few weeks"}\nEstimated Value: $${newOpp.dealValue.toLocaleString()}\nRecommended Tier: ${newOpp.recommendedTier}\n\nView Opportunity in Pipeline ->`,
          folder: "inquiries",
          clientName: newOpp.company,
        });

        if (process.env.SMTP_PASS) {
          const nodemailer = await import("nodemailer");
          const smtpHost = process.env.SMTP_HOST || "mail.privateemail.com";
          const smtpPort = Number(process.env.SMTP_PORT || 465);
          const smtpSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : smtpPort === 465;
          const smtpUser = process.env.SMTP_USER || "hello@thevirtuslabs.com";
          const smtpFrom = process.env.SMTP_FROM || `"The Virtus Labs" <${smtpUser}>`;
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            auth: { user: smtpUser, pass: process.env.SMTP_PASS },
          });
          await transporter.sendMail({
            from: smtpFrom,
            to: process.env.TEAM_NOTIFICATION_EMAIL || smtpUser,
            subject: emailNotice.subject,
            text: emailNotice.body,
          });
        }
      } catch (notifyErr) {
        console.warn("Could not dispatch team notification email:", notifyErr);
      }
    }
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

export async function DELETE(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const url = new URL(request.url);
  const queryId = str(url.searchParams.get("id"), 64);
  let ids: string[] = queryId ? [queryId] : [];

  if (ids.length === 0) {
    const body = await readJsonObject(request).catch(() => null);
    if (body && Array.isArray(body.ids)) {
      ids = body.ids.map((v) => str(v, 64)).filter((v): v is string => Boolean(v));
    } else if (body && typeof body.id === "string") {
      const single = str(body.id, 64);
      if (single) ids = [single];
    }
  }

  if (ids.length === 0) return badRequest("Missing opportunity id(s) to delete.", "id");

  const sql = isNeonConfigured() ? getNeonSql() : null;
  try {
    if (sql) {
      await sql`DELETE FROM opportunities WHERE id = ANY(${ids});`;
    }
    for (const id of ids) {
      db.removeOpportunity(id);
    }
    return NextResponse.json({ ok: true, deleted: ids.length, ids });
  } catch (err) {
    return sql ? unavailable("DELETE /api/pipeline error", err) : serverError("DELETE /api/pipeline error", err);
  }
}


