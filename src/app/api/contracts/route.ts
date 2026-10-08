import { NextResponse } from "next/server";
import { db } from "@/db";
import type { Contract } from "@/db";
import { isNeonConfigured, getNeonSql } from "@/lib/neon";
import { denyUnlessStaff } from "@/lib/staffAuth";
import { EMAIL_PATTERN, badRequest, money, readJsonObject, serverError, str, unavailable } from "@/lib/apiUtil";
import { NUMBER_ATTEMPTS, isUniqueViolation, nextNumber, yearPrefix } from "@/lib/numbering";

export const dynamic = "force-dynamic";

// Admin only (middleware and handlers). Neon is the source of truth; the in-memory store is the dev fallback.

/** Contract types and the code used in their numbers, e.g. SOW-2026-003. */
const TYPE_CODE: Record<Contract["contractType"], string> = {
  "Master Service Agreement (MSA)": "MSA",
  "Statement of Work (SOW)": "SOW",
  "Retainer Agreement": "RET",
  NDA: "NDA",
};
const TYPES = Object.keys(TYPE_CODE) as Contract["contractType"][];

type Sql = NonNullable<ReturnType<typeof getNeonSql>>;
const neon = (): Sql | null => (isNeonConfigured() ? getNeonSql() : null);

// Dates are formatted in SQL so they match the in-memory format and never shift with the server's timezone.
async function selectContracts(sql: Sql, id?: string): Promise<Contract[]> {
  const rows = id
    ? await sql`
        SELECT id, contract_number AS "contractNumber", client_id AS "clientId", client_name AS "clientName", company, title,
               contract_type AS "contractType", value::float8 AS value, status,
               to_char(signed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI "UTC"') AS "signedAt",
               signer_name AS "signerName", signer_email AS "signerEmail", to_char(created_at, 'YYYY-MM-DD') AS "createdAt"
        FROM contracts WHERE id = ${id} LIMIT 1`
    : await sql`
        SELECT id, contract_number AS "contractNumber", client_id AS "clientId", client_name AS "clientName", company, title,
               contract_type AS "contractType", value::float8 AS value, status,
               to_char(signed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI "UTC"') AS "signedAt",
               signer_name AS "signerName", signer_email AS "signerEmail", to_char(created_at, 'YYYY-MM-DD') AS "createdAt"
        FROM contracts ORDER BY created_at DESC`;
  return (rows as Contract[]).map((r) => ({
    ...r,
    signedAt: r.signedAt ?? undefined,
    signerName: r.signerName ?? undefined,
    signerEmail: r.signerEmail ?? undefined,
  }));
}

export async function GET() {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const sql = neon();
  if (!sql) return NextResponse.json({ ok: true, source: "local", data: db.getContracts() });
  try {
    return NextResponse.json({ ok: true, source: "neon", data: await selectContracts(sql) });
  } catch (err) {
    return unavailable("GET /api/contracts error", err);
  }
}

/** Drafts a contract awaiting signature. The number and client details come from the server. */
export async function POST(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");

  const clientId = str(body.clientId, 64);
  const title = str(body.title, 200);
  const value = body.value === undefined || body.value === "" ? 0 : money(body.value); // 0 is valid, for example an NDA
  const contractType = body.contractType === undefined ? "Statement of Work (SOW)" : TYPES.find((t) => t === body.contractType);
  if (!clientId) return badRequest("Choose a client.", "clientId");
  if (!title) return badRequest("Enter a title.", "title");
  if (value === null) return badRequest("Enter a valid contract value.", "value");
  if (!contractType) return badRequest("Choose a valid contract type.", "contractType");

  const prefix = yearPrefix(TYPE_CODE[contractType]);
  const sql = neon();
  try {
    if (!sql) {
      const client = db.getClientById(clientId);
      if (!client) return badRequest("Unknown client.", "clientId");
      const created = db.addContract({
        contractNumber: nextNumber(prefix, db.getContracts().map((c) => c.contractNumber)),
        clientId,
        clientName: client.name,
        company: client.company,
        title,
        contractType,
        value,
        status: "Pending Signature",
      });
      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    }

    const [client] = await sql`SELECT name, company FROM clients WHERE id = ${clientId} LIMIT 1`;
    if (!client) return badRequest("Unknown client.", "clientId");

    const id = `cont-${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    for (let attempt = 1; ; attempt++) {
      const taken = await sql`SELECT contract_number AS n FROM contracts WHERE contract_number LIKE ${prefix + "%"}`;
      const contractNumber = nextNumber(prefix, taken.map((r) => String(r.n)));
      try {
        await sql`
          INSERT INTO contracts (id, contract_number, client_id, client_name, company, title, contract_type, value, status)
          VALUES (${id}, ${contractNumber}, ${clientId}, ${client.name}, ${client.company}, ${title}, ${contractType}, ${value}, 'Pending Signature')`;
        break;
      } catch (err) {
        if (!isUniqueViolation(err) || attempt >= NUMBER_ATTEMPTS) throw err;
      }
    }
    const [created] = await selectContracts(sql, id);
    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (err) {
    return sql ? unavailable("POST /api/contracts error", err) : serverError("POST /api/contracts error", err);
  }
}

/** Records a signature. Atomic: only an unsigned contract changes, so a contract is never signed twice. */
export async function PATCH(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");
  const id = str(body.id, 64);
  const signerName = str(body.signerName, 200);
  const signerEmail = str(body.signerEmail, 200);
  if (!id) return badRequest("Missing contract id.", "id");
  if (!signerName) return badRequest("Enter the signer's name.", "signerName");
  if (!signerEmail || !EMAIL_PATTERN.test(signerEmail)) return badRequest("Enter a valid signer email.", "signerEmail");

  const sql = neon();
  try {
    if (!sql) {
      const existing = db.getContracts().find((c) => c.id === id);
      if (!existing) return NextResponse.json({ ok: false, error: "Contract not found." }, { status: 404 });
      if (existing.status === "Signed") {
        return NextResponse.json({ ok: false, error: "This contract is already signed." }, { status: 409 });
      }
      return NextResponse.json({ ok: true, data: db.signContract(id, signerName, signerEmail) });
    }

    const changed = await sql`
      UPDATE contracts SET status = 'Signed', signer_name = ${signerName}, signer_email = ${signerEmail}, signed_at = NOW()
      WHERE id = ${id} AND status <> 'Signed'
      RETURNING id`;
    if (changed.length === 0) {
      const exists = await sql`SELECT 1 FROM contracts WHERE id = ${id} LIMIT 1`;
      return exists.length === 0
        ? NextResponse.json({ ok: false, error: "Contract not found." }, { status: 404 })
        : NextResponse.json({ ok: false, error: "This contract is already signed." }, { status: 409 });
    }
    const [saved] = await selectContracts(sql, id);
    return NextResponse.json({ ok: true, data: saved });
  } catch (err) {
    return sql ? unavailable("PATCH /api/contracts error", err) : serverError("PATCH /api/contracts error", err);
  }
}
