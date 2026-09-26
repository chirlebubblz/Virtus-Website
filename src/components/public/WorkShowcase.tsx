"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { siteData } from "@/data/siteData";
import { SectionHeader } from "./SectionHeader";

const pad = (value: number) => String(value).padStart(2, "0");

export const WorkShowcase: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const projects = siteData.work.projects;
  const total = projects.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const scrollFrameRef = useRef<number | null>(null);

  const trackPadding = () =>
    trackRef.current ? parseFloat(getComputedStyle(trackRef.current).paddingLeft) || 0 : 0;

  const scrollToIndex = useCallback(
    (index: number) => {
      const target = ((index % total) + total) % total;
      const track = trackRef.current;
      const card = cardRefs.current[target];
      if (!track || !card) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollTo({
        left: card.offsetLeft - trackPadding(),
        behavior: reduceMotion ? "auto" : "smooth",
      });
      setCurrentIndex(target);
    },
    [total]
  );

  // Keep the active index in sync with wheel, drag and touch scrolling.
  const syncFromScroll = useCallback(() => {
    if (scrollFrameRef.current !== null) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const track = trackRef.current;
      if (!track) return;
      const origin = track.getBoundingClientRect().left + trackPadding();
      let nearest = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      cardRefs.current.forEach((card, index) => {
        if (!card) return;
        const distance = Math.abs(card.getBoundingClientRect().left - origin);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = index;
        }
      });
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 2) nearest = total - 1;
      setCurrentIndex(nearest);
    });
  }, [total]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollToIndex(currentIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollToIndex(currentIndex - 1);
    }
  };

  const arrowClass =
    "flex h-12 w-12 items-center justify-center border-2 border-white text-lg font-bold text-white transition-colors hover:border-tvl-amber hover:bg-tvl-amber hover:text-black focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-tvl-amber";

  return (
    <section
      id="work"
      aria-labelledby="work-title"
      className="relative scroll-mt-16 overflow-hidden border-b border-shelf/50 bg-abyss py-16 sm:py-24 lg:py-28"
    >
      <div className="mx-auto mb-10 grid w-full max-w-[88rem] gap-8 px-5 sm:mb-14 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end lg:px-10">
        <SectionHeader eyebrow="Concept work" title={siteData.work.title} titleId="work-title" intro={siteData.work.intro} />

        <div className="flex items-center justify-between gap-6 lg:flex-col lg:items-end lg:justify-end">
          <div
            role="status"
            aria-label={`Project ${currentIndex + 1} of ${total}`}
            className="flex items-baseline gap-2 font-display leading-none"
          >
            <span aria-hidden="true" className="text-5xl text-tvl-amber sm:text-6xl">
              {pad(currentIndex + 1)}
            </span>
            <span aria-hidden="true" className="text-2xl text-tide">
              / {pad(total)}
            </span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => scrollToIndex(currentIndex - 1)} className={arrowClass} aria-label="Previous project">
              <span aria-hidden="true">←</span>
            </button>
            <button type="button" onClick={() => scrollToIndex(currentIndex + 1)} className={arrowClass} aria-label="Next project">
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>

      <div
        ref={trackRef}
        onScroll={syncFromScroll}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Lab projects"
        className="work-track relative flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto pb-2 scrollbar-none focus-visible:outline focus-visible:outline-[3px] focus-visible:-outline-offset-4 focus-visible:outline-tvl-amber sm:gap-6 lg:gap-8"
      >
        {projects.map((project, idx) => {
          const isActive = idx === currentIndex;
          const body = (
            <>
              <div className="relative aspect-[4/5] overflow-hidden bg-abyss-2 sm:aspect-[4/3] xl:aspect-[16/11]">
                <Image
                  src={project.image}
                  alt={project.imageAlt}
                  fill
                  sizes="(max-width: 640px) 82vw, (max-width: 1024px) 26rem, (max-width: 1536px) 32rem, 38rem"
                  className={`work-card__image object-cover ${isActive ? "opacity-100" : "opacity-75"}`}
                />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <span className="absolute left-0 top-0 bg-tvl-amber px-3.5 py-2 font-display text-2xl leading-none text-black">
                  {pad(idx + 1)}
                </span>
                <span className="absolute bottom-4 left-4 right-4 truncate font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-white">
                  {project.visualCredit}
                </span>
              </div>

              <div className="flex flex-1 flex-col border-t-4 border-tvl-amber bg-black p-5 sm:p-7">
                <span className="text-eyebrow font-sans font-bold uppercase text-tvl-amber">{project.pillar}</span>
                <h3 className="mt-3 font-monument text-xl font-bold uppercase leading-[1.15] text-white sm:text-2xl">
                  {project.name}
                </h3>
                <p className="mt-3 font-sans text-[0.95rem] leading-[1.6] text-tide">{project.statement}</p>
                <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1.5 pt-5 font-sans text-xs font-semibold uppercase tracking-[0.08em] text-white">
                  {project.capabilities.map((cap) => (
                    <li key={cap} className="flex items-center gap-2">
                      <span aria-hidden="true" className="h-1 w-1 bg-tvl-amber" />
                      {cap}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          );

          const cardClass = `work-card flex w-[82vw] max-w-[24rem] shrink-0 snap-start flex-col border border-shelf sm:w-[26rem] sm:max-w-none lg:w-[30rem] xl:w-[34rem] 2xl:w-[38rem] ${
            isActive ? "" : "opacity-95"
          }`;

          // Only a project with a real destination renders as a link.
          return project.liveUrl ? (
            <a
              key={project.id}
              ref={(node) => {
                cardRefs.current[idx] = node;
              }}
              data-active={isActive}
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${project.name} (opens in a new tab)`}
              className={`${cardClass} focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-tvl-amber`}
            >
              {body}
            </a>
          ) : (
            <article
              key={project.id}
              ref={(node) => {
                cardRefs.current[idx] = node;
              }}
              data-active={isActive}
              aria-label={`Project ${idx + 1} of ${total}: ${project.name}`}
              className={cardClass}
            >
              {body}
            </article>
          );
        })}
      </div>

      <div className="mx-auto mt-8 flex w-full max-w-[88rem] gap-2 px-5 sm:px-8 lg:px-10" role="group" aria-label="Choose project">
        {projects.map((project, idx) => (
          <button
            key={project.id}
            type="button"
            onClick={() => scrollToIndex(idx)}
            aria-label={`Show ${project.name}`}
            aria-current={idx === currentIndex ? "true" : undefined}
            className="group flex h-11 flex-1 items-center focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-0 focus-visible:outline-tvl-amber"
          >
            <span
              aria-hidden="true"
              className={`block h-1 w-full transition-colors duration-300 ${
                idx === currentIndex ? "bg-tvl-amber" : "bg-shelf group-hover:bg-tide"
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  );
};
