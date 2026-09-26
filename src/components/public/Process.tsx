import React from "react";
import { siteData } from "@/data/siteData";
import { SectionHeader } from "./SectionHeader";

export const Process: React.FC = () => {
  return (
    <section id="process" aria-labelledby="process-title" className="scroll-mt-16 bg-black py-16 sm:py-24 lg:py-28">
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[22rem_1fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeader
              eyebrow="The Virtus model"
              title={siteData.process.title}
              titleId="process-title"
              intro={siteData.process.intro}
            />
            <div className="mt-8 border-t border-shelf pt-5">
              <p className="flex flex-wrap gap-x-2 font-monument text-sm font-bold uppercase leading-[1.5] text-white">
                {siteData.why.points.map((point, idx) => (
                  <React.Fragment key={point.name}>
                    {idx > 0 && (
                      <span aria-hidden="true" className="text-tvl-amber">
                        /
                      </span>
                    )}
                    <span>{point.name}</span>
                  </React.Fragment>
                ))}
              </p>
              <p className="mt-3 max-w-[38ch] font-sans text-base leading-[1.6] text-tide">{siteData.why.intro}</p>
            </div>
          </div>

          <ol className="relative">
            <span aria-hidden="true" className="absolute bottom-0 left-[1.4rem] top-0 hidden w-px bg-shelf sm:block" />
            {siteData.process.steps.map((step, idx) => (
              <li key={step.name} className="relative grid grid-cols-[3rem_1fr] gap-x-5 pb-10 last:pb-0 sm:grid-cols-[3rem_1fr] sm:gap-x-8">
                <span className="relative z-10 flex h-12 w-12 items-center justify-center bg-tvl-amber font-display text-2xl leading-none text-black">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="pt-1">
                  <h3 className="font-monument text-xl font-bold uppercase leading-[1.15] text-white sm:text-2xl">{step.name}</h3>
                  <p className="mt-3 max-w-[52ch] font-sans text-base leading-[1.6] text-tide">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};
