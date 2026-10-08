import { NextResponse } from "next/server";
import { db } from "@/db";
import type { Invoice } from "@/db";
import { isNeonConfigured, getNeonSql } from "@/lib/neon";
import { denyUnlessStaff } from "@/lib/staffAuth";
import { badRequest, dateOnly, money, readJsonObject, serverError, str, unavailable } from "@/lib/apiUtil";
import { NUMBER_ATTEMPTS, isUniqueViolation, nextNumber, yearPrefix } from "@/lib/numbering";

export const dynamic = "force-dynamic";

// Admin only (middleware and handlers). Neon is the source of truth; the in-memory store is the dev fallback.

type Sql = NonNullable<ReturnType<typeof getNeonSql>>;
const neon = (): Sql | null => (isNeonConfigured() ? getNeonSql() : null);

// Dates are formatted in SQL so the day never shifts with the server's timezone.
async function selectInvoices(sql: Sql, id?: string): Promise<Invoice[]> {
  const rows = id
    ? await sql`
        SELECT id, invoice_number AS "invoiceNumber", client_id AS "clientId", client_name AS "clientName",
               amount::float8 AS amount, status, to_char(due_date, 'YYYY-MM-DD') AS "dueDate",
               to_char(paid_at, 'YYYY-MM-DD') AS "paidAt"
        FROM invoices WHERE id = ${id} LIMIT 1`
    : await sql`
        SELECT id, invoice_number AS "invoiceNumber", client_id AS "clientId", client_name AS "clientName",
               amount::float8 AS amount, status, to_char(due_date, 'YYYY-MM-DD') AS "dueDate",
               to_char(paid_at, 'YYYY-MM-DD') AS "paidAt"
        FROM invoices ORDER BY created_at DESC`;
  return (rows as Invoice[]).map((r) => ({ ...r, paidAt: r.paidAt ?? undefined }));
}

export async function GET() {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const sql = neon();
  if (!sql) return NextResponse.json({ ok: true, source: "local", data: db.getInvoices() });
  try {
    return NextResponse.json({ ok: true, source: "neon", data: await selectInvoices(sql) });
  } catch (err) {
    return unavailable("GET /api/invoices error", err);
  }
}

/** Issues an invoice. The number and client name come from the server, never from the request. */
export async function POST(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");

  const clientId = str(body.clientId, 64);
  const amount = money(body.amount);
  const dueDate = body.dueDate === undefined || body.dueDate === ""
    ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : dateOnly(body.dueDate);

  if (!clientId) return badRequest("Choose a client.", "clientId");
  if (amount === null || amount <= 0) return badRequest("Enter an amount greater than zero.", "amount");
  if (!dueDate) return badRequest("Enter the due date as YYYY-MM-DD.", "dueDate");

  const prefix = yearPrefix("INV");
  const sql = neon();
  try {
    if (!sql) {
      const client = db.getClientById(clientId);
      if (!client) return badRequest("Unknown client.", "clientId");
      const invoiceNumber = nextNumber(prefix, db.getInvoices().map((i) => i.invoiceNumber));
      const created = db.addInvoice({ invoiceNumber, clientId, clientName: client.company, amount, status: "Pending", dueDate });
      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    }

    const [client] = await sql`SELECT company FROM clients WHERE id = ${clientId} LIMIT 1`;
    if (!client) return badRequest("Unknown client.", "clientId");

    const id = `inv-${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    for (let attempt = 1; ; attempt++) {
      const taken = await sql`SELECT invoice_number AS n FROM invoices WHERE invoice_number LIKE ${prefix + "%"}`;
      const invoiceNumber = nextNumber(prefix, taken.map((r) => String(r.n)));
      try {
        await sql`
          INSERT INTO invoices (id, invoice_number, client_id, client_name, amount, status, due_date)
          VALUES (${id}, ${invoiceNumber}, ${clientId}, ${client.company}, ${amount}, 'Pending', ${dueDate})`;
        break;
      } catch (err) {
        if (!isUniqueViolation(err) || attempt >= NUMBER_ATTEMPTS) throw err;
      }
    }
    const [created] = await selectInvoices(sql, id);
    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (err) {
    return sql ? unavailable("POST /api/invoices error", err) : serverError("POST /api/invoices error", err);
  }
}

/** Marks an invoice paid. Atomic: only a Pending or Overdue invoice changes, so two clicks never double-pay. */
export async function PATCH(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");
  const id = str(body.id, 64);
  if (!id) return badRequest("Missing invoice id.", "id");
  if (body.status !== "Paid") return badRequest("Only marking an invoice paid is supported.", "status");

  const sql = neon();
  try {
    if (!sql) {
      const current = db.getInvoices().find((i) => i.id === id);
      if (!current) return NextResponse.json({ ok: false, error: "Invoice not found." }, { status: 404 });
      if (current.status === "Paid") return NextResponse.json({ ok: false, error: "This invoice is already paid." }, { status: 409 });
      return NextResponse.json({ ok: true, data: db.markInvoicePaid(id) });
    }

    const changed = await sql`UPDATE invoices SET status = 'Paid', paid_at = NOW() WHERE id = ${id} AND status <> 'Paid' RETURNING id`;
    if (changed.length === 0) {
      const exists = await sql`SELECT 1 FROM invoices WHERE id = ${id} LIMIT 1`;
      return exists.length === 0
        ? NextResponse.json({ ok: false, error: "Invoice not found." }, { status: 404 })
        : NextResponse.json({ ok: false, error: "This invoice is already paid." }, { status: 409 });
    }
    const [saved] = await selectInvoices(sql, id);
    return NextResponse.json({ ok: true, data: saved });
  } catch (err) {
    return sql ? unavailable("PATCH /api/invoices error", err) : serverError("PATCH /api/invoices error", err);
  }
}
