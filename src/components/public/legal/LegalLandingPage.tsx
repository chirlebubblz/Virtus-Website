"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Layers } from "lucide-react";
import {
  getOtherLegalCampaigns,
  LEGAL_CAMPAIGN_FAQS,
  type LegalCampaignPage,
} from "@/lib/legalServices";
import { useInquiryDialog } from "../SiteChrome";
import { Button, IndexBadge } from "../ui";
import { Icon } from "@/components/icons/Icon";

interface LegalLandingPageProps {
  campaign: LegalCampaignPage;
}

export function LegalLandingPage({ campaign }: LegalLandingPageProps) {
  const { openInquiry } = useInquiryDialog();
  const otherCampaigns = getOtherLegalCampaigns(campaign.slug);

  return (
    <>
      {/* 1. Hero + Dual CTAs */}
      <section className="relative overflow-hidden border-b border-shelf bg-abyss py-16 sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,210,39,0.09),transparent_65%)]"
        />
        <div className="relative mx-auto w-full max-w-[96rem] 2xl:max-w-[104rem] px-5 sm:px-8 lg:px-10 2xl:px-12">
          <Link
            href="/solutions/legal"
            className="group inline-flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-[0.12em] text-seaglass hover:text-tvl-amber focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-tvl-amber"
          >
            <Icon name="arrow-left" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
            Back to Law Firm Workflows
          </Link>

          <span className="mt-10 block text-eyebrow font-sans font-bold uppercase text-tvl-amber">
            {campaign.eyebrow}
          </span>
          <h1 className="mt-4 max-w-[22ch] font-monument text-h1 font-bold uppercase leading-[1.05] text-seaglass">
            {campaign.heroHeadline}{" "}
            <span className="text-tvl-amber">{campaign.heroAccent}</span>
          </h1>
          <p className="mt-6 max-w-[56ch] font-sans text-lg leading-[1.6] text-tide">
            {campaign.heroSubhead}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button href="/book" size="lg" icon="arrow-right" fullWidthOnMobile>
              {campaign.primaryCtaLabel}
            </Button>
            <a
              href="#how-it-works"
              className="inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-xl border-2 border-white bg-transparent px-7 font-sans text-sm font-bold uppercase tracking-[0.16em] text-white transition-colors hover:border-tvl-amber hover:text-tvl-amber focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
            >
              <span>See How It Works</span>
              <Icon name="chevron-down" className="h-4 w-4 shrink-0" />
            </a>
            <Button
              variant="ghost"
              tone="white"
              size="lg"
              onClick={() => openInquiry(campaign.inquiryService)}
              aria-haspopup="dialog"
              fullWidthOnMobile
            >
              {campaign.secondaryCtaLabel}
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Firm Outcomes / Proof Strip */}
      <section aria-label="Firm outcomes" className="border-b border-shelf bg-abyss-2 py-10 sm:py-12">
        <div className="mx-auto w-full max-w-[96rem] 2xl:max-w-[104rem] px-5 sm:px-8 lg:px-10 2xl:px-12">
          <ul className="grid gap-6 sm:grid-cols-3 lg:gap-8">
            {campaign.outcomesStrip.map((item) => (
              <li
                key={item.label}
                className="rounded-xl border border-shelf bg-abyss p-6"
              >
                <span className="block font-display text-2xl leading-none text-tvl-amber sm:text-3xl">
                  {item.metric}
                </span>
                <h2 className="mt-3 font-monument text-sm font-bold uppercase text-seaglass">
                  {item.label}
                </h2>
                <p className="mt-2 font-sans text-sm leading-[1.6] text-tide">
                  {item.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. Before vs. After Grid */}
      <section aria-labelledby="before-after-heading" className="bg-abyss py-16 sm:py-24">
        <div className="mx-auto w-full max-w-[96rem] 2xl:max-w-[104rem] px-5 sm:px-8 lg:px-10 2xl:px-12">
          <span className="block text-eyebrow font-sans font-bold uppercase text-tvl-amber">
            Before &amp; After
          </span>
          <h2
            id="before-after-heading"
            className="mt-3 font-monument text-2xl font-bold uppercase text-seaglass sm:text-3xl"
          >
            Manual Work vs. Automated Workflow
          </h2>

          <div className="mt-10 overflow-hidden rounded-xl border border-shelf">
            <div className="hidden grid-cols-[14rem_1fr_1fr] border-b border-shelf bg-abyss-2 px-6 py-4 lg:grid">
              <span className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-tide">
                Workflow Area
              </span>
              <span className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-tide">
                Current Bottleneck
              </span>
              <span className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-tvl-amber">
                With Automation
              </span>
            </div>

            <ul className="divide-y divide-shelf">
              {campaign.beforeAfter.map((row) => (
                <li
                  key={row.area}
                  className="grid gap-4 bg-abyss p-6 lg:grid-cols-[14rem_1fr_1fr] lg:items-start lg:gap-8"
                >
                  <div className="font-monument text-sm font-bold uppercase text-seaglass">
                    {row.area}
                  </div>
                  <div className="rounded-lg border border-shelf bg-abyss-2/60 p-4 font-sans text-sm leading-[1.6] text-tide lg:border-0 lg:bg-transparent lg:p-0">
                    <span className="mb-1 block font-sans text-[0.68rem] font-bold uppercase tracking-[0.12em] text-tide lg:hidden">
                      Before
                    </span>
                    {row.before}
                  </div>
                  <div className="rounded-lg border border-tvl-amber/30 bg-tvl-amber/5 p-4 font-sans text-sm font-medium leading-[1.6] text-seaglass lg:border-0 lg:bg-transparent lg:p-0">
                    <span className="mb-1 block font-sans text-[0.68rem] font-bold uppercase tracking-[0.12em] text-tvl-amber lg:hidden">
                      With Automation
                    </span>
                    {row.after}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 4. 3-Step How It Works */}
      <section
        id="how-it-works"
        aria-labelledby="how-it-works-heading"
        className="scroll-mt-20 border-t border-shelf bg-abyss-2 py-16 sm:py-24"
      >
        <div className="mx-auto w-full max-w-[96rem] 2xl:max-w-[104rem] px-5 sm:px-8 lg:px-10 2xl:px-12">
          <span className="block text-eyebrow font-sans font-bold uppercase text-tvl-amber">
            Step-by-Step
          </span>
          <h2
            id="how-it-works-heading"
            className="mt-3 font-monument text-2xl font-bold uppercase text-seaglass sm:text-3xl"
          >
            How it works in practice
          </h2>

          <ol className="mt-10 grid gap-6 lg:grid-cols-3">
            {campaign.workflow.map((item, idx) => (
              <li
                key={item.step}
                className="flex flex-col gap-5 rounded-xl border border-shelf bg-abyss p-6 sm:p-8"
              >
                <div className="flex items-center justify-between">
                  <IndexBadge index={idx + 1} size="md" />
                  <span className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-tide">
                    Step {item.step}
                  </span>
                </div>
                <div>
                  <h3 className="font-monument text-lg font-bold uppercase text-seaglass">{item.title}</h3>
                  <p className="mt-3 font-sans text-sm leading-[1.65] text-tide">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. Deliverables */}
      <section aria-labelledby="deliverables-heading" className="border-t border-shelf bg-abyss py-16 sm:py-20">
        <div className="mx-auto w-full max-w-[96rem] 2xl:max-w-[104rem] px-5 sm:px-8 lg:px-10 2xl:px-12">
          <span className="block text-eyebrow font-sans font-bold uppercase text-tvl-amber">
            What We Set Up
          </span>
          <h2
            id="deliverables-heading"
            className="mt-3 font-monument text-2xl font-bold uppercase text-seaglass sm:text-3xl"
          >
            What&apos;s included
          </h2>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {campaign.deliverables.map((item, idx) => (
              <li key={item.title} className="flex flex-col gap-3 rounded-xl border border-shelf bg-abyss-2 p-6">
                <span className="font-display text-2xl leading-none text-tvl-amber">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <h3 className="font-sans text-base font-bold text-seaglass">{item.title}</h3>
                <p className="font-sans text-sm leading-[1.6] text-tide">{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. Confidentiality & Stack Compatibility Strip */}
      <section aria-label="Confidentiality and stack compatibility" className="border-t border-shelf bg-abyss-2 py-14 sm:py-20">
        <div className="mx-auto grid w-full max-w-[96rem] 2xl:max-w-[104rem] gap-8 px-5 sm:px-8 lg:grid-cols-2 lg:px-10 2xl:px-12">
          <div className="rounded-xl border border-shelf bg-abyss p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-tvl-amber/10 text-tvl-amber">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="font-monument text-lg font-bold uppercase text-seaglass">
                Confidentiality &amp; Client Data Controls
              </h2>
            </div>
            <ul className="mt-5 space-y-3">
              {campaign.confidentialityNotes.map((note) => (
                <li key={note} className="flex items-start gap-2.5 font-sans text-sm leading-[1.6] text-tide">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-tvl-amber" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-shelf bg-abyss p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-tvl-amber/10 text-tvl-amber">
                <Layers className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="font-monument text-lg font-bold uppercase text-seaglass">
                Works With Your Existing Tools
              </h2>
            </div>
            <p className="mt-4 font-sans text-sm leading-[1.6] text-tide">
              No need to switch practice management software. Everything connects directly to the email, calendar,
              document, and billing platforms your team already relies on:
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {campaign.stackCompatibility.map((tool) => (
                <span
                  key={tool}
                  className="rounded-lg border border-shelf bg-abyss-2 px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-[0.08em] text-seaglass"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. Cross-links to the other 3 Campaign Pages */}
      <section aria-label="Other law office workflows" className="border-t border-shelf bg-abyss py-14 sm:py-20">
        <div className="mx-auto w-full max-w-[96rem] 2xl:max-w-[104rem] px-5 sm:px-8 lg:px-10 2xl:px-12">
          <span className="block text-eyebrow font-sans font-bold uppercase text-tvl-amber">
            More Law Office Workflows
          </span>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {otherCampaigns.map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/solutions/legal/${other.slug}`}
                  className="group flex min-h-[6.5rem] items-center justify-between gap-4 rounded-xl border border-shelf bg-abyss-2 p-6 transition-colors hover:border-tvl-amber focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-tvl-amber"
                >
                  <span>
                    <span className="block font-sans text-[0.7rem] font-bold uppercase tracking-[0.14em] text-tide">
                      {other.inquiryService}
                    </span>
                    <span className="mt-2 block font-monument text-base font-bold uppercase text-seaglass">
                      {other.moduleTitle}
                    </span>
                  </span>
                  <Icon
                    name="arrow-right"
                    className="h-5 w-5 shrink-0 text-tvl-amber transition-transform duration-200 group-hover:translate-x-1"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 8. Objection-Handling FAQ */}
      <section aria-labelledby="legal-faq-heading" className="border-t border-shelf bg-abyss-2 py-16 sm:py-24">
        <div className="mx-auto grid w-full max-w-[96rem] 2xl:max-w-[104rem] gap-10 px-5 sm:px-8 lg:grid-cols-[22rem_1fr] lg:gap-16 lg:px-10 2xl:px-12">
          <div>
            <span className="block text-eyebrow font-sans font-bold uppercase text-tvl-amber">
              Common Questions
            </span>
            <h2
              id="legal-faq-heading"
              className="mt-3 font-monument text-2xl font-bold uppercase text-seaglass sm:text-3xl"
            >
              Questions from law offices
            </h2>
            <p className="mt-4 font-sans text-sm leading-[1.6] text-tide">
              Straight answers on software compatibility, client confidentiality, rollout timing, and fit for your practice areas.
            </p>
          </div>

          <div className="divide-y divide-shelf border-y border-shelf">
            {LEGAL_CAMPAIGN_FAQS.map((item, idx) => (
              <details
                key={item.q}
                name="legal-campaign-faq"
                open={idx === 0}
                className="group relative transition-colors duration-200 open:bg-abyss/60 [&_summary::-webkit-details-marker]:hidden"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 hidden w-1 bg-tvl-amber group-open:block"
                />
                <summary className="grid min-h-[4.25rem] cursor-pointer list-none grid-cols-[2.25rem_1fr_auto] items-center gap-4 px-3 py-5 font-sans text-base font-bold text-seaglass transition-colors group-hover:text-tvl-amber focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-tvl-amber sm:text-lg">
                  <span className="font-mono text-xs font-bold tracking-wider text-tide transition-colors group-open:text-tvl-amber">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="pr-4 leading-snug">{item.q}</span>
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-shelf bg-abyss text-tide transition-colors group-hover:border-tvl-amber/50 group-hover:text-tvl-amber"
                  >
                    <Icon name="plus" className="h-3.5 w-3.5 group-open:hidden" />
                    <Icon name="minus" className="hidden h-3.5 w-3.5 group-open:block" />
                  </span>
                </summary>
                <div className="faq-answer-grid">
                  <div className="overflow-hidden">
                    <p className="max-w-[66ch] pb-6 pl-[3.25rem] pr-6 font-sans text-sm leading-[1.65] text-tide sm:text-base">
                      {item.a}
                    </p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Closing Dual CTA */}
      <section aria-labelledby="campaign-closing-cta" className="border-t border-shelf bg-abyss py-16 sm:py-24">
        <div className="mx-auto flex w-full max-w-[96rem] 2xl:max-w-[104rem] flex-col gap-10 px-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:gap-16 lg:px-10 2xl:px-12">
          <div>
            <span className="block text-eyebrow font-sans font-bold uppercase text-tvl-amber">
              {campaign.moduleTitle}
            </span>
            <h2
              id="campaign-closing-cta"
              className="mt-3 font-monument text-[clamp(2.25rem,6vw,4.5rem)] font-bold uppercase leading-[1.05] text-seaglass"
            >
              Less admin work.
              <span className="block text-tvl-amber">Faster client turnaround.</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <Button href="/book" size="lg" icon="arrow-right" fullWidthOnMobile>
              Book a 15-Min Walkthrough
            </Button>
            <Button
              variant="outline"
              tone="white"
              size="lg"
              onClick={() => openInquiry(campaign.inquiryService)}
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
