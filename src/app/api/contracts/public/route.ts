import { NextResponse } from "next/server";
import { db } from "@/db";
import type { Contract } from "@/db";
import { getNeonSql, isNeonConfigured } from "@/lib/neon";
import { EMAIL_PATTERN, badRequest, forbidden, readJsonObject, serverError, str, unavailable } from "@/lib/apiUtil";
import { clientIp, isBlocked, recordFailure } from "@/lib/rateLimit";
import { dispatchWebhook } from "@/lib/webhooks";
import { sendAutomatedEmail } from "@/lib/mailer";
import { authorizeShare, canViewShare, consumeShare, shareRefusal, type ShareState } from "@/lib/docAccess";
import { hashShareToken, isShareToken } from "@/lib/shareTokens";

export const dynamic = "force-dynamic";

type Sql = NonNullable<ReturnType<typeof getNeonSql>>;
const neon = (): Sql | null => (isNeonConfigured() ? getNeonSql() : null);
const DOCUMENT = "agreement";

async function selectOneContract(sql: Sql, id: string): Promise<Contract | null> {
  const rows = await sql`
    SELECT id, contract_number AS "contractNumber", client_id AS "clientId", client_name AS "clientName", company, title,
           contract_type AS "contractType", value::float8 AS value, status,
           to_char(signed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI "UTC"') AS "signedAt",
           signer_name AS "signerName", signer_email AS "signerEmail", to_char(created_at, 'YYYY-MM-DD') AS "createdAt"
    FROM contracts WHERE id = ${id} LIMIT 1`;
  const row = (rows as Contract[])[0];
  if (!row) return null;
  return {
    ...row,
    signedAt: row.signedAt ?? undefined,
    signerName: row.signerName ?? undefined,
    signerEmail: row.signerEmail ?? undefined,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = str(searchParams.get("id"), 64);
  if (!id) return badRequest("Missing agreement id.", "id");

  const state: ShareState = await authorizeShare("contract", id, searchParams.get("token"));
  if (!canViewShare(state)) return forbidden(shareRefusal(state, DOCUMENT));

  const sql = neon();
  try {
    const contract = sql
      ? await selectOneContract(sql, id)
      : db.getContracts().find((c) => c.id === id) ?? null;
    if (!contract) return NextResponse.json({ ok: false, error: "Agreement not found." }, { status: 404 });
    return NextResponse.json({ ok: true, data: contract });
  } catch (err) {
    return sql ? unavailable("GET /api/contracts/public error", err) : serverError("GET /api/contracts/public error", err);
  }
}

export async function POST(request: Request) {
  const ipKey = `contract-public:${clientIp(request)}`;
  if (isBlocked(ipKey, 15)) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Please try again shortly." }, { status: 429 });
  }

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");
  const id = str(body.id, 64);
  const token = body.token;
  const signerName = str(body.signerName, 200);
  const signerEmail = str(body.signerEmail, 200)?.toLowerCase() ?? null;

  if (!id) return badRequest("Missing agreement id.", "id");
  if (!signerName) return badRequest("Please enter your full legal name.", "signerName");
  if (!signerEmail || !EMAIL_PATTERN.test(signerEmail)) {
    return badRequest("Please enter a valid email address.", "signerEmail");
  }

  const sql = neon();
  try {
    if (!sql) {
      if (!(await consumeShare("contract", id, token))) {
        recordFailure(ipKey, 15 * 60 * 1000);
        return forbidden(shareRefusal("invalid", DOCUMENT));
      }
      const existing = db.getContracts().find((c) => c.id === id);
      if (!existing) return NextResponse.json({ ok: false, error: "Agreement not found." }, { status: 404 });
      if (existing.status === "Signed") {
        return NextResponse.json({ ok: true, data: existing });
      }
      const signed = db.signContract(id, signerName, signerEmail);
      return NextResponse.json({ ok: true, data: signed });
    }

    // Signing and spending the token are one statement, so two racing requests cannot both record a signature.
    const hash = isShareToken(token) ? await hashShareToken(token) : "";
    const changed = await sql`
      UPDATE contracts
      SET status = 'Signed', signer_name = ${signerName}, signer_email = ${signerEmail}, signed_at = NOW(),
          share_token_used_at = NOW()
      WHERE id = ${id}
        AND status <> 'Signed'
        AND share_token_hash = ${hash}
        AND share_token_used_at IS NULL
        AND (share_token_expires_at IS NULL OR share_token_expires_at > NOW())
      RETURNING id`;
    if (changed.length === 0) {
      const existing = await selectOneContract(sql, id);
      if (!existing) return NextResponse.json({ ok: false, error: "Agreement not found." }, { status: 404 });
      if (existing.status === "Signed") {
        return NextResponse.json({ ok: true, data: existing });
      }
      recordFailure(ipKey, 15 * 60 * 1000);
      const state: ShareState = await authorizeShare("contract", id, token);
      return forbidden(shareRefusal(state, DOCUMENT));
    }

    const saved = await selectOneContract(sql, id);
    if (saved) {
      void dispatchWebhook({
        event: "contract_signed",
        title: `Agreement E-Signed Online: ${saved.company}`,
        description: `**${signerName}** (${signerEmail}) electronically executed **${saved.contractNumber}** (${saved.title}).`,
        data: {
          contractNumber: saved.contractNumber,
          company: saved.company,
          title: saved.title,
          signerName,
          signerEmail,
          signedAt: saved.signedAt ?? "",
        },
      });
      void sendAutomatedEmail({
        templateId: "contract_executed",
        recipient: signerEmail,
        variables: {
          clientName: signerName,
          company: saved.company,
          contractTitle: `${saved.contractNumber} — ${saved.title}`,
          dealValue: saved.value > 0 ? `$${saved.value.toLocaleString()}` : "Non-monetary (NDA)",
        },
      });
    }

    return NextResponse.json({ ok: true, data: saved });
  } catch (err) {
    return sql ? unavailable("POST /api/contracts/public error", err) : serverError("POST /api/contracts/public error", err);
  }
}
