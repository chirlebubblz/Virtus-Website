/**
 * Centralized Webhook & CRM Dispatcher for Virtus Agency OS
 * Dispatches async events to Discord, Slack, and external CRMs (GoHighLevel / ClickUp).
 */

export interface WebhookEventPayload {
  event:
    | "lead_inquiry_created"
    | "calendar_booking_created"
    | "proposal_accepted"
    | "revision_requested";
  title: string;
  description: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

export async function dispatchWebhook(payload: WebhookEventPayload): Promise<void> {
  const timestamp = payload.timestamp || new Date().toISOString();
  const enrichedPayload = { ...payload, timestamp };

  const discordUrl = process.env.DISCORD_WEBHOOK_URL;
  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  const crmUrl = process.env.CRM_WEBHOOK_URL || process.env.GHL_WEBHOOK_URL;

  const tasks: Promise<unknown>[] = [];

  // 1. Discord Webhook
  if (discordUrl) {
    const discordBody = {
      embeds: [
        {
          title: `⚡ [Virtus OS] ${payload.title}`,
          description: payload.description,
          color: payload.event === "calendar_booking_created" ? 0xfbd227 : 0x10b981,
          fields: Object.entries(payload.data)
            .filter(([, v]) => v !== undefined && v !== null && v !== "")
            .map(([k, v]) => ({
              name: k.replace(/([A-Z])/g, " $1").toUpperCase(),
              value: String(v).slice(0, 500),
              inline: true,
            })),
          footer: {
            text: `Virtus OS Dispatch • ${new Date().toLocaleTimeString()}`,
          },
          timestamp,
        },
      ],
    };

    tasks.push(
      fetch(discordUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discordBody),
      }).catch((err) => console.error("[Webhook Discord Error]", err))
    );
  }

  // 2. Slack Webhook
  if (slackUrl) {
    const slackBody = {
      text: `*⚡ [Virtus OS] ${payload.title}*\n${payload.description}`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: `⚡ ${payload.title}` },
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: payload.description },
        },
        {
          type: "section",
          fields: Object.entries(payload.data)
            .filter(([, v]) => v !== undefined && v !== null && v !== "")
            .map(([k, v]) => ({
              type: "mrkdwn",
              text: `*${k.replace(/([A-Z])/g, " $1")}:*\n${String(v)}`,
            })),
        },
      ],
    };

    tasks.push(
      fetch(slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slackBody),
      }).catch((err) => console.error("[Webhook Slack Error]", err))
    );
  }

  // 3. CRM / Custom Webhook (GoHighLevel / ClickUp / Zapier / Make)
  if (crmUrl) {
    tasks.push(
      fetch(crmUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Virtus-Event": payload.event,
        },
        body: JSON.stringify(enrichedPayload),
      }).catch((err) => console.error("[Webhook CRM Error]", err))
    );
  }

  // Log to server console if no webhooks configured (local development)
  if (!discordUrl && !slackUrl && !crmUrl) {
    console.log(`[Virtus Webhook Dispatch: ${payload.event}]`, {
      title: payload.title,
      data: payload.data,
    });
  }

  await Promise.allSettled(tasks);
}
