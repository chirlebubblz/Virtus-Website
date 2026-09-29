"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { getPillarBySlug, getProjectsForPillar } from "@/lib/servicePillars";
import { Icon } from "@/components/icons/Icon";
import { IndexBadge } from "../ui";
import { DisciplineCta } from "./DisciplineCta";
import { DisciplineMore, DisciplineNav } from "./DisciplineNav";

const pillar = getPillarBySlug("content");

export function ContentVideoPage() {
  const project = getProjectsForPillar(pillar)[0];

  return (
    <>
      <DisciplineNav current="content" />
      <section className="relative overflow-hidden bg-black">
        <div className="absolute left-5 top-6 z-10 sm:left-8 sm:top-8 lg:left-10">
          <Link
            href="/#services"
            className="group inline-flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-[0.12em] text-white hover:text-tvl-amber focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-tvl-amber"
          >
            <Icon name="arrow-left" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
            Back to Services
          </Link>
        </div>

        {project && (
          <div className="relative aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]">
            <Image src={project.image} alt={project.imageAlt} fill priority sizes="100vw" className="object-cover" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/30 to-black/10" />

            <span
              aria-hidden="true"
              className="absolute bottom-10 left-6 hidden font-display text-[clamp(2rem,6vw,4rem)] uppercase leading-none text-white/90 [writing-mode:vertical-rl] sm:block sm:left-8 lg:left-10"
            >
              {pillar.name}
            </span>

            {/* Decorative only — there's no real video behind this Lab Project concept visual. */}
            <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/70 text-white/90">
                <Icon name="play" className="h-6 w-6 translate-x-0.5" />
              </span>
            </div>

            <div className="absolute bottom-8 right-6 max-w-[26ch] text-right sm:right-8 lg:right-10">
              <h1 className="font-monument text-h2 font-bold uppercase leading-[1.05] text-white">
                Content that keeps performing.
              </h1>
            </div>
          </div>
        )}
      </section>

      <section aria-label="Content and video capabilities" className="bg-black py-14 sm:py-20">
        <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-10">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
            {pillar.capabilities.map((cap, idx) => (
              <div key={cap} className="flex w-40 shrink-0 flex-col gap-3 rounded-xl border border-shelf bg-abyss-2 p-4">
                <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#DD7230]" />
                <IndexBadge index={idx + 1} size="sm" />
                <span className="font-sans text-sm font-semibold text-white">{cap}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {project && (
        <section aria-labelledby="content-quote-title" className="bg-black pb-16 sm:pb-24">
          <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-10">
            <p className="max-w-[42ch] font-sans text-eyebrow font-bold uppercase text-tvl-amber">{project.visualCredit}</p>
            <h2 id="content-quote-title" className="mt-4 max-w-[26ch] font-monument text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.15] text-white">
              {pillar.outcome}
            </h2>
            <p className="mt-6 max-w-[60ch] border-l-4 border-[#DD7230] pl-6 font-sans text-lg leading-[1.6] text-tide">{project.statement}</p>
          </div>
        </section>
      )}

      <DisciplineMore current="content" />
      <DisciplineCta pillarName={pillar.name} line="Got a story worth" subline="telling on repeat?" />
    </>
  );
}
