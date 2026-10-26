import { NextResponse } from "next/server";
import { db } from "@/db";
import { isNeonConfigured, getNeonSql, ensureInvoiceDetailColumns } from "@/lib/neon";
import { badRequest, forbidden, str, unavailable } from "@/lib/apiUtil";
import { authorizeShare, canViewShare, shareRefusal, type ShareState } from "@/lib/docAccess";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = str(searchParams.get("id"), 64);
  if (!id) return badRequest("Missing invoice id.", "id");

  const state: ShareState = await authorizeShare("invoice", id, searchParams.get("token"));
  if (!canViewShare(state)) return forbidden(shareRefusal(state, "invoice"));

  const sql = isNeonConfigured() ? getNeonSql() : null;
  if (!sql) {
    const found = db.getInvoices().find((i) => i.id === id);
    if (!found) return NextResponse.json({ ok: false, error: "Invoice not found." }, { status: 404 });
    const { clientEmail: _omitted, ...rest } = found;
    return NextResponse.json({ ok: true, data: rest });
  }

  try {
    await ensureInvoiceDetailColumns(sql);
    const rows = await sql`
      SELECT id, invoice_number AS "invoiceNumber", client_id AS "clientId", client_name AS "clientName",
             title,
             amount::float8 AS amount,
             COALESCE(subtotal, amount)::float8 AS subtotal,
             COALESCE(tax_rate, 0)::float8 AS "taxRate",
             COALESCE(tax_amount, 0)::float8 AS "taxAmount",
             COALESCE(discount_amount, 0)::float8 AS "discountAmount",
             COALESCE(line_items, '[]'::jsonb) AS "lineItems",
             notes, payment_terms AS "paymentTerms", payment_url AS "paymentUrl",
             status, to_char(due_date, 'YYYY-MM-DD') AS "dueDate",
             to_char(paid_at, 'YYYY-MM-DD') AS "paidAt",
             to_char(created_at, 'YYYY-MM-DD') AS "createdAt"
      FROM invoices WHERE id = ${id} LIMIT 1`;
    const found = rows[0];
    if (!found) return NextResponse.json({ ok: false, error: "Invoice not found." }, { status: 404 });
    return NextResponse.json({
      ok: true,
      data: {
        ...found,
        // client_email is deliberately not selected: this page is reachable by anyone holding the link.
        lineItems: Array.isArray(found.lineItems) ? found.lineItems : [],
        paidAt: found.paidAt ?? undefined,
        createdAt: found.createdAt ?? undefined,
      },
    });
  } catch (err) {
    return unavailable("GET /api/invoices/public error", err);
  }
}
