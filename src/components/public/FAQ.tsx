import React from "react";
import { siteData } from "@/data/siteData";
import { SectionHeader } from "./SectionHeader";

interface FAQProps {
  onOpenInquiry: () => void;
}

export const FAQ: React.FC<FAQProps> = ({ onOpenInquiry }) => {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-16 bg-white py-16 text-black sm:py-24 lg:py-28">
      <div className="mx-auto grid w-full max-w-[88rem] gap-12 px-5 sm:px-8 lg:grid-cols-[22rem_1fr] lg:gap-20 lg:px-10">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeader tone="light" eyebrow="FAQ" title={siteData.faq.title} titleId="faq-title" />
          <div className="mt-8 border-t-2 border-black pt-6">
            <p className="font-sans text-base font-semibold leading-[1.6] text-black">Still have a question?</p>
            <button
              type="button"
              onClick={onOpenInquiry}
              aria-haspopup="dialog"
              className="mt-4 inline-flex min-h-12 items-center gap-3 bg-black px-6 font-sans text-xs font-bold uppercase tracking-[0.14em] text-tvl-amber transition-colors hover:bg-tvl-amber hover:text-black focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              Start a project
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        <div className="border-t-2 border-black">
          {siteData.faq.items.map((item, idx) => (
            <details
              key={item.q}
              name="virtus-faq"
              className="group relative border-b-2 border-black open:bg-[#FEF6D4] [&_summary::-webkit-details-marker]:hidden"
            >
              <span aria-hidden="true" className="absolute inset-y-0 left-0 hidden w-1.5 bg-black group-open:block" />
              <summary className="grid min-h-[4.5rem] cursor-pointer list-none grid-cols-[2.5rem_1fr_auto] items-center gap-3 py-4 pl-3 pr-3 font-sans text-base font-bold text-black focus-visible:outline focus-visible:outline-[3px] focus-visible:-outline-offset-3 focus-visible:outline-black sm:grid-cols-[3.5rem_1fr_auto] sm:pl-5 sm:text-lg">
                <span aria-hidden="true" className="font-display text-2xl leading-none text-black">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span>{item.q}</span>
                <span aria-hidden="true" className="relative h-4 w-4 shrink-0 text-black">
                  <span className="absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2 bg-current" />
                  <span className="absolute left-1/2 top-0 h-4 w-0.5 -translate-x-1/2 bg-current transition-all duration-200 group-open:rotate-90 group-open:opacity-0" />
                </span>
              </summary>
              <div className="faq-answer-grid">
                <div className="overflow-hidden">
                  <p className="max-w-[62ch] pb-6 pl-[3.25rem] pr-6 font-sans text-base leading-[1.6] text-[#333333] sm:pl-[5rem]">
                    {item.a}
                  </p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};
