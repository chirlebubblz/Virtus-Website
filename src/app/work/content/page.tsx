import type { Metadata } from "next";
import { getPillarBySlug } from "@/lib/servicePillars";
import { SiteChrome } from "@/components/public/SiteChrome";
import { ContentVideoPage } from "@/components/public/discipline/ContentVideoPage";

const pillar = getPillarBySlug("content");

export const metadata: Metadata = {
  title: `${pillar.name} — The Virtus Labs`,
  description: pillar.outcome,
};

export default function Page() {
  return (
    <SiteChrome>
      <ContentVideoPage />
    </SiteChrome>
  );
}
