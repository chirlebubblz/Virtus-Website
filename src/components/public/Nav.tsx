"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { siteData } from "@/data/siteData";
import { ImmersiveFullscreenNav } from "@/components/ui/immersive-full-screen-nav";

interface NavProps {
  onOpenInquiry: () => void;
}

const actionBase =
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-[#F5C518] font-bold uppercase text-black transition-all hover:bg-[#ffd026] hover:shadow-[0_0_20px_rgba(245,197,24,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]";

const headerActionClasses = `${actionBase} min-h-10 px-4 py-2 font-sans text-xs tracking-[0.14em]`;

export const Nav: React.FC<NavProps> = ({ onOpenInquiry }) => {
  const [isImmersiveOpen, setIsImmersiveOpen] = useState(false);

  const closeImmersive = useCallback(() => {
    setIsImmersiveOpen(false);
  }, []);

  const action = siteData.nav.action.label;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050505]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[96rem] 2xl:max-w-[104rem] items-center justify-between gap-4 px-5 sm:px-8 md:h-[4.5rem] lg:px-10 2xl:px-12">
          {/* Logo - Navigates cleanly to home */}
          <Link
            href="/"
            onClick={closeImmersive}
            className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518] focus-visible:ring-offset-4 focus-visible:ring-offset-[#050505]"
            aria-label="The Virtus Labs — Home"
          >
            <Logo />
          </Link>

          {/* Action CTAs + Immersive Menu Trigger */}
          <div className="flex items-center gap-3">
            {/* Start a project primary CTA */}
            <button
              type="button"
              onClick={onOpenInquiry}
              aria-haspopup="dialog"
              className={headerActionClasses}
            >
              {action}
            </button>

            {/* Immersive Full Screen Navigation Trigger */}
            <button
              type="button"
              onClick={() => setIsImmersiveOpen(true)}
              className="group flex h-10 items-center gap-2.5 rounded-lg border border-white/15 bg-white/[0.04] px-3.5 py-2 text-white transition-all hover:border-[#F5C518] hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518]"
              aria-haspopup="dialog"
              aria-expanded={isImmersiveOpen}
              aria-label="Open immersive full screen navigation menu"
            >
              <span className="hidden sm:inline font-mono text-xs font-bold uppercase tracking-widest text-zinc-300 group-hover:text-[#F5C518] transition-colors">
                MENU
              </span>
              <div className="flex flex-col gap-1 w-4 justify-center items-end" aria-hidden="true">
                <span className="h-0.5 w-4 rounded-full bg-white group-hover:bg-[#F5C518] transition-colors" />
                <span className="h-0.5 w-2.5 rounded-full bg-[#F5C518] group-hover:w-4 transition-all" />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Immersive Full Screen Navigation Modal Overlay */}
      <ImmersiveFullscreenNav
        isOpen={isImmersiveOpen}
        onClose={closeImmersive}
        onOpenInquiry={onOpenInquiry}
      />
    </>
  );
};
