import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/public/SiteChrome";
import { LegalLandingPage } from "@/components/public/legal/LegalLandingPage";
import { LEGAL_CAMPAIGN_SLUGS, getLegalCampaignBySlug } from "@/lib/legalServices";

interface LegalSolutionPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return LEGAL_CAMPAIGN_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: LegalSolutionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const campaign = getLegalCampaignBySlug(slug);
  if (!campaign) {
    return {
      title: "Legal Solution Not Found — The Virtus Labs",
    };
  }
  return {
    title: campaign.seo.title,
    description: campaign.seo.description,
    openGraph: {
      title: campaign.seo.title,
      description: campaign.seo.description,
    },
  };
}

export default async function LegalSolutionCampaignPage({ params }: LegalSolutionPageProps) {
  const { slug } = await params;
  const campaign = getLegalCampaignBySlug(slug);

  if (!campaign) {
    notFound();
  }

  return (
    <SiteChrome>
      <LegalLandingPage campaign={campaign} />
    </SiteChrome>
  );
}
