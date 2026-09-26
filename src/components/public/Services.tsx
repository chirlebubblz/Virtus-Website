import React from "react";
import Image from "next/image";
import { siteData } from "@/data/siteData";
import { SectionHeader } from "./SectionHeader";

interface ServicesProps {
  onOpenInquiry: (service?: string) => void;
}

const BARS = ["bg-black", "bg-[#854D27]", "bg-[#DD7230]", "bg-black"];

export const Services: React.FC<ServicesProps> = ({ onOpenInquiry }) => {
  const projectsById = new Map(siteData.work.projects.map((project) => [project.id, project]));

  return (
    <section id="services" aria-labelledby="services-title" className="scroll-mt-16 bg-white py-16 text-black sm:py-24 lg:py-28">
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-10">
        <SectionHeader
          tone="light"
          eyebrow="Capabilities"
          title={siteData.services.title}
          titleId="services-title"
          intro={siteData.services.intro}
          className="mb-10 sm:mb-14"
        />

        <ul className="grid gap-6 md:grid-cols-2 lg:gap-8">
          {siteData.services.pillars.map((pillar, idx) => {
            const project = projectsById.get(pillar.projectId);
            return (
              <li key={pillar.id} className="flex">
                <article className="relative flex w-full flex-col border-2 border-black bg-white">
                  <span aria-hidden="true" className={`absolute inset-y-0 left-0 z-10 w-2 ${BARS[idx % BARS.length]}`} />
                  {project && (
                    <div className="relative aspect-[16/8] overflow-hidden border-b-2 border-black bg-black">
                      <Image
                        src={project.image}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 37rem"
                        className="object-cover"
                      />
                      <span className="absolute right-0 top-0 bg-tvl-amber px-3.5 py-2 font-display text-2xl leading-none text-black">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-1 flex-col py-6 pl-9 pr-6 sm:py-8 sm:pl-11 sm:pr-8">
                    <h3 className="font-monument text-xl font-bold uppercase leading-[1.15] text-black sm:text-2xl">
                      {pillar.name}
                    </h3>
                    <p className="mt-3 max-w-[44ch] font-sans text-base leading-[1.6] text-[#333333]">
                      {pillar.outcome}
                    </p>
                    <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 font-sans text-xs font-bold uppercase tracking-[0.08em] text-black">
                      {pillar.capabilities.slice(0, 4).map((cap) => (
                        <li key={cap} className="flex items-center gap-2">
                          <span aria-hidden="true" className="h-1 w-1 bg-black" />
                          {cap}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => onOpenInquiry(pillar.name)}
                      aria-haspopup="dialog"
                      className="mt-7 inline-flex min-h-12 items-center justify-between gap-6 self-start bg-black px-6 font-sans text-xs font-bold uppercase tracking-[0.14em] text-tvl-amber transition-colors hover:bg-tvl-amber hover:text-black focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-black"
                    >
                      Start with {pillar.name}
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>

        <p className="mt-10 max-w-[60ch] border-l-4 border-black pl-5 font-sans text-base leading-[1.6] text-black">
          {siteData.services.closing}
        </p>
      </div>
    </section>
  );
};
