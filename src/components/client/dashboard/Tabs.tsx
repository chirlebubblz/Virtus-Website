"use client";

import React, { useRef } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Container } from "./Container";
import { focusRing } from "./styles";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon: IconName;
  count?: number;
}

/**
 * One ARIA tablist that adapts: a fixed bottom bar with icons on phones, a sticky pill bar under the header from 640px.
 * Arrow keys, Home and End move between tabs (roving tabindex).
 */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const move = (event: React.KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const next =
      event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    onChange(tabs[next].id);
    refs.current[tabs[next].id]?.focus();
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:sticky sm:inset-x-auto sm:top-16 sm:bottom-auto sm:border-t-0 sm:border-b sm:bg-black/70 sm:pb-0">
      <Container className="sm:py-3">
        <div role="tablist" aria-label="Dashboard sections" className="grid grid-cols-4 gap-1 sm:flex sm:gap-2 sm:overflow-x-auto">
          {tabs.map((t, i) => {
            const active = t.id === value;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  refs.current[t.id] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={active}
                aria-controls="dashboard-panel"
                tabIndex={active ? 0 : -1}
                onClick={() => onChange(t.id)}
                onKeyDown={(e) => move(e, i)}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2 font-sans text-[0.68rem] font-bold uppercase tracking-[0.12em] transition-colors sm:min-h-11 sm:flex-row sm:gap-2 sm:whitespace-nowrap sm:border sm:px-4 sm:text-eyebrow ${focusRing} ${
                  active
                    ? "text-[#FBD227] sm:border-[#FBD227] sm:bg-[#FBD227] sm:text-black"
                    : "text-[#A3A3A3] hover:text-white sm:border-white/15"
                }`}
              >
                <Icon name={t.icon} className="h-5 w-5 sm:h-4 sm:w-4" />
                <span>{t.label}</span>
                {t.count !== undefined && t.count > 0 && (
                  <span
                    className={`absolute right-2 top-1.5 min-w-5 px-1 text-center text-[0.65rem] leading-5 sm:static sm:ml-0.5 ${
                      active ? "bg-[#FBD227] text-black sm:bg-black sm:text-[#FBD227]" : "bg-white/10 text-white"
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Container>
    </div>
  );
}
