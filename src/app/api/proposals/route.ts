import { NextResponse } from "next/server";
import { db } from "@/db";
import type { Proposal } from "@/db";
import { denyUnlessStaff } from "@/lib/staffAuth";
import { badRequest, readJsonObject, str } from "@/lib/apiUtil";
import { dispatchWebhook } from "@/lib/webhooks";
import { sendAutomatedEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await denyUnlessStaff(["admin", "team"]);
  if (denied) return denied;

  return NextResponse.json({
    ok: true,
    data: db.getProposals(),
  });
}

export async function POST(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid JSON body");

  const title = str(body.title, 200);
  const clientId = str(body.clientId, 64);
  const company = str(body.company, 200);
  const clientName = str(body.clientName, 200);
  const amount = Number(body.amount);
  const timeline = str(body.timeline, 100) || "4 Weeks Delivery";
  const validUntil = str(body.validUntil, 32) || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const scopeSummary = Array.isArray(body.scopeSummary)
    ? body.scopeSummary.filter((s): s is string => typeof s === "string")
    : [];

  if (!title) return badRequest("Title is required", "title");
  if (!clientId || !company) return badRequest("Client is required", "clientId");
  if (!amount || isNaN(amount) || amount <= 0) return badRequest("Valid amount is required", "amount");

  const year = new Date().getFullYear();
  const existing = db.getProposals();
  const used = existing
    .map((p) => new RegExp(`^PROP-${year}-(\\d+)$`).exec(p.proposalNumber)?.[1])
    .filter((n): n is string => Boolean(n))
    .map(Number);
  const proposalNumber = `PROP-${year}-${String(Math.max(0, ...used) + 1).padStart(3, "0")}`;

  const proposal = db.addProposal({
    proposalNumber,
    clientId,
    clientName: clientName || company,
    company,
    title,
    amount,
    status: "Sent",
    validUntil,
    scopeSummary,
    timeline,
  });

  return NextResponse.json({ ok: true, data: proposal }, { status: 201 });
}

export async function PATCH(request: Request) {
  const denied = await denyUnlessStaff(["admin", "team"]);
  if (denied) return denied;

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid JSON body");

  const id = str(body.id, 64);
  if (!id) return badRequest("Proposal ID is required", "id");

  const updates: Partial<Omit<Proposal, "id">> = {};

  if (body.title !== undefined) {
    const title = str(body.title, 200);
    if (!title) return badRequest("Title cannot be empty", "title");
    updates.title = title;
  }

  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (isNaN(amount) || amount <= 0) return badRequest("Valid amount is required", "amount");
    updates.amount = amount;
  }

  if (body.timeline !== undefined) {
    updates.timeline = str(body.timeline, 100) || "4 Weeks Delivery";
  }

  if (body.validUntil !== undefined) {
    const validUntil = str(body.validUntil, 32);
    if (validUntil) updates.validUntil = validUntil;
  }

  if (body.scopeSummary !== undefined) {
    if (Array.isArray(body.scopeSummary)) {
      updates.scopeSummary = body.scopeSummary.filter((s): s is string => typeof s === "string");
    }
  }

  if (body.status !== undefined) {
    const status = body.status as Proposal["status"];
    if (!["Draft", "Sent", "Accepted", "Declined"].includes(status)) {
      return badRequest("Valid status is required", "status");
    }
    updates.status = status;
  }

  const existing = db.getProposals().find((p) => p.id === id);
  if (!existing) return badRequest("Proposal not found", "id");

  const wasAccepted = existing.status === "Accepted";
  const result = db.updateProposal(id, updates);
  if (!result) return badRequest("Proposal not found", "id");

  if (updates.status === "Accepted" && !wasAccepted) {
    const acceptedData = db.acceptProposal(id);
    if (acceptedData) {
      // 1. Dispatch Webhook
      void dispatchWebhook({
        event: "proposal_accepted",
        title: `Proposal Accepted: ${result.company}`,
        description: `**${result.company}** has accepted proposal **${result.proposalNumber}** (${result.title}) for **$${result.amount.toLocaleString()}**.\nActive project and 50% deposit invoice created automatically.`,
        data: {
          proposalNumber: result.proposalNumber,
          company: result.company,
          title: result.title,
          amount: `$${result.amount.toLocaleString()}`,
          projectId: acceptedData.project.id,
          invoiceNumber: acceptedData.invoice.invoiceNumber,
        },
      });

      // 2. Automated Email to Client
      const client = db.getClientById(result.clientId);
      if (client && client.email) {
        void sendAutomatedEmail({
          templateId: "proposal_accepted",
          recipient: client.email,
          variables: {
            clientName: client.contactName || client.name,
            company: client.company,
            proposalTitle: result.title,
            dealValue: `$${result.amount.toLocaleString()}`,
            timeline: result.timeline,
          },
        });
      }
    }
  }

  return NextResponse.json({ ok: true, data: result });
}

export async function DELETE(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  let id = searchParams.get("id");
  if (!id) {
    const body = await readJsonObject(request);
    id = body ? str(body.id, 64) : null;
  }
  if (!id) return badRequest("Proposal ID is required", "id");

  const deleted = db.deleteProposal(id);
  if (!deleted) return badRequest("Proposal not found", "id");

  return NextResponse.json({ ok: true, deletedId: id });
}
