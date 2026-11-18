"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BrainCircuit,
  CalendarCheck,
  FileText,
  FolderLock,
  ListChecks,
  Mail,
  Receipt,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  LEGAL_CAMPAIGNS,
  LEGAL_CAMPAIGN_SLUGS,
  LEGAL_MODULES,
  type LegalModuleIcon,
} from "@/lib/legalServices";
import { useInquiryDialog } from "../SiteChrome";
import { Button } from "../ui";
import { Icon } from "@/components/icons/Icon";

const MODULE_ICONS: Record<LegalModuleIcon, LucideIcon> = {
  "calendar-check": CalendarCheck,
  "file-text": FileText,
  "folder-lock": FolderLock,
  receipt: Receipt,
  "list-checks": ListChecks,
  mail: Mail,
  "trending-up": TrendingUp,
  "brain-circuit": BrainCircuit,
};

const STACK_LOGOS = [
  "Clio",
  "MyCase",
  "Microsoft Outlook / 365",
  "Google Workspace",
  "NetDocuments",
  "LawPay",
];

export function LegalOsHub() {
  const [activeId, setActiveId] = useState<string>(LEGAL_MODULES[0].id);
  const { openInquiry } = useInquiryDialog();

  const activeModule = LEGAL_MODULES.find((m) => m.id === activeId) ?? LEGAL_MODULES[0];
  const ActiveIcon = MODULE_ICONS[activeModule.icon];

  return (
    <>
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden border-b border-shelf bg-abyss py-16 sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,210,39,0.09),transparent_65%)]"
        />
        <div className="relative mx-auto w-full max-w-[96rem] 2xl:max-w-[104rem] px-5 sm:px-8 lg:px-10 2xl:px-12">
          <Link
            href="/#services"
            className="group inline-flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-[0.12em] text-seaglass hover:text-tvl-amber focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-tvl-amber"
          >
            <Icon name="arrow-left" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
            Back to Services
          </Link>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <span className="block text-eyebrow font-sans font-bold uppercase text-tvl-amber">
                Law Firm Workflow Automation
              </span>
              <h1 className="mt-4 max-w-[20ch] font-monument text-h1 font-bold uppercase leading-[1.05] text-seaglass">
                Practical Automation for <span className="text-tvl-amber">Law Offices.</span>
              </h1>
              <p className="mt-6 max-w-[58ch] font-sans text-lg leading-[1.6] text-tide">
                Eight day-to-day workflows built for attorneys, paralegals, and their clients—covering intake and
                conflict checks, engagement letter assembly, client portals, and billing follow-ups. Start with one
                bottleneck or connect all eight alongside Clio, MyCase, Outlook, and Google Workspace.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button href="/book" size="lg" icon="arrow-right" fullWidthOnMobile>
                  Book a 15-Min Walkthrough
                </Button>
                <Button
                  variant="outline"
                  tone="white"
                  size="lg"
                  onClick={() => openInquiry("AI & Automation")}
                  aria-haspopup="dialog"
                  fullWidthOnMobile
                >
                  Request a Workflow Review
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-shelf bg-abyss-2 p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-tvl-amber/10 text-tvl-amber">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <span className="block font-sans text-[0.7rem] font-bold uppercase tracking-[0.14em] text-tvl-amber">
                    Confidentiality &amp; Client Data Controls
                  </span>
                  <h2 className="font-monument text-sm font-bold uppercase text-seaglass">
                    Zero Public AI Training
                  </h2>
                </div>
              </div>
              <p className="mt-4 font-sans text-sm leading-[1.6] text-tide">
                Every workflow runs on isolated, zero-retention infrastructure with attorney or paralegal review before
                anything goes to clients or courts. Everything connects directly to your existing software—no data
                migration required.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {STACK_LOGOS.map((tool) => (
                  <span
                    key={tool}
                    className="rounded-md border border-shelf bg-abyss px-2.5 py-1 font-sans text-[0.7rem] font-bold uppercase tracking-[0.08em] text-tide"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive 8-Module Sidebar Switcher + Showcase Panel */}
      <section aria-labelledby="legal-os-modules-heading" className="bg-abyss py-16 sm:py-24">
        <div className="mx-auto w-full max-w-[96rem] 2xl:max-w-[104rem] px-5 sm:px-8 lg:px-10 2xl:px-12">
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="block text-eyebrow font-sans font-bold uppercase text-tvl-amber">
                Core Law Office Workflows
              </span>
              <h2
                id="legal-os-modules-heading"
                className="mt-3 font-monument text-2xl font-bold uppercase text-seaglass sm:text-3xl"
              >
                Eight workflows across the matter lifecycle
              </h2>
            </div>
            <p className="max-w-[42ch] font-sans text-sm text-tide">
              Select any workflow on the left to see what it handles for your attorneys, paralegals, and clients.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[22rem_1fr] lg:items-start">
            {/* Left Sidebar Switcher */}
            <div
              role="tablist"
              aria-label="Law office workflows"
              className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1"
            >
              {LEGAL_MODULES.map((mod) => {
                const ModIcon = MODULE_ICONS[mod.icon];
                const isActive = mod.id === activeModule.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    role="tab"
                    id={`tab-${mod.id}`}
                    aria-selected={isActive}
                    aria-controls={`panel-${mod.id}`}
                    onClick={() => setActiveId(mod.id)}
                    className={`group flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-tvl-amber ${
                      isActive
                        ? "border-tvl-amber bg-tvl-amber text-black"
                        : "border-shelf bg-abyss-2 text-seaglass hover:border-tvl-amber/60"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        isActive ? "bg-black text-tvl-amber" : "bg-abyss text-tvl-amber"
                      }`}
                    >
                      <ModIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block font-sans text-[0.65rem] font-bold uppercase tracking-[0.14em] ${
                          isActive ? "text-black/75" : "text-tide"
                        }`}
                      >
                        Workflow {mod.index}
                      </span>
                      <span className="block truncate font-sans text-sm font-bold">{mod.title}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right Detail Showcase Panel */}
            <div
              role="tabpanel"
              id={`panel-${activeModule.id}`}
              aria-labelledby={`tab-${activeModule.id}`}
              className="rounded-xl border border-shelf bg-abyss-2 p-6 sm:p-10"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-shelf pb-6">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tvl-amber text-black">
                    <ActiveIcon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div>
                    <span className="block font-sans text-xs font-bold uppercase tracking-[0.16em] text-tvl-amber">
                      Workflow {activeModule.index} {"//"} {activeModule.inquiryService}
                    </span>
                    <h3 className="mt-1 font-monument text-2xl font-bold uppercase text-seaglass sm:text-3xl">
                      {activeModule.title}
                    </h3>
                  </div>
                </div>

                {activeModule.campaignSlug && (
                  <Link
                    href={`/solutions/legal/${activeModule.campaignSlug}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-tvl-amber/40 bg-tvl-amber/10 px-3.5 py-2 font-sans text-xs font-bold uppercase tracking-[0.12em] text-tvl-amber transition-colors hover:bg-tvl-amber hover:text-black focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-tvl-amber"
                  >
                    See How It Works
                    <Icon name="arrow-right" className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>

              <p className="mt-6 font-sans text-lg font-semibold text-seaglass">{activeModule.tagline}</p>
              <p className="mt-3 font-sans text-base leading-[1.65] text-tide">{activeModule.summary}</p>

              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-shelf bg-abyss p-5">
                  <span className="block font-sans text-xs font-bold uppercase tracking-[0.14em] text-tvl-amber">
                    What Changes for Your Firm
                  </span>
                  <ul className="mt-4 space-y-3">
                    {activeModule.outcomes.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 font-sans text-sm text-seaglass">
                        <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-tvl-amber" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-shelf bg-abyss p-5">
                  <span className="block font-sans text-xs font-bold uppercase tracking-[0.14em] text-tvl-amber">
                    What&apos;s Included
                  </span>
                  <ul className="mt-4 space-y-3">
                    {activeModule.capabilities.map((cap) => (
                      <li key={cap} className="flex items-start gap-2.5 font-sans text-sm text-tide">
                        <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-tvl-amber" />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-shelf pt-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-sans text-[0.7rem] font-bold uppercase tracking-[0.12em] text-tide">
                    Connects with:
                  </span>
                  {activeModule.integrations.map((tool) => (
                    <span
                      key={tool}
                      className="rounded-md border border-shelf bg-abyss px-2.5 py-1 font-sans text-xs font-semibold text-seaglass"
                    >
                      {tool}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {activeModule.campaignSlug && (
                    <Button href={`/solutions/legal/${activeModule.campaignSlug}`} variant="outline" tone="white" size="sm">
                      View Workflow Details
                    </Button>
                  )}
                  <Button
                    size="sm"
                    icon="arrow-right"
                    onClick={() => openInquiry(activeModule.inquiryService)}
                    aria-haspopup="dialog"
                  >
                    Request a Workflow Review
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Featured Campaign Solutions Grid */}
      <section aria-label="Common law office automation starting points" className="border-t border-shelf bg-abyss py-16 sm:py-20">
        <div className="mx-auto w-full max-w-[96rem] 2xl:max-w-[104rem] px-5 sm:px-8 lg:px-10 2xl:px-12">
          <div className="mb-8">
            <span className="block text-eyebrow font-sans font-bold uppercase text-tvl-amber">
              Most Requested Workflows
            </span>
            <h2 className="mt-2 font-monument text-2xl font-bold uppercase text-seaglass sm:text-3xl">
              Four common starting points
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LEGAL_CAMPAIGN_SLUGS.map((slug) => {
              const campaign = LEGAL_CAMPAIGNS[slug];
              return (
                <Link
                  key={slug}
                  href={`/solutions/legal/${slug}`}
                  className="group flex flex-col justify-between rounded-xl border border-shelf bg-abyss-2 p-6 transition-colors hover:border-tvl-amber focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-tvl-amber"
                >
                  <div>
                    <span className="block font-sans text-[0.7rem] font-bold uppercase tracking-[0.14em] text-tvl-amber">
                      {campaign.inquiryService}
                    </span>
                    <h3 className="mt-2 font-monument text-lg font-bold uppercase text-seaglass">
                      {campaign.moduleTitle}
                    </h3>
                    <p className="mt-3 font-sans text-sm leading-[1.55] text-tide">{campaign.heroSubhead}</p>
                  </div>
                  <span className="mt-6 inline-flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-[0.12em] text-seaglass group-hover:text-tvl-amber">
                    See Workflow
                    <Icon name="arrow-right" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Bridge CTA Section */}
      <section aria-labelledby="legal-bridge-cta" className="border-t border-shelf bg-abyss-2 py-16 sm:py-24">
        <div className="mx-auto flex w-full max-w-[96rem] 2xl:max-w-[104rem] flex-col gap-10 px-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:gap-16 lg:px-10 2xl:px-12">
          <div>
            <span className="block text-eyebrow font-sans font-bold uppercase text-tvl-amber">
              Start With One Workflow
            </span>
            <h2 id="legal-bridge-cta" className="mt-3 font-monument text-[clamp(2rem,5vw,3.75rem)] font-bold uppercase leading-[1.05] text-seaglass">
              See how it fits
              <span className="block text-tvl-amber">your firm&apos;s tools.</span>
            </h2>
            <p className="mt-4 max-w-[56ch] font-sans text-base leading-[1.6] text-tide">
              Tell us where your attorneys and paralegals lose the most time—intake and conflict checks, engagement
              letters, chasing client documents, or pre-bill follow-ups—and we&apos;ll map out how it connects to your
              current practice management, email, and billing software.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <Button href="/book" size="lg" icon="arrow-right" fullWidthOnMobile>
              Book a 15-Min Walkthrough
            </Button>
            <Button
              variant="outline"
              tone="white"
              size="lg"
              onClick={() => openInquiry("AI & Automation")}
              aria-haspopup="dialog"
              fullWidthOnMobile
            >
              Request a Workflow Review
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
