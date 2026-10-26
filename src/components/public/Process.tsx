"use client";

import React, { useState, useCallback } from "react";
import { Icon } from "@/components/icons/Icon";
import { useInquiryDialog } from "./SiteChrome";

export interface ProcessProps {
  onOpenInquiry?: () => void;
}

interface ProcessStage {
  id: string;
  num: string;
  name: string;
  timeframe: string;
  owner: string;
  summary: string;
  deliverable: string;
}

const STAGES: ProcessStage[] = [
  {
    id: "discover",
    num: "01",
    name: "Discover",
    timeframe: "Week 01",
    owner: "Strategy Director",
    summary: "Align business KPIs, audit tech requirements, and lock fixed sprint milestones upfront.",
    deliverable: "Scope & Arch Spec",
  },
  {
    id: "design",
    num: "02",
    name: "Design",
    timeframe: "Weeks 02–03",
    owner: "Design Director",
    summary: "Two curated visual directions, tokenized systems, and interactive Figma prototypes.",
    deliverable: "Clickable Prototype",
  },
  {
    id: "build",
    num: "03",
    name: "Build",
    timeframe: "Weeks 03–05",
    owner: "Systems Engineer",
    summary: "Type-safe Next.js & React 19 engineering with weekly live staging previews.",
    deliverable: "Production Codebase",
  },
  {
    id: "deliver",
    num: "04",
    name: "Deliver",
    timeframe: "Week 06",
    owner: "Launch Lead",
    summary: "95+ Lighthouse audits, zero-downtime cutover, and complete repository transfer.",
    deliverable: "100% IP Transfer",
  },
  {
    id: "support",
    num: "05",
    name: "Support",
    timeframe: "Ongoing",
    owner: "Dedicated Tech Lead",
    summary: "30-day launch warranty, 24/7 telemetry monitoring, and flexible evolution sprints.",
    deliverable: "SLA & 24/7 Care",
  },
];

