"use client";

import React, { useCallback } from "react";
import { Hero } from "@/components/public/Hero";
import { Trust } from "@/components/public/Trust";
import { WorkShowcase } from "@/components/public/WorkShowcase";
import { Services } from "@/components/public/Services";
import { Process } from "@/components/public/Process";
import { Products } from "@/components/public/Products";
import { FAQ } from "@/components/public/FAQ";
import { LeadCapture } from "@/components/public/LeadCapture";
import { SiteChrome, useInquiryDialog } from "@/components/public/SiteChrome";

function HomeContent() {
  const { openInquiry } = useInquiryDialog();
  const openBlankInquiry = useCallback(() => openInquiry(), [openInquiry]);

  return (
    <>
      <Hero onOpenInquiry={openBlankInquiry} />
      <Trust />
      <WorkShowcase />
      <Services />
      <Process />
      <Products onOpenInquiry={openBlankInquiry} />
      <FAQ onOpenInquiry={openBlankInquiry} />
      <LeadCapture />
    </>
  );
}

export default function Home() {
  return (
    <SiteChrome>
      <HomeContent />
    </SiteChrome>
  );
}
