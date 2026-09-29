"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { LeadDialog } from "./LeadDialog";
import { InquiryDialog } from "./InquiryDialog";
import { useLeadPopup } from "./useLeadPopup";

const INQUIRY_HASH = "#brief";

interface InquiryContextValue {
  openInquiry: (service?: string) => void;
}

const InquiryContext = createContext<InquiryContextValue | null>(null);

/** Lets any page mounted inside `SiteChrome` open the shared inquiry dialog, optionally pre-filling a service. */
export function useInquiryDialog(): InquiryContextValue {
  const ctx = useContext(InquiryContext);
  if (!ctx) throw new Error("useInquiryDialog must be used within <SiteChrome>");
  return ctx;
}

/**
 * Shared marketing-site shell: nav, footer, skip link and the two lead-capture
 * dialogs, plus the state that drives them. Every public page (the homepage
 * and the /work/<slug> discipline pages) mounts this once so the dialog
 * wiring — including #brief/#why-us hash compatibility — lives in one place.
 */
export const SiteChrome: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [presetService, setPresetService] = useState<string | undefined>();

  const openInquiry = useCallback((service?: string) => {
    setPresetService(service);
    setIsInquiryOpen(true);
  }, []);
  const openBlankInquiry = useCallback(() => openInquiry(), [openInquiry]);

  const leadPopup = useLeadPopup(isInquiryOpen);

  // Closing a hash-opened dialog drops #brief without adding a history entry.
  const closeInquiry = useCallback(() => {
    setIsInquiryOpen(false);
    if (window.location.hash === INQUIRY_HASH) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  // /#brief compatibility and legacy #why-us links.
  useEffect(() => {
    const syncFromHash = () => {
      const { hash } = window.location;
      if (hash === INQUIRY_HASH) {
        setPresetService(undefined);
        setIsInquiryOpen(true);
        return;
      }
      setIsInquiryOpen(false);
      if (hash === "#why-us") {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#process`);
        document.getElementById("process")?.scrollIntoView();
      }
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  return (
    <InquiryContext.Provider value={{ openInquiry }}>
      <div className="relative min-h-screen bg-abyss text-white">
        {/* Skip to Content for Accessibility */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-tvl-amber focus:px-5 focus:py-3 focus:font-sans focus:text-sm focus:font-bold focus:uppercase focus:tracking-[0.12em] focus:text-black focus:outline focus:outline-[3px] focus:outline-offset-2 focus:outline-white"
        >
          Skip to content
        </a>

        <Nav onOpenInquiry={openBlankInquiry} />

        <main id="main">{children}</main>

        <Footer onOpenInquiry={openBlankInquiry} />

        <LeadDialog open={leadPopup.open} onClose={leadPopup.close} />
        <InquiryDialog open={isInquiryOpen} presetService={presetService} onClose={closeInquiry} />
      </div>
    </InquiryContext.Provider>
  );
};
