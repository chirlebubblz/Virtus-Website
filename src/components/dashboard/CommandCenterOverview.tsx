"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/db";
import { Icon } from "@/components/icons/Icon";

interface OverviewProps {
  onNavigate: (view: string) => void;
}

export const CommandCenterOverview: React.FC<OverviewProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState(db.getOverviewMetrics());

  useEffect(() => {
    // Refresh metrics on mount
    setMetrics(db.getOverviewMetrics());
  }, []);

  return (
    <div className="p-6 sm:p-10 max-w-[88rem] mx-auto text-[#000000]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-gray-500 block mb-1">
            OPERATIONS OVERVIEW
          </span>
          <h1 className="font-monument text-3xl sm:text-4xl font-black text-[#000000] tracking-tight">
            YOUR COMMAND CENTER
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Summary of leads, projects, invoices and activity in this workspace. Figures come from the workspace store and are not saved between reloads unless the database is connected.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate("bookings")}
            className="inline-flex items-center gap-1.5 border border-gray-400 bg-white px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-black shadow-xs hover:border-black hover:bg-[#FBD227] transition-all"
          >
            <span className="inline-flex items-center gap-1.5"><Icon name="calendar" className="h-4 w-4" />Calendar</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("library")}
            className="inline-flex items-center gap-1.5 border border-gray-400 bg-white px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-black shadow-xs hover:border-black hover:bg-gray-50 transition-all"
          >
            <span className="inline-flex items-center gap-1.5"><Icon name="library" className="h-4 w-4" />Library</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("leads")}
            className="inline-flex items-center gap-1.5 border-2 border-black bg-black px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[#FBD227] shadow-xs hover:bg-[#FBD227] hover:text-black transition-all"
          >
            <span className="inline-flex items-center gap-1.5"><Icon name="bolt" className="h-4 w-4" />Open pipeline<Icon name="arrow-right" className="h-4 w-4" /></span>
          </button>
        </div>
      </div>

      {/* Row 1: 4 Live Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Card 1: Pipeline Value */}
        <div className="border border-gray-300 bg-white p-5 rounded shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 font-medium">Pipeline value</span>
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#FBD227]/30 text-amber-800 font-bold text-xs">
              $
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black text-black">
              ${metrics.pipelineValue.toLocaleString()}
            </span>
          </div>
          <span className="text-xs text-gray-600 mt-1 block">
            from open leads
          </span>
        </div>

        {/* Card 2: Open Leads */}
        <div className="border border-gray-300 bg-white p-5 rounded shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 font-medium">Open leads</span>
            <div className="flex h-7 w-7 items-center justify-center rounded bg-sky-100 text-sky-700 font-bold text-xs">
              <Icon name="users" className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black text-black">
              {metrics.openLeadsCount}
            </span>
          </div>
          <span className="text-xs text-gray-600 mt-1 block">
            workspace records
          </span>
        </div>

        {/* Card 3: Active Projects */}
        <div className="border border-gray-300 bg-white p-5 rounded shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 font-medium">Active projects</span>
            <div className="flex h-7 w-7 items-center justify-center rounded bg-rose-100 text-rose-700 font-bold text-xs">
              <Icon name="link" className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black text-black">
              {metrics.activeProjectsCount}
            </span>
          </div>
          <span className="text-xs text-gray-600 mt-1 block">
            delivery portfolio
          </span>
        </div>

        {/* Card 4: Collected Revenue */}
        <div className="border border-gray-300 bg-white p-5 rounded shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 font-medium">Collected</span>
            <div className="flex h-7 w-7 items-center justify-center rounded bg-emerald-100 text-emerald-700 font-bold text-xs">
              <Icon name="mail" className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black text-black">
              ${metrics.collectedTotal.toLocaleString()}
            </span>
          </div>
          <span className="text-xs text-gray-600 mt-1 block">
            paid invoices
          </span>
        </div>
      </div>

      {/* Row 2: Operational Widgets */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols): Delivery Pulse & Focus Today */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Pulse */}
          <div className="border border-gray-300 bg-white p-6 rounded shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-sans font-bold text-sm text-black">Delivery pulse</h3>
                <p className="text-xs text-gray-500">Active projects by progress and risk.</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("projects")}
                className="text-xs font-semibold text-black hover:underline"
              >
                All projects →
              </button>
            </div>

            {metrics.deliveryPulse.length === 0 ? (
              <p className="text-xs text-gray-600 py-6">No active projects yet.</p>
            ) : (
              <div className="space-y-4 pt-2">
                {metrics.deliveryPulse.map((proj) => (
                  <div key={proj.id} className="border border-gray-200 p-4 rounded bg-gray-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs font-bold text-black">{proj.clientName}</span>
                        <span className="text-xs text-gray-500 ml-2">({proj.title})</span>
                      </div>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        {proj.riskLevel}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#FBD227] h-full"
                          style={{ width: `${proj.progress}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-bold text-gray-700">
                        {proj.progress}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Focus Today */}
          <div className="border border-gray-300 bg-white p-6 rounded shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-sans font-bold text-sm text-black">My focus today</h3>
                <p className="text-xs text-gray-500">Tasks that need attention first.</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("tasks")}
                className="text-xs font-semibold text-black hover:underline"
              >
                View board →
              </button>
            </div>

            {metrics.focusTasks.length === 0 ? (
              <p className="text-xs text-gray-600 py-6">No tasks yet.</p>
            ) : (
              <div className="space-y-2.5">
                {metrics.focusTasks.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between border-b border-gray-100 pb-2.5 last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#FBD227]" />
                      <span className="text-xs font-medium text-black">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500">{t.assignee}</span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                        {t.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Bookings, Recent Activity & Staging Status */}
        <div className="space-y-6">
          {/* Upcoming Bookings Widget */}
          <div className="border border-gray-300 bg-white p-5 rounded shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className="font-sans font-bold text-sm text-black">Upcoming bookings</span>
                <span className="font-mono text-[0.6rem] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                  Cal.com
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("bookings")}
                className="font-mono text-xs font-bold text-black hover:underline"
              >
                Calendar →
              </button>
            </div>

            <div className="space-y-2.5">
              {db.getBookings().slice(0, 2).map((book) => (
                <div
                  key={book.id}
                  className="p-2.5 rounded bg-gray-50 border border-gray-200 text-xs flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-bold text-gray-900 block">{book.clientName}</span>
                    <span className="text-xs text-gray-500 font-mono">
                      {book.date} • {book.time}
                    </span>
                  </div>
                  {/^https:\/\//i.test(book.meetingUrl) ? (
                    <a
                      href={book.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs font-bold px-2 py-1 rounded bg-[#1C1C1C] text-white hover:bg-[#FBD227] hover:text-black transition-colors shrink-0"
                    >
                      Join
                    </a>
                  ) : (
                    <span className="font-mono text-xs text-gray-600 shrink-0">No link</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="border border-gray-300 bg-white p-6 rounded shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-sans font-bold text-sm text-black">Recent activity</h3>
                <p className="text-xs text-gray-500">Signals from across the workspace.</p>
              </div>
              <span className="text-gray-400 text-xs">···</span>
            </div>

            {metrics.recentActivity.length === 0 ? (
              <p className="text-xs text-gray-600 py-6">No activity recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {metrics.recentActivity.slice(0, 8).map((act) => (
                  <div key={act.id} className="text-xs border-l-2 border-gray-300 pl-3 py-1">
                    <p className="text-gray-800 font-medium">{act.description}</p>
                    <span className="text-xs text-gray-600 font-mono mt-0.5 block">
                      {act.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Staging Status Card (Warm Yellow Tinted from Image 2) */}
          <div className="border border-[#FCDB52] bg-[#FCDB52] p-6 rounded shadow-sm">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-700 block mb-2">
              STAGING STATUS
            </span>
            <h4 className="font-sans text-base font-bold text-black">
              Live workspace connected.
            </h4>
            <p className="text-xs text-gray-700 mt-2 leading-relaxed">
              Dashboard metrics and activity now read from the Team7641 Neon workspace.
            </p>
            <button
              type="button"
              onClick={() => onNavigate("settings")}
              className="mt-4 inline-flex items-center gap-1.5 border border-gray-400 bg-white px-3.5 py-1.5 text-xs font-bold text-black hover:border-black transition-colors"
            >
              Review access model →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
