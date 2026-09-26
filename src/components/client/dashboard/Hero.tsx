import React from "react";
import type { ClientPortalData } from "@/lib/clientPortal";
import type { ApprovalStatus } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { ProgressRing } from "./ProgressRing";
import { Container } from "./Container";
import { btnOutline, btnYellow, enter, eyebrow, stagger } from "./styles";
import { useClock } from "./clock";
import { dateLabel, daysUntil, greeting } from "./format";

export type TabId = "overview" | "deliverables" | "invoices" | "calls";

interface HeroProps {
  name: string;
  project: ClientPortalData["project"];
  approval: ApprovalStatus;
  deliverableCount: number;
  onNavigate: (tab: TabId) => void;
}

/** The single next thing the client should do, from what the portal already knows. */
function nextStep(
  project: HeroProps["project"],
  approval: ApprovalStatus,
  deliverableCount: number
): { title: string; body: string; cta?: { label: string; tab: TabId } } {
  if (!project) {
    return {
      title: "Your project is being set up",
      body: "Your account lead is preparing the plan. Milestones appear here as soon as work is scheduled.",
    };
  }
  if (approval === "approved") {
    return { title: "Milestone approved", body: "Thank you. The team is moving to the next step." };
  }
  if (approval === "changes_requested") {
    return {
      title: "Changes in progress",
      body: "Your team is working through your latest request.",
      cta: { label: "View your requests", tab: "overview" },
    };
  }
  if (deliverableCount > 0) {
    return {
      title: "Your review is needed",
      body: `Look over the latest ${project.phase} work, then approve it or tell us what to change.`,
      cta: { label: "Review deliverables", tab: "deliverables" },
    };
  }
  return { title: "Work in progress", body: "Your first deliverable will land here for review." };
}

export function Hero({ name, project, approval, deliverableCount, onNavigate }: HeroProps) {
  const step = nextStep(project, approval, deliverableCount);
  const { today, hour } = useClock();
  const left = project ? daysUntil(project.targetDate, today) : null;

  return (
    <section aria-labelledby="hero-title" className="pb-8 pt-10 sm:pb-12 sm:pt-14">
      <Container className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
        <div className={enter}>
          <div className="flex items-center gap-4">
            <span aria-hidden="true" className="block h-1 w-12 bg-[#FBD227]" />
            <span className={eyebrow}>{greeting(hour)}</span>
          </div>
          <h1
            id="hero-title"
            className="mt-4 font-monument text-[clamp(2.25rem,6vw,4.25rem)] font-bold uppercase leading-[1.05] text-white"
          >
            {name}
            <span className="text-[#FBD227]">.</span>
          </h1>

          {project && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <p className="font-sans text-lg font-semibold text-white">{project.title}</p>
              <span className="border border-[#FBD227] px-2.5 py-1 font-sans text-xs font-bold uppercase tracking-[0.14em] text-[#FBD227]">
                {project.phase}
              </span>
              <span className="border border-white/25 px-2.5 py-1 font-sans text-xs font-bold uppercase tracking-[0.14em] text-[#D4D4D4]">
                {project.riskLevel}
              </span>
            </div>
          )}

          <div className="mt-8 max-w-[38rem] border-l-4 border-[#FBD227] bg-white/[0.04] p-5 sm:p-6" style={stagger(1)}>
            <p className={eyebrow}>Next step</p>
            <p className="mt-2 font-monument text-xl font-bold uppercase text-white">{step.title}</p>
            <p className="mt-2 font-sans text-base leading-relaxed text-[#D4D4D4]">{step.body}</p>
            {step.cta && (
              <button
                type="button"
                onClick={() => onNavigate(step.cta!.tab)}
                className={`mt-4 ${step.cta.tab === "deliverables" ? btnYellow : btnOutline}`}
              >
                {step.cta.label}
                <Icon name="arrow-right" className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {project && (
          <div className={`flex items-center gap-6 lg:flex-col lg:items-center lg:gap-4 ${enter}`} style={stagger(2)}>
            <ProgressRing value={project.progress} />
            <div className="lg:text-center">
              <p className={eyebrow}>Target date</p>
              <p className="mt-1 font-sans text-lg font-bold text-white">{dateLabel(project.targetDate)}</p>
              {left !== null && (
                <p className="font-sans text-sm text-[#A3A3A3]">
                  {left > 0 ? `${left} day${left === 1 ? "" : "s"} left` : left === 0 ? "Due today" : `${-left} day${left === -1 ? "" : "s"} past`}
                </p>
              )}
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}
