"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { getPillarBySlug, getProjectsForPillar } from "@/lib/servicePillars";
import { AccentBar, IndexBadge, SlantDivider } from "../ui";
import { Icon } from "@/components/icons/Icon";
import { DisciplineCta } from "./DisciplineCta";
import { DisciplineMore, DisciplineNav } from "./DisciplineNav";

const pillar = getPillarBySlug("brand");

export function BrandCreativePage() {
  const project = getProjectsForPillar(pillar)[0];

  return (
    <>
      <DisciplineNav current="brand" />
      <section className="relative bg-white py-16 text-black sm:py-24">
        <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-10">
          <Link
            href="/#services"
            className="group inline-flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-[0.12em] text-black hover:text-[#854D27] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            <Icon name="arrow-left" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
            Back to Services
          </Link>

          <span className="mt-10 block text-eyebrow font-sans font-bold uppercase text-[#854D27]">{pillar.name}</span>
          <h1 className="mt-4 max-w-[24ch] font-monument text-h1 font-bold uppercase leading-[1.05] text-black">
            Brand systems people remember.
          </h1>

          <div className="mt-8 flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <AccentBar key={i} index={i} orientation="slant" className="h-3 w-16" />
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="brand-body-title" className="bg-white py-4 text-black sm:py-8">
        <div className="mx-auto grid w-full max-w-[88rem] gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:px-10">
          <div>
            <h2 id="brand-body-title" className="sr-only">
              What Brand &amp; Creative delivers
            </h2>
            <p className="max-w-[42ch] font-monument text-h3 font-bold leading-[1.3] text-black">{pillar.outcome}</p>
            <ol className="mt-10 space-y-3">
              {pillar.capabilities.map((cap, idx) => (
                <li key={cap} className="flex items-center gap-4 border-b border-[#E5E5E5] pb-3">
                  <IndexBadge index={idx + 1} size="sm" tone="black" />
                  <span className="font-sans text-base font-semibold text-black">{cap}</span>
                </li>
              ))}
            </ol>
          </div>

          {project && (
            <div className="flex flex-col overflow-hidden rounded-xl border-2 border-black bg-black">
              <div className="relative aspect-[3/4]">
                <Image src={project.image} alt={project.imageAlt} fill sizes="(max-width: 1024px) 100vw, 40rem" className="object-cover" />
              </div>
              <div className="border-t-4 border-[#854D27] p-6 sm:p-8">
                <span className="font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-tide">{project.visualCredit}</span>
                <h3 className="mt-2 font-monument text-xl font-bold uppercase text-white">{project.name}</h3>
                <p className="mt-3 font-sans text-base leading-[1.6] text-tide">{project.statement}</p>
                <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white">
                  {project.capabilities.map((cap) => (
                    <li key={cap} className="flex items-center gap-2">
                      <span aria-hidden="true" className="h-1 w-1 bg-[#854D27]" />
                      {cap}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
        <div className="relative mt-16 sm:mt-24">
          <SlantDivider toTone="black" />
        </div>
      </section>

      <DisciplineMore current="brand" />
      <DisciplineCta pillarName={pillar.name} line="Have a brand worth" subline="remembering?" />
    </>
  );
}
