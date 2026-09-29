// Shared lookups for the discipline showcase pages, so /work/<slug> routes and
// Services.tsx never duplicate ad hoc .find()/.filter() calls over siteData.

import { siteData } from "@/data/siteData";

export const PILLAR_SLUGS = ["brand", "web", "content", "automation"] as const;
export type PillarSlug = (typeof PILLAR_SLUGS)[number];

export function getPillarBySlug(slug: PillarSlug) {
  const pillar = siteData.services.pillars.find((p) => p.slug === slug);
  if (!pillar) throw new Error(`Unknown service pillar slug: ${slug}`);
  return pillar;
}

export function getProjectsForPillar(pillar: { name: string }) {
  return siteData.work.projects.filter((p) => p.pillar === pillar.name);
}
