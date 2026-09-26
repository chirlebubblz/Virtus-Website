import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
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
  title: "The Virtus Labs — One Team. Limitless Possibilities.",
  description:
    "The Virtus Labs brings people, ideas and craft together under one roof — brand, web, content and automation delivered as one coordinated team.",
  applicationName: "The Virtus Labs",
  openGraph: {
    title: "The Virtus Labs — One Team. Limitless Possibilities.",
    description:
      "We bring people, ideas and craft together to build what's next.",
    type: "website",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark scroll-smooth ${fontVariables}`}>
      <body className="bg-abyss text-seaglass min-h-screen antialiased selection:bg-tvl-amber/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
