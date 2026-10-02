import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { denyUnlessStaff } from "@/lib/staffAuth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  // Only authenticated staff (admins or team members) can send emails
  const denied = await denyUnlessStaff(["admin", "team"]);
  if (denied) return denied;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  if (typeof json !== "object" || json === null) {
    return NextResponse.json(
      { ok: false, error: "Request body must be an object." },
      { status: 400 }
    );
  }

  const { to, subject, body, inReplyTo, references } = json as Record<string, unknown>;

  if (typeof to !== "string" || !EMAIL_PATTERN.test(to.trim())) {
    return NextResponse.json(
      { ok: false, error: "Please provide a valid recipient email address." },
      { status: 400 }
    );
  }

  if (typeof subject !== "string" || !subject.trim()) {
    return NextResponse.json(
      { ok: false, error: "Subject line cannot be empty." },
      { status: 400 }
    );
  }

  if (typeof body !== "string" || !body.trim()) {
    return NextResponse.json(
      { ok: false, error: "Message body cannot be empty." },
      { status: 400 }
    );
  }

  const smtpHost = process.env.SMTP_HOST || "mail.privateemail.com";
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  const smtpSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : smtpPort === 465;
  const smtpUser = process.env.SMTP_USER || "hello@thevirtuslabs.com";
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || `"The Virtus Labs" <${smtpUser}>`;

  if (!smtpPass) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "SMTP_PASS is not configured. Please add your PrivateEmail password as SMTP_PASS in Vercel Environment Variables.",
      },
      { status: 503 }
    );
  }

  try {
    const transporter = nodemailer.createTransport({
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });

    const info = await transporter.sendMail({
      from: smtpFrom,
      to: to.trim(),
      subject: subject.trim(),
      text: body.trim(),
      html: body.trim().replace(/\n/g, "<br/>"),
      ...(typeof inReplyTo === "string" && inReplyTo ? { inReplyTo } : {}),
      ...(typeof references === "string" && references ? { references } : {}),
    });

    return NextResponse.json({
      ok: true,
      messageId: info.messageId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to deliver email through SMTP.";
    return NextResponse.json(
      { ok: false, error: `SMTP Delivery Error: ${message}` },
      { status: 502 }
    );
  }
}
