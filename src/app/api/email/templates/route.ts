import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { denyUnlessStaff } from "@/lib/staffAuth";
import {
  getAutomatedTemplates,
  getAutomatedTemplate,
  saveAutomatedTemplate,
  deleteAutomatedTemplate,
  renderTemplate,
  AutomatedEmailTemplate,
} from "@/lib/emailTemplates";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  return NextResponse.json({
    ok: true,
    templates: getAutomatedTemplates(),
  });
}

export async function PATCH(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !("template" in body)) {
    return NextResponse.json({ ok: false, error: "Missing template in request body" }, { status: 400 });
  }

  const template = (body as { template: AutomatedEmailTemplate }).template;
  if (!template.id || !template.subject || !template.body) {
    return NextResponse.json({ ok: false, error: "Subject and body cannot be empty" }, { status: 400 });
  }

  saveAutomatedTemplate(template);

  return NextResponse.json({
    ok: true,
    template,
  });
}

export async function POST(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = (body as Record<string, unknown>) || {};

  // Action 1: Create Custom Template From Scratch
  if (payload.action === "create_template") {
    const {
      name,
      category = "Custom",
      description = "",
      triggerEvent = "Custom Manual / API Trigger",
      subject,
      body: templateBody,
      variables = [],
    } = payload as {
      name?: string;
      category?: AutomatedEmailTemplate["category"];
      description?: string;
      triggerEvent?: string;
      subject?: string;
      body?: string;
      variables?: string[];
    };

    if (!name?.trim() || !subject?.trim() || !templateBody?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Template Name, Subject, and Body copy are required." },
        { status: 400 }
      );
    }

    const cleanId = `custom_${Date.now()}_${name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20)}`;
    const newTemplate: AutomatedEmailTemplate = {
      id: cleanId,
      name: name.trim(),
      category,
      description: description.trim() || "Custom studio email automation.",
      triggerEvent: triggerEvent.trim() || "Custom Trigger",
      subject: subject.trim(),
      body: templateBody.trim(),
      enabled: true,
      variables: Array.from(new Set(["{{clientName}}", "{{company}}", ...variables])),
      isCustom: true,
    };

    saveAutomatedTemplate(newTemplate);
    return NextResponse.json({ ok: true, template: newTemplate }, { status: 201 });
  }

  // Action 2: Dispatch Live Test Email
  const { templateId, testRecipient } = payload as Record<string, string>;
  if (!templateId) {
    return NextResponse.json({ ok: false, error: "Missing templateId" }, { status: 400 });
  }

  const template = getAutomatedTemplate(templateId);
  if (!template) {
    return NextResponse.json({ ok: false, error: "Template not found" }, { status: 404 });
  }

  const dummyVariables: Record<string, string> = {
    clientName: "Alex Rivera",
    company: "Apex Horizon Labs",
    service: "Headless Web & Digital Architecture",
    timeline: "2 to 4 weeks",
    budget: "$7,500+",
    bookingDate: "Friday, October 16, 2026",
    bookingTime: "02:00 PM – 02:30 PM (PST)",
    meetingUrl: "https://meet.google.com/tvl-disc-8922",
    hostName: "Paks (Studio Director)",
    clientEmail: "alex@apexhorizon.io",
    phone: "+1 (555) 234-5678",
    dealValue: "$8,500",
    bottleneck: "High drop-off on mobile checkout and manual lead booking",
    upsellName: "3D Photorealistic Canister Visuals (+$1,500)",
    proposalUrl: "https://thevirtuslabs.com/proposals/prop-apex-2026",
    validUntil: "November 1, 2026",
    contractTitle: "Master Services Agreement (MSA) & Sprint 1 SOW",
    signingUrl: "https://thevirtuslabs.com/portal/sign/con-apex-992",
    invoiceNumber: "INV-2026-089",
    invoiceAmount: "$4,250.00",
    dueDate: "October 10, 2026",
    invoiceUrl: "https://thevirtuslabs.com/portal/invoice/inv-2026-089",
    portalUrl: "https://thevirtuslabs.com/client/login",
    accessToken: "TVL-PORTAL-8829-XP",
    milestoneName: "Phase 1: Brand System & Interactive 3D Canvas",
    reviewUrl: "https://thevirtuslabs.com/client/approval",
  };

  const rendered = renderTemplate(template, dummyVariables);

  const smtpHost = process.env.SMTP_HOST || "mail.privateemail.com";
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  const smtpSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : smtpPort === 465;
  const smtpUser = process.env.SMTP_USER || "hello@thevirtuslabs.com";
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || `"The Virtus Labs" <${smtpUser}>`;

  if (!smtpPass) {
    return NextResponse.json(
      { ok: false, error: "SMTP_PASS is not configured in environment variables." },
      { status: 503 }
    );
  }

  const recipient = testRecipient?.trim() || "thevirtuslabs@gmail.com";

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: smtpFrom,
      to: recipient,
      subject: `[TEST] ${rendered.subject}`,
      text: rendered.body,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0A0A0A; color: #E5E5E5; padding: 40px 20px; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #111111; border: 1px solid #262626; border-radius: 8px; overflow: hidden;">
            <div style="border-bottom: 2px solid #FBD227; padding: 24px 32px; background-color: #141414;">
              <span style="font-size: 16px; font-weight: 900; letter-spacing: 0.1em; color: #FFFFFF; text-transform: uppercase;">
                THE VIRTUS LABS <span style="color: #FBD227;">·</span> TEMPLATE TEST
              </span>
            </div>
            <div style="padding: 32px; font-size: 15px; color: #D4D4D4; white-space: pre-line;">
              ${rendered.body.replace(/\n/g, "<br/>")}
            </div>
            <div style="border-top: 1px solid #222222; padding: 20px 32px; background-color: #0D0D0D; font-size: 12px; color: #777777;">
              <p style="margin: 0;">Automated System Dispatch · The Virtus Labs</p>
            </div>
          </div>
        </div>
      `,
    });

    return NextResponse.json({
      ok: true,
      messageId: info.messageId,
      recipient,
      subject: rendered.subject,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to deliver test email.";
    return NextResponse.json({ ok: false, error: `SMTP Test Error: ${msg}` }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id parameter" }, { status: 400 });
  }

  const deleted = deleteAutomatedTemplate(id);
  return NextResponse.json({ ok: deleted });
}
