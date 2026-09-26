"use client";

import React, { useEffect, useState } from "react";
import { AccessConfigPanel } from "./AccessConfigPanel";
import { DemoDataPanel } from "./DemoDataPanel";

export const WorkspaceSettingsView: React.FC = () => {
  const [timeZone, setTimeZone] = useState("");
  useEffect(() => setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone), []);

  const rows: { label: string; value: string }[] = [
    { label: "Studio name", value: "The Virtus Labs" },
    { label: "Currency", value: "USD ($). All amounts in this workspace are shown in US dollars." },
    { label: "Your time zone", value: timeZone || "Detecting…" },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 text-white font-sans">
      <div className="border-b border-[#262626] pb-5">
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-400">Operations OS · Settings</span>
        <h1 className="font-monument text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 uppercase">
          Workspace Settings
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">Current workspace parameters and data configuration.</p>
      </div>

      <p role="note" className="border border-[#262626] border-l-4 border-l-[#FBD227] bg-[#161616] px-4 py-3 font-mono text-xs text-gray-300 rounded-r">
        Studio name and currency are fixed defaults. Access credentials and demo data fixtures are managed below.
      </p>

      <dl className="bg-[#111111] border border-[#262626] rounded-lg divide-y divide-[#1F1F1F] shadow-2xs font-mono text-xs">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1 p-4 sm:grid-cols-[14rem_1fr]">
            <dt className="font-bold uppercase text-gray-400">{row.label}</dt>
            <dd className="text-white font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>

      <AccessConfigPanel />

      <DemoDataPanel />
    </div>
  );
};
