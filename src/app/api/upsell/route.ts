import { NextResponse } from "next/server";
import { db } from "@/db";
import { sendAutomatedEmail } from "@/lib/mailer";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON format" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, error: "Missing upsell details" }, { status: 400 });
  }

  const {
    opportunityId,
    selectedAddOns,
    clientName,
    company,
    clientEmail,
  } = body as {
    opportunityId: string;
    selectedAddOns: Array<{ id: string; title: string; price: number }>;
    clientName?: string;
    company?: string;
    clientEmail?: string;
  };

  if (!opportunityId || !Array.isArray(selectedAddOns) || selectedAddOns.length === 0) {
    return NextResponse.json({ ok: false, error: "Missing opportunityId or selectedAddOns" }, { status: 400 });
  }

  const totalAddOn = selectedAddOns.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const addOnTitles = selectedAddOns.map((item) => item.title).join(", ");

  // 1. Fetch and update Opportunity in DB
  const opp = db.getOpportunities().find((o) => o.id === opportunityId);
  let updatedDealValue = totalAddOn;
  let targetEmail = clientEmail;
  let targetName = clientName;
  let targetCompany = company;

  if (opp) {
    updatedDealValue = opp.dealValue + totalAddOn;
    targetEmail = opp.email || targetEmail;
    targetName = opp.name || targetName;
    targetCompany = opp.company || targetCompany;

    const existingTags = opp.tags || [];
    const newTags = Array.from(new Set([...existingTags, "#UpsellAccepted", ...selectedAddOns.map((a) => `#${a.id}`)]));
    const newDeliverables = Array.from(new Set([...(opp.deliverables || []), ...selectedAddOns.map((a) => a.title)]));

    db.updateOpportunity(opportunityId, {
      dealValue: updatedDealValue,
      tags: newTags,
      deliverables: newDeliverables,
      internalNotes: `${opp.internalNotes || ""}\n[Add-on Sprints Added]: ${addOnTitles} (+$${totalAddOn.toLocaleString()})`.trim(),
    });
  }

  // 2. Sync with Neon DB if configured
  try {
    const { isNeonConfigured, getNeonSql } = await import("@/lib/neon");
    if (isNeonConfigured()) {
      const sql = getNeonSql();
      if (sql) {
        await sql`
          UPDATE opportunities
          SET deal_value = deal_value + ${totalAddOn}
          WHERE id = ${opportunityId};
        `;
      }
    }
  } catch (neonErr) {
    console.error("[Upsell API] Neon update error (non-fatal):", neonErr);
  }

  // 3. Trigger Automated Email Confirmations via PrivateEmail SMTP
  if (targetEmail) {
    void sendAutomatedEmail({
      templateId: "upsell_confirmation",
      recipient: targetEmail,
      variables: {
        clientName: targetName || "Valued Client",
        company: targetCompany || "Your Project",
        upsellName: addOnTitles,
        dealValue: `$${updatedDealValue.toLocaleString()}`,
      },
    });
  }

  // Internal team inbound alert
  const teamEmail = process.env.SMTP_USER || "hello@thevirtuslabs.com";
  void sendAutomatedEmail({
    templateId: "internal_alert",
    recipient: teamEmail,
    variables: {
      clientName: targetName || "Client",
      company: targetCompany || "Client Project",
      clientEmail: targetEmail || "N/A",
      phone: opp?.phone || "N/A",
      service: `Add-ons: ${addOnTitles}`,
      dealValue: `+$${totalAddOn.toLocaleString()} (Total: $${updatedDealValue.toLocaleString()})`,
      bottleneck: `Accepted Accelerated Sprint Add-ons: ${addOnTitles}`,
    },
  });

  return NextResponse.json({
    ok: true,
    opportunityId,
    totalAddOn,
    updatedDealValue,
    addOnTitles,
  });
}
