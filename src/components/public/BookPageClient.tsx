"use client";

import React from "react";
import Link from "next/link";
import { LeadCapture } from "./LeadCapture";
import { Icon } from "@/components/icons/Icon";

const HIGHLIGHTS = [
  {
    icon: "users" as const,
    title: "1-on-1 Studio Leadership",
    desc: "Speak directly with studio directors who build and architect systems, not sales reps.",
  },
  {
    icon: "bolt" as const,
    title: "30-Min High-Impact Scoping",
    desc: "We analyze your scope, tech stack, and deliver actionable technical recommendations.",
  },
  {
    icon: "calendar" as const,
    title: "Instant Google Meet & Calendar Invite",
    desc: "You will immediately receive an email with your Google Meet link and an .ics calendar invite.",
  },
];

export const BookPageClient: React.FC = () => {
  return (
    <div className="bg-black text-white selection:bg-[#FBD227] selection:text-black">
      {/* Top Banner / Hero Context */}
      <section className="relative overflow-hidden border-b border-[#262626] bg-[#0c0c0c] pt-24 pb-16 sm:pt-32 sm:pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#FBD227]/10 via-transparent to-transparent pointer-events-none" />

        <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-10 relative">
          <div className="flex items-center gap-2 mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-[#999999] hover:text-[#FBD227] transition-colors"
            >
              <Icon name="arrow-left" className="h-3.5 w-3.5" />
              <span>Back to home</span>
            </Link>
            <span className="text-neutral-700">·</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FBD227]/30 bg-[#FBD227]/10 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider text-[#FBD227]">
              Live Calendar
            </span>
          </div>

          <div className="max-w-3xl">
            <h1 className="font-monument text-3xl font-black uppercase tracking-tight text-white sm:text-5xl lg:text-6xl">
              Book a Strategy <span className="text-[#FBD227]">Session</span>
            </h1>
            <p className="mt-4 text-base text-neutral-300 sm:text-lg leading-relaxed">
              Choose a date and time on our calendar below. Lock in a focused 30-minute discovery call to scope your technical architecture, timeline, and product roadmap.
            </p>
          </div>

          {/* Value Props Row */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#262626] pt-8">
            {HIGHLIGHTS.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-[#222222] bg-[#141414] p-4.5 hover:border-[#333333] transition-colors"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FBD227]/10 text-[#FBD227] mb-3">
                  <Icon name={item.icon} className="h-5 w-5" />
                </div>
                <h2 className="font-sans font-bold text-sm text-white mb-1">{item.title}</h2>
                <p className="font-sans text-xs text-neutral-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Embedded Live Calendar Booking Experience */}
      <div>
        <LeadCapture
          eyebrow="Direct Studio Booking"
          title="Select Your Preferred Time"
          intro="Reserve an open slot directly on our live studio schedule. All times are automatically checked for conflicts."
          defaultTab="calendar"
        />
      </div>
    </div>
  );
};
