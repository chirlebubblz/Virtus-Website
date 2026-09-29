import type { Metadata } from "next";
import { getPillarBySlug } from "@/lib/servicePillars";
import { SiteChrome } from "@/components/public/SiteChrome";
import { AiAutomationPage } from "@/components/public/discipline/AiAutomationPage";

const pillar = getPillarBySlug("automation");

export const metadata: Metadata = {
  title: `${pillar.name} — The Virtus Labs`,
  description: pillar.outcome,
};

export default function Page() {
  return (
    <SiteChrome>
      <AiAutomationPage />
    </SiteChrome>
  );
}
