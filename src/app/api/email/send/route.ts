import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { denyUnlessStaff } from "@/lib/staffAuth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB max total per email

interface RawAttachmentInput {
  filename?: unknown;
  contentType?: unknown;
  content?: unknown; // base64 string or data:mime;base64,...
  data?: unknown; // fallback alternative name
  size?: unknown;
}

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

  const { to, subject, body, inReplyTo, references, attachments: rawAttachments } = json as Record<string, unknown>;

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

  // Parse and validate attachments if provided
  const parsedAttachments: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }> = [];

  if (Array.isArray(rawAttachments) && rawAttachments.length > 0) {
    let totalBytes = 0;
    for (const raw of rawAttachments as RawAttachmentInput[]) {
      if (!raw || typeof raw !== "object") continue;
      const rawName = typeof raw.filename === "string" ? raw.filename.trim() : "attachment";
      const filename = rawName.slice(0, 255) || "attachment";
      const contentType = typeof raw.contentType === "string" ? raw.contentType.trim() : undefined;

      const rawContent =
        typeof raw.content === "string" ? raw.content : typeof raw.data === "string" ? raw.data : "";
      if (!rawContent) continue;

      // Strip "data:<mime>;base64," if present
      const base64Index = rawContent.indexOf(";base64,");
      const cleanBase64 = base64Index !== -1 ? rawContent.slice(base64Index + 8) : rawContent;

      try {
        const buffer = Buffer.from(cleanBase64, "base64");
        totalBytes += buffer.length;
        if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
          return NextResponse.json(
            { ok: false, error: "Total attachment size exceeds the 25 MB limit." },
            { status: 400 }
          );
        }
        parsedAttachments.push({
          filename,
          content: buffer,
          ...(contentType ? { contentType } : {}),
        });
      } catch {
        return NextResponse.json(
          { ok: false, error: `Failed to process attachment "${filename}". Ensure valid base64 encoding.` },
          { status: 400 }
        );
      }
    }
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
      ...(parsedAttachments.length > 0 ? { attachments: parsedAttachments } : {}),
      ...(typeof inReplyTo === "string" && inReplyTo ? { inReplyTo } : {}),
      ...(typeof references === "string" && references ? { references } : {}),
    });

    return NextResponse.json({
      ok: true,
      messageId: info.messageId,
      attachmentsCount: parsedAttachments.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to deliver email through SMTP.";
    return NextResponse.json(
      { ok: false, error: `SMTP Delivery Error: ${message}` },
      { status: 502 }
    );
  }
}
