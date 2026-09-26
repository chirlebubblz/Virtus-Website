"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception to console and telemetry
    console.error("Runtime exception captured by Root Error Boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] flex flex-col justify-between selection:bg-[#FBD227] selection:text-black">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <span className="font-sans text-xs font-bold uppercase tracking-wider text-gray-400">
          The Virtus Labs · System Diagnostics
        </span>
        <span className="font-sans text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 px-2.5 py-0.5 rounded">
          EXCEPTION_RECOVERED
        </span>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="max-w-xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-amber-950/40 border border-amber-800/60 text-amber-300 font-sans text-xs font-bold">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            UNEXPECTED RUNTIME INTERRUPT
          </div>

          <h1 className="font-monument text-3xl sm:text-5xl font-bold uppercase tracking-tight text-white">
            System Fault Detected
          </h1>

          <p className="text-xs sm:text-sm text-gray-400 font-sans leading-relaxed">
            The application intercepted an unexpected exception. The state was isolated to prevent data loss across your active workspace.
          </p>

          {error?.message && (
            <div className="p-4 bg-black/60 border border-white/15 rounded text-left font-sans text-xs text-rose-300 overflow-x-auto">
              <span className="text-gray-500 uppercase block text-[0.65rem] mb-1 font-bold">Diagnostics:</span>
              <code>{error.message}</code>
              {error.digest && (
                <span className="text-gray-600 block text-[0.65rem] mt-1">Digest: {error.digest}</span>
              )}
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full sm:w-auto border-2 border-[#FBD227] bg-[#FBD227] text-black font-sans text-xs font-bold uppercase tracking-wider px-6 py-3 hover:bg-black hover:text-[#FBD227] transition-colors"
            >
              <Icon name="refresh" className="mr-1.5 inline h-4 w-4 align-[-0.2em]" />Retry / recover session
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto border-2 border-white/20 bg-white/5 text-gray-300 font-sans text-xs font-bold uppercase tracking-wider px-6 py-3 hover:border-white hover:text-white transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-4 text-center font-sans text-xs text-gray-500">
        Virtus Operations OS
      </footer>
    </div>
  );
}
