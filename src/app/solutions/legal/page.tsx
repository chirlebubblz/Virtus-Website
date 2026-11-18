import type { Metadata } from "next";
import { SiteChrome } from "@/components/public/SiteChrome";
import { LegalOsHub } from "@/components/public/legal/LegalOsHub";

export const metadata: Metadata = {
  title: "Law Firm Workflow Automation — Practical Systems for Legal Practices | The Virtus Labs",
  description:
    "Eight practical workflow systems for law firms—covering client intake and conflict checks, document assembly and e-sign, client matter portals, and billing automation.",
  openGraph: {
    title: "Law Firm Workflow Automation — The Virtus Labs",
    description:
      "Practical workflow automation built for attorneys, paralegals, and clients alongside Clio, MyCase, Outlook, Google Workspace, and LawPay.",
  },
};

export default function LegalSolutionsPage() {
  return (
    <SiteChrome>
      <LegalOsHub />
    </SiteChrome>
  );
}
