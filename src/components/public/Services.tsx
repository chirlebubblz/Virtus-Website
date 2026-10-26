import React from "react";
import Image from "next/image";
import Link from "next/link";
import { siteData } from "@/data/siteData";
import { SectionHeader } from "./SectionHeader";
import { IndexBadge } from "./ui";
import { Icon } from "@/components/icons/Icon";

export const Services: React.FC = () => {
  const projectsById = new Map(siteData.work.projects.map((project) => [project.id, project]));

  return (
    <section
      id="services"
      aria-labelledby="services-title"
      className="relative scroll-mt-16 overflow-hidden bg-[#070707] py-16 text-white sm:py-24 lg:py-28"
    >
      {/* Ambient background bloom */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-1/4 -left-32 h-[34rem] w-[34rem] rounded-full bg-[#F5C518]/[0.025] blur-[150px]" />
        <div className="absolute bottom-10 right-0 h-[36rem] w-[36rem] rounded-full bg-[#F5C518]/[0.02] blur-[160px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[96rem] 2xl:max-w-[104rem] px-5 sm:px-8 lg:px-10 2xl:px-12">
        <SectionHeader
          tone="dark"
          eyebrow="Capabilities"
          title={siteData.services.title}
          titleId="services-title"
          intro={siteData.services.intro}
          className="mb-12 sm:mb-16"
        />

        <ul className="grid gap-6 md:grid-cols-2 lg:gap-8">
          {siteData.services.pillars.map((pillar, idx) => {
            const project = projectsById.get(pillar.projectId);
            return (
              <li key={pillar.id} className="flex">
                <article className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0E0E0E] transition-all duration-300 hover:border-[#F5C518]/50 hover:shadow-[0_0_35px_rgba(245,197,24,0.08)]">
                  {/* Visual Preview */}
                  {project && (
                    <div className="relative aspect-[16/8] overflow-hidden border-b border-white/10 bg-black">
                      <Image
                        src={project.image}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 37rem"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-[#0E0E0E] via-black/25 to-black/40"
                      />
                      <div className="absolute left-3.5 top-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1 font-mono text-[0.625rem] font-bold uppercase tracking-wider text-zinc-300 backdrop-blur-md">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#F5C518]" />
                          SYS.0{idx + 1}
                        </span>
                      </div>
                      <IndexBadge index={idx + 1} className="absolute right-3.5 top-3.5" />
                    </div>
                  )}

                  {/* Body Details */}
                  <div className="flex flex-1 flex-col p-6 sm:p-8">
                    <h3 className="font-monument text-xl font-bold uppercase leading-[1.2] text-white transition-colors duration-200 group-hover:text-[#F5C518] sm:text-2xl">
                      {pillar.name}
                    </h3>

                    <p className="mt-3 max-w-[48ch] 2xl:max-w-[56ch] font-sans text-sm leading-[1.65] text-zinc-400 sm:text-base">
                      {pillar.outcome}
                    </p>

                    {/* Capabilities Tags */}
                    <ul className="mt-6 flex flex-wrap gap-2">
                      {pillar.capabilities.slice(0, 5).map((cap) => (
                        <li
                          key={cap}
                          className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 font-sans text-xs font-medium text-zinc-300 transition-colors group-hover:border-white/20"
                        >
                          {cap}
                        </li>
                      ))}
                    </ul>

                    {/* Action Button */}
                    <Link
                      href={`/work/${pillar.slug}`}
                      className="group/btn mt-8 inline-flex items-center gap-3 self-start rounded-lg border border-white/15 bg-white/[0.04] px-5 py-3 font-sans text-xs font-bold uppercase tracking-[0.14em] text-white transition-all hover:border-[#F5C518] hover:bg-[#F5C518] hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518]"
                    >
                      <span>See {pillar.name} work</span>
                      <Icon
                        name="arrow-right"
                        className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:translate-x-1"
                      />
                    </Link>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>

        {/* Closing multi-discipline banner */}
        <div className="relative z-10 mt-12 flex flex-col justify-between gap-6 rounded-2xl border border-white/10 bg-[#0C0C0C] p-6 sm:p-8 md:flex-row md:items-center">
          <div className="max-w-[58ch] 2xl:max-w-[68ch] border-l-2 border-[#F5C518] pl-5">
            <p className="font-sans text-sm font-medium leading-[1.65] text-zinc-300 sm:text-base">
              {siteData.services.closing}
            </p>
          </div>
          <Link
            href="/#contact"
            className="group inline-flex min-h-12 shrink-0 items-center justify-center gap-2.5 rounded-lg bg-[#F5C518] px-6 py-3 font-sans text-xs font-extrabold uppercase tracking-[0.14em] text-black shadow-[0_0_20px_rgba(245,197,24,0.2)] transition-all hover:bg-[#ffd026] hover:shadow-[0_0_30px_rgba(245,197,24,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518]"
          >
            <span>Assemble A Studio Pod</span>
            <Icon
              name="arrow-right"
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
            />
          </Link>
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
