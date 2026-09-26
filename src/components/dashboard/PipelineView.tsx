"use client";

import React, { useEffect, useState } from "react";
import type { Opportunity } from "@/db";
import { KanbanSkeleton } from "./Skeleton";
import { fieldCompact } from "./ui";

export const PipelineView: React.FC = () => {
  // The server holds real website inquiries, so read and write the pipeline through the API.
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [load, setLoad] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pipeline")
      .then(async (r) => ({ ok: r.ok, json: await r.json().catch(() => null) }))
      .then(({ ok, json }) => {
        if (cancelled) return;
        if (ok && json?.ok && Array.isArray(json.data)) {
          setOpportunities(json.data.map((o: Opportunity) => ({ ...o, dealValue: Number(o.dealValue), needs: o.needs ?? [] })));
          setLoad("ready");
        } else {
          setLoad("error");
        }
      })
      .catch(() => !cancelled && setLoad("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  const stages = [
    { id: "new_inquiry", label: "1. New Inquiry", color: "border-sky-400" },
    { id: "qualified", label: "2. Qualified / Discovery", color: "border-indigo-400" },
    { id: "proposal_sent", label: "3. Proposal Sent", color: "border-[#FBD227]" },
    { id: "in_review", label: "4. In Review / SOW", color: "border-purple-400" },
    { id: "won", label: "5. Won / Kickoff", color: "border-emerald-500" },
    { id: "lost", label: "6. Lost", color: "border-[#444444]" },
  ] as const;

  const totalValue = opportunities
    .filter((o) => o.stage !== "lost")
    .reduce((sum, o) => sum + o.dealValue, 0);

  const wonValue = opportunities
    .filter((o) => o.stage === "won")
    .reduce((sum, o) => sum + o.dealValue, 0);

  const wonCount = opportunities.filter((o) => o.stage === "won").length;
  const winRate = opportunities.length > 0 ? Math.round((wonCount / opportunities.length) * 100) : 0;

  const handleMoveStage = async (oppId: string, nextStage: Opportunity["stage"]) => {
    const previous = opportunities;
    setError(null);
    // Optimistic move, rolled back if the server rejects it.
    setOpportunities((list) => list.map((o) => (o.id === oppId ? { ...o, stage: nextStage } : o)));
    try {
      const res = await fetch("/api/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: oppId, stage: nextStage }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setOpportunities(previous);
        setError(json?.error ?? "Could not update lead. Try again.");
      }
    } catch {
      setOpportunities(previous);
      setError("Network error. Could not update lead.");
    }
  };

  return (
    <div className="p-6 sm:p-10 max-w-[96rem] mx-auto text-white">
      {/* Top Banner with Summary Metrics */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-[#262626] pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span aria-hidden="true" className="block h-1 w-10 bg-[#FBD227]" />
            <span className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-[#FBD227]">
              LEADS & CONVERSIONS
            </span>
          </div>
          <h1 className="font-monument text-3xl font-black text-white tracking-tight uppercase">
            Opportunities <span className="text-[#FBD227]">Pipeline.</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#999999] mt-2 max-w-[65ch]">
            Track prospects, proposals, and project conversions directly captured from website inquiries.
          </p>
        </div>

        {/* Aggregate Stats */}
        <div className="flex flex-wrap gap-4 bg-[#111111] border border-[#262626] p-3.5">
          <div className="px-3 border-r border-[#262626]">
            <span className="text-xs font-sans uppercase font-bold tracking-wider text-[#888888] block">Total Pipeline</span>
            <span className="font-monument text-lg font-bold text-white">${totalValue.toLocaleString()}</span>
          </div>
          <div className="px-3 border-r border-[#262626]">
            <span className="text-xs font-sans uppercase font-bold tracking-wider text-[#888888] block">Deals Won</span>
            <span className="font-monument text-lg font-bold text-[#FBD227]">${wonValue.toLocaleString()}</span>
          </div>
          <div className="px-3">
            <span className="text-xs font-sans uppercase font-bold tracking-wider text-[#888888] block">Win Rate</span>
            <span className="font-monument text-lg font-bold text-white">{winRate}%</span>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 border-l-4 border-[#DD7230] bg-[#DD7230]/10 px-4 py-3 font-mono text-xs font-bold text-white">
          {error}
        </p>
      )}
      {load === "error" && (
        <p role="alert" className="mb-4 border-l-4 border-[#DD7230] bg-[#DD7230]/10 px-4 py-3 font-mono text-xs font-bold text-white">
          Could not load leads. Reload the page to try again.
        </p>
      )}

      {/* Horizontal Kanban Columns */}
      {load === "loading" ? (
        <KanbanSkeleton />
      ) : (
      <div className="overflow-x-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start pb-6">
        {stages.map((stage) => {
          const stageOpps = opportunities.filter((o) => o.stage === stage.id);
          const stageSum = stageOpps.reduce((sum, o) => sum + o.dealValue, 0);

          return (
            <div
              key={stage.id}
              className="bg-[#0D0D0D] border border-[#262626] p-3 min-w-[16rem] flex flex-col min-h-[36rem]"
            >
              {/* Column Header */}
              <div className={`border-t-2 ${stage.color} pt-2 mb-3 bg-[#141414] border-x border-b border-[#262626] p-2.5`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-monument text-xs font-bold text-white uppercase tracking-wider">{stage.label}</h3>
                  <span className="font-mono text-xs font-bold bg-black border border-[#333333] px-2 py-0.5 text-[#FBD227]">
                    {stageOpps.length}
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold text-[#888888] mt-1 block">
                  ${stageSum.toLocaleString()}
                </span>
              </div>

              {/* Cards in Column */}
              <div className="space-y-3 flex-1">
                {stageOpps.length === 0 ? (
                  <div className="border border-dashed border-[#262626] p-4 text-center text-xs text-[#666666]">
                    No opportunities
                  </div>
                ) : (
                  stageOpps.map((opp) => (
                    <div
                      key={opp.id}
                      className="border border-[#262626] bg-[#141414] p-3.5 hover:border-[#FBD227]/60 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-bold text-xs text-white leading-tight">{opp.company}</h4>
                          <span className="text-xs text-[#888888]">{opp.name}</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-[#FBD227] bg-[#FBD227]/10 border border-[#FBD227]/30 px-2 py-0.5">
                          ${opp.dealValue.toLocaleString()}
                        </span>
                      </div>

                      {/* Tier & Needs */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="text-xs font-mono px-1.5 py-0.5 bg-[#1C1C1C] text-[#FBD227] border border-[#FBD227]/40">
                          {opp.recommendedTier}
                        </span>
                        {(opp.needs ?? []).map((n) => (
                          <span key={n} className="text-xs font-mono px-1.5 py-0.5 bg-[#1C1C1C] text-[#AAAAAA] border border-[#333333]">
                            {n.split(" ")[0]}
                          </span>
                        ))}
                      </div>

                      {opp.message && (
                        <p className="text-xs text-[#999999] italic line-clamp-2 mb-3 bg-black border border-[#222222] p-2">
                          &quot;{opp.message}&quot;
                        </p>
                      )}

                      {/* Move Stage Selector */}
                      <div className="pt-2 border-t border-[#222222] flex items-center justify-between">
                        <span className="text-xs text-[#888888] font-mono">Stage:</span>
                        <select
                          aria-label={`Stage for ${opp.company}`}
                          value={opp.stage}
                          onChange={(e) => handleMoveStage(opp.id, e.target.value as Opportunity["stage"])}
                          className={fieldCompact}
                        >
                          <option value="new_inquiry" className="bg-black text-white">New Inquiry</option>
                          <option value="qualified" className="bg-black text-white">Qualified</option>
                          <option value="proposal_sent" className="bg-black text-white">Proposal Sent</option>
                          <option value="in_review" className="bg-black text-white">In Review</option>
                          <option value="won" className="bg-black text-white">Won / Kickoff</option>
                          <option value="lost" className="bg-black text-white">Lost</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>
      )}
    </div>
  );
};
