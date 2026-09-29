"use client";

import React from "react";
import Image from "next/image";
import { getPillarBySlug, getProjectsForPillar } from "@/lib/servicePillars";
import { DisciplineCta } from "./DisciplineCta";
import { DisciplineMore, DisciplineNav } from "./DisciplineNav";

const pillar = getPillarBySlug("web");

function BrowserFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-shelf bg-abyss-2">
      <div className="flex items-center gap-3 border-b border-shelf bg-black px-4 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#854D27]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#DD7230]" />
          <span className="h-2.5 w-2.5 rounded-full bg-tvl-amber" />
        </span>
        <span className="flex-1 truncate rounded-full bg-abyss-2 px-3 py-1 text-center font-sans text-xs text-tide">
          {label}.example
        </span>
      </div>
      {children}
    </div>
  );
}

export function WebDigitalPage() {
  const projects = getProjectsForPillar(pillar);

  return (
    <>
      <DisciplineNav current="web" />

      <section className="bg-black py-16 sm:py-24 lg:py-28">
        <div className="mx-auto grid w-full max-w-[88rem] items-end gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:gap-6 lg:px-10">
          <div className="lg:col-span-8">
            <span className="block text-eyebrow font-sans font-bold uppercase text-tvl-amber">{pillar.name}</span>
            <h1 className="mt-6 font-monument text-h1 font-bold uppercase leading-[1.02] text-white">
              Built fast.
              <span className="block text-tvl-amber">Built to convert.</span>
            </h1>
          </div>
          <div className="lg:col-span-4 lg:pb-3">
            <p className="max-w-[40ch] font-sans text-lg leading-[1.6] text-tide">{pillar.outcome}</p>
            <a
              href="#web-scope"
              className="mt-8 inline-flex min-h-[2.75rem] items-center border-b-2 border-tvl-amber font-sans text-xs font-bold uppercase tracking-[0.12em] text-white hover:text-tvl-amber focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-tvl-amber"
            >
              See what is in scope
            </a>
          </div>
        </div>
      </section>

      <section aria-label="Web and digital projects" className="bg-black pb-8 sm:pb-16">
        <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-14 px-5 sm:gap-20 sm:px-8 lg:px-10">
          {projects.map((project, idx) => (
            <article key={project.id} aria-label={project.name} className="border-t border-shelf">
              <p className="flex justify-between py-5 font-sans text-xs font-bold uppercase tracking-[0.14em] text-tide sm:pb-8">
                <span>
                  Lab project {String(idx + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}
                </span>
                <span>Concept work</span>
              </p>
              <div className="grid gap-8 lg:grid-cols-12 lg:gap-6">
                <div className={`lg:col-span-8 ${idx % 2 === 1 ? "lg:order-2" : ""}`}>
                  <BrowserFrame label={project.id}>
                    <div className="relative aspect-[16/10] lg:aspect-[16/9]">
                      <Image src={project.image} alt={project.imageAlt} fill sizes="(max-width: 1024px) 100vw, 60rem" className="object-cover" />
                    </div>
                  </BrowserFrame>
                </div>
                <div className={`flex flex-col justify-between gap-8 lg:col-span-4 ${idx % 2 === 1 ? "lg:order-1 lg:pr-4" : "lg:pl-4"}`}>
                  <div>
                    <h2 className="font-monument text-h3 font-bold uppercase leading-[1.1] text-white">{project.name}</h2>
                    <p className="mt-5 font-sans text-lg leading-[1.6] text-tide">{project.statement}</p>
                  </div>
                  <ul className="border-t border-shelf">
                    {project.capabilities.map((cap) => (
                      <li key={cap} className="border-b border-shelf py-3.5 font-sans text-xs font-bold uppercase tracking-[0.1em] text-white">
                        {cap}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="web-scope" aria-labelledby="web-scope-title" className="scroll-mt-16 border-t border-shelf bg-abyss-2 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-10">
          <div className="mb-10 grid gap-4 sm:mb-14 lg:grid-cols-12 lg:items-end lg:gap-6">
            <h2 id="web-scope-title" className="font-monument text-h2 font-bold uppercase leading-[1.1] text-white lg:col-span-7">
              What&apos;s in scope
            </h2>
            <p className="font-sans text-base leading-[1.6] text-tide lg:col-span-5">
              Start with one line item or bring several together. We scope the team around the project.
            </p>
          </div>
          <ul className="grid grid-cols-2 border-l border-t border-shelf lg:grid-cols-4">
            {pillar.capabilities.map((cap, idx) => (
              <li key={cap} className="border-b border-r border-shelf px-4 pb-8 pt-5 sm:px-6 sm:pb-10 sm:pt-7">
                <span className="font-sans text-xs font-bold tracking-[0.14em] text-tvl-amber">{String(idx + 1).padStart(2, "0")}</span>
                <span className="mt-6 block font-sans text-[0.95rem] font-bold text-white sm:mt-9 sm:text-lg">{cap}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <DisciplineMore current="web" />
      <DisciplineCta pillarName={pillar.name} line="Ready for a site" subline="that works harder?" />
    </>
  );
}
