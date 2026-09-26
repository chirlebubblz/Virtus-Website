"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Nav } from "@/components/public/Nav";
import { Hero } from "@/components/public/Hero";
import { Trust } from "@/components/public/Trust";
import { WorkShowcase } from "@/components/public/WorkShowcase";
import { Services } from "@/components/public/Services";
import { Process } from "@/components/public/Process";
import { Products } from "@/components/public/Products";
import { FAQ } from "@/components/public/FAQ";
import { LeadCapture } from "@/components/public/LeadCapture";
import { Footer } from "@/components/public/Footer";
import { LeadDialog } from "@/components/public/LeadDialog";
import { useLeadPopup } from "@/components/public/useLeadPopup";
import { InquiryDialog } from "@/components/public/InquiryDialog";

const INQUIRY_HASH = "#brief";

export default function Home() {
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
    <div className="relative min-h-screen bg-abyss text-white">
      {/* Skip to Content for Accessibility */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-tvl-amber focus:px-5 focus:py-3 focus:font-sans focus:text-sm focus:font-bold focus:uppercase focus:tracking-[0.12em] focus:text-black focus:outline focus:outline-[3px] focus:outline-offset-2 focus:outline-white"
      >
        Skip to content
      </a>

      <Nav onOpenInquiry={openBlankInquiry} />

      <main id="main">
        <Hero onOpenInquiry={openBlankInquiry} />
        <Trust />
        <WorkShowcase />
        <Services onOpenInquiry={openInquiry} />
        <Process />
        <Products onOpenInquiry={openBlankInquiry} />
        <FAQ onOpenInquiry={openBlankInquiry} />
        <LeadCapture />
      </main>

      <Footer onOpenInquiry={openBlankInquiry} />

      <LeadDialog open={leadPopup.open} onClose={leadPopup.close} />
      <InquiryDialog open={isInquiryOpen} presetService={presetService} onClose={closeInquiry} />
    </div>
  );
}
