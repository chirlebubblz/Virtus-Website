"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { siteData } from "@/data/siteData";
import { SectionHeader } from "./SectionHeader";
import { IconButton, IndexBadge } from "./ui";
import { Icon } from "@/components/icons/Icon";
import { CardHandGallery, type FanCardItem } from "@/components/ui/card-hand-gallery";
import { motion, AnimatePresence } from "motion/react";

const PILLAR_SLUGS: Record<string, string> = {
  "Brand & Creative": "brand",
  "Web & Digital": "web",
  "Content & Video": "content",
  "AI & Automation": "automation",
};

export const WorkShowcase: React.FC = () => {
  const projects = siteData.work.projects;
  const total = projects.length;
  const [activeId, setActiveId] = useState<string>(projects[0]?.id || "tidewater");

  const currentIndex = projects.findIndex((p) => p.id === activeId);
  const activeProject = projects[currentIndex] || projects[0];

  const fanCards: FanCardItem[] = projects.map((p) => ({
    id: p.id,
    src: p.image,
    title: p.name,
    description: p.statement,
    pillar: p.pillar,
    kind: p.kind,
    visualCredit: p.visualCredit,
    capabilities: p.capabilities,
    liveUrl: p.liveUrl,
    href: p.liveUrl || `/work/${PILLAR_SLUGS[p.pillar] || "web"}`,
  }));

  const scrollToIndex = useCallback(
    (index: number) => {
      const target = ((index % total) + total) % total;
      const targetProject = projects[target];
      if (targetProject) setActiveId(targetProject.id);
    },
    [projects, total]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        scrollToIndex(currentIndex + 1);
      } else if (event.key === "ArrowLeft") {
        scrollToIndex(currentIndex - 1);
      }
    },
    [currentIndex, scrollToIndex]
  );

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const el = document.getElementById("work");
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        // Only trigger if no input is focused
        if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) return;
        handleKeyDown(e);
      }
    };

    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [handleKeyDown]);

  const targetSlug = PILLAR_SLUGS[activeProject.pillar] || "web";
  const destinationHref = activeProject.liveUrl || `/work/${targetSlug}`;
  const isExternal = Boolean(activeProject.liveUrl);

  return (
    <section
      id="work"
      aria-labelledby="work-title"
      className="relative scroll-mt-16 overflow-hidden bg-[#070707] py-16 text-white sm:py-24 lg:py-28"
    >
      {/* Subtle ambient lighting */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-1/3 -right-32 h-[34rem] w-[34rem] rounded-full bg-[#F5C518]/[0.025] blur-[150px]" />
        <div className="absolute bottom-10 left-0 h-[30rem] w-[30rem] rounded-full bg-[#F5C518]/[0.015] blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto mb-8 grid w-full max-w-[96rem] 2xl:max-w-[104rem] gap-8 px-5 sm:mb-12 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end lg:px-10 2xl:px-12">
        <SectionHeader
          tone="dark"
          eyebrow="Concept work"
          title={siteData.work.title}
          titleId="work-title"
          intro={siteData.work.intro}
        />

        <div className="flex items-center justify-between gap-6 lg:flex-col lg:items-end lg:justify-end">
          <div role="status" aria-label={`Project ${currentIndex + 1} of ${total}`}>
            <IndexBadge index={currentIndex + 1} total={total} size="lg" />
          </div>
          <div className="flex gap-2">
            <IconButton
              icon="arrow-left"
              tone="white"
              size="md"
              label="Previous project"
              onClick={() => scrollToIndex(currentIndex - 1)}
            />
            <IconButton
              icon="arrow-right"
              tone="white"
              size="md"
              label="Next project"
              onClick={() => scrollToIndex(currentIndex + 1)}
            />
          </div>
        </div>
      </div>

      {/* Card Hand Gallery Showcase */}
      <div className="relative z-10 mx-auto w-full max-w-[96rem] 2xl:max-w-[104rem] px-5 sm:px-8 lg:px-10 2xl:px-12">
        <CardHandGallery
          cards={fanCards}
          activeId={activeId}
          cardWidth={260}
          hoverLift={18}
          onSelect={(card) => setActiveId(card.id)}
          className="my-4"
          renderLeftPanel={(card, idx, count) => (
            <AnimatePresence mode="wait">
              <motion.div
                key={card.id}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="space-y-3"
              >
                <div className="flex items-center justify-center lg:justify-end gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 font-mono text-[0.625rem] font-bold uppercase tracking-wider text-[#F5C518]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F5C518]" />
                    LAB.0{idx + 1} / 0{count}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/60 px-2.5 py-0.5 font-mono text-[0.625rem] uppercase tracking-wider text-zinc-400">
                    {card.pillar}
                  </span>
                </div>

                <h3 className="font-monument text-2xl font-bold uppercase leading-[1.15] text-white sm:text-3xl lg:text-3xl 2xl:text-4xl">
                  {card.title}
                </h3>

                <p className="font-sans text-sm leading-relaxed text-zinc-400 max-w-sm xl:max-w-md mx-auto lg:ml-auto lg:mr-0">
                  {card.description}
                </p>
              </motion.div>
            </AnimatePresence>
          )}
          renderRightPanel={(card) => (
            <AnimatePresence mode="wait">
              <motion.div
                key={card.id}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 14 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="space-y-4"
              >
                <div>
                  <span className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.2em] text-[#F5C518] block mb-2">
                    Key Capabilities
                  </span>
                  <ul className="flex flex-wrap justify-center lg:justify-start gap-1.5">
                    {card.capabilities?.map((cap) => (
                      <li
                        key={cap}
                        className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 font-sans text-xs font-medium text-zinc-300"
                      >
                        {cap}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2">
                  {isExternal ? (
                    <a
                      href={destinationHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2.5 rounded-lg bg-[#F5C518] px-6 py-3 font-sans text-xs font-extrabold uppercase tracking-[0.14em] text-black shadow-[0_0_20px_rgba(245,197,24,0.2)] transition-all hover:bg-[#ffd026] hover:shadow-[0_0_30px_rgba(245,197,24,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518]"
                    >
                      <span>Launch Live Experience</span>
                      <Icon
                        name="arrow-up-right"
                        className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </a>
                  ) : (
                    <Link
                      href={destinationHref}
                      className="group inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2.5 rounded-lg bg-[#F5C518] px-6 py-3 font-sans text-xs font-extrabold uppercase tracking-[0.14em] text-black shadow-[0_0_20px_rgba(245,197,24,0.2)] transition-all hover:bg-[#ffd026] hover:shadow-[0_0_30px_rgba(245,197,24,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518]"
                    >
                      <span>Explore Case Study</span>
                      <Icon
                        name="arrow-right"
                        className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
                      />
                    </Link>
                  )}
                </div>

                {card.visualCredit && (
                  <p className="font-sans text-[0.6875rem] text-zinc-500 uppercase tracking-wider">
                    {card.visualCredit}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        />
      </div>

      {/* Interactive Project Switcher Bar */}
      <div
        className="relative z-10 mx-auto mt-8 flex w-full max-w-[96rem] 2xl:max-w-[104rem] gap-2 px-5 sm:px-8 lg:px-10 2xl:px-12"
        role="group"
        aria-label="Choose project"
      >
        {projects.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => setActiveId(project.id)}
            aria-label={`Show ${project.name}`}
            aria-current={project.id === activeId ? "true" : undefined}
            className="group flex h-11 flex-1 items-center focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-0 focus-visible:outline-[#F5C518]"
          >
            <span
              aria-hidden="true"
              className={`block h-1.5 w-full rounded-full transition-all duration-300 ${
                project.id === activeId
                  ? "bg-[#F5C518] shadow-[0_0_12px_rgba(245,197,24,0.5)]"
                  : "bg-white/10 group-hover:bg-white/30"
              }`}
            />
          </button>
        ))}
      </div>

      {/* Instruction hint for drag & flick */}
      <p className="relative z-10 mt-4 text-center font-mono text-[0.6875rem] uppercase tracking-widest text-zinc-500">
        Hover to fan · Click or flick card to lift · Use ← → arrows
      </p>

      {/* Hairline boundary */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#F5C518]/20 to-transparent"
      />
    </section>
  );
};
