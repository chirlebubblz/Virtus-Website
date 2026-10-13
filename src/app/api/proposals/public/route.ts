import { NextResponse } from "next/server";
import { db } from "@/db";
import type { Proposal } from "@/db";
import { getNeonSql, isNeonConfigured } from "@/lib/neon";
import { badRequest, readJsonObject, serverError, str, unavailable } from "@/lib/apiUtil";
import { insertNumbered, yearPrefix } from "@/lib/numbering";
import { clientIp, isBlocked, recordFailure } from "@/lib/rateLimit";
import { dispatchWebhook } from "@/lib/webhooks";
import { sendAutomatedEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

type Sql = NonNullable<ReturnType<typeof getNeonSql>>;
const neon = (): Sql | null => (isNeonConfigured() ? getNeonSql() : null);

const inDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const newId = (prefix: string) => `${prefix}-${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

async function selectOneProposal(sql: Sql, id: string): Promise<Proposal | null> {
  const rows = await sql`
    SELECT id, proposal_number AS "proposalNumber", client_id AS "clientId", client_name AS "clientName", company, title,
           amount::float8 AS amount, status, to_char(valid_until, 'YYYY-MM-DD') AS "validUntil",
           scope_summary AS "scopeSummary", timeline, to_char(created_at, 'YYYY-MM-DD') AS "createdAt"
    FROM proposals WHERE id = ${id} LIMIT 1`;
  const row = (rows as Proposal[])[0];
  if (!row) return null;
  return { ...row, validUntil: row.validUntil ?? "", scopeSummary: row.scopeSummary ?? [] };
}

export async function GET(request: Request) {
  const id = str(new URL(request.url).searchParams.get("id"), 64);
  if (!id) return badRequest("Missing proposal id.", "id");

  const sql = neon();
  try {
    const proposal = sql
      ? await selectOneProposal(sql, id)
      : db.getProposals().find((p) => p.id === id) ?? null;
    if (!proposal) return NextResponse.json({ ok: false, error: "Proposal not found." }, { status: 404 });
    return NextResponse.json({ ok: true, data: proposal });
  } catch (err) {
    return sql ? unavailable("GET /api/proposals/public error", err) : serverError("GET /api/proposals/public error", err);
  }
}

export async function POST(request: Request) {
  const ipKey = `proposal-public:${clientIp(request)}`;
  if (isBlocked(ipKey, 15)) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Please try again shortly." }, { status: 429 });
  }
  recordFailure(ipKey, 15 * 60 * 1000);

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");
  const id = str(body.id, 64);
  const action = body.action === "decline" ? "Declined" : "Accepted";
  if (!id) return badRequest("Missing proposal id.", "id");

  const sql = neon();
  try {
    if (!sql) {
      const current = db.getProposals().find((p) => p.id === id);
      if (!current) return NextResponse.json({ ok: false, error: "Proposal not found." }, { status: 404 });
      if (current.status === "Accepted") {
        return NextResponse.json({ ok: true, data: current });
      }
      if (action === "Declined") {
        const declined = db.updateProposal(id, { status: "Declined" });
        return NextResponse.json({ ok: true, data: declined });
      }
      const result = db.acceptProposal(id);
      if (!result) return NextResponse.json({ ok: false, error: "Proposal not found." }, { status: 404 });
      return NextResponse.json({
        ok: true,
        data: result.proposal,
        accepted: { projectId: result.project.id, invoiceNumber: result.invoice.invoiceNumber },
      });
    }

    const current = await selectOneProposal(sql, id);
    if (!current) return NextResponse.json({ ok: false, error: "Proposal not found." }, { status: 404 });
    if (current.status === "Accepted") {
      return NextResponse.json({ ok: true, data: current });
    }

    const [changed] = await sql`
      UPDATE proposals p
      SET status = ${action}
      FROM (SELECT status FROM proposals WHERE id = ${id} FOR UPDATE) old
      WHERE p.id = ${id}
      RETURNING old.status AS "oldStatus"`;
    if (!changed) return NextResponse.json({ ok: false, error: "Proposal not found." }, { status: 404 });

    let accepted: { projectId: string; invoiceNumber: string } | null = null;
    if (action === "Accepted" && changed.oldStatus !== "Accepted") {
      try {
        const invoiceId = newId("inv");
        const invPrefix = yearPrefix("INV");
        const invoiceNumber = await insertNumbered(
          invPrefix,
          async () => (await sql`SELECT invoice_number AS n FROM invoices WHERE invoice_number LIKE ${invPrefix + "%"}`).map((r) => String(r.n)),
          (number) => sql`
            INSERT INTO invoices (id, invoice_number, client_id, client_name, amount, status, due_date)
            VALUES (${invoiceId}, ${number}, ${current.clientId}, ${current.company}, ${Math.round(current.amount * 50) / 100}, 'Pending', ${inDays(14)})`
        );

        const [existing] = await sql`SELECT id FROM projects WHERE client_id = ${current.clientId} ORDER BY created_at ASC LIMIT 1`;
        let projectId: string;
        if (existing) {
          projectId = existing.id as string;
          await sql`UPDATE projects SET budget = ${current.amount}, phase = 'Discover', progress = GREATEST(COALESCE(progress, 0), 15) WHERE id = ${projectId}`;
        } else {
          projectId = newId("proj");
          await sql`
            INSERT INTO projects (id, client_id, client_name, title, phase, progress, risk_level, budget, start_date, target_date)
            VALUES (${projectId}, ${current.clientId}, ${current.company}, ${current.title}, 'Discover', 10, 'On Track', ${current.amount}, ${inDays(0)}, ${inDays(30)})`;
        }

        await sql`
          UPDATE clients
          SET status = 'Active',
              total_revenue = COALESCE(total_revenue, 0) + ${current.amount},
              active_projects_count = COALESCE(active_projects_count, 0) + ${existing ? 0 : 1}
          WHERE id = ${current.clientId}`;

        accepted = { projectId, invoiceNumber };

        const [client] = await sql`SELECT email, contact_name AS "name", company FROM clients WHERE id = ${current.clientId} LIMIT 1`;
        void dispatchWebhook({
          event: "proposal_accepted",
          title: `Proposal Accepted Online: ${current.company}`,
          description: `**${current.company}** accepted proposal **${current.proposalNumber}** (${current.title}) for **$${current.amount.toLocaleString()}**.`,
          data: {
            proposalNumber: current.proposalNumber,
            company: current.company,
            title: current.title,
            amount: `$${current.amount.toLocaleString()}`,
            projectId: accepted.projectId,
            invoiceNumber: accepted.invoiceNumber,
          },
        });
        if (client?.email) {
          void sendAutomatedEmail({
            templateId: "proposal_accepted",
            recipient: String(client.email),
            variables: {
              clientName: String(client.name ?? current.clientName),
              company: String(client.company ?? current.company),
              proposalTitle: current.title,
              dealValue: `$${current.amount.toLocaleString()}`,
              timeline: current.timeline,
            },
          });
        }
      } catch (err) {
        await sql`UPDATE proposals SET status = ${changed.oldStatus as string} WHERE id = ${id}`.catch(() => undefined);
        return unavailable("POST /api/proposals/public acceptance error", err);
      }
    }

    const updated = await selectOneProposal(sql, id);
    return NextResponse.json({ ok: true, data: updated, ...(accepted ? { accepted } : {}) });
  } catch (err) {
    return unavailable("POST /api/proposals/public error", err);
  }
}
