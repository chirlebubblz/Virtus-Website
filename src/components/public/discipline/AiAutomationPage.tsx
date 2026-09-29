"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { getPillarBySlug, getProjectsForPillar } from "@/lib/servicePillars";
import { Icon } from "@/components/icons/Icon";
import { IndexBadge } from "../ui";
import { DisciplineCta } from "./DisciplineCta";
import { DisciplineMore, DisciplineNav } from "./DisciplineNav";

const pillar = getPillarBySlug("automation");
const FLOW_STEPS = ["Input", "Automate", "Review", "Output"];

export function AiAutomationPage() {
  const project = getProjectsForPillar(pillar)[0];

  return (
    <>
      <DisciplineNav current="automation" />
      <section className="relative bg-black py-16 sm:py-24">
        <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-10">
          <Link
            href="/#services"
            className="group inline-flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-[0.12em] text-white hover:text-tvl-amber focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-tvl-amber"
          >
            <Icon name="arrow-left" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
            Back to Services
          </Link>

          <span className="mt-10 block text-eyebrow font-sans font-bold uppercase text-tvl-amber">{pillar.name}</span>
          <h1 className="mt-4 max-w-[26ch] font-monument text-h1 font-bold uppercase leading-[1.05] text-white">
            Systems that run without you.
          </h1>
          <p className="mt-6 max-w-[52ch] font-sans text-lg leading-[1.6] text-tide">{pillar.outcome}</p>

          <div className="mt-14 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none sm:gap-4">
            {FLOW_STEPS.map((step, idx) => (
              <React.Fragment key={step}>
                <div className="flex shrink-0 flex-col items-center gap-3">
                  <IndexBadge index={idx + 1} size="md" />
                  <span className="font-sans text-xs font-bold uppercase tracking-[0.1em] text-white">{step}</span>
                </div>
                {idx < FLOW_STEPS.length - 1 && <span aria-hidden="true" className="h-px w-8 shrink-0 bg-shelf sm:w-16" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      <section aria-label="AI and automation capabilities" className="bg-black pb-16 sm:pb-24">
        <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-10">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pillar.capabilities.map((cap, idx) => (
              <li key={cap} className="flex flex-col gap-4 rounded-xl border border-shelf bg-abyss-2 p-5">
                <span className="font-display text-2xl leading-none text-tvl-amber">{String(idx + 1).padStart(2, "0")}</span>
                <span className="font-sans text-sm font-semibold text-white">{cap}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {project && (
        <section aria-label={`${project.name} case file`} className="bg-black pb-16 sm:pb-24">
          <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-10">
            <div className="grid overflow-hidden rounded-xl border border-shelf lg:grid-cols-2">
              <div className="flex flex-col justify-center bg-abyss-2 p-8 sm:p-10">
                <span className="font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-tide">{project.visualCredit}</span>
                <h2 className="mt-2 font-monument text-xl font-bold uppercase text-white">{project.name}</h2>
                <p className="mt-4 font-sans text-base leading-[1.6] text-tide">{project.statement}</p>
                <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white">
                  {project.capabilities.map((cap) => (
                    <li key={cap} className="flex items-center gap-2">
                      <span aria-hidden="true" className="h-1 w-1 bg-tvl-amber" />
                      {cap}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative aspect-[16/10] lg:aspect-auto">
                <Image src={project.image} alt={project.imageAlt} fill sizes="(max-width: 1024px) 100vw, 44rem" className="object-cover" />
              </div>
            </div>
          </div>
        </section>
      )}

      <DisciplineMore current="automation" />
      <DisciplineCta pillarName={pillar.name} line="Ready to automate" subline="the busywork?" />
    </>
  );
}
