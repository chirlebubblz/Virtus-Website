"use client";

import React from "react";
import { siteData } from "@/data/siteData";
import { Button } from "./ui";
import { HalftoneWordmarkFooter } from "@/components/ui/halftone-wordmark-footer";

interface FooterProps {
  onOpenInquiry: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenInquiry }) => {
  const columns = [
    {
      title: "Disciplines",
      links: [
        { label: "Web & Digital", href: "/work/web" },
        { label: "Brand & Creative", href: "/work/brand" },
        { label: "AI & Automation", href: "/work/automation" },
        { label: "Content & Video", href: "/work/content" },
      ],
    },
    {
      title: "Workspaces",
      links: [
        { label: "Book Strategy Session", href: "/book" },
        { label: "Client Room", href: "/client" },
        { label: "Track Milestones", href: "/track" },
        { label: "Portal Gateway", href: "/portal" },
      ],
    },
    {
      title: "Connect",
      links: [
        { label: siteData.footer.email, href: `mailto:${siteData.footer.email}` },
        { label: "Staff Access", href: "/staff/login" },
        { label: "Start a Brief", onClick: onOpenInquiry },
      ],
    },
  ];

  return (
    <div id="footer" className="relative bg-[#050505] text-white">
      {/* 1. Grand Final CTA Section */}
      <section aria-labelledby="cta-heading" className="border-t border-white/10 bg-[#050505]">
        <div className="mx-auto w-full max-w-[96rem] 2xl:max-w-[104rem] px-5 sm:px-8 lg:px-10 2xl:px-12 py-16 sm:py-20 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-16">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#F5C518] block mb-3">
                NEXT STEPS // STUDIO LAUNCH
              </span>
              <h2 id="cta-heading" className="type-display text-[clamp(2.75rem,8vw,6.5rem)] text-white">
                {siteData.finalCta.line}
                <span className="block text-[#F5C518]">{siteData.finalCta.subline}</span>
              </h2>
            </div>
            <Button onClick={onOpenInquiry} aria-haspopup="dialog" size="lg" icon="arrow-right">
              {siteData.finalCta.action.label}
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Interactive Halftone Wordmark Footer */}
      <HalftoneWordmarkFooter
        wordmark="VIRTUS"
        label="THE VIRTUS LABS"
        meta="Independent Digital Studio · Manila → Worldwide"
        columns={columns}
        backToTop={true}
        preset="night"
        palette={{
          background: "#050505",
          ink: "#f4f4f4",
          warm: "#F5C518",
        }}
        dotGap={6}
        radius={95}
        crop={0.2}
        grain={0.4}
      />
    </div>
  );
};
