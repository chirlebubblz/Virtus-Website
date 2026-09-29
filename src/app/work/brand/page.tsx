import type { Metadata } from "next";
import { getPillarBySlug } from "@/lib/servicePillars";
import { SiteChrome } from "@/components/public/SiteChrome";
import { BrandCreativePage } from "@/components/public/discipline/BrandCreativePage";

const pillar = getPillarBySlug("brand");

export const metadata: Metadata = {
  title: `${pillar.name} — The Virtus Labs`,
  description: pillar.outcome,
};

export default function Page() {
  return (
    <SiteChrome>
      <BrandCreativePage />
    </SiteChrome>
  );
}
