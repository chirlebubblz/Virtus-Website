import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] flex flex-col justify-between selection:bg-[#FBD227] selection:text-black">
      {/* Top Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-sans text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-[#FBD227] transition-colors">
          The Virtus Labs · Manila → Worldwide
        </Link>
        <span className="font-sans text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 px-2.5 py-0.5 rounded">
          HTTP 404
        </span>
      </header>

      {/* Hero 404 message */}
      <main className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="max-w-lg space-y-6">
          <span className="font-sans text-xs font-bold uppercase tracking-widest text-[#FBD227] block">
            ERR_ROUTE_NOT_FOUND
          </span>
          <h1 className="font-monument text-5xl sm:text-7xl font-bold uppercase tracking-tight text-white">
            404
          </h1>
          <h2 className="font-monument text-lg sm:text-xl font-bold uppercase tracking-tight text-gray-300">
            Signal Lost in Transmission
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 font-sans leading-relaxed">
            The coordinate or workspace sector you requested does not exist or has been relocated to another sector.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto border-2 border-[#FBD227] bg-[#FBD227] text-black font-sans text-xs font-bold uppercase tracking-wider px-6 py-3 hover:bg-black hover:text-[#FBD227] transition-colors"
            >
              ← Return to Agency Home
            </Link>
            <Link
              href="/#brief"
              className="w-full sm:w-auto border-2 border-white/20 bg-white/5 text-gray-300 font-sans text-xs font-bold uppercase tracking-wider px-6 py-3 hover:border-white hover:text-white transition-colors"
            >
              Start a project ↗
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-4 text-center font-sans text-xs text-gray-500">
        Virtus Operations OS · Infrastructure Health: Operational
      </footer>
    </div>
  );
}
