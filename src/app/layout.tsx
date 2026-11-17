import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/react";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import "@/styles/globals.css";

const displayFont = localFont({
  src: "../../public/fonts/league-gothic-400.woff2",
  variable: "--font-face-display",
  weight: "400",
  display: "optional",
  adjustFontFallback: false,
  preload: true,
});

const monumentFont = localFont({
  src: "../../public/fonts/unbounded-700.woff2",
  variable: "--font-face-monument",
  weight: "700",
  display: "optional",
  adjustFontFallback: false,
  preload: true,
});

const accentFont = localFont({
  src: "../../public/fonts/lexend-exa-300.woff2",
  variable: "--font-face-accent",
  weight: "300",
  display: "optional",
  adjustFontFallback: false,
  preload: true,
});

const sansFont = localFont({
  src: "../../public/fonts/montserrat-400.woff2",
  variable: "--font-face-sans",
  weight: "100 900",
  display: "optional",
  adjustFontFallback: false,
  preload: true,
});

const wordmarkFont = localFont({
  src: "../../public/fonts/syncopate-700.woff2",
  variable: "--font-face-wordmark",
  weight: "700",
  display: "optional",
  adjustFontFallback: false,
  preload: true,
});

const monoFont = localFont({
  src: [
    {
      path: "../../public/fonts/plex-mono-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/plex-mono-500.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/plex-mono-600.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-face-mono",
  display: "optional",
  adjustFontFallback: false,
  preload: true,
});

const fontVariables = [
  displayFont.variable,
  monumentFont.variable,
  accentFont.variable,
  wordmarkFont.variable,
  sansFont.variable,
  monoFont.variable,
].join(" ");

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: "The Virtus Labs — High-Performance Digital Homes & Platform Architecture",
  description:
    "The Virtus Labs builds high-performance digital homes, conversion architectures, brand systems, and automated agency operating systems.",
  applicationName: "The Virtus Labs",
  openGraph: {
    title: "The Virtus Labs — High-Performance Digital Homes & Platform Architecture",
    description:
      "Transform your website from a passive digital brochure into a 24/7 revenue engine.",
    type: "website",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "The Virtus Labs",
  url: "https://virtus-website.vercel.app",
  logo: "https://virtus-website.vercel.app/icon.svg",
  description:
    "High-performance digital studio and agency operating system. We build custom Next.js platforms, conversion architectures, brand systems, and automated workflows.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Manila",
    addressCountry: "PH",
  },
  priceRange: "$$$$",
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Virtus 4-Tier Service Offerings",
    itemListElement: [
      {
        "@type": "Offer",
        name: "Conversion Architecture Diagnostic",
        price: "0",
        priceCurrency: "USD",
        description: "60-second interactive website maturity assessment and 6-page architecture blueprint.",
      },
      {
        "@type": "Offer",
        name: "48-Hour Architecture Audit & Tech Roadmap",
        price: "1250",
        priceCurrency: "USD",
        description: "Comprehensive Core Web Vitals, database latency, and UX bottleneck teardown with a 100% money-back guarantee.",
      },
      {
        "@type": "Offer",
        name: "Custom Digital Home & Platform Build",
        price: "10000",
        priceCurrency: "USD",
        description: "Bespoke Next.js 15, React 19, and serverless Neon Postgres digital platform development.",
      },
      {
        "@type": "Offer",
        name: "Monthly Operations & Growth Retainer",
        price: "1500",
        priceCurrency: "USD",
        description: "Continuous conversion rate optimization, 24/7 SLA monitoring, and Generative Engine Optimization.",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark scroll-smooth ${fontVariables}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-abyss text-seaglass min-h-screen antialiased selection:bg-tvl-amber/30 selection:text-white">
        <PostHogProvider>
          {children}
          <Analytics />
        </PostHogProvider>
      </body>
    </html>
  );
}
