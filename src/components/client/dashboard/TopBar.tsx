"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/public/Logo";
import { Icon } from "@/components/icons/Icon";
import { Container } from "./Container";
import { focusRing } from "./styles";
import { timeAgo } from "./format";

interface TopBarProps {
  company: string;
  /** Epoch ms of the last update, or null before the page has mounted. */
  updatedAt: number | null;
  refreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

export function TopBar({ company, updatedAt, refreshing, onRefresh, onLogout }: TopBarProps) {
  // Re-render every 30 seconds so "Updated 2 min ago" stays true.
  const [now, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const label = updatedAt === null ? "Refresh" : `Updated ${timeAgo(updatedAt, now || Date.now())}`;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/75 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-3">
        <Link href="/" aria-label="The Virtus Labs — Home" className={focusRing}>
          <Logo />
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden max-w-[16rem] truncate font-sans text-eyebrow font-bold uppercase text-[#A3A3A3] md:inline">
            {company}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label={refreshing ? "Refreshing" : label}
            className={`inline-flex min-h-11 items-center gap-2 border border-white/15 px-3 font-sans text-xs font-semibold text-[#D4D4D4] transition-colors hover:border-[#FBD227] hover:text-[#FBD227] disabled:opacity-60 ${focusRing}`}
          >
            <Icon name="refresh" className={`h-4 w-4 ${refreshing ? "motion-safe:animate-spin" : ""}`} />
            <span className="hidden sm:inline">{refreshing ? "Refreshing…" : label}</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className={`inline-flex min-h-11 items-center gap-2 border-2 border-white/25 px-3 font-sans text-eyebrow font-bold uppercase text-white transition-colors hover:border-[#FBD227] hover:text-[#FBD227] sm:px-4 ${focusRing}`}
          >
            <Icon name="logout" className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
            <span className="sr-only sm:hidden">Log out</span>
          </button>
        </div>
      </Container>
    </header>
  );
}
