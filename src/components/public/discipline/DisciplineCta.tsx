"use client";

import React from "react";
import { useInquiryDialog } from "../SiteChrome";
import { Button } from "../ui";

interface DisciplineCtaProps {
  pillarName: string;
  line: string;
  subline: string;
}

/** The closing CTA every discipline page ends with — opens the shared inquiry dialog pre-filled with this discipline. */
export const DisciplineCta: React.FC<DisciplineCtaProps> = ({ pillarName, line, subline }) => {
  const { openInquiry } = useInquiryDialog();

  return (
    <section aria-labelledby="discipline-cta-title" className="border-t border-shelf bg-black py-16 sm:py-24">
      <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-10 px-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:gap-16 lg:px-10">
        <h2 id="discipline-cta-title" className="type-display text-[clamp(2.5rem,7vw,5.5rem)] text-white">
          {line}
          <span className="block text-tvl-amber">{subline}</span>
        </h2>
        <Button onClick={() => openInquiry(pillarName)} aria-haspopup="dialog" size="lg" icon="arrow-right" className="shrink-0">
          Start with {pillarName}
        </Button>
      </div>
    </section>
  );
};
