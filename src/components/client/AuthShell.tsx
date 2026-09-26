import React from "react";
import Link from "next/link";
import { Logo } from "@/components/public/Logo";

/** Black page frame for login and welcome screens. Follows the brand guide: Virtus Black base, Spark Yellow accent. */
export function AuthShell({ children, footerLabel }: { children: React.ReactNode; footerLabel: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white selection:bg-[#FBD227] selection:text-black">
      <header className="flex items-center justify-between gap-4 border-b border-[#333333] px-5 py-4 sm:px-8 lg:px-10">
        <Link
          href="/"
          aria-label="The Virtus Labs — Home"
          className="focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#FBD227]"
        >
          <Logo />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-[74rem] flex-1 px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
        {children}
      </main>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#333333] px-5 py-5 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-[#999999] sm:px-8 lg:px-10">
        <span>{footerLabel}</span>
        <span>One team. Limitless possibilities.</span>
      </footer>
    </div>
  );
}
