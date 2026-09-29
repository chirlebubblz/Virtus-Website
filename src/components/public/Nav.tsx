"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { siteData } from "@/data/siteData";
import { Icon } from "@/components/icons/Icon";
import { Button, IndexBadge } from "./ui";

interface NavProps {
  onOpenInquiry: () => void;
}

// Nav hrefs are root-relative ("/#work") so they still resolve correctly from
// a non-homepage route; this recovers the bare section id for the scroll-spy.
const hashId = (href: string) => href.split("#")[1] ?? "";

const SECTION_IDS = siteData.nav.links.map((link) => hashId(link.href));

export const Nav: React.FC<NavProps> = ({ onOpenInquiry }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const previousOverflowRef = useRef("");
  const lockedRef = useRef(false);

  const closeMenu = useCallback((restoreFocus: boolean) => {
    setMenuOpen(false);
    if (restoreFocus) toggleRef.current?.focus();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-spy: highlight the section nearest the reading line.
  useEffect(() => {
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.intersectionRatio);
          else visible.delete(entry.target.id);
        });
        const top = SECTION_IDS.find((id) => visible.has(id)) ?? null;
        setActiveId(top);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: [0, 0.01] }
    );
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Drawer: lock scroll, Escape closes, leave when the desktop layout returns.
  useEffect(() => {
    if (!menuOpen) return;
    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lockedRef.current = true;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu(true);
    };
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = () => media.matches && closeMenu(false);
    document.addEventListener("keydown", onKey);
    media.addEventListener("change", onChange);

    return () => {
      document.removeEventListener("keydown", onKey);
      media.removeEventListener("change", onChange);
      if (lockedRef.current) {
        document.body.style.overflow = previousOverflowRef.current;
        lockedRef.current = false;
      }
    };
  }, [menuOpen, closeMenu]);

  const action = siteData.nav.action.label;
  const solid = scrolled || menuOpen;

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-200 ${
        solid ? "border-shelf bg-black" : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[88rem] items-center justify-between gap-4 px-5 sm:px-8 lg:h-[4.5rem] lg:px-10">
        <Link
          href="/#top"
          className="shrink-0 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-tvl-amber"
          aria-label="The Virtus Labs — Home"
          onClick={() => closeMenu(false)}
        >
          <Logo showWordmark={false} className="min-[440px]:hidden" />
          <Logo className="hidden min-[440px]:inline-flex" />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
          {siteData.nav.links.map((link) => {
            const active = activeId === hashId(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "true" : undefined}
                className={`relative py-2 font-sans text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-tvl-amber ${
                  active ? "text-white" : "text-tide hover:text-white"
                }`}
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 -bottom-0.5 h-0.5 bg-tvl-amber transition-transform duration-200 origin-left ${
                    active ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </Link>
            );
          })}
          <Button onClick={onOpenInquiry} aria-haspopup="dialog" size="md">
            {action}
          </Button>
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <Button onClick={onOpenInquiry} aria-haspopup="dialog" size="sm" className="whitespace-nowrap">
            {action}
          </Button>
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center text-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-0 focus-visible:outline-tvl-amber"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            <Icon name={menuOpen ? "close" : "menu"} className="h-5 w-5" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="fixed inset-x-0 bottom-0 top-16 overflow-y-auto overscroll-contain border-t border-shelf bg-black px-5 pb-10 pt-6 sm:px-8 lg:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col">
            {siteData.nav.links.map((link, idx) => {
              const active = activeId === hashId(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => closeMenu(false)}
                  aria-current={active ? "true" : undefined}
                  className="flex min-h-16 items-center gap-5 border-b border-shelf font-monument text-xl font-bold uppercase text-white focus-visible:outline focus-visible:outline-[3px] focus-visible:-outline-offset-2 focus-visible:outline-tvl-amber sm:text-2xl"
                >
                  <IndexBadge index={idx + 1} size="sm" />
                  <span className={active ? "text-tvl-amber" : ""}>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};
