import { NextResponse } from "next/server";
import { db } from "@/db";
import type { Invoice, InvoiceLineItem } from "@/db";
import { isNeonConfigured, getNeonSql, ensureInvoiceDetailColumns } from "@/lib/neon";
import { denyUnlessStaff } from "@/lib/staffAuth";
import { badRequest, dateOnly, money, readJsonObject, serverError, str, unavailable } from "@/lib/apiUtil";
import { insertNumbered, nextNumber, yearPrefix } from "@/lib/numbering";
import { sendAutomatedEmail } from "@/lib/mailer";
import { createShareLink } from "@/lib/docAccess";

export const dynamic = "force-dynamic";

type Sql = NonNullable<ReturnType<typeof getNeonSql>>;
const neon = (): Sql | null => (isNeonConfigured() ? getNeonSql() : null);

function parseLineItems(raw: unknown): InvoiceLineItem[] {
  if (!Array.isArray(raw)) return [];
  const items: InvoiceLineItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const description = str(obj.description, 300);
    const quantity = Number(obj.quantity);
    const unitPrice = Number(obj.unitPrice);
    if (!description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      continue;
    }
    const total = Math.round(quantity * unitPrice * 100) / 100;
    items.push({ description, quantity, unitPrice, total });
  }
  return items;
}

