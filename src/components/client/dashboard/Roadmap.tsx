import React from "react";
import type { ClientPortalData } from "@/lib/clientPortal";
import { cardPad, eyebrow } from "./styles";

const PHASES = ["Discover", "Design", "Build", "Deliver", "Support"] as const;
const ORDER: Record<(typeof PHASES)[number], number> = { Discover: 1, Design: 2, Build: 3, Deliver: 4, Support: 5 };

/** Five phases. A segmented bar across on wide screens, a stacked list on phones. */
export function Roadmap({ project }: { project: NonNullable<ClientPortalData["project"]> }) {
  const currentOrder = ORDER[project.phase] ?? 0;
  return (
    <section aria-labelledby="roadmap-title" className={cardPad}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="roadmap-title" className="font-monument text-xl font-bold uppercase text-white">
          Roadmap
        </h2>
        <span className={eyebrow}>{project.progress}% complete</span>
      </div>

      <div
        className="mt-5 h-1.5 w-full bg-white/10"
        role="progressbar"
        aria-valuenow={project.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Project progress"
      >
        <div className="h-full bg-[#FBD227]" style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }} />
      </div>

      <ol className="mt-6 grid gap-3 sm:grid-cols-5">
        {PHASES.map((phase, index) => {
          const done = ORDER[phase] < currentOrder;
          const current = phase === project.phase;
          return (
            <li
              key={phase}
              aria-current={current ? "step" : undefined}
              className={`flex items-center gap-3 border-l-4 py-1 pl-4 sm:block sm:border-l-0 sm:border-t-4 sm:pb-0 sm:pl-0 sm:pt-3 ${
                current ? "border-[#FBD227]" : done ? "border-[#FBD227]/50" : "border-white/10"
              }`}
            >
              <span className={`font-sans text-xs font-bold uppercase tracking-[0.16em] ${current ? "text-[#FBD227]" : "text-[#A3A3A3]"}`}>
                0{index + 1} · {done ? "Done" : current ? "Now" : "Next"}
              </span>
              <span className={`block font-monument text-base font-bold uppercase sm:mt-1 ${current || done ? "text-white" : "text-[#A3A3A3]"}`}>
                {phase}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
