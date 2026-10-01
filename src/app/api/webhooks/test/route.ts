import { NextResponse } from "next/server";
import { denyUnlessStaff } from "@/lib/staffAuth";
import { dispatchWebhook } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

export async function POST() {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const discordConfigured = Boolean(process.env.DISCORD_WEBHOOK_URL);
  const slackConfigured = Boolean(process.env.SLACK_WEBHOOK_URL);
  const crmConfigured = Boolean(process.env.CRM_WEBHOOK_URL || process.env.GHL_WEBHOOK_URL);

  await dispatchWebhook({
    event: "calendar_booking_created",
    title: "Test System Dispatch from Virtus OS",
    description: "This is a test notification confirming your Webhook and CRM routing integration is live and working.",
    data: {
      status: "Verified",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      discordActive: discordConfigured ? "Connected" : "Not configured",
      slackActive: slackConfigured ? "Connected" : "Not configured",
      crmActive: crmConfigured ? "Connected" : "Not configured",
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Test webhook dispatched successfully.",
    integrations: {
      discord: discordConfigured,
      slack: slackConfigured,
      crm: crmConfigured,
    },
  });
}
