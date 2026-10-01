import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { denyUnlessStaff } from "@/lib/staffAuth";
import {
  getAutomatedTemplates,
  getAutomatedTemplate,
  saveAutomatedTemplate,
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

  const { templateId, testRecipient } = (body as Record<string, string>) || {};
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
      html: rendered.body.replace(/\n/g, "<br/>"),
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
