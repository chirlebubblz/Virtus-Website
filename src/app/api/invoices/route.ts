import { NextResponse } from "next/server";
import { db } from "@/db";
import type { Invoice } from "@/db";
import { isNeonConfigured, getNeonSql } from "@/lib/neon";
import { denyUnlessStaff } from "@/lib/staffAuth";
import { badRequest, dateOnly, money, readJsonObject, serverError, str, unavailable } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

const STATUSES = ["Paid", "Pending", "Overdue"] as const;

export async function GET() {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const sql = isNeonConfigured() ? getNeonSql() : null;
  if (!sql) return NextResponse.json({ ok: true, source: "local", data: db.getInvoices() });
  try {
    const rows = await sql`
      SELECT id, invoice_number as "invoiceNumber", client_id as "clientId", client_name as "clientName", amount::float8 as amount, status, due_date as "dueDate", paid_at as "paidAt", created_at as "createdAt"
      FROM invoices
      ORDER BY created_at DESC;
    `;
    return NextResponse.json({ ok: true, source: "neon", data: rows });
  } catch (err) {
    return unavailable("GET /api/invoices error", err);
  }
}

export async function POST(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");

  const invoiceNumber = str(body.invoiceNumber, 64);
  const clientId = str(body.clientId, 64);
  const clientName = str(body.clientName, 200);
  const amount = money(body.amount);
  const status = body.status === undefined ? "Pending" : STATUSES.find((s) => s === body.status);
  const dueDate = body.dueDate === undefined || body.dueDate === ""
    ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : dateOnly(body.dueDate);

  if (!invoiceNumber) return badRequest("Enter an invoice number.", "invoiceNumber");
  if (!clientId) return badRequest("Choose a client.", "clientId");
  if (!clientName) return badRequest("Enter the client name.", "clientName");
  if (amount === null || amount <= 0) return badRequest("Enter an amount greater than zero.", "amount");
  if (!status) return badRequest("Status must be Paid, Pending or Overdue.", "status");
  if (!dueDate) return badRequest("Enter the due date as YYYY-MM-DD.", "dueDate");

  const invoice: Omit<Invoice, "id"> = {
    invoiceNumber,
    clientId,
    clientName,
    company: str(body.company, 200) ?? clientName,
    amount,
    status,
    dueDate,
  };

  const sql = isNeonConfigured() ? getNeonSql() : null;
  try {
    if (sql) {
      const dupe = await sql`SELECT 1 FROM invoices WHERE invoice_number = ${invoiceNumber} LIMIT 1;`;
      if (dupe.length > 0) return badRequest("That invoice number is already used.", "invoiceNumber");
      const known = await sql`SELECT 1 FROM clients WHERE id = ${clientId} LIMIT 1;`;
      if (known.length === 0) return badRequest("Unknown client.", "clientId");
    } else {
      if (db.getInvoices().some((i) => i.invoiceNumber === invoiceNumber)) {
        return badRequest("That invoice number is already used.", "invoiceNumber");
      }
      if (!db.getClientById(clientId)) return badRequest("Unknown client.", "clientId");
    }

    const created = db.addInvoice(invoice);
    if (sql) {
      await sql`
        INSERT INTO invoices (id, invoice_number, client_id, client_name, amount, status, due_date)
        VALUES (${created.id}, ${created.invoiceNumber}, ${created.clientId}, ${created.clientName}, ${created.amount}, ${created.status}, ${created.dueDate});
      `;
    }
    return NextResponse.json({ ok: true, data: created });
  } catch (err) {
    return sql ? unavailable("POST /api/invoices error", err) : serverError("POST /api/invoices error", err);
  }
}