// Dates are formatted in SQL so the day never shifts with the server's timezone.
async function selectInvoices(sql: Sql, id?: string): Promise<Invoice[]> {
  await ensureInvoiceDetailColumns(sql);
  const rows = id
    ? await sql`
        SELECT id, invoice_number AS "invoiceNumber", client_id AS "clientId", client_name AS "clientName",
               client_email AS "clientEmail", title,
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
        FROM invoices WHERE id = ${id} LIMIT 1`
    : await sql`
        SELECT id, invoice_number AS "invoiceNumber", client_id AS "clientId", client_name AS "clientName",
               client_email AS "clientEmail", title,
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
        FROM invoices ORDER BY created_at DESC`;
  return (rows as Invoice[]).map((r) => ({
    ...r,
    lineItems: Array.isArray(r.lineItems) ? r.lineItems : [],
    paidAt: r.paidAt ?? undefined,
    createdAt: r.createdAt ?? undefined,
  }));
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

/** Issues an invoice with optional itemized line items, tax, discount, payment URL, and email dispatch. */
export async function POST(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");

  const clientId = str(body.clientId, 64);
  const title = str(body.title, 255) || "Studio Engagement Invoice";
  const lineItems = parseLineItems(body.lineItems);
  const taxRate = Math.max(0, Math.min(100, Number(body.taxRate) || 0));
  const discountAmount = Math.max(0, Number(body.discountAmount) || 0);
  const notes = str(body.notes, 2000) || undefined;
  const paymentTerms = str(body.paymentTerms, 255) || "Net 14";
  const paymentUrl = str(body.paymentUrl, 1000) || undefined;

  let subtotal = lineItems.length > 0
    ? Math.round(lineItems.reduce((acc, item) => acc + item.total, 0) * 100) / 100
    : (money(body.amount) ?? 0);

  if (subtotal <= 0) {
    const fallbackAmount = money(body.amount);
    if (fallbackAmount && fallbackAmount > 0) {
      subtotal = fallbackAmount;
    }
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxableAmount * (taxRate / 100) * 100) / 100;
  const amount = Math.round((taxableAmount + taxAmount) * 100) / 100;

  const dueDate =
    body.dueDate === undefined || body.dueDate === ""
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : dateOnly(body.dueDate);

  if (!clientId) return badRequest("Choose a client.", "clientId");
  if (!Number.isFinite(amount) || amount <= 0) return badRequest("Enter an amount greater than zero.", "amount");
  if (!dueDate) return badRequest("Enter the due date as YYYY-MM-DD.", "dueDate");

  const prefix = yearPrefix("INV");
  const sql = neon();
  const origin = new URL(request.url).origin;

  try {
    if (!sql) {
      const client = db.getClientById(clientId);
      if (!client) return badRequest("Unknown client.", "clientId");
      const invoiceNumber = nextNumber(prefix, db.getInvoices().map((i) => i.invoiceNumber));
      const created = db.addInvoice({
        invoiceNumber,
        clientId,
        clientName: client.company,
        clientEmail: client.email,
        title,
        amount,
        subtotal,
        taxRate,
        taxAmount,
        discountAmount,
        lineItems,
        notes,
        paymentTerms,
        paymentUrl,
        status: "Pending",
        dueDate,
      });

      let emailSent = false;
      if (body.sendEmail === true && client.email) {
        const res = await sendAutomatedEmail({
          templateId: "invoice_issued",
          recipient: client.email,
          variables: {
            clientName: client.name || client.company,
            company: client.company,
            invoiceNumber: created.invoiceNumber,
            invoiceAmount: `$${created.amount.toLocaleString()}`,
            dueDate: created.dueDate,
            invoiceUrl: `${origin}/invoices/${created.id}`,
          },
        });
        emailSent = res.ok;
      }

      return NextResponse.json({ ok: true, data: created, emailSent }, { status: 201 });
    }

    await ensureInvoiceDetailColumns(sql);
    const [client] = await sql`SELECT name, company, email FROM clients WHERE id = ${clientId} LIMIT 1`;
    if (!client) return badRequest("Unknown client.", "clientId");

    const id = `inv-${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const lineItemsJson = JSON.stringify(lineItems);

    await insertNumbered(
      prefix,
      async () => (await sql`SELECT invoice_number AS n FROM invoices WHERE invoice_number LIKE ${prefix + "%"}`).map((r) => String(r.n)),
      (invoiceNumber) => sql`
        INSERT INTO invoices (
          id, invoice_number, client_id, client_name, client_email, title,
          amount, subtotal, tax_rate, tax_amount, discount_amount, line_items,
          notes, payment_terms, payment_url, status, due_date
        )
        VALUES (
          ${id}, ${invoiceNumber}, ${clientId}, ${client.company}, ${client.email ?? null}, ${title},
          ${amount}, ${subtotal}, ${taxRate}, ${taxAmount}, ${discountAmount}, ${lineItemsJson}::jsonb,
          ${notes ?? null}, ${paymentTerms}, ${paymentUrl ?? null}, 'Pending', ${dueDate}
        )`
    );
    const [created] = await selectInvoices(sql, id);

    let emailSent = false;
    if (body.sendEmail === true && client.email) {
      const res = await sendAutomatedEmail({
        templateId: "invoice_issued",
        recipient: String(client.email),
        variables: {
          clientName: String(client.name || client.company),
          company: String(client.company),
          invoiceNumber: created.invoiceNumber,
          invoiceAmount: `$${created.amount.toLocaleString()}`,
          dueDate: created.dueDate,
          invoiceUrl: `${origin}/invoices/${created.id}`,
        },
      });
      emailSent = res.ok;
    }

    return NextResponse.json({ ok: true, data: created, emailSent }, { status: 201 });
  } catch (err) {
    return sql ? unavailable("POST /api/invoices error", err) : serverError("POST /api/invoices error", err);
  }
}

/** Updates an invoice (status, itemized fields, or sends/resends the invoice email). */
export async function PATCH(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");
  const id = str(body.id, 64);
  if (!id) return badRequest("Missing invoice id.", "id");

  const sql = neon();
  const origin = new URL(request.url).origin;

  try {
    // 1. Handle 1-click share-link creation. Returns the link for the clipboard; the token is stored hashed.
    if (body.action === "share") {
      const link = await createShareLink("invoice", id, origin, () =>
        db.getInvoices().some((i) => i.id === id)
      ).catch(() => null);
      if (!link) return NextResponse.json({ ok: false, error: "Could not create the invoice link." }, { status: 404 });
      return NextResponse.json({ ok: true, data: link });
    }

    // 2. Handle 1-click email dispatch
    if (body.sendInvoiceEmail === true) {
      let inv: Invoice | undefined;
      let recipientEmail = "";
      if (!sql) {
        inv = db.getInvoices().find((i) => i.id === id);
        if (inv) {
          const cli = db.getClientById(inv.clientId);
          recipientEmail = inv.clientEmail || cli?.email || "";
        }
      } else {
        const [row] = await selectInvoices(sql, id);
        inv = row;
        if (inv) {
          recipientEmail = inv.clientEmail || "";
          if (!recipientEmail && inv.clientId) {
            const [cli] = await sql`SELECT email FROM clients WHERE id = ${inv.clientId} LIMIT 1`;
            recipientEmail = cli?.email ? String(cli.email) : "";
          }
        }
      }
      if (!inv) return NextResponse.json({ ok: false, error: "Invoice not found." }, { status: 404 });
      if (!recipientEmail) return badRequest("Client does not have an email address on file.");

      const sent = await sendAutomatedEmail({
        templateId: "invoice_issued",
        recipient: recipientEmail,
        variables: {
          clientName: inv.clientName,
          company: inv.company || inv.clientName,
          invoiceNumber: inv.invoiceNumber,
          invoiceAmount: `$${inv.amount.toLocaleString()}`,
          dueDate: inv.dueDate,
          invoiceUrl: `${origin}/invoices/${inv.id}`,
        },
      });
      return NextResponse.json({ ok: true, data: inv, emailSent: sent.ok });
    }

    // 3. Handle full invoice edit (if lineItems or title or dueDate passed)
    if (body.lineItems !== undefined || body.title !== undefined || body.dueDate !== undefined) {
      const title = str(body.title, 255) || "Studio Engagement Invoice";
      const lineItems = parseLineItems(body.lineItems);
      const taxRate = Math.max(0, Math.min(100, Number(body.taxRate) || 0));
      const discountAmount = Math.max(0, Number(body.discountAmount) || 0);
      const notes = str(body.notes, 2000) || undefined;
      const paymentTerms = str(body.paymentTerms, 255) || "Net 14";
      const paymentUrl = str(body.paymentUrl, 1000) || undefined;
      const dueDate = dateOnly(body.dueDate);
      if (!dueDate) return badRequest("Enter the due date as YYYY-MM-DD.", "dueDate");

      const subtotal = lineItems.length > 0
        ? Math.round(lineItems.reduce((acc, item) => acc + item.total, 0) * 100) / 100
        : (money(body.amount) ?? 0);
      const taxableAmount = Math.max(0, subtotal - discountAmount);
      const taxAmount = Math.round(taxableAmount * (taxRate / 100) * 100) / 100;
      const amount = Math.round((taxableAmount + taxAmount) * 100) / 100;
      if (amount <= 0) return badRequest("Invoice total must be greater than zero.", "amount");

      const status =
        body.status === "Paid" || body.status === "Pending" || body.status === "Overdue"
          ? body.status
          : undefined;

      if (!sql) {
        const updated = db.updateInvoice(id, {
          title,
          lineItems,
          subtotal,
          taxRate,
          taxAmount,
          discountAmount,
          amount,
          notes,
          paymentTerms,
          paymentUrl,
          dueDate,
          ...(status ? { status } : {}),
        });
        if (!updated) return NextResponse.json({ ok: false, error: "Invoice not found." }, { status: 404 });
        return NextResponse.json({ ok: true, data: updated });
      }

      await ensureInvoiceDetailColumns(sql);
      const lineItemsJson = JSON.stringify(lineItems);
      await sql`
        UPDATE invoices
        SET title = ${title},
            amount = ${amount},
            subtotal = ${subtotal},
            tax_rate = ${taxRate},
            tax_amount = ${taxAmount},
            discount_amount = ${discountAmount},
            line_items = ${lineItemsJson}::jsonb,
            notes = ${notes ?? null},
            payment_terms = ${paymentTerms},
            payment_url = ${paymentUrl ?? null},
            due_date = ${dueDate},
            status = COALESCE(${status ?? null}, status),
            paid_at = CASE WHEN ${status ?? null} = 'Paid' AND paid_at IS NULL THEN NOW() ELSE paid_at END
        WHERE id = ${id}`;
      const [saved] = await selectInvoices(sql, id);
      if (!saved) return NextResponse.json({ ok: false, error: "Invoice not found." }, { status: 404 });
      return NextResponse.json({ ok: true, data: saved });
    }

    // 4. Handle atomic Mark Paid / Status toggle
    if (body.status !== "Paid" && body.status !== "Pending" && body.status !== "Overdue") {
      return badRequest("Invalid invoice status.", "status");
    }

    if (!sql) {
      const current = db.getInvoices().find((i) => i.id === id);
      if (!current) return NextResponse.json({ ok: false, error: "Invoice not found." }, { status: 404 });
      if (body.status === "Paid") {
        return NextResponse.json({ ok: true, data: db.markInvoicePaid(id) });
      }
      return NextResponse.json({ ok: true, data: db.updateInvoice(id, { status: body.status }) });
    }

    if (body.status === "Paid") {
      const changed = await sql`UPDATE invoices SET status = 'Paid', paid_at = NOW() WHERE id = ${id} AND status <> 'Paid' RETURNING id`;
      if (changed.length === 0) {
        const exists = await sql`SELECT 1 FROM invoices WHERE id = ${id} LIMIT 1`;
        return exists.length === 0
          ? NextResponse.json({ ok: false, error: "Invoice not found." }, { status: 404 })
          : NextResponse.json({ ok: false, error: "This invoice is already paid." }, { status: 409 });
      }
    } else {
      await sql`UPDATE invoices SET status = ${body.status}, paid_at = NULL WHERE id = ${id}`;
    }

    const [saved] = await selectInvoices(sql, id);
    return NextResponse.json({ ok: true, data: saved });
  } catch (err) {
    return sql ? unavailable("PATCH /api/invoices error", err) : serverError("PATCH /api/invoices error", err);
  }
}

export async function DELETE(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const id = str(searchParams.get("id"), 64);
  if (!id) return badRequest("Missing invoice id.", "id");

  const sql = neon();
  try {
    if (!sql) {
      const deleted = db.deleteInvoice(id);
      if (!deleted) return NextResponse.json({ ok: false, error: "Invoice not found." }, { status: 404 });
      return NextResponse.json({ ok: true, deletedId: id });
    }
    const rows = await sql`DELETE FROM invoices WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) return NextResponse.json({ ok: false, error: "Invoice not found." }, { status: 404 });
    return NextResponse.json({ ok: true, deletedId: id });
  } catch (err) {
    return unavailable("DELETE /api/invoices error", err);
  }
}
