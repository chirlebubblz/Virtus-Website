"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import type { OverviewData } from "@/app/api/overview/route";
import { workspaceApi } from "./api";

interface OverviewProps {
  onNavigate: (view: string) => void;
}

const EMPTY: OverviewData = {
  pipelineValue: 0,
  openLeadsCount: 0,
  activeProjectsCount: 0,
  collectedTotal: 0,
  deliveryPulse: [],
  focusTasks: [],
  upcomingBookings: [],
  recentActivity: [],
  database: { status: "local" },
};

/** "5 min ago", "3 h ago", or the date for anything older than a day. */
function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export const CommandCenterOverview: React.FC<OverviewProps> = ({ onNavigate }) => {
  // Everything on this page comes from /api/overview, the same database the other pages save to.
  const [metrics, setMetrics] = useState<OverviewData>(EMPTY);
  const [load, setLoad] = useState<"loading" | "ready" | "error">("loading");

  const loadOverview = useCallback(() => {
    setLoad("loading");
    workspaceApi<OverviewData>("/api/overview")
      .then((data) => {
        setMetrics(data);
        setLoad("ready");
      })
      .catch(() => setLoad("error"));
  }, []);

  useEffect(loadOverview, [loadOverview]);
  const shown = (value: string | number) => (load === "loading" ? "…" : value);

  return (
    <div className="p-6 sm:p-10 max-w-[88rem] mx-auto text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 border-b border-[#262626] pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span aria-hidden="true" className="block h-1 w-10 bg-[#FBD227]" />
            <span className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-[#FBD227]">
              OPERATIONS OVERVIEW
            </span>
          </div>
          <h1 className="font-monument text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">
            YOUR COMMAND <span className="text-[#FBD227]">CENTER.</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#999999] mt-2 max-w-[65ch]">
            Summary of leads, projects, invoices, and live activity in this studio workspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate("bookings")}
            className="inline-flex items-center gap-1.5 border border-[#333333] bg-[#141414] px-3.5 py-2 font-sans text-xs font-bold uppercase tracking-[0.12em] text-white hover:border-[#FBD227] hover:text-[#FBD227] transition-all"
          >
            <Icon name="calendar" className="h-4 w-4 text-[#FBD227]" />
            Calendar
          </button>
          <button
            type="button"
            onClick={() => onNavigate("library")}
            className="inline-flex items-center gap-1.5 border border-[#333333] bg-[#141414] px-3.5 py-2 font-sans text-xs font-bold uppercase tracking-[0.12em] text-white hover:border-[#FBD227] hover:text-[#FBD227] transition-all"
          >
            <Icon name="library" className="h-4 w-4 text-[#FBD227]" />
            Library
          </button>
          <button
            type="button"
            onClick={() => onNavigate("leads")}
            className="inline-flex items-center gap-2 border-2 border-[#FBD227] bg-[#FBD227] px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.14em] text-black hover:bg-transparent hover:text-[#FBD227] transition-all"
          >
            <Icon name="bolt" className="h-4 w-4" />
            Open pipeline
            <Icon name="arrow-right" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {load === "error" && (
        <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-[#DD7230] bg-[#DD7230]/10 px-4 py-3 text-xs">
          <span>The overview could not be loaded. Check your connection and try again.</span>
          <button type="button" onClick={loadOverview} className="border border-[#333333] bg-[#141414] px-3 py-1.5 font-sans text-xs font-bold uppercase text-white hover:border-[#FBD227]">
            Retry
          </button>
        </div>
      )}

      {/* Row 1: 4 Live Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Card 1: Pipeline Value */}
        <div className="border border-[#262626] bg-[#111111] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-[#999999]">Pipeline value</span>
            <div className="flex h-7 w-7 items-center justify-center border border-[#FBD227]/40 bg-[#FBD227]/10 text-[#FBD227] font-bold text-xs">
              $
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-monument text-2xl font-bold text-white">
              {shown(`${metrics.pipelineValue.toLocaleString()}`)}
            </span>
          </div>
          <span className="text-xs text-[#666666] mt-2 block">
            from open opportunities
          </span>
        </div>

        {/* Card 2: Open Leads */}
        <div className="border border-[#262626] bg-[#111111] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-[#999999]">Open leads</span>
            <div className="flex h-7 w-7 items-center justify-center border border-[#333333] bg-[#1A1A1A] text-white font-bold text-xs">
              <Icon name="users" className="h-4 w-4 text-[#FBD227]" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-monument text-2xl font-bold text-white">
              {shown(metrics.openLeadsCount)}
            </span>
          </div>
          <span className="text-xs text-[#666666] mt-2 block">
            active studio prospects
          </span>
        </div>

        {/* Card 3: Active Projects */}
        <div className="border border-[#262626] bg-[#111111] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-[#999999]">Active projects</span>
            <div className="flex h-7 w-7 items-center justify-center border border-[#333333] bg-[#1A1A1A] text-white font-bold text-xs">
              <Icon name="link" className="h-4 w-4 text-[#FBD227]" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-monument text-2xl font-bold text-white">
              {shown(metrics.activeProjectsCount)}
            </span>
          </div>
          <span className="text-xs text-[#666666] mt-2 block">
            delivery sprint portfolio
          </span>
        </div>

        {/* Card 4: Collected Revenue */}
        <div className="border border-[#262626] bg-[#111111] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-[#999999]">Collected</span>
            <div className="flex h-7 w-7 items-center justify-center border border-[#FBD227]/40 bg-[#FBD227]/10 text-[#FBD227] font-bold text-xs">
              <Icon name="check-circle" className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-monument text-2xl font-bold text-[#FBD227]">
              {shown(`${metrics.collectedTotal.toLocaleString()}`)}
            </span>
          </div>
          <span className="text-xs text-[#666666] mt-2 block">
            settled client invoices
          </span>
        </div>
      </div>

      {/* Row 2: Operational Widgets */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols): Delivery Pulse & Focus Today */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Pulse */}
          <div className="border border-[#262626] bg-[#111111] p-6">
            <div className="flex items-center justify-between mb-4 border-b border-[#222222] pb-3">
              <div>
                <h3 className="font-monument text-sm font-bold uppercase text-white">Delivery pulse</h3>
                <p className="text-xs text-[#888888] mt-0.5">Active projects by progress and risk.</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("projects")}
                className="font-sans text-xs font-bold uppercase tracking-wider text-[#FBD227] hover:underline"
              >
                All projects →
              </button>
            </div>

            {metrics.deliveryPulse.length === 0 ? (
              <p className="text-xs text-[#666666] py-6 text-center font-mono">{load === "loading" ? "Loading…" : "No active projects yet."}</p>
            ) : (
              <div className="space-y-3 pt-1">
                {metrics.deliveryPulse.map((proj) => (
                  <div key={proj.id} className="border border-[#262626] p-4 bg-[#141414]">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs font-bold text-white block">{proj.clientName}</span>
                        <span className="text-xs text-[#888888]">{proj.title}</span>
                      </div>
                      <span className="font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-[#FBD227]/40 bg-[#FBD227]/10 text-[#FBD227]">
                        {proj.riskLevel}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex-1 bg-[#262626] h-1.5 overflow-hidden">
                        <div
                          className="bg-[#FBD227] h-full"
                          style={{ width: `${proj.progress}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-bold text-[#CCCCCC]">
                        {proj.progress}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Focus Today */}
          <div className="border border-[#262626] bg-[#111111] p-6">
            <div className="flex items-center justify-between mb-4 border-b border-[#222222] pb-3">
              <div>
                <h3 className="font-monument text-sm font-bold uppercase text-white">My focus today</h3>
                <p className="text-xs text-[#888888] mt-0.5">High-priority tasks requiring action.</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("tasks")}
                className="font-sans text-xs font-bold uppercase tracking-wider text-[#FBD227] hover:underline"
              >
                View board →
              </button>
            </div>

            {metrics.focusTasks.length === 0 ? (
              <p className="text-xs text-[#666666] py-6 text-center font-mono">{load === "loading" ? "Loading…" : "No open tasks."}</p>
            ) : (
              <div className="space-y-2.5">
                {metrics.focusTasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between border-b border-[#1E1E1E] pb-2.5 last:border-b-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-1.5 w-1.5 bg-[#FBD227]" />
                      <span className="text-xs font-medium text-[#E5E5E5]">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#888888]">{t.assignee}</span>
                      <span className="text-[10px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 border border-[#DD7230]/40 bg-[#DD7230]/10 text-[#DD7230]">
                        {t.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Bookings, Recent Activity & Live Database Status */}
        <div className="space-y-6">
          {/* Upcoming Bookings Widget */}
          <div className="border border-[#262626] bg-[#111111] p-5">
            <div className="flex items-center justify-between mb-3 border-b border-[#222222] pb-2">
              <div className="flex items-center gap-2">
                <span className="font-monument text-xs font-bold uppercase text-white">Upcoming bookings</span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("bookings")}
                className="font-sans text-xs font-bold uppercase tracking-wider text-[#FBD227] hover:underline"
              >
                Calendar →
              </button>
            </div>

            <div className="space-y-2.5 pt-1">
              {metrics.upcomingBookings.length === 0 && (
                <p className="text-xs text-[#666666] py-4 text-center font-mono">{load === "loading" ? "Loading…" : "No upcoming calls."}</p>
              )}
              {metrics.upcomingBookings.map((book) => (
                <div
                  key={book.id}
                  className="p-3 bg-[#141414] border border-[#262626] text-xs flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-bold text-white block">{book.clientName}</span>
                    <span className="text-xs text-[#888888] font-mono mt-0.5 block">
                      {book.date} • {book.time}
                    </span>
                  </div>
                  {/^https:\/\//i.test(book.meetingUrl) ? (
                    <a
                      href={book.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-sans text-xs font-bold uppercase tracking-wider px-2.5 py-1 border border-[#FBD227] bg-[#FBD227] text-black hover:bg-transparent hover:text-[#FBD227] transition-colors shrink-0"
                    >
                      Join
                    </a>
                  ) : (
                    <span className="font-mono text-xs text-[#666666] shrink-0">No link</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="border border-[#262626] bg-[#111111] p-6">
            <div className="flex items-center justify-between mb-4 border-b border-[#222222] pb-2">
              <div>
                <h3 className="font-monument text-xs font-bold uppercase text-white">Recent activity</h3>
                <p className="text-xs text-[#888888] mt-0.5">Live workspace signals.</p>
              </div>
              <span className="text-[#666666] text-xs">●</span>
            </div>

            {metrics.recentActivity.length === 0 ? (
              <p className="text-xs text-[#666666] py-6 text-center font-mono">
                {load === "loading" ? "Loading…" : metrics.database.status === "local" ? "Activity is recorded once a database is connected." : "No activity recorded yet."}
              </p>
            ) : (
              <div className="space-y-3">
                {metrics.recentActivity.map((act) => (
                  <div key={act.id} className="text-xs border-l-2 border-[#FBD227] pl-3 py-1">
                    <p className="text-[#E0E0E0] font-medium leading-snug">{act.description}</p>
                    <span className="text-[11px] text-[#777777] font-mono mt-0.5 block">
                      {timeAgo(act.at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Staging / Production Status Card */}
          <div className="border-2 border-[#FBD227] bg-[#111111] p-6 relative">
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#FBD227] block mb-2">
              DATABASE STATUS
            </span>
            <h4 className="font-monument text-sm font-bold uppercase text-white">
              {load === "loading"
                ? "Checking…"
                : load === "error"
                ? "Not reachable."
                : metrics.database.status === "connected"
                ? `Neon connected (${metrics.database.latencyMs} ms).`
                : "Local store only."}
            </h4>
            <p className="text-xs text-[#999999] mt-2 leading-relaxed">
              {load === "error"
                ? "The workspace could not reach the server. Records cannot be loaded or saved until it is back."
                : metrics.database.status === "local"
                ? "No database is configured, so records live in memory and are lost when the server restarts."
                : "Leads, clients, bookings, proposals, contracts, invoices, projects and tasks are saved in the database."}
            </p>
            <button
              type="button"
              onClick={() => onNavigate("settings")}
              className="mt-4 inline-flex items-center gap-1.5 border border-[#333333] bg-[#1A1A1A] px-3.5 py-1.5 font-sans text-xs font-bold uppercase tracking-wider text-white hover:border-[#FBD227] hover:text-[#FBD227] transition-colors"
            >
              Review access & settings →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
