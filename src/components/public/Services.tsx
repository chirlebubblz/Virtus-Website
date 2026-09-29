import React from "react";
import Image from "next/image";
import { siteData } from "@/data/siteData";
import { SectionHeader } from "./SectionHeader";
import { AccentBar, Button, IndexBadge, SlantDivider } from "./ui";

export const Services: React.FC = () => {
  const projectsById = new Map(siteData.work.projects.map((project) => [project.id, project]));

  return (
    <section id="services" aria-labelledby="services-title" className="relative scroll-mt-16 bg-white py-16 text-black sm:py-24 lg:py-28">
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
                <article className="relative flex w-full flex-col overflow-hidden rounded-xl border-2 border-black bg-white">
                  <AccentBar index={idx} />
                  {project && (
                    <div className="relative aspect-[16/8] border-b-2 border-black bg-black">
                      <Image
                        src={project.image}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 37rem"
                        className="object-cover"
                      />
                      <IndexBadge index={idx + 1} className="absolute right-3 top-3" />
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
                    <Button
                      href={`/work/${pillar.slug}`}
                      tone="black"
                      size="md"
                      icon="arrow-right"
                      className="mt-7 self-start justify-between gap-6"
                    >
                      See {pillar.name} work
                    </Button>
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
      <SlantDivider toTone="black" />
    </section>
  );
};
