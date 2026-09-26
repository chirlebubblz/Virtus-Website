import { NextResponse } from "next/server";
import { db, toClientSummary } from "@/db";
import { issuePortalToken } from "@/lib/tokens";
import { isNeonConfigured, getNeonSql } from "@/lib/neon";
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
    const rows = await sql`
      SELECT id, name, contact_name as "contactName", company, email, status, total_revenue::float8 as "totalRevenue", active_projects_count as "activeProjectsCount", portal_token_last4 as "portalTokenLast4", portal_token_expires_at as "portalTokenExpiresAt", portal_token_revoked_at as "portalTokenRevokedAt", created_at as "createdAt"
      FROM clients
      ORDER BY created_at DESC;
    `;
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
