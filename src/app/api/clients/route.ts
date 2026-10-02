import { NextResponse } from "next/server";
import { db, toClientSummary } from "@/db";
import type { Client } from "@/db";
import { issuePortalToken } from "@/lib/tokens";
import { isNeonConfigured, getNeonSql, seedNeonDemo } from "@/lib/neon";
import { denyUnlessStaff } from "@/lib/staffAuth";
import { EMAIL_PATTERN, badRequest, readJsonObject, serverError, str, unavailable } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

const STATUSES = ["Active", "Completed", "Onboarding"] as const;

export async function GET() {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const sql = isNeonConfigured() ? getNeonSql() : null;
  if (!sql) return NextResponse.json({ ok: true, source: "local", data: db.getClients().map(toClientSummary) });
  try {
    // NUMERIC arrives as a string from Postgres, which breaks revenue sums in the UI. Cast to float8.
    let rows = await sql`
      SELECT id, name, contact_name as "contactName", company, email, status, total_revenue::float8 as "totalRevenue", active_projects_count as "activeProjectsCount", portal_token_last4 as "portalTokenLast4", portal_token_expires_at as "portalTokenExpiresAt", portal_token_revoked_at as "portalTokenRevokedAt", created_at as "createdAt"
      FROM clients
      ORDER BY created_at DESC;
    `;
    // If the database has no clients yet, seed the default sample clients so the workspace is never blank
    if (rows.length === 0) {
      await seedNeonDemo(sql).catch(() => {});
      rows = await sql`
        SELECT id, name, contact_name as "contactName", company, email, status, total_revenue::float8 as "totalRevenue", active_projects_count as "activeProjectsCount", portal_token_last4 as "portalTokenLast4", portal_token_expires_at as "portalTokenExpiresAt", portal_token_revoked_at as "portalTokenRevokedAt", created_at as "createdAt"
        FROM clients
        ORDER BY created_at DESC;
      `;
    }
    return NextResponse.json({ ok: true, source: "neon", data: rows });
  } catch (err) {
    return unavailable("GET /api/clients error", err);
  }
}

export async function POST(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");

  const name = str(body.name, 200);
  const company = str(body.company, 200);
  const email = str(body.email, 200)?.toLowerCase() ?? null;
  const contactName = body.contactName === undefined || body.contactName === "" ? name : str(body.contactName, 200);
  const status = body.status === undefined || body.status === "" ? "Active" : STATUSES.find((s) => s === body.status);

  if (!name) return badRequest("Enter the client name.", "name");
  if (!company) return badRequest("Enter the company.", "company");
  if (!email || !EMAIL_PATTERN.test(email)) return badRequest("Enter a valid email address.", "email");
  if (!contactName) return badRequest("Contact name is too long.", "contactName");
  if (!status) return badRequest("Status must be Active, Onboarding or Completed.", "status");

  const sql = isNeonConfigured() ? getNeonSql() : null;
  try {
    const taken = sql
      ? (await sql`SELECT 1 FROM clients WHERE lower(email) = ${email} LIMIT 1;`).length > 0
      : db.getClients().some((c) => c.email.toLowerCase() === email);
    if (taken) return badRequest("A client with this email already exists.", "email");

    const issued = await issuePortalToken();
    const created = db.addClient({
      name,
      contactName,
      company,
      email,
      status,
      portalTokenHash: issued.hash,
      portalTokenLast4: issued.last4,
      portalTokenExpiresAt: issued.expiresAt,
    });

    if (sql) {
      // Do not hand out a portal link that was never stored.
      await sql`
        INSERT INTO clients (id, name, contact_name, company, email, status, total_revenue, active_projects_count, portal_token_hash, portal_token_last4, portal_token_expires_at)
        VALUES (${created.id}, ${created.name}, ${created.contactName ?? created.name}, ${created.company}, ${created.email}, ${created.status}, 0, 0, ${issued.hash}, ${issued.last4}, ${issued.expiresAt});
      `;
    }

    // The plaintext token is returned once and never stored.
    return NextResponse.json({ ok: true, data: { ...toClientSummary(created), portalToken: issued.token } });
  } catch (err) {
    return sql ? unavailable("POST /api/clients error", err) : serverError("POST /api/clients error", err);
  }
}

export async function PATCH(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const body = await readJsonObject(request);
  if (!body || !body.id) return badRequest("Client ID is required.", "id");

  const id = str(body.id, 64);
  if (!id) return badRequest("Client ID is invalid.", "id");

  const updates: Partial<Client> = {};

  if (body.name !== undefined) updates.name = str(body.name, 200) || undefined;
  if (body.company !== undefined) updates.company = str(body.company, 200) || undefined;
  if (body.contactName !== undefined) updates.contactName = str(body.contactName, 200) || undefined;
  if (body.email !== undefined) {
    const email = str(body.email, 200)?.toLowerCase();
    if (!email || !EMAIL_PATTERN.test(email)) return badRequest("Enter a valid email address.", "email");
    updates.email = email;
  }
  if (body.status !== undefined) {
    const status = STATUSES.find((s) => s === body.status);
    if (!status) return badRequest("Status must be Active, Onboarding or Completed.", "status");
    updates.status = status;
  }
  if (body.totalRevenue !== undefined) {
    const rev = Number(body.totalRevenue);
    if (!isNaN(rev)) updates.totalRevenue = Math.max(0, rev);
  }
  if (body.activeProjectsCount !== undefined) {
    const count = Number(body.activeProjectsCount);
    if (!isNaN(count)) updates.activeProjectsCount = Math.max(0, count);
  }

  const sql = isNeonConfigured() ? getNeonSql() : null;
  try {
    const updated = db.updateClient(id, updates);

    if (sql) {
      await sql`
        UPDATE clients
        SET name = COALESCE(${updates.name ?? null}, name),
            company = COALESCE(${updates.company ?? null}, company),
            contact_name = COALESCE(${updates.contactName ?? null}, contact_name),
            email = COALESCE(${updates.email ?? null}, email),
            status = COALESCE(${updates.status ?? null}, status),
            total_revenue = COALESCE(${updates.totalRevenue ?? null}, total_revenue),
            active_projects_count = COALESCE(${updates.activeProjectsCount ?? null}, active_projects_count)
        WHERE id = ${id};
      `;
    }

    if (!updated && !sql) {
      return badRequest("Client not found.", "id");
    }

    return NextResponse.json({
      ok: true,
      data: updated ? toClientSummary(updated) : { id, ...updates },
    });
  } catch (err) {
    return sql ? unavailable("PATCH /api/clients error", err) : serverError("PATCH /api/clients error", err);
  }
}

export async function DELETE(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const body = await readJsonObject(request);
  const id = str(body?.id, 64);
  if (!id) return badRequest("Client ID is required.", "id");

  const sql = isNeonConfigured() ? getNeonSql() : null;
  try {
    db.removeClient(id);
    if (sql) {
      await sql`DELETE FROM clients WHERE id = ${id};`;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return unavailable("DELETE /api/clients error", err);
  }
}
