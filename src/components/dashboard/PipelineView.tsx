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
    { id: "proposal_sent", label: "3. Proposal Sent", color: "border-amber-400" },
    { id: "in_review", label: "4. In Review / SOW", color: "border-purple-400" },
    { id: "won", label: "5. Won / Kickoff", color: "border-emerald-500" },
    { id: "lost", label: "6. Lost", color: "border-gray-400" },
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
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "Could not move this lead.");
    } catch (err) {
      setOpportunities(previous);
      setError(err instanceof Error ? err.message : "Could not move this lead.");
    }
  };

  return (
    <div className="p-6 sm:p-10 max-w-[96rem] mx-auto text-[#000000]">
      {/* Top Banner with GHL Summary Metrics */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-gray-500 block mb-1">
            Leads
          </span>
          <h1 className="font-monument text-3xl font-black text-[#000000] tracking-tight">
            OPPORTUNITIES PIPELINE
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Track leads, proposals, and deal conversions directly from website inquiries.
          </p>
        </div>

        {/* Aggregate Stats */}
        <div className="flex flex-wrap gap-4 bg-white border border-gray-300 p-3 rounded-lg shadow-sm">
          <div className="px-3 border-r border-gray-200">
            <span className="text-xs font-mono uppercase text-gray-500 block">Total Pipeline</span>
            <span className="font-mono text-lg font-bold text-black">${totalValue.toLocaleString()}</span>
          </div>
          <div className="px-3 border-r border-gray-200">
            <span className="text-xs font-mono uppercase text-gray-500 block">Deals Won</span>
            <span className="font-mono text-lg font-bold text-emerald-600">${wonValue.toLocaleString()}</span>
          </div>
          <div className="px-3">
            <span className="text-xs font-mono uppercase text-gray-500 block">Win Rate</span>
            <span className="font-mono text-lg font-bold text-[#000000]">{winRate}%</span>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 border-l-4 border-[#DD7230] bg-[#F8E3D6] px-4 py-3 font-mono text-xs font-bold text-black">
          {error}
        </p>
      )}
      {load === "error" && (
        <p role="alert" className="mb-4 border-l-4 border-[#DD7230] bg-[#F8E3D6] px-4 py-3 font-mono text-xs font-bold text-black">
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
              className="bg-gray-100/80 border border-gray-300 rounded-lg p-3 min-w-[15rem] flex flex-col min-h-[36rem]"
            >
              {/* Column Header */}
              <div className={`border-t-4 ${stage.color} pt-2 mb-3 bg-white p-2.5 rounded shadow-2xs`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-black uppercase tracking-wider">{stage.label}</h3>
                  <span className="font-mono text-xs font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                    {stageOpps.length}
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold text-gray-500 mt-1 block">
                  ${stageSum.toLocaleString()}
                </span>
              </div>

              {/* Cards in Column */}
              <div className="space-y-3 flex-1">
                {stageOpps.length === 0 ? (
                  <div className="border border-dashed border-gray-300 rounded p-4 text-center text-xs text-gray-600">
                    No opportunities
                  </div>
                ) : (
                  stageOpps.map((opp) => (
                    <div
                      key={opp.id}
                      className="border border-gray-300 bg-white p-3.5 rounded shadow-sm hover:shadow transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-bold text-xs text-black leading-tight">{opp.company}</h4>
                          <span className="text-xs text-gray-500">{opp.name}</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          ${opp.dealValue.toLocaleString()}
                        </span>
                      </div>

                      {/* Tier & Needs */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          {opp.recommendedTier}
                        </span>
                        {(opp.needs ?? []).map((n) => (
                          <span key={n} className="text-xs font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                            {n.split(" ")[0]}
                          </span>
                        ))}
                      </div>

                      {opp.message && (
                        <p className="text-xs text-gray-600 italic line-clamp-2 mb-3 bg-gray-50 p-1.5 rounded">
                          &quot;{opp.message}&quot;
                        </p>
                      )}

                      {/* Move Stage Selector */}
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-600 font-mono">Stage:</span>
                        <select
                          aria-label={`Stage for ${opp.company}`}
                          value={opp.stage}
                          onChange={(e) => handleMoveStage(opp.id, e.target.value as Opportunity["stage"])}
                          className={fieldCompact}
                        >
                          <option value="new_inquiry">New Inquiry</option>
                          <option value="qualified">Qualified</option>
                          <option value="proposal_sent">Proposal Sent</option>
                          <option value="in_review">In Review</option>
                          <option value="won">Won / Kickoff</option>
                          <option value="lost">Lost</option>
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
