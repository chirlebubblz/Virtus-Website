import React from "react";
import type { ClientPortalData } from "@/lib/clientPortal";
import { Icon, type IconName } from "@/components/icons/Icon";
import { EmptyState } from "./EmptyState";
import { btnYellow, card, enter, eyebrow, stagger } from "./styles";
import { dateLabel, isOpenableUrl } from "./format";

const TYPE_ICON: Record<string, IconName> = { document: "file", image: "library", video: "video", audio: "music" };

export function DeliverablesTab({ items }: { items: ClientPortalData["deliverables"] }) {
  if (items.length === 0) {
    return (
      <EmptyState icon="folder" title="No files shared yet">
        New deliverables appear here first, so you can review them before anything is final.
      </EmptyState>
    );
  }

  const groups = items.reduce<Record<string, typeof items>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(groups).map(([category, files], g) => (
        <section key={category} aria-label={category} className={enter} style={stagger(g)}>
          <h2 className={`${eyebrow} mb-3`}>
            {category} <span className="text-white">({files.length})</span>
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {files.map((item) => (
              <li key={item.id} className={`${card} flex items-center gap-4 p-4 transition-colors hover:border-white/25 sm:p-5`}>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/20 text-[#FBD227]">
                  <Icon name={TYPE_ICON[item.fileType] ?? "file"} className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-sans text-base font-bold text-white">{item.title}</h3>
                  <p className="truncate font-sans text-sm text-[#A3A3A3]">
                    {item.filename} · {item.fileSize} · {dateLabel(item.createdAt)}
                  </p>
                </div>
                {isOpenableUrl(item.url) ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className={`${btnYellow} shrink-0 !min-h-10 !px-4 !py-2`}>
                    Open
                    <Icon name="arrow-up-right" className="h-4 w-4" />
                  </a>
                ) : (
                  <span className="shrink-0 border border-white/20 px-2.5 py-1 font-sans text-xs font-bold uppercase tracking-[0.12em] text-[#A3A3A3]">
                    Coming soon
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
