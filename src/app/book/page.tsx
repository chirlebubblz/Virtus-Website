import type { Metadata } from "next";
import { SiteChrome } from "@/components/public/SiteChrome";
import { BookPageClient } from "@/components/public/BookPageClient";

export const metadata: Metadata = {
  title: "Book a Strategy Call — The Virtus Labs",
  description:
    "Schedule a 30-minute discovery call directly with The Virtus Labs studio directors. Instant Zoom confirmation and calendar invite.",
  openGraph: {
    title: "Book a Strategy Call — The Virtus Labs",
    description:
      "Schedule a 30-minute discovery call directly with The Virtus Labs studio directors. Instant Zoom confirmation and calendar invite.",
  },
};

export default function BookPage() {
  return (
    <SiteChrome>
      <BookPageClient />
    </SiteChrome>
  );
}
