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
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 text-[#000000]">
      <div className="border-b border-gray-200 pb-5">
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-600">Operations OS · Settings</span>
        <h1 className="font-monument text-2xl sm:text-3xl font-black text-[#000000] tracking-tight mt-1 uppercase">
          Workspace Settings
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Current workspace configuration.</p>
      </div>

      <p role="note" className="border-l-4 border-[#FBD227] bg-gray-50 px-4 py-3 font-mono text-xs text-black">
        Studio name and currency are fixed in the code for now. Access settings and demo data are managed below.
      </p>

      <dl className="bg-white border border-gray-300 rounded-lg divide-y divide-gray-200 shadow-2xs font-mono text-xs">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1 p-4 sm:grid-cols-[14rem_1fr]">
            <dt className="font-bold uppercase text-gray-700">{row.label}</dt>
            <dd className="text-black">{row.value}</dd>
          </div>
        ))}
      </dl>

      <AccessConfigPanel />

      <DemoDataPanel />
    </div>
  );
};
