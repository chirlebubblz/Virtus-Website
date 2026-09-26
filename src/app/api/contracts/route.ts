import { NextResponse } from "next/server";
import { db, uid } from "@/db";
import type { Contract } from "@/db";
import { isNeonConfigured, getNeonSql } from "@/lib/neon";
import { denyUnlessStaff } from "@/lib/staffAuth";
import { EMAIL_PATTERN, badRequest, money, readJsonObject, serverError, str, unavailable } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

const TYPES: Contract["contractType"][] = [
  "Master Service Agreement (MSA)",
  "Statement of Work (SOW)",
  "Retainer Agreement",
  "NDA",
];

export async function GET() {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const sql = isNeonConfigured() ? getNeonSql() : null;
  if (!sql) return NextResponse.json({ ok: true, source: "local", data: db.getContracts() });
  try {
    const rows = await sql`
      SELECT id, contract_number as "contractNumber", client_id as "clientId", client_name as "clientName", company, title, contract_type as "contractType", value::float8 as value, status, signed_at as "signedAt", signer_name as "signerName", signer_email as "signerEmail", created_at as "createdAt"
      FROM contracts
      ORDER BY created_at DESC;
    `;
    return NextResponse.json({ ok: true, source: "neon", data: rows });
  } catch (err) {
    return unavailable("GET /api/contracts error", err);
  }
}

export async function POST(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");

  const clientId = str(body.clientId, 64);
  const clientName = str(body.clientName, 200);
  const value = body.value === undefined ? 0 : money(body.value); // 0 is valid, for example an NDA
  const contractType = body.contractType === undefined ? TYPES[1] : TYPES.find((t) => t === body.contractType);
  if (!clientId) return badRequest("Choose a client.", "clientId");
  if (!clientName) return badRequest("Enter the client name.", "clientName");
  if (value === null) return badRequest("Enter a valid contract value.", "value");
  if (!contractType) return badRequest("Choose a valid contract type.", "contractType");

  const sql = isNeonConfigured() ? getNeonSql() : null;
  try {
    const known = sql
      ? (await sql`SELECT 1 FROM clients WHERE id = ${clientId} LIMIT 1;`).length > 0
      : Boolean(db.getClientById(clientId));
    if (!known) return badRequest("Unknown client.", "clientId");

    const created = db.addContract({
      contractNumber: str(body.contractNumber, 64) ?? uid("VRT-AGR").toUpperCase(),
      clientId,
      clientName,
      company: str(body.company, 200) ?? clientName,
      title: str(body.title, 200) ?? "Master Services Agreement",
      contractType,
      value,
      status: "Pending Signature",
    });
    if (sql) {
      await sql`
        INSERT INTO contracts (id, contract_number, client_id, client_name, company, title, contract_type, value, status)
        VALUES (${created.id}, ${created.contractNumber}, ${created.clientId}, ${created.clientName}, ${created.company}, ${created.title}, ${created.contractType}, ${created.value}, ${created.status});
      `;
    }
    return NextResponse.json({ ok: true, data: created });
  } catch (err) {
    return sql ? unavailable("POST /api/contracts error", err) : serverError("POST /api/contracts error", err);
  }
}

export async function PATCH(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");
  const id = str(body.id, 64);
  const signerName = str(body.signerName, 200);
  const signerEmail = str(body.signerEmail, 200);
  if (!id || !signerName || !signerEmail) return badRequest("Missing required fields.");
  if (!EMAIL_PATTERN.test(signerEmail)) return badRequest("Enter a valid signer email.", "signerEmail");

  const sql = isNeonConfigured() ? getNeonSql() : null;
  try {
    if (sql) {
      // Atomic: only an unsigned contract can be signed, and nothing is reported unless a row changed.
      const rows = await sql`
        UPDATE contracts
        SET status = 'Signed', signer_name = ${signerName}, signer_email = ${signerEmail}, signed_at = ${new Date().toISOString()}
        WHERE id = ${id} AND status <> 'Signed'
        RETURNING id;
      `;
      if (rows.length === 0) {
        const exists = await sql`SELECT status FROM contracts WHERE id = ${id} LIMIT 1;`;
        return exists.length === 0
          ? NextResponse.json({ ok: false, error: "Contract not found." }, { status: 404 })
          : NextResponse.json({ ok: false, error: "This contract is already signed." }, { status: 409 });
      }
      return NextResponse.json({ ok: true, data: db.signContract(id, signerName, signerEmail) });
    }

    const existing = db.getContracts().find((c) => c.id === id);
    if (!existing) return NextResponse.json({ ok: false, error: "Contract not found." }, { status: 404 });
    if (existing.status === "Signed") {
      return NextResponse.json({ ok: false, error: "This contract is already signed." }, { status: 409 });
    }
    return NextResponse.json({ ok: true, data: db.signContract(id, signerName, signerEmail) });
  } catch (err) {
    return sql ? unavailable("PATCH /api/contracts error", err) : serverError("PATCH /api/contracts error", err);
  }
}
