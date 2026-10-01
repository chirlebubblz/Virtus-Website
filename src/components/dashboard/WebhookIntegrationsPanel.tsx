"use client";

import React, { useState } from "react";

export const WebhookIntegrationsPanel: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestDispatch = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/webhooks/test", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.ok) {
        setTestResult("✓ Test dispatch sent successfully! Check your Discord / Slack / CRM channel.");
      } else {
        setTestResult(json.error || "Failed to trigger test dispatch.");
      }
    } catch {
      setTestResult("Network error triggering test dispatch.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <section aria-labelledby="webhooks-title" className="bg-[#111111] border border-[#262626] rounded-lg p-5 shadow-2xs space-y-4 font-mono text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262626] pb-4">
        <div>
          <span className="text-[#FBD227] uppercase font-bold text-[10px] tracking-wider block">Integrations & Dispatch</span>
          <h2 id="webhooks-title" className="font-monument text-lg font-black text-white uppercase mt-0.5">
            CRM & Team Webhooks
          </h2>
          <p className="text-gray-400 font-sans text-xs mt-1">
            Real-time notifications sent to Discord, Slack, and GoHighLevel / ClickUp whenever a client books or requests revisions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleTestDispatch}
          disabled={testing}
          className="px-3.5 py-2 border border-[#333333] bg-[#161616] text-[#FBD227] hover:border-[#FBD227] hover:bg-black font-bold uppercase transition-colors disabled:opacity-50 shrink-0"
        >
          {testing ? "Sending Test…" : "⚡ Send Test Dispatch"}
        </button>
      </div>

      {testResult && (
        <div className={`p-3 rounded border text-xs ${testResult.startsWith("✓") ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300" : "bg-red-950/60 border-red-500/50 text-red-300"}`}>
          {testResult}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        {/* Discord */}
        <div className="border border-[#222222] bg-black p-3.5 rounded space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span>🎮</span> Discord Alerts
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-[#333333] text-gray-300">
              DISCORD_WEBHOOK_URL
            </span>
          </div>
          <p className="text-[11px] text-gray-400 font-sans">
            Rich embedded cards for strategy call bookings, new briefs, and revision requests.
          </p>
        </div>

        {/* Slack */}
        <div className="border border-[#222222] bg-black p-3.5 rounded space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span>💬</span> Slack Channel
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-[#333333] text-gray-300">
              SLACK_WEBHOOK_URL
            </span>
          </div>
          <p className="text-[11px] text-gray-400 font-sans">
            Block-kit formatted messages sent instantly to your agency operations channel.
          </p>
        </div>

        {/* CRM (GoHighLevel / ClickUp) */}
        <div className="border border-[#222222] bg-black p-3.5 rounded space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span>🚀</span> CRM Automation
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-[#333333] text-gray-300">
              CRM_WEBHOOK_URL
            </span>
          </div>
          <p className="text-[11px] text-gray-400 font-sans">
            Syncs leads and bookings to GoHighLevel pipelines or creates ClickUp sprint tasks.
          </p>
        </div>
      </div>
    </section>
  );
};
