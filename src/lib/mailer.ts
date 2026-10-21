import nodemailer from "nodemailer";
import {
  getAutomatedTemplate,
  renderTemplate,
  AutomatedEmailTemplate,
} from "./emailTemplates";

export interface MailerAttachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
  encoding?: string;
}

export interface SendAutomatedEmailParams {
  templateId: AutomatedEmailTemplate["id"];
  recipient: string;
  variables: Record<string, string>;
  attachments?: MailerAttachment[];
  icalEvent?: {
    filename?: string;
    method?: string;
    content?: string | Buffer;
  };
}

export function getMailTransporter() {
  const host = process.env.SMTP_HOST || "mail.privateemail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
  const user = process.env.SMTP_USER || "hello@thevirtuslabs.com";
  const pass = process.env.SMTP_PASS || "";

  return nodemailer.createTransport({
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    // Strict TLS timeout
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
}

/**
 * Sends an automated email using configured templates and PrivateEmail SMTP.
 * Fails safely if credentials are not configured or transport fails, logging the event.
 */
export async function sendAutomatedEmail({
  templateId,
  recipient,
  variables,
  attachments,
  icalEvent,
}: SendAutomatedEmailParams): Promise<{ ok: boolean; messageId?: string; error?: string; skipped?: boolean }> {
  try {
    const template = getAutomatedTemplate(templateId);
    if (!template) {
      console.warn(`[Mailer] Template not found: ${templateId}`);
      return { ok: false, error: `Template ${templateId} not found` };
    }

    if (!template.enabled) {
      console.info(`[Mailer] Template ${templateId} is disabled by admin. Skipping.`);
      return { ok: true, skipped: true };
    }

    if (!recipient || !recipient.includes("@")) {
      console.warn(`[Mailer] Invalid recipient: ${recipient}`);
      return { ok: false, error: "Invalid recipient email" };
    }

    const { subject, body } = renderTemplate(template, variables);

    const user = process.env.SMTP_USER || "hello@thevirtuslabs.com";
    const pass = process.env.SMTP_PASS;
    const fromAddress = process.env.SMTP_FROM || `"The Virtus Labs" <${user}>`;

    if (!pass) {
      console.warn("[Mailer] SMTP_PASS not set. Skipping live dispatch (logged in dev).");
      return { ok: true, messageId: "dev-mock-no-password" };
    }

    const transporter = getMailTransporter();
    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipient,
      subject,
      text: body,
      ...(attachments && attachments.length > 0 ? { attachments } : {}),
      ...(icalEvent ? { icalEvent } : {}),
      // Styled dark luxury HTML wrapper
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0A0A0A; color: #E5E5E5; padding: 40px 20px; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #111111; border: 1px solid #262626; border-radius: 8px; overflow: hidden;">
            <div style="border-bottom: 2px solid #FBD227; padding: 24px 32px; background-color: #141414;">
              <span style="font-size: 16px; font-weight: 900; letter-spacing: 0.1em; color: #FFFFFF; text-transform: uppercase;">
                THE VIRTUS LABS <span style="color: #FBD227;">·</span> STUDIO
              </span>
            </div>
            <div style="padding: 32px; font-size: 15px; color: #D4D4D4; white-space: pre-line;">
              ${body.replace(/\n/g, "<br/>")}
              ${
                variables.googleCalendarUrl
                  ? `
                <div style="margin: 28px 0 12px 0; padding-top: 20px; border-top: 1px solid #262626;">
                  <p style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #FBD227; margin: 0 0 12px 0;">Add to your calendar:</p>
                  <a href="${variables.googleCalendarUrl}" target="_blank" style="display: inline-block; background-color: #FBD227; color: #000000; font-weight: 800; font-size: 12px; text-decoration: none; padding: 10px 18px; border-radius: 4px; margin-right: 8px; text-transform: uppercase; letter-spacing: 0.05em;">
                    📅 Add to Google Calendar
                  </a>
                  ${
                    variables.outlookCalendarUrl
                      ? `
                  <a href="${variables.outlookCalendarUrl}" target="_blank" style="display: inline-block; background-color: #1A1A1A; color: #FFFFFF; font-weight: 700; font-size: 12px; text-decoration: none; padding: 10px 18px; border-radius: 4px; border: 1px solid #333333; text-transform: uppercase; letter-spacing: 0.05em;">
                    📅 Add to Outlook
                  </a>`
                      : ""
                  }
                </div>
              `
                  : ""
              }
            </div>
            <div style="border-top: 1px solid #222222; padding: 20px 32px; background-color: #0D0D0D; font-size: 12px; color: #777777;">
              <p style="margin: 0;">The Virtus Labs · Architectural Digital Systems & Brand Engineering</p>
              <p style="margin: 4px 0 0 0;"><a href="https://thevirtuslabs.com" style="color: #FBD227; text-decoration: none;">thevirtuslabs.com</a> · <a href="mailto:hello@thevirtuslabs.com" style="color: #FBD227; text-decoration: none;">hello@thevirtuslabs.com</a></p>
            </div>
          </div>
        </div>
      `,
    });

    console.log(`[Mailer] Successfully dispatched email "${subject}" to ${recipient}. MessageId: ${info.messageId}`);
    return { ok: true, messageId: info.messageId };
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[Mailer] Failed sending template ${templateId} to ${recipient}:`, err.message);
    return { ok: false, error: err.message };
  }
}
