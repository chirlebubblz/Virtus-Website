import { NextResponse } from "next/server";
import { db } from "@/db";
import type { Proposal } from "@/db";
import { getNeonSql, isNeonConfigured } from "@/lib/neon";
import { denyUnlessStaff } from "@/lib/staffAuth";
import { badRequest, dateOnly, money, readJsonObject, serverError, str, unavailable } from "@/lib/apiUtil";
import { insertNumbered, nextNumber, yearPrefix } from "@/lib/numbering";
import { dispatchWebhook } from "@/lib/webhooks";
import { sendAutomatedEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

// Admin only (middleware and handlers). Neon is the source of truth; the in-memory store is the dev fallback.

const STATUSES: Proposal["status"][] = ["Draft", "Sent", "Accepted", "Declined"];
const DEFAULT_TIMELINE = "4 Weeks Delivery";

type Sql = NonNullable<ReturnType<typeof getNeonSql>>;
const neon = (): Sql | null => (isNeonConfigured() ? getNeonSql() : null);

const inDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const newId = (prefix: string) => `${prefix}-${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

/** Up to 20 non-empty lines of at most 200 characters, or null when the value is not a list of text. */
function scopeList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim().slice(0, 200))
    .slice(0, 20);
}

// Dates are formatted in SQL so the day never shifts with the server's timezone.
async function selectProposals(sql: Sql, id?: string): Promise<Proposal[]> {
  const rows = id
    ? await sql`
        SELECT id, proposal_number AS "proposalNumber", client_id AS "clientId", client_name AS "clientName", company, title,
               amount::float8 AS amount, status, to_char(valid_until, 'YYYY-MM-DD') AS "validUntil",
               scope_summary AS "scopeSummary", timeline, to_char(created_at, 'YYYY-MM-DD') AS "createdAt"
        FROM proposals WHERE id = ${id} LIMIT 1`
    : await sql`
        SELECT id, proposal_number AS "proposalNumber", client_id AS "clientId", client_name AS "clientName", company, title,
               amount::float8 AS amount, status, to_char(valid_until, 'YYYY-MM-DD') AS "validUntil",
               scope_summary AS "scopeSummary", timeline, to_char(created_at, 'YYYY-MM-DD') AS "createdAt"
        FROM proposals ORDER BY created_at DESC`;
  return (rows as Proposal[]).map((r) => ({ ...r, validUntil: r.validUntil ?? "", scopeSummary: r.scopeSummary ?? [] }));
}

export async function GET() {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const sql = neon();
  if (!sql) return NextResponse.json({ ok: true, source: "local", data: db.getProposals() });
  try {
    return NextResponse.json({ ok: true, source: "neon", data: await selectProposals(sql) });
  } catch (err) {
    return unavailable("GET /api/proposals error", err);
  }
}

/** Creates a proposal marked Sent. The number and company come from the server. */
export async function POST(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");

  const clientId = str(body.clientId, 64);
  const title = str(body.title, 200);
  const amount = money(body.amount);
  const contact = str(body.clientName, 200); // the contact person the proposal is addressed to
  const timeline = str(body.timeline, 100) ?? DEFAULT_TIMELINE;
  const validUntil = body.validUntil === undefined || body.validUntil === "" ? inDays(30) : dateOnly(body.validUntil);
  const scopeSummary = body.scopeSummary === undefined ? [] : scopeList(body.scopeSummary);

  if (!clientId) return badRequest("Choose a client.", "clientId");
  if (!title) return badRequest("Enter a title.", "title");
  if (amount === null || amount <= 0) return badRequest("Enter an amount greater than zero.", "amount");
  if (!validUntil) return badRequest("Enter the valid-until date as YYYY-MM-DD.", "validUntil");
  if (!scopeSummary) return badRequest("Scope must be a list of items.", "scopeSummary");

  const prefix = yearPrefix("PROP");
  const sql = neon();
  try {
    if (!sql) {
      const client = db.getClientById(clientId);
      if (!client) return badRequest("Unknown client.", "clientId");
      const created = db.addProposal({
        proposalNumber: nextNumber(prefix, db.getProposals().map((p) => p.proposalNumber)),
        clientId,
        clientName: contact ?? client.contactName ?? client.name,
        company: client.company,
        title,
        amount,
        status: "Sent",
        validUntil,
        scopeSummary,
        timeline,
      });
      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    }

    const [client] = await sql`SELECT name, contact_name AS "contactName", company FROM clients WHERE id = ${clientId} LIMIT 1`;
    if (!client) return badRequest("Unknown client.", "clientId");

    const id = newId("prop");
    await insertNumbered(
      prefix,
      async () => (await sql`SELECT proposal_number AS n FROM proposals WHERE proposal_number LIKE ${prefix + "%"}`).map((r) => String(r.n)),
      (proposalNumber) => sql`
        INSERT INTO proposals (id, proposal_number, client_id, client_name, company, title, amount, status, valid_until, scope_summary, timeline)
        VALUES (${id}, ${proposalNumber}, ${clientId}, ${contact ?? client.contactName ?? client.name}, ${client.company}, ${title},
                ${amount}, 'Sent', ${validUntil}, ${JSON.stringify(scopeSummary)}::jsonb, ${timeline})`
    );
    const [created] = await selectProposals(sql, id);
    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (err) {
    return sql ? unavailable("POST /api/proposals error", err) : serverError("POST /api/proposals error", err);
  }
}

interface Accepted {
  projectId: string;
  invoiceNumber: string;
}

/**
 * What accepting a proposal does, in Neon: start or reactivate the client's project, issue a 50% deposit invoice,
 * and add the amount to the client's revenue. Called only by the request whose status change flipped the proposal
 * to Accepted, so it runs once.
 */
// ponytail: separate statements over the HTTP driver, not one transaction. A failure part-way can leave an
// invoice without the project or revenue update; the caller reverts the status so the admin can retry. Move to a
// Pool transaction if this ever needs to be all-or-nothing.
async function runAcceptance(sql: Sql, p: Proposal): Promise<Accepted> {
  const invoiceId = newId("inv");
  const invPrefix = yearPrefix("INV");
  const invoiceNumber = await insertNumbered(
    invPrefix,
    async () => (await sql`SELECT invoice_number AS n FROM invoices WHERE invoice_number LIKE ${invPrefix + "%"}`).map((r) => String(r.n)),
    (number) => sql`
      INSERT INTO invoices (id, invoice_number, client_id, client_name, amount, status, due_date)
      VALUES (${invoiceId}, ${number}, ${p.clientId}, ${p.company}, ${Math.round(p.amount * 50) / 100}, 'Pending', ${inDays(14)})`
  );

  // The client portal shows the client's first project, so reuse it when there is one.
  const [existing] = await sql`SELECT id FROM projects WHERE client_id = ${p.clientId} ORDER BY created_at ASC LIMIT 1`;
  let projectId: string;
  if (existing) {
    projectId = existing.id as string;
    await sql`UPDATE projects SET budget = ${p.amount}, phase = 'Discover', progress = GREATEST(COALESCE(progress, 0), 15) WHERE id = ${projectId}`;
  } else {
    projectId = newId("proj");
    await sql`
      INSERT INTO projects (id, client_id, client_name, title, phase, progress, risk_level, budget, start_date, target_date)
      VALUES (${projectId}, ${p.clientId}, ${p.company}, ${p.title}, 'Discover', 10, 'On Track', ${p.amount}, ${inDays(0)}, ${inDays(30)})`;
  }

  await sql`
    UPDATE clients
    SET status = 'Active',
        total_revenue = COALESCE(total_revenue, 0) + ${p.amount},
        active_projects_count = COALESCE(active_projects_count, 0) + ${existing ? 0 : 1}
    WHERE id = ${p.clientId}`;

  return { projectId, invoiceNumber };
}

/** Webhook and client email after an acceptance. Fire and forget; neither can fail the request. */
function announceAcceptance(p: Proposal, accepted: Accepted, client: { email?: string; name?: string; company?: string } | undefined) {
  void dispatchWebhook({
    event: "proposal_accepted",
    title: `Proposal Accepted: ${p.company}`,
    description: `**${p.company}** has accepted proposal **${p.proposalNumber}** (${p.title}) for **$${p.amount.toLocaleString()}**.\nActive project and 50% deposit invoice created automatically.`,
    data: {
      proposalNumber: p.proposalNumber,
      company: p.company,
      title: p.title,
      amount: `$${p.amount.toLocaleString()}`,
      projectId: accepted.projectId,
      invoiceNumber: accepted.invoiceNumber,
    },
  });
  if (client?.email) {
    void sendAutomatedEmail({
      templateId: "proposal_accepted",
      recipient: client.email,
      variables: {
        clientName: client.name ?? p.clientName,
        company: client.company ?? p.company,
        proposalTitle: p.title,
        dealValue: `$${p.amount.toLocaleString()}`,
        timeline: p.timeline,
      },
    });
  }
}

/** Edits fields and/or status. Moving to Accepted starts the project and deposit invoice exactly once. */
export async function PATCH(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");
  const id = str(body.id, 64);
  if (!id) return badRequest("Missing proposal id.", "id");

  const updates: Partial<Omit<Proposal, "id">> = {};
  if (body.title !== undefined) {
    const title = str(body.title, 200);
    if (!title) return badRequest("Enter a title.", "title");
    updates.title = title;
  }
  if (body.amount !== undefined) {
    const amount = money(body.amount);
    if (amount === null || amount <= 0) return badRequest("Enter an amount greater than zero.", "amount");
    updates.amount = amount;
  }
  if (body.timeline !== undefined) updates.timeline = str(body.timeline, 100) ?? DEFAULT_TIMELINE;
  if (body.validUntil !== undefined && body.validUntil !== "") {
    const validUntil = dateOnly(body.validUntil);
    if (!validUntil) return badRequest("Enter the valid-until date as YYYY-MM-DD.", "validUntil");
    updates.validUntil = validUntil;
  }
  if (body.scopeSummary !== undefined) {
    const scope = scopeList(body.scopeSummary);
    if (!scope) return badRequest("Scope must be a list of items.", "scopeSummary");
    updates.scopeSummary = scope;
  }
  if (body.status !== undefined) {
    const status = STATUSES.find((s) => s === body.status);
    if (!status) return badRequest("Choose a valid status.", "status");
    updates.status = status;
  }

  const sql = neon();
  try {
    if (!sql) return patchLocal(id, updates);

    const [current] = await selectProposals(sql, id);
    if (!current) return NextResponse.json({ ok: false, error: "Proposal not found." }, { status: 404 });
    const next = { ...current, ...updates };

    // One statement: apply the edit and report the status it replaced. The row lock makes a second, concurrent
    // accept see "Accepted" as the old status, so only one request runs the acceptance.
    const [changed] = await sql`
      UPDATE proposals p
      SET title = ${next.title}, amount = ${next.amount}, timeline = ${next.timeline},
          valid_until = ${next.validUntil || null}, scope_summary = ${JSON.stringify(next.scopeSummary)}::jsonb, status = ${next.status}
      FROM (SELECT status FROM proposals WHERE id = ${id} FOR UPDATE) old
      WHERE p.id = ${id}
      RETURNING old.status AS "oldStatus"`;
    if (!changed) return NextResponse.json({ ok: false, error: "Proposal not found." }, { status: 404 });

    let accepted: Accepted | null = null;
    if (next.status === "Accepted" && changed.oldStatus !== "Accepted") {
      try {
        accepted = await runAcceptance(sql, next);
      } catch (err) {
        // Put the status back so the admin can try again; nothing reports success that did not happen.
        await sql`UPDATE proposals SET status = ${changed.oldStatus as string} WHERE id = ${id}`.catch(() => undefined);
        return unavailable("PATCH /api/proposals acceptance error", err);
      }
      const [client] = await sql`SELECT email, contact_name AS "name", company FROM clients WHERE id = ${next.clientId} LIMIT 1`;
      announceAcceptance(next, accepted, client as { email?: string; name?: string; company?: string } | undefined);
    }

    const [saved] = await selectProposals(sql, id);
    return NextResponse.json({ ok: true, data: saved, ...(accepted ? { accepted } : {}) });
  } catch (err) {
    return unavailable("PATCH /api/proposals error", err);
  }
}

/** Dev store without a database. Accepting runs acceptProposal once (updateProposal already calls it). */
function patchLocal(id: string, updates: Partial<Omit<Proposal, "id">>) {
  const current = db.getProposals().find((p) => p.id === id);
  if (!current) return NextResponse.json({ ok: false, error: "Proposal not found." }, { status: 404 });
  const accepting = updates.status === "Accepted" && current.status !== "Accepted";
  const { status: _status, ...fields } = updates;
  const saved = db.updateProposal(id, accepting ? fields : updates);
  if (!saved) return NextResponse.json({ ok: false, error: "Proposal not found." }, { status: 404 });
  if (!accepting) return NextResponse.json({ ok: true, data: saved });

  const result = db.acceptProposal(id);
  if (!result) return NextResponse.json({ ok: false, error: "Proposal not found." }, { status: 404 });
  const accepted = { projectId: result.project.id, invoiceNumber: result.invoice.invoiceNumber };
  const client = db.getClientById(saved.clientId);
  announceAcceptance(result.proposal, accepted, client && { email: client.email, name: client.contactName ?? client.name, company: client.company });
  return NextResponse.json({ ok: true, data: result.proposal, accepted });
}

export async function DELETE(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const id = str(new URL(request.url).searchParams.get("id"), 64);
  if (!id) return badRequest("Missing proposal id.", "id");

  const sql = neon();
  try {
    const deleted = sql
      ? (await sql`DELETE FROM proposals WHERE id = ${id} RETURNING id`).length > 0
      : db.deleteProposal(id);
    if (!deleted) return NextResponse.json({ ok: false, error: "Proposal not found." }, { status: 404 });
    return NextResponse.json({ ok: true, data: { id } });
  } catch (err) {
    return sql ? unavailable("DELETE /api/proposals error", err) : serverError("DELETE /api/proposals error", err);
  }
}
