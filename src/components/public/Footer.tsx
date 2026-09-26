import React from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { Icon } from "@/components/icons/Icon";
import { siteData } from "@/data/siteData";

interface FooterProps {
  onOpenInquiry: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenInquiry }) => {
  return (
    <footer id="footer" className="relative border-t-4 border-tvl-amber bg-black">
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-10">
        <div className="grid gap-10 border-b border-shelf py-14 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-16">
          <h2 className="type-display text-[clamp(3rem,9vw,7rem)] text-white">
            {siteData.finalCta.line}
            <span className="block text-tvl-amber">{siteData.finalCta.subline}</span>
          </h2>
          <button
            type="button"
            onClick={onOpenInquiry}
            aria-haspopup="dialog"
            className="inline-flex min-h-14 items-center justify-center gap-3 bg-tvl-amber px-8 font-sans text-sm font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            {siteData.finalCta.action.label}
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="grid gap-12 py-12 sm:py-16 md:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1fr] lg:gap-16">
          <div>
            <Logo size="lg" />
            <p className="mt-6 max-w-[34ch] font-sans text-base leading-[1.6] text-tide">
              {siteData.seo.description}
            </p>
          </div>

          <div>
            <p className="border-t-2 border-tvl-amber pt-3 text-eyebrow font-sans font-bold uppercase text-white">
              Say hello
            </p>
            <a
              href={`mailto:${siteData.footer.email}`}
              className="group mt-5 inline-flex min-h-11 max-w-full items-center gap-3 font-monument text-lg font-bold text-white transition-colors hover:text-tvl-amber focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-tvl-amber sm:text-xl"
            >
              <span className="break-all">{siteData.footer.email}</span>
              <span aria-hidden="true" className="text-tvl-amber transition-transform duration-200 group-hover:translate-x-1">
                ↗
              </span>
            </a>
            <p className="mt-3 font-sans text-base text-tide">{siteData.footer.built}</p>
          </div>

          <div>
            <p className="border-t-2 border-tvl-amber pt-3 text-eyebrow font-sans font-bold uppercase text-white">
              Availability
            </p>
            <p className="mt-5 flex items-center gap-3 font-sans text-sm font-bold uppercase tracking-[0.12em] text-white">
              <span aria-hidden="true" className="h-2.5 w-2.5 bg-tvl-amber" />
              {siteData.availability}
            </p>
            <p className="mt-3 max-w-[30ch] font-sans text-base leading-[1.6] text-tide">{siteData.footer.timezones}</p>
          </div>
        </div>

        {/* Workspaces & Portals Strip (Option D) */}
        <div className="flex flex-col gap-4 border-t border-shelf py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <span className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-white mr-1 sm:mr-2">
              Workspaces
            </span>

            <Link
              href="/client"
              className="group inline-flex items-center gap-2 border border-shelf bg-black px-3.5 py-2 font-sans text-xs font-semibold text-white transition-colors hover:border-tvl-amber hover:text-tvl-amber focus-visible:outline focus-visible:outline-[2px] focus-visible:outline-tvl-amber"
            >
              <Icon name="user" className="h-3.5 w-3.5 text-tvl-amber" />
              <span>Client Room</span>
              <Icon name="arrow-up-right" className="h-3 w-3 text-tide transition-colors group-hover:text-tvl-amber" />
            </Link>

            <Link
              href="/track"
              className="group inline-flex items-center gap-2 border border-shelf bg-black px-3.5 py-2 font-sans text-xs font-semibold text-white transition-colors hover:border-tvl-amber hover:text-tvl-amber focus-visible:outline focus-visible:outline-[2px] focus-visible:outline-tvl-amber"
            >
              <Icon name="trend" className="h-3.5 w-3.5 text-tvl-amber" />
              <span>Track Project</span>
              <Icon name="arrow-up-right" className="h-3 w-3 text-tide transition-colors group-hover:text-tvl-amber" />
            </Link>

            <Link
              href="/staff/login"
              className="group inline-flex items-center gap-2 border border-shelf bg-black px-3.5 py-2 font-sans text-xs font-semibold text-white transition-colors hover:border-tvl-amber hover:text-tvl-amber focus-visible:outline focus-visible:outline-[2px] focus-visible:outline-tvl-amber"
            >
              <Icon name="lock" className="h-3.5 w-3.5 text-tvl-amber" />
              <span>Staff Portal</span>
              <Icon name="arrow-up-right" className="h-3 w-3 text-tide transition-colors group-hover:text-tvl-amber" />
            </Link>
          </div>

          <Link
            href="/portal"
            className="font-sans text-xs font-semibold text-tide transition-colors hover:text-white flex items-center gap-1.5"
          >
            <span>Gateway Portal</span>
            <Icon name="arrow-up-right" className="h-3 w-3 text-tvl-amber" />
          </Link>
        </div>

        <div className="flex flex-col gap-2 border-t border-shelf py-5 font-sans text-xs font-semibold uppercase tracking-[0.14em] text-tide sm:flex-row sm:items-center sm:justify-between">
          <p>{siteData.footer.disclosure}</p>
          <Link
            href="#top"
            className="inline-flex min-h-11 items-center text-white transition-colors hover:text-tvl-amber focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-tvl-amber"
          >
            Back to top <span aria-hidden="true" className="ml-1.5">↑</span>
          </Link>
        </div>
      </div>
    </footer>
  );
};
