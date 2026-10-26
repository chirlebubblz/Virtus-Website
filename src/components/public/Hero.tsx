import React from "react";
import Link from "next/link";
import { siteData } from "@/data/siteData";
import { Icon } from "@/components/icons/Icon";
import { HeroLeadForm } from "./HeroLeadForm";

interface HeroProps {
  onOpenInquiry: () => void;
}

const pad = (value: number) => String(value).padStart(2, "0");

export const Hero: React.FC<HeroProps> = ({ onOpenInquiry }) => {
  return (
    <section
      id="top"
      className="relative flex min-h-[calc(100svh-4rem)] flex-col justify-between overflow-hidden bg-[#050505] text-white md:min-h-[calc(100svh-4.5rem)]"
    >
      {/* Ambient architecture: grid, gold bloom and the oversized V watermark. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="hero-grid absolute inset-0" />

        <div className="absolute -right-24 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-[#F5C518]/5 blur-[140px] sm:h-[36rem] sm:w-[36rem] lg:right-0 lg:h-[42rem] lg:w-[42rem]" />

        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 100 90"
          className="pointer-events-none absolute -right-[22%] top-1/2 z-0 h-[clamp(24rem,72vw,46rem)] w-auto -translate-y-1/2 select-none sm:-right-[10%] lg:right-[-2%] 2xl:right-[2%] lg:h-[92%]"
        >
          <defs>
            <linearGradient id="hero-v-left" x1="0" y1="0" x2="0.82" y2="1">
              <stop offset="0" stopColor="#0A0A0A" />
              <stop offset="0.42" stopColor="#181818" />
              <stop offset="0.72" stopColor="#2E2E2E" />
              <stop offset="1" stopColor="#121212" />
            </linearGradient>
            <linearGradient id="hero-v-gold" x1="0" y1="0" x2="0.35" y2="1">
              <stop offset="0" stopColor="#F5C518" stopOpacity="0.46" />
              <stop offset="0.52" stopColor="#B58F0C" stopOpacity="0.24" />
              <stop offset="1" stopColor="#F5C518" stopOpacity="0.07" />
            </linearGradient>
          </defs>
          <polygon points="0,0 29.6,0 50.2,59.8 79.6,59.8 69,90 31,90" fill="url(#hero-v-left)" />
          <polygon points="70.6,0 100,0 82.9,50.2 53.5,50.2" fill="url(#hero-v-gold)" />
        </svg>

        {/* Keeps the copy column readable without flattening the background artwork. */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#050505_0%,rgba(5,5,5,0.94)_30%,rgba(5,5,5,0.62)_56%,rgba(5,5,5,0.08)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050505] to-transparent" />
      </div>

      <div className="relative z-10 flex flex-1 items-center">
        <div className="hero-copy mx-auto w-full max-w-[96rem] 2xl:max-w-[104rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10 lg:py-12 2xl:px-12">
          <div className="max-w-[54rem] lg:max-w-[70rem] 2xl:max-w-[82rem]">
            {/* Availability eyebrow */}
            <div className="hero-eyebrow hero-rise hero-rise-1 mb-7 flex flex-wrap items-center gap-3 sm:mb-8">
              <span className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 font-sans text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-zinc-300 sm:text-[0.6875rem]">
                <span aria-hidden="true" className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F5C518] opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#F5C518]" />
                </span>
                {siteData.hero.eyebrow}
              </span>
            </div>

            <h1 className="hero-rise hero-rise-2 font-display text-[clamp(3.5rem,7.8vw,6.75rem)] 2xl:text-[7.25rem] uppercase leading-[0.95] tracking-tight text-white">
              {siteData.hero.displayLines.map((line, index) =>
                index === 1 ? (
                  <span
                    key={line}
                    className="relative isolate mt-1 block w-fit max-w-full text-[#F5C518] [text-shadow:0_4px_48px_rgba(5,5,5,0.9)]"
                  >
                    <span aria-hidden="true" className="hero-headline-aura absolute inset-0 -z-10" />
                    <span className="relative">{line}</span>
                  </span>
                ) : (
                  <span key={line} className="block">
                    {line}
                  </span>
                )
              )}
            </h1>

            <p className="hero-body hero-rise hero-rise-3 mt-6 max-w-xl 2xl:max-w-2xl text-pretty font-sans text-base font-medium leading-[1.65] text-zinc-300 sm:mt-7 sm:text-lg lg:text-xl">
              {siteData.hero.body}
            </p>

            {/* One primary conversion path. Everything else stays subordinate. */}
            <div className="hero-actions hero-rise hero-rise-4 mt-8 flex flex-col items-start gap-3 sm:mt-9 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onOpenInquiry}
                aria-haspopup="dialog"
                className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-lg bg-[#F5C518] px-7 py-4 font-sans text-xs font-extrabold uppercase tracking-[0.16em] text-black shadow-[0_0_25px_rgba(245,197,24,0.2)] transition-all hover:bg-[#ffd026] hover:shadow-[0_0_35px_rgba(245,197,24,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
              >
                {siteData.hero.primary.label}
                <Icon
                  name="arrow-up-right"
                  className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </button>

              <Link
                href={siteData.hero.secondary.href}
                className="group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-lg px-5 py-4 font-sans text-xs font-bold uppercase tracking-[0.16em] text-zinc-200 transition-all hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
              >
                {siteData.hero.secondary.label}
                <Icon
                  name="arrow-right"
                  className="h-4 w-4 text-[#F5C518] transition-transform duration-200 group-hover:translate-x-1"
                />
              </Link>
            </div>

            {/* Secondary micro-conversion, visually separated from the brief CTA. */}
            <div className="hero-lead hero-rise hero-rise-4 mt-10 max-w-lg border-t border-white/10 pt-6 sm:mt-12">
              <HeroLeadForm />
            </div>
          </div>
        </div>
      </div>

      <footer aria-label="Studio capabilities" className="relative z-10 border-t border-white/10 bg-[#080808]/90 backdrop-blur-md">
        <div className="mx-auto grid max-w-[96rem] 2xl:max-w-[104rem] grid-cols-2 md:grid-cols-4 md:divide-x md:divide-white/10">
          {siteData.hero.disciplines.map((discipline, index) => {
            const disciplineHref =
              index === 0
                ? "/work/brand"
                : index === 1
                ? "/work/web"
                : index === 2
                ? "/work/content"
                : "/work/automation";

            return (
              <Link
                key={discipline}
                href={disciplineHref}
                className="group flex min-h-[6rem] flex-col justify-between gap-4 px-5 py-5 transition-[background-color,box-shadow] duration-200 hover:bg-white/[0.035] hover:shadow-[inset_0_1px_0_rgba(245,197,24,0.18)] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#F5C518] md:flex-row md:items-center md:gap-3 md:px-6 lg:px-8"
              >
              <span className="flex items-center justify-between gap-3 md:justify-start">
                <span className="font-mono text-[0.625rem] font-medium tracking-[0.18em] text-zinc-400 transition-colors group-hover:text-[#F5C518]">
                  {pad(index + 1)}
                </span>
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 bg-[#F5C518] transition-transform duration-200 group-hover:scale-125"
                />
              </span>

              <span className="min-w-0 font-sans text-[0.65rem] font-semibold uppercase leading-[1.4] tracking-[0.16em] text-zinc-400 transition-colors group-hover:text-white sm:text-xs sm:tracking-[0.18em]">
                {discipline}
              </span>

              <Icon
                name="arrow-up-right"
                className="hidden h-3.5 w-3.5 shrink-0 text-zinc-600 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#F5C518] md:ml-auto md:block"
              />
            </Link>
          );
        })}
      </div>
      </footer>
    </section>
  );
};
