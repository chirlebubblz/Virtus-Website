import type { Metadata } from "next";
import { getPillarBySlug } from "@/lib/servicePillars";
import { SiteChrome } from "@/components/public/SiteChrome";
import { WebDigitalPage } from "@/components/public/discipline/WebDigitalPage";

const pillar = getPillarBySlug("web");

export const metadata: Metadata = {
  title: `${pillar.name} — The Virtus Labs`,
  description: pillar.outcome,
};

export default function Page() {
  return (
    <SiteChrome>
      <WebDigitalPage />
    </SiteChrome>
  );
}
