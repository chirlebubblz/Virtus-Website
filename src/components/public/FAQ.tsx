import React from "react";
import { siteData } from "@/data/siteData";
import { SectionHeader } from "./SectionHeader";
import { Icon } from "@/components/icons/Icon";

interface FAQProps {
  onOpenInquiry: () => void;
}

const pad = (value: number) => String(value).padStart(2, "0");

export const FAQ: React.FC<FAQProps> = ({ onOpenInquiry }) => {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="relative scroll-mt-16 bg-[#050505] py-16 text-white sm:py-24 lg:py-28"
    >
      <div className="mx-auto grid w-full max-w-[96rem] 2xl:max-w-[104rem] gap-12 px-5 sm:px-8 lg:grid-cols-[24rem_1fr] 2xl:grid-cols-[28rem_1fr] lg:gap-16 2xl:gap-24 lg:px-10 2xl:px-12">
        {/* Left Column: Sticky Context & Direct Ask */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeader
            tone="dark"
            eyebrow="FAQ"
            title={siteData.faq.title}
            titleId="faq-title"
            intro="Direct answers on timelines, scoping, collaboration models, and file ownership."
          />

          <div className="mt-8 rounded-2xl border border-white/10 bg-[#0E0E0E] p-6 space-y-4">
            <h3 className="font-monument text-sm font-bold uppercase text-white">
              Still have a question?
            </h3>
            <p className="font-sans text-xs sm:text-sm leading-relaxed text-zinc-400">
              Can&apos;t find the answer you need? Send our directors a direct project note and we will reply within 24 hours.
            </p>
            <button
              type="button"
              onClick={onOpenInquiry}
              aria-haspopup="dialog"
              className="group inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-lg bg-[#F5C518] px-5 py-3 font-sans text-xs font-extrabold uppercase tracking-[0.14em] text-black shadow-[0_0_20px_rgba(245,197,24,0.2)] transition-all hover:bg-[#ffd026] hover:shadow-[0_0_30px_rgba(245,197,24,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518]"
            >
              <span>Start a project</span>
              <Icon
                name="arrow-right"
                className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
              />
            </button>
          </div>
        </div>

        {/* Right Column: Accordion list */}
        <div className="border-t border-white/10 divide-y divide-white/10">
          {siteData.faq.items.map((item, idx) => (
            <details
              key={item.q}
              name="virtus-faq"
              className="group relative transition-colors duration-200 open:bg-white/[0.025] [&_summary::-webkit-details-marker]:hidden"
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 hidden w-1 bg-[#F5C518] group-open:block"
              />
              <summary className="grid min-h-[4.5rem] cursor-pointer list-none grid-cols-[2.5rem_1fr_auto] items-center gap-4 py-5 px-3 font-sans text-base sm:text-lg font-bold text-white transition-colors group-hover:text-[#F5C518] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]">
                <span className="font-mono text-xs font-bold text-zinc-500 tracking-wider group-open:text-[#F5C518] transition-colors">
                  {pad(idx + 1)}
                </span>
                <span className="pr-4 leading-snug">{item.q}</span>
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-zinc-300 transition-all group-hover:border-[#F5C518]/50 group-hover:text-[#F5C518]"
                >
                  <Icon name="plus" className="h-3.5 w-3.5 group-open:hidden" />
                  <Icon name="minus" className="hidden h-3.5 w-3.5 group-open:block" />
                </span>
              </summary>
              <div className="faq-answer-grid">
                <div className="overflow-hidden">
                  <p className="max-w-[64ch] 2xl:max-w-[74ch] pb-6 pl-[3.25rem] pr-6 font-sans text-sm sm:text-base leading-relaxed text-zinc-400">
                    {item.a}
                  </p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* Hairline boundary */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#F5C518]/20 to-transparent"
      />
    </section>
  );
};
