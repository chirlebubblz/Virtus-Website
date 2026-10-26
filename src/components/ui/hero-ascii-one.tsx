"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface HeroAsciiOneProps {
  projectId?: string;
  className?: string;
  showCorners?: boolean;
  showTelemetry?: boolean;
  showGridLines?: boolean;
  children?: React.ReactNode;
}

declare global {
  interface Window {
    UnicornStudio?: {
      isInitialized: boolean;
      init: () => void;
    };
  }
}

export function HeroAsciiBackground({
  projectId = "OMzqyUv6M3kSnv0JeAtC",
  className,
}: {
  projectId?: string;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Initialize UnicornStudio script if not loaded
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.textContent = `
      !function(){
        if(!window.UnicornStudio){
          window.UnicornStudio={isInitialized:!1};
          var i=document.createElement("script");
          i.src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.33/dist/unicornStudio.umd.js";
          i.onload=function(){
            window.UnicornStudio.isInitialized||(window.UnicornStudio.init(),window.UnicornStudio.isInitialized=!0)
          };
          (document.head || document.body).appendChild(i)
        } else if (!window.UnicornStudio.isInitialized && typeof window.UnicornStudio.init === 'function') {
          window.UnicornStudio.init();
          window.UnicornStudio.isInitialized = true;
        }
      }();
    `;
    document.head.appendChild(script);

    // Style override to ensure clean canvas containment and hide any watermarks
    const style = document.createElement("style");
    style.textContent = `
      [data-us-project] {
        position: relative !important;
        overflow: hidden !important;
      }
      [data-us-project] canvas {
        clip-path: inset(0 0 10% 0) !important;
      }
      [data-us-project] * {
        pointer-events: none !important;
      }
      [data-us-project] a[href*="unicorn"],
      [data-us-project] button[title*="unicorn"],
      [data-us-project] div[title*="Made with"],
      [data-us-project] .unicorn-brand,
      [data-us-project] [class*="brand"],
      [data-us-project] [class*="credit"],
      [data-us-project] [class*="watermark"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        position: absolute !important;
        left: -9999px !important;
        top: -9999px !important;
      }
    `;
    document.head.appendChild(style);

    const hideBranding = () => {
      [
        "[data-us-project]",
        `[data-us-project="${projectId}"]`,
        ".unicorn-studio-container",
        'canvas[aria-label*="Unicorn"]',
      ].forEach((selector) => {
        document.querySelectorAll(selector).forEach((container) => {
          container.querySelectorAll("*").forEach((el) => {
            const text = (el.textContent || "").toLowerCase();
            const title = (el.getAttribute("title") || "").toLowerCase();
            const href = (el.getAttribute("href") || "").toLowerCase();
            if (
              text.includes("made with") ||
              text.includes("unicorn") ||
              title.includes("made with") ||
              title.includes("unicorn") ||
              href.includes("unicorn.studio")
            ) {
              (el as HTMLElement).style.display = "none";
              (el as HTMLElement).style.visibility = "hidden";
              (el as HTMLElement).style.opacity = "0";
              (el as HTMLElement).style.pointerEvents = "none";
              try {
                el.remove();
              } catch {}
            }
          });
        });
      });
    };

    hideBranding();
    const interval = setInterval(hideBranding, 100);
    const t1 = setTimeout(hideBranding, 500);
    const t2 = setTimeout(hideBranding, 1500);
    const t3 = setTimeout(hideBranding, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (script.parentNode) script.parentNode.removeChild(script);
      if (style.parentNode) style.parentNode.removeChild(style);
    };
  }, [projectId]);

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {/* Interactive WebGL ASCII canvas on desktop */}
      <div className="absolute inset-0 hidden h-full w-full lg:block">
        {mounted && (
          <div
            data-us-project={projectId}
            style={{ width: "100%", height: "100%", minHeight: "100%" }}
          />
        )}
      </div>

      {/* Mobile atmospheric stars/dither fallback */}
      <div className="stars-bg absolute inset-0 h-full w-full lg:hidden opacity-30" />
    </div>
  );
}

export default function HeroAsciiOne({
  projectId = "OMzqyUv6M3kSnv0JeAtC",
  className,
  showCorners = true,
  showTelemetry = true,
  showGridLines = true,
  children,
}: HeroAsciiOneProps) {
  return (
    <div className={cn("relative isolate min-h-screen overflow-hidden bg-black text-white", className)}>
      {/* 3D ASCII Canvas Background */}
      <HeroAsciiBackground projectId={projectId} />

      {/* Cyberpunk Viewfinder Corner Reticles */}
      {showCorners && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-4 z-20 h-6 w-6 border-l-2 border-t-2 border-white/40 sm:h-8 sm:w-8 lg:left-8 lg:top-8"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-4 top-4 z-20 h-6 w-6 border-r-2 border-t-2 border-white/40 sm:h-8 sm:w-8 lg:right-8 lg:top-8"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-4 left-4 z-20 h-6 w-6 border-b-2 border-l-2 border-white/40 sm:h-8 sm:w-8 lg:bottom-8 lg:left-8"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-4 right-4 z-20 h-6 w-6 border-b-2 border-r-2 border-white/40 sm:h-8 sm:w-8 lg:bottom-8 lg:right-8"
          />
        </>
      )}

      {/* Subtle Dither Pattern overlay */}
      {showGridLines && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 hero-grid opacity-30 z-0" />
      )}

      {/* Foreground Children */}
      <div className="relative z-10 flex min-h-screen flex-col justify-between">
        {children}
      </div>

      {/* Bottom Telemetry Bar */}
      {showTelemetry && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/60 backdrop-blur-md"
        >
          <div className="mx-auto flex max-w-[96rem] 2xl:max-w-[104rem] items-center justify-between px-5 py-2.5 sm:px-8 sm:py-3 lg:px-10 2xl:px-12">
            <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-wider text-white/50 sm:gap-6 sm:text-[10px]">
              <span className="inline-flex items-center gap-1.5 text-zinc-300">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F5C518] animate-pulse" />
                SYSTEM.ACTIVE
              </span>
              <span className="hidden sm:inline text-zinc-500">·</span>
              <span className="hidden sm:inline">V2.5 // CORE.SYS</span>
              <div className="hidden items-center gap-1 sm:flex">
                <span className="h-2 w-0.5 bg-white/30" />
                <span className="h-3 w-0.5 bg-white/40" />
                <span className="h-2.5 w-0.5 bg-white/50" />
                <span className="h-4 w-0.5 bg-[#F5C518]" />
                <span className="h-2 w-0.5 bg-white/30" />
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-wider text-white/50 sm:text-[10px]">
              <span>◐ RENDERING</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">LAT: 14.5995° N · LONG: 120.9842° E</span>
              <span className="hidden lg:inline text-zinc-400">FRAME: ∞</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
