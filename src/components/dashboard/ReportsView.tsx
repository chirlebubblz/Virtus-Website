"use client";

import React from "react";
import { db } from "@/db";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export const ReportsView: React.FC = () => {
  const invoices = db.getInvoices();
  const opportunities = db.getOpportunities();
  const projects = db.getProjects();
  const tasks = db.getTasks();

  const collected = invoices.filter((i) => i.status === "Paid").reduce((a, b) => a + b.amount, 0);
  const outstanding = invoices.filter((i) => i.status !== "Paid").reduce((a, b) => a + b.amount, 0);
  const openPipeline = opportunities
    .filter((o) => o.stage !== "won" && o.stage !== "lost")
    .reduce((a, b) => a + b.dealValue, 0);
  const won = opportunities.filter((o) => o.stage === "won");
  const closed = opportunities.filter((o) => o.stage === "won" || o.stage === "lost");
  // Win rate counts only closed deals, so open leads do not drag it down.
  const winRate = closed.length > 0 ? Math.round((won.length / closed.length) * 100) : null;
  const averageDeal = won.length > 0 ? won.reduce((a, b) => a + b.dealValue, 0) / won.length : null;
  const doneTasks = tasks.filter((t) => t.status === "done").length;

  const stat = (label: string, value: string, note: string, valueColor = "text-white") => (
    <div className="bg-[#111111] border border-[#262626] p-4 rounded-lg shadow-2xs">
      <span className="font-mono text-xs text-gray-400 block mb-1">{label}</span>
      <span className={`font-mono text-2xl font-black ${valueColor} block`}>{value}</span>
      <span className="font-mono text-xs text-gray-400">{note}</span>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-white font-sans">
      <div className="border-b border-[#262626] pb-5">
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-400">Operations OS · Reports</span>
        <h1 className="font-monument text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 uppercase">
          Performance Reports
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Real-time metrics calculated from active invoices, CRM leads, and delivery tasks.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stat("Win rate", winRate === null ? "No data" : `${winRate}%`, `${won.length} won of ${closed.length} closed`, "text-emerald-400")}
        {stat("Collected", money(collected), `${money(outstanding)} outstanding`, "text-[#FBD227]")}
        {stat("Open pipeline", money(openPipeline), `${opportunities.length - closed.length} open leads`)}
        {stat("Average won deal", averageDeal === null ? "No data" : money(averageDeal), `${won.length} won deals`)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#111111] border border-[#262626] rounded-lg p-5 shadow-2xs">
          <h2 className="font-monument font-bold text-sm uppercase tracking-wider text-white mb-4">Task completion</h2>
          <div className="flex justify-between font-mono text-xs mb-1.5">
            <span className="text-gray-400 font-bold">Done</span>
            <span className="font-black text-[#FBD227]">
              {doneTasks} of {tasks.length}
            </span>
          </div>
          <div
            className="w-full bg-[#1F1F1F] h-2.5 rounded-full overflow-hidden"
            role="progressbar"
            aria-label="Task completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0}
          >
            <div className="bg-[#FBD227] h-full transition-all duration-300" style={{ width: `${tasks.length ? (doneTasks / tasks.length) * 100 : 0}%` }} />
          </div>
        </div>

        <div className="bg-[#111111] border border-[#262626] rounded-lg p-5 shadow-2xs">
          <h2 className="font-monument font-bold text-sm uppercase tracking-wider text-white mb-4">Delivery portfolio</h2>
          {projects.length === 0 ? (
            <p className="font-mono text-xs text-gray-500">No projects yet.</p>
          ) : (
            <div className="space-y-3 font-mono text-xs">
              {projects.map((p) => (
                <div key={p.id} className="p-3 rounded bg-[#161616] border border-[#262626] flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-white block">{p.title}</span>
                    <span className="text-xs text-gray-400">
                      Phase: {p.phase} · Progress: {p.progress}%
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded border border-[#262626] bg-[#1F1F1F] font-bold text-xs text-[#FBD227]">{p.riskLevel}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
