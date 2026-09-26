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

  const stat = (label: string, value: string, note: string) => (
    <div className="bg-white border border-gray-300 p-4 rounded-lg shadow-2xs">
      <span className="font-mono text-xs text-gray-600 block mb-1">{label}</span>
      <span className="font-mono text-2xl font-black text-black block">{value}</span>
      <span className="font-mono text-xs text-gray-600">{note}</span>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-[#000000]">
      <div className="border-b border-gray-200 pb-5">
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-600">Operations OS · Reports</span>
        <h1 className="font-monument text-2xl sm:text-3xl font-black text-[#000000] tracking-tight mt-1 uppercase">
          Performance Reports
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          Figures are calculated from the invoices, leads and tasks in this workspace. All dates, no filters.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stat("Win rate", winRate === null ? "No data" : `${winRate}%`, `${won.length} won of ${closed.length} closed`)}
        {stat("Collected", money(collected), `${money(outstanding)} outstanding`)}
        {stat("Open pipeline", money(openPipeline), `${opportunities.length - closed.length} open leads`)}
        {stat("Average won deal", averageDeal === null ? "No data" : money(averageDeal), `${won.length} won deals`)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-300 rounded-lg p-5 shadow-2xs">
          <h2 className="font-mono font-bold text-sm uppercase tracking-wider text-black mb-4">Task completion</h2>
          <div className="flex justify-between font-mono text-xs mb-1">
            <span className="text-gray-700 font-bold">Done</span>
            <span className="font-black text-black">
              {doneTasks} of {tasks.length}
            </span>
          </div>
          <div
            className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden"
            role="progressbar"
            aria-label="Task completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0}
          >
            <div className="bg-[#FBD227] h-full" style={{ width: `${tasks.length ? (doneTasks / tasks.length) * 100 : 0}%` }} />
          </div>
        </div>

        <div className="bg-white border border-gray-300 rounded-lg p-5 shadow-2xs">
          <h2 className="font-mono font-bold text-sm uppercase tracking-wider text-black mb-4">Delivery portfolio</h2>
          {projects.length === 0 ? (
            <p className="font-mono text-xs text-gray-600">No projects yet.</p>
          ) : (
            <div className="space-y-3 font-mono text-xs">
              {projects.map((p) => (
                <div key={p.id} className="p-3 rounded bg-gray-50 border border-gray-200 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-black block">{p.title}</span>
                    <span className="text-xs text-gray-600">
                      Phase: {p.phase} · Progress: {p.progress}%
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded border border-black font-bold text-xs">{p.riskLevel}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
