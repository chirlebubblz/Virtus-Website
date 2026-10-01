import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { denyUnlessStaff } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await denyUnlessStaff(["admin", "team"]);
  if (denied) return denied;

  const imapHost = process.env.IMAP_HOST || process.env.SMTP_HOST || "mail.privateemail.com";
  const imapPort = Number(process.env.IMAP_PORT || 993);
  const imapUser = process.env.SMTP_USER || "hello@thevirtuslabs.com";
  const imapPass = process.env.SMTP_PASS;

  if (!imapPass) {
    return NextResponse.json(
      { ok: false, error: "SMTP_PASS / IMAP password is not configured." },
      { status: 503 }
    );
  }

  const client = new ImapFlow({
    host: imapHost,
    port: imapPort,
    secure: true,
    auth: {
      user: imapUser,
      pass: imapPass,
    },
    logger: false,
  });

  try {
    await client.connect();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to connect to IMAP server.";
    return NextResponse.json({ ok: false, error: `IMAP connection error: ${msg}` }, { status: 502 });
  }

  const emails: Array<{
    id: string;
    sender: string;
    senderEmail: string;
    recipient: string;
    subject: string;
    preview: string;
    body: string;
    timestamp: string;
    folder: "inbox";
    isRead: boolean;
    messageId?: string;
    inReplyTo?: string;
  }> = [];

  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      // Determine message range - fetch up to 30 most recent messages
      const status = await client.status("INBOX", { messages: true });
      const total = typeof status === "object" && status !== null && "messages" in status ? Number(status.messages) || 0 : 0;

      if (total > 0) {
        const start = Math.max(1, total - 29);
        const range = `${start}:*`;

        for await (const msg of client.fetch(range, { envelope: true, source: true })) {
          if (!msg.source) continue;
          try {
            const parsed = await simpleParser(msg.source);
            const fromObj = parsed.from?.value?.[0];
            const senderName = fromObj?.name || fromObj?.address || "Unknown Sender";
            const senderEmail = fromObj?.address || "";
            const toText = Array.isArray(parsed.to) ? parsed.to[0]?.text : parsed.to?.text;
            const recipient = toText || imapUser;
            const textContent = parsed.text || "";
            const preview = textContent.replace(/\s+/g, " ").trim().substring(0, 90) || "(No text content)";

            const dateStr = parsed.date
              ? new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                }).format(parsed.date)
              : "Recent";

            emails.unshift({
              id: `imap-${msg.uid || Math.random().toString(36).substring(2, 9)}`,
              sender: senderName,
              senderEmail,
              recipient,
              subject: parsed.subject || "(No Subject)",
              preview,
              body: textContent || (typeof parsed.html === "string" ? parsed.html : "(Empty message body)"),
              timestamp: dateStr,
              folder: "inbox",
              isRead: true,
              messageId: parsed.messageId,
              inReplyTo: typeof parsed.inReplyTo === "string" ? parsed.inReplyTo : undefined,
            });
          } catch {
            // Ignore single corrupt message and continue with others
          }
        }
      }
    } finally {
      lock.release();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch messages.";
    return NextResponse.json({ ok: false, error: `IMAP fetch error: ${msg}` }, { status: 502 });
  } finally {
    try {
      await client.logout();
    } catch {
      // ignore logout cleanup errors
    }
  }

  return NextResponse.json({
    ok: true,
    emails,
  });
}