export const Process: React.FC<ProcessProps> = ({ onOpenInquiry }) => {
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);

  // Fallback to inquiry context if not passed as prop
  let contextInquiry: (() => void) | undefined;
  try {
    const dialog = useInquiryDialog();
    contextInquiry = dialog.openInquiry;
  } catch {
    contextInquiry = undefined;
  }

  const handleInquiry = useCallback(() => {
    if (onOpenInquiry) {
      onOpenInquiry();
    } else if (contextInquiry) {
      contextInquiry();
    } else {
      const el = document.getElementById("brief");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [onOpenInquiry, contextInquiry]);

  const activeStage = STAGES[activeStageIndex];

  return (
    <section
      id="process"
      aria-labelledby="process-title"
      className="relative scroll-mt-16 overflow-hidden bg-[#060607] py-16 sm:py-20 lg:py-24 text-white"
    >
      {/* Subtle ambient lighting */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-1/4 -left-40 h-[30rem] w-[30rem] rounded-full bg-[#F5C518]/[0.025] blur-[150px]" />
        <div className="absolute bottom-1/4 -right-40 h-[32rem] w-[32rem] rounded-full bg-[#DD7230]/[0.02] blur-[160px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[96rem] 2xl:max-w-[104rem] px-5 sm:px-8 lg:px-10 2xl:px-12">
        {/* Header */}
        <div className="mb-10 sm:mb-14">
          <div className="flex items-center gap-3 mb-4">
            <span className="h-1 w-10 rounded-full bg-[#F5C518]" aria-hidden="true" />
            <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#F5C518]">
              The Virtus Model // Stages 01–05
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-2xl">
              <h2
                id="process-title"
                className="font-monument text-3xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight text-white"
              >
                How We Work<span className="text-[#F5C518]">.</span>
              </h2>
              <p className="mt-3 font-sans text-sm sm:text-base font-normal leading-relaxed text-zinc-400">
                Five stages. One clear owner at every step. Zero guesswork from day one to launch.
              </p>
            </div>

            {/* Quick Segmented Nav */}
            <div
              role="tablist"
              aria-label="Process stages navigation"
              className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-white/10 bg-[#0C0C0E]/90 p-1.5 backdrop-blur-md scrollbar-none"
            >
              {STAGES.map((s, idx) => {
                const isActive = idx === activeStageIndex;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveStageIndex(idx)}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`stage-card-${s.id}`}
                    className={`group relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 font-mono text-xs transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F5C518] ${
                      isActive
                        ? "bg-[#F5C518] text-black shadow-[0_0_14px_rgba(245,197,24,0.3)] font-bold"
                        : "text-zinc-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{s.num}</span>
                    <span className="hidden sm:inline font-sans text-xs uppercase tracking-wider">
                      {s.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 5-Stage Matrix Grid */}
        <div
          role="region"
          aria-label="Virtus Model Stages Grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4"
        >
          {STAGES.map((stage, idx) => {
            const isActive = idx === activeStageIndex;

            return (
              <div
                key={stage.id}
                id={`stage-card-${stage.id}`}
                tabIndex={0}
                role="button"
                aria-pressed={isActive}
                onClick={() => setActiveStageIndex(idx)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveStageIndex(idx);
                  }
                }}
                className={`group relative flex flex-col justify-between rounded-2xl border p-5 sm:p-6 transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] ${
                  isActive
                    ? "border-[#F5C518] bg-gradient-to-b from-[#16161C] via-[#0F0F13] to-[#0A0A0C] shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_24px_rgba(245,197,24,0.12)] -translate-y-1"
                    : "border-white/10 bg-[#0B0B0E]/80 hover:border-white/25 hover:bg-[#101015] hover:-translate-y-0.5"
                }`}
              >
                {/* Top Active Line Accent */}
                {isActive && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-transparent via-[#F5C518] to-transparent shadow-[0_0_8px_#F5C518]"
                  />
                )}

                <div>
                  {/* Top row: Numeral and Timeframe pill */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span
                      className={`font-monument text-2xl sm:text-3xl font-bold tracking-tight transition-colors duration-200 ${
                        isActive ? "text-[#F5C518]" : "text-white/40 group-hover:text-white/70"
                      }`}
                    >
                      {stage.num}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium transition-colors ${
                        isActive
                          ? "border-[#F5C518]/40 bg-[#F5C518]/15 text-[#F5C518]"
                          : "border-white/10 bg-white/[0.03] text-zinc-400"
                      }`}
                    >
                      {stage.timeframe}
                    </span>
                  </div>

                  {/* Stage Name */}
                  <h3 className="font-monument text-lg sm:text-xl font-bold uppercase tracking-tight text-white group-hover:text-[#F5C518] transition-colors">
                    {stage.name}
                  </h3>

                  {/* Dedicated Owner Badge */}
                  <div className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs">
                    <Icon
                      name="user"
                      className={`h-3 w-3 ${isActive ? "text-[#F5C518]" : "text-zinc-400"}`}
                    />
                    <span className="font-sans text-[11px] text-zinc-400">Owner:</span>
                    <span className="font-sans text-[11px] font-semibold text-zinc-200">
                      {stage.owner}
                    </span>
                  </div>

                  {/* Action Summary */}
                  <p className="mt-4 font-sans text-xs sm:text-sm font-normal leading-relaxed text-zinc-400">
                    {stage.summary}
                  </p>
                </div>

                {/* Bottom Core Output */}
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <Icon
                      name="check"
                      className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-[#F5C518]" : "text-zinc-500"}`}
                    />
                    <span className="font-sans text-xs font-medium">{stage.deliverable}</span>
                  </div>
                  <Icon
                    name="arrow-right"
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      isActive ? "text-[#F5C518] translate-x-1" : "text-zinc-600 group-hover:text-zinc-400"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Operating Commitments & Direct Action Bar */}
        <div className="mt-8 sm:mt-12 rounded-2xl border border-white/10 bg-gradient-to-r from-[#0C0C0E] via-[#0E0E12] to-[#0A0A0C] p-5 sm:p-6 backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-sans text-xs sm:text-sm text-zinc-300">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F5C518]/15 text-[#F5C518]">
                <Icon name="check" className="h-3 w-3" />
              </span>
              <span>Fixed Sprints & Scope</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F5C518]/15 text-[#F5C518]">
                <Icon name="check" className="h-3 w-3" />
              </span>
              <span>100% IP & Repo Ownership</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F5C518]/15 text-[#F5C518]">
                <Icon name="check" className="h-3 w-3" />
              </span>
              <span>Direct Senior Access</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInquiry}
            className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#F5C518] px-5 py-2.5 font-sans text-xs font-extrabold uppercase tracking-[0.14em] text-black shadow-[0_0_20px_rgba(245,197,24,0.2)] transition-all hover:bg-[#ffd026] hover:shadow-[0_0_30px_rgba(245,197,24,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518]"
          >
            <span>Initiate Stage {activeStage.num} ({activeStage.name})</span>
            <Icon
              name="arrow-right"
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
            />
          </button>
        </div>
      </div>

      {/* Hairline boundary */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#F5C518]/25 to-transparent"
      />
    </section>
  );
};

export default Process;
