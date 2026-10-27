"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { SectionHeader } from "./SectionHeader";
import { IndexBadge, SlantDivider } from "./ui";
import { type MemberPortfolioItem, type TeamMemberUser, type TeamPod } from "@/db";
import {
  getCachedTeamsData,
  preloadTeamsData,
  subscribeTeamsCache,
} from "@/lib/teamsClientCache";

const FALLBACK_PODS: TeamPod[] = [
  {
    id: "pod-1",
    name: "Brand & Creative Pod",
    focusArea: "Visual Identity, Design Systems & Kinetic 3D",
    leaderId: "",
    leaderName: "Unassigned",
    leaderRole: "Brand & Creative Lead",
    memberIds: [],
    color: "#FBD227",
    activeProjectsCount: 2,
    createdAt: "2026-09-15",
  },
  {
    id: "pod-2",
    name: "Engineering & Architecture Pod",
    focusArea: "Edge Platforms, WebGL & Cloud Systems",
    leaderId: "",
    leaderName: "Unassigned",
    leaderRole: "Lead Frontend Engineer",
    memberIds: [],
    color: "#60A5FA",
    activeProjectsCount: 2,
    createdAt: "2026-09-18",
  },
  {
    id: "pod-3",
    name: "Strategy & Discovery Pod",
    focusArea: "Platform Strategy, Feasibility & Direction",
    leaderId: "",
    leaderName: "Unassigned",
    leaderRole: "Strategy & Discovery Lead",
    memberIds: [],
    color: "#818CF8",
    activeProjectsCount: 3,
    createdAt: "2026-09-20",
  },
];

function extractDomain(urlStr: string): string {
  try {
    const url = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return urlStr;
  }
}

function isImageUrl(val?: string | null): boolean {
  if (!val) return false;
  const str = val.trim();
  return (
    str.startsWith("http://") ||
    str.startsWith("https://") ||
    str.startsWith("data:image/") ||
    str.startsWith("/") ||
    str.startsWith("blob:")
  );
}

/**
 * Procedural architectural SVG blueprint preview for portfolio cards.
 * Provides a crisp, high-contrast generative wireframe matching Virtus aesthetic.
 */
export function ArchitecturalPreview({
  item,
  accentColor = "#FBD227",
}: {
  item: MemberPortfolioItem;
  accentColor?: string;
}) {
  const domain = extractDomain(item.url);
  const isWebgl = item.tag?.toUpperCase().includes("WEBGL") || item.tag?.toUpperCase().includes("CODE");
  const isDesign = item.tag?.toUpperCase().includes("BRAND") || item.tag?.toUpperCase().includes("DESIGN") || item.tag?.toUpperCase().includes("TYPO");
  const isHealth = item.tag?.toUpperCase().includes("HEALTH") || item.tag?.toUpperCase().includes("UX");

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-[#0C0C0C] border border-[#242424] p-3 flex flex-col justify-between group-hover:border-tvl-amber/40 transition-colors">
      {/* Background blueprint grid */}
      <div
        className="absolute inset-0 opacity-[0.12] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, ${accentColor} 1px, transparent 1px), linear-gradient(to bottom, ${accentColor} 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Subtle glowing ambient gradient */}
      <div
        className="absolute -top-12 -right-12 h-36 w-36 rounded-full blur-2xl opacity-20 pointer-events-none"
        style={{ backgroundColor: accentColor }}
      />

      {/* Frame Top HUD */}
      <div className="relative z-10 flex items-center justify-between border-b border-[#222222] pb-1.5 text-[10px] font-mono text-gray-400">
        <span className="flex items-center gap-1.5 truncate max-w-[14rem]">
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
          <span className="truncate">SYS://{domain}</span>
        </span>
        <span className="text-gray-500 uppercase tracking-widest text-[9px] shrink-0">VIEWPORT 1440x900</span>
      </div>

      {/* Center Architectural Vector Graphics */}
      <div className="relative z-10 my-auto flex items-center justify-center py-1">
        {isWebgl ? (
          <svg className="w-full text-gray-400 h-20" viewBox="0 0 320 80" fill="none">
            <line x1="20" y1="40" x2="300" y2="40" stroke="#333333" strokeDasharray="4 4" />
            <polygon points="160,10 200,65 120,65" stroke={accentColor} strokeWidth="1.5" fill="none" opacity="0.8" />
            <circle cx="160" cy="40" r="28" stroke="#555555" strokeWidth="1" strokeDasharray="2 3" />
            <circle cx="160" cy="40" r="3" fill={accentColor} />
            <line x1="80" y1="20" x2="80" y2="60" stroke="#333333" />
            <line x1="240" y1="20" x2="240" y2="60" stroke="#333333" />
            <rect x="30" y="25" width="30" height="30" stroke="#333333" />
            <rect x="260" y="25" width="30" height="30" stroke="#333333" />
          </svg>
        ) : isDesign ? (
          <svg className="w-full text-gray-400 h-20" viewBox="0 0 320 80" fill="none">
            <rect x="25" y="15" width="50" height="50" rx="4" stroke="#444444" strokeWidth="1.5" />
            <rect x="90" y="15" width="50" height="50" rx="25" stroke={accentColor} strokeWidth="1.5" fill="none" opacity="0.75" />
            <polygon points="175,15 205,65 145,65" stroke="#555555" strokeWidth="1.5" fill="none" />
            <path d="M225,50 C240,20 260,65 285,30" stroke={accentColor} strokeWidth="2" fill="none" />
            <circle cx="285" cy="30" r="3" fill={accentColor} />
          </svg>
        ) : isHealth ? (
          <svg className="w-full text-gray-400 h-20" viewBox="0 0 320 80" fill="none">
            <rect x="20" y="15" width="280" height="50" rx="6" stroke="#2D2D2D" strokeWidth="1.5" />
            <line x1="20" y1="32" x2="300" y2="32" stroke="#2D2D2D" />
            <rect x="35" y="42" width="55" height="12" rx="3" fill={accentColor} opacity="0.4" />
            <rect x="100" y="42" width="75" height="12" rx="3" fill="#333333" />
            <rect x="185" y="42" width="45" height="12" rx="3" fill="#292929" />
            <circle cx="280" cy="48" r="4" fill={accentColor} />
          </svg>
        ) : (
          <svg className="w-full text-gray-400 h-20" viewBox="0 0 320 80" fill="none">
            <rect x="20" y="12" width="80" height="56" rx="4" stroke="#333333" strokeWidth="1" />
            <rect x="110" y="12" width="190" height="24" rx="4" stroke="#333333" strokeWidth="1" />
            <rect x="110" y="44" width="90" height="24" rx="4" stroke={accentColor} strokeWidth="1" opacity="0.6" />
            <rect x="210" y="44" width="90" height="24" rx="4" stroke="#2B2B2B" strokeWidth="1" />
            <line x1="30" y1="28" x2="80" y2="28" stroke={accentColor} strokeWidth="2" />
            <line x1="30" y1="40" x2="65" y2="40" stroke="#555555" strokeWidth="1.5" />
          </svg>
        )}
      </div>

      {/* Frame Bottom Coordinates */}
      <div className="relative z-10 flex items-center justify-between border-t border-[#222222] pt-1.5 text-[9px] font-mono text-gray-500">
        <span>ARCHITECTURAL SPEC // PROD</span>
        <span className="text-tvl-amber uppercase tracking-wider">{item.tag || "PRODUCTION SITE"}</span>
      </div>
    </div>
  );
}

/**
 * Interactive Portfolio Collector Deck component for an individual team member.
 */
function MemberPortfolioDeck({
  items,
  memberAccent,
}: {
  items: MemberPortfolioItem[];
  memberAccent: string;
}) {
  const [deckIndex, setDeckIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"stacked" | "grid">("stacked");

  const total = items.length;
  if (total === 0) return null;

  const activeIndex = ((deckIndex % total) + total) % total;
  const currentCard = items[activeIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeckIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeckIndex((prev) => (prev + 1) % total);
  };

  return (
    <div className="border-t border-[#262626] mt-5 pt-4">
      {/* Deck Header Bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-tvl-amber/15 text-tvl-amber">
            <Icon name="folder" className="h-3 w-3" />
          </span>
          <span className="font-monument text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white">
            Portfolio Deck
          </span>
          <span className="font-mono text-[10px] sm:text-[11px] font-bold text-tvl-amber bg-tvl-amber/10 px-2 py-0.5 rounded border border-tvl-amber/20">
            {String(activeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>

        {/* View Mode Toggle & Deck Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "stacked" ? "grid" : "stacked")}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1C1C1C] hover:bg-[#282828] text-gray-300 hover:text-white border border-[#333333] font-mono text-[10px] transition-colors"
            title={viewMode === "stacked" ? "Switch to Expanded Grid View" : "Switch to Stacked Deck View"}
          >
            <Icon name={viewMode === "stacked" ? "dashboard" : "library"} className="h-3 w-3 text-tvl-amber" />
            <span className="hidden sm:inline">{viewMode === "stacked" ? "Fan" : "Deck"}</span>
          </button>

          {total > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous portfolio card"
                className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded bg-[#1C1C1C] hover:bg-tvl-amber hover:text-black text-gray-300 border border-[#333333] transition-colors"
              >
                <Icon name="chevron-left" className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next portfolio card"
                className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded bg-[#1C1C1C] hover:bg-tvl-amber hover:text-black text-gray-300 border border-[#333333] transition-colors"
              >
                <Icon name="chevron-right" className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mode 1: STACKED DECK */}
      {viewMode === "stacked" ? (
        <div className="relative">
          {/* Card Stack Shadows & Depth Layers */}
          {total > 1 && (
            <>
              {total > 2 && (
                <div
                  aria-hidden="true"
                  className="absolute inset-x-3 top-3 -bottom-3 rounded-xl bg-[#0F0F0F] border border-[#222222] opacity-40 pointer-events-none -z-20 transition-all duration-300"
                />
              )}
              <div
                aria-hidden="true"
                className="absolute inset-x-1.5 top-1.5 -bottom-1.5 rounded-xl bg-[#141414] border border-[#2A2A2A] opacity-75 pointer-events-none -z-10 transition-all duration-300"
              />
            </>
          )}

          {/* Active Front Collector Card */}
          <div className="relative z-10 rounded-xl border border-[#303030] bg-[#121212] p-3.5 sm:p-4 transition-all shadow-xl">
            {/* Card Frame Header */}
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#242424]">
              <div className="flex items-center gap-1.5 truncate">
                <span className="flex items-center gap-1 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-[9px] uppercase font-bold text-emerald-400">Live</span>
                </span>
                <span className="text-gray-600 font-mono text-xs">/</span>
                <span className="font-mono text-[11px] text-gray-300 truncate max-w-[10rem] sm:max-w-[14rem]">
                  {extractDomain(currentCard.url)}
                </span>
              </div>
              {currentCard.tag && (
                <span
                  className="font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0"
                  style={{
                    backgroundColor: `${currentCard.accentColor || memberAccent}15`,
                    color: currentCard.accentColor || memberAccent,
                    borderColor: `${currentCard.accentColor || memberAccent}35`,
                  }}
                >
                  {currentCard.tag}
                </span>
              )}
            </div>

            {/* Visual Preview */}
            <div className="mb-3">
              {currentCard.previewImage ? (
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-[#262626]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentCard.previewImage}
                    alt={currentCard.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <ArchitecturalPreview
                  item={currentCard}
                  accentColor={currentCard.accentColor || memberAccent}
                />
              )}
            </div>

            {/* Card Meta & Description */}
            <div className="space-y-1 mb-3">
              <h4 className="font-monument text-xs sm:text-sm font-bold uppercase text-white tracking-wide truncate">
                {currentCard.title}
              </h4>
              {currentCard.description && (
                <p className="font-sans text-xs text-tide leading-relaxed line-clamp-2">
                  {currentCard.description}
                </p>
              )}
            </div>

            {/* Interactive CTA Link */}
            <div className="flex items-center justify-between pt-2.5 border-t border-[#222222]">
              <span className="font-mono text-[10px] text-gray-500">
                Card {String(activeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>
              <a
                href={currentCard.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-tvl-amber px-3 py-1 font-mono text-[11px] font-bold uppercase text-black hover:bg-white transition-colors"
              >
                <span>Visit Site</span>
                <Icon name="arrow-up-right" className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Quick Deck Pagination Tabs */}
          {total > 1 && (
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {items.map((item, idx) => (
                <button
                  key={item.id || idx}
                  type="button"
                  onClick={() => setDeckIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === activeIndex
                      ? "w-7 bg-tvl-amber"
                      : "w-2 bg-[#333333] hover:bg-[#555555]"
                  }`}
                  aria-label={`Jump to portfolio card ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Mode 2: EXPANDED GRID / FAN */
        <div className="grid grid-cols-1 gap-3">
          {items.map((item, idx) => (
            <div
              key={item.id || idx}
              className="rounded-xl border border-[#2B2B2B] bg-[#121212] p-3.5 transition-all hover:border-tvl-amber/50"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#222222]">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="font-mono text-xs text-gray-300">{extractDomain(item.url)}</span>
                </div>
                {item.tag && (
                  <span
                    className="font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: `${item.accentColor || memberAccent}15`,
                      color: item.accentColor || memberAccent,
                      borderColor: `${item.accentColor || memberAccent}30`,
                    }}
                  >
                    {item.tag}
                  </span>
                )}
              </div>
              {/* Visual Preview */}
              <div className="my-2">
                {item.previewImage ? (
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-[#262626]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.previewImage}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <ArchitecturalPreview
                    item={item}
                    accentColor={item.accentColor || memberAccent}
                  />
                )}
              </div>

              <h4 className="font-monument text-xs font-bold uppercase text-white mb-1 truncate">
                {item.title}
              </h4>
              {item.description && (
                <p className="font-sans text-xs text-tide leading-relaxed mb-2.5 line-clamp-2">
                  {item.description}
                </p>
              )}
              <div className="flex items-center justify-end">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-tvl-amber hover:text-white font-mono text-[11px] font-bold uppercase transition-colors"
                >
                  <span>Launch Live Site</span>
                  <Icon name="arrow-up-right" className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Individual Specialist Card component presented on stage.
 */
function TeamMemberCard({
  member,
  pod,
  cardIndex,
  totalCards,
  isCardLeader = false,
  showDeckControls = false,
  onPrevCard,
  onNextCard,
}: {
  member: TeamMemberUser;
  pod?: TeamPod;
  cardIndex: number;
  totalCards: number;
  isCardLeader?: boolean;
  showDeckControls?: boolean;
  onPrevCard?: () => void;
  onNextCard?: () => void;
}) {
  const roleBadgeLabel = isCardLeader ? "CARD LEADER" : `MEMBER 0${cardIndex}`;
  const podColor = pod?.color || "#FBD227";

  // Normalise portfolio collection
  const portfolioItems: MemberPortfolioItem[] =
    member.portfolioCollection && member.portfolioCollection.length > 0
      ? member.portfolioCollection
      : member.portfolioUrl
      ? [
          {
            id: `fallback-${member.id}`,
            title: `${member.name}'s Primary Production Portfolio`,
            url: member.portfolioUrl,
            tag: "PRIMARY PORTFOLIO",
            description: `Official digital portfolio and interactive client build archive for ${member.name}.`,
            accentColor: podColor,
          },
        ]
      : [];

  return (
    <article className="relative flex flex-col justify-between rounded-2xl border border-shelf/80 bg-abyss-2 p-5 sm:p-7 transition-all hover:border-tvl-amber/40 overflow-hidden group shadow-xl">
      {/* Top Pod Accent Strip */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5 transition-all"
        style={{ backgroundColor: podColor }}
      />

      {/* Card Main Body */}
      <div>
        {/* Header Row: Avatar, Info, Badges & Controls */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex shrink-0 items-center justify-center rounded-xl font-monument font-bold text-white border transition-colors h-12 w-12 text-lg overflow-hidden"
              style={{
                backgroundColor: "#161616",
                borderColor: `${podColor}60`,
              }}
            >
              {isImageUrl(member.avatar || member.avatarUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.avatar || member.avatarUrl}
                  alt={member.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                member.avatar || member.name.charAt(0)
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                {member.teamName && (
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#202020] text-gray-300 border border-shelf/60">
                    {member.teamName}
                  </span>
                )}
                {isCardLeader ? (
                  <span className="inline-flex items-center gap-1 rounded bg-tvl-amber/20 border border-tvl-amber/40 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-tvl-amber">
                    <Icon name="bolt" className="h-2.5 w-2.5" />
                    <span>Card Leader</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-[#202020] border border-[#333333] px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-gray-400">
                    <span>Member 0{cardIndex}</span>
                  </span>
                )}
              </div>
              <h3 className="font-monument font-bold uppercase text-white tracking-wide truncate text-xl sm:text-2xl">
                {member.name}
              </h3>
              {member.username && (
                <p className="font-mono text-xs text-[#FBD227] tracking-wider truncate mb-0.5">
                  @{member.username.replace(/^@/, "")}
                </p>
              )}
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-tvl-amber mt-0.5 truncate">
                {member.roleTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {showDeckControls && totalCards > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onPrevCard}
                  aria-label="Previous specialist card"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#181818] hover:bg-tvl-amber hover:text-black text-gray-300 border border-[#333333] transition-colors"
                >
                  <Icon name="chevron-left" className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onNextCard}
                  aria-label="Next specialist card"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#181818] hover:bg-tvl-amber hover:text-black text-gray-300 border border-[#333333] transition-colors"
                >
                  <Icon name="chevron-right" className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <span
              className={`font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${
                isCardLeader
                  ? "bg-tvl-amber text-black border-tvl-amber font-extrabold shadow-sm"
                  : "bg-[#181818] text-gray-300 border-[#333333]"
              }`}
            >
              {roleBadgeLabel}
            </span>
            <IndexBadge index={cardIndex + 1} size="sm" tone="amber" className="shrink-0" />
          </div>
        </div>

        {/* Member Bio */}
        {member.bio && (
          <p className="font-sans text-tide leading-relaxed text-xs sm:text-sm mt-3">
            {member.bio}
          </p>
        )}

        {/* Member Skills Pills */}
        {member.skills && member.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {member.skills.map((skill, sIdx) => (
              <span
                key={sIdx}
                className="font-mono text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#161616] text-gray-300 border border-shelf/60 hover:border-tvl-amber/40 transition-colors"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* Personal Website Line */}
        <div className="mt-3 pt-2.5 border-t border-shelf/50 flex items-center justify-between gap-2 font-mono text-xs">
          <span className="text-gray-400 uppercase tracking-wider text-[10px] sm:text-[11px] font-bold flex items-center gap-1.5">
            <Icon name="link" className="h-3 w-3 text-tvl-amber" />
            <span>Personal Website:</span>
          </span>
          {member.portfolioUrl ? (
            <a
              href={member.portfolioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-tvl-amber hover:text-white hover:underline transition-colors font-semibold text-xs"
            >
              <span className="truncate max-w-[11rem] sm:max-w-[14rem]">{extractDomain(member.portfolioUrl)}</span>
              <Icon name="arrow-up-right" className="h-3 w-3 shrink-0" />
            </a>
          ) : (
            <span className="text-gray-500 italic text-[10px]">Direct studio inquiry</span>
          )}
        </div>
      </div>

      {/* Interactive Portfolio Card Collection */}
      <MemberPortfolioDeck
        items={portfolioItems}
        memberAccent={podColor}
      />
    </article>
  );
}

const DUMMY_IDS = new Set(["user-1", "user-2", "user-3", "user-4", "user-5", "user-6", "user-paks"]);
const DUMMY_NAMES = new Set(["paks", "kai", "ren", "sora", "milo", "nadia"]);

const isDummyMember = (m: { id?: string; email?: string; name?: string }) =>
  Boolean(m.id && DUMMY_IDS.has(m.id)) ||
  Boolean(m.name && DUMMY_NAMES.has(m.name.trim().toLowerCase())) ||
  Boolean(m.email && DUMMY_NAMES.has(m.email.toLowerCase().split("@")[0]));

/**
 * Animated High-Contrast Skeleton state matching Virtus 3D Deck aesthetic.
 * Visible on cold visits when local cache is empty while eager preload finishes.
 */
function TeamDeckSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start animate-pulse" aria-busy="true" aria-label="Loading Specialist Deck">
      {/* Left Skeleton Panel */}
      <div className="w-full lg:w-80 xl:w-96 shrink-0 space-y-4">
        <div className="rounded-2xl border border-shelf/80 bg-abyss-2 p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-shelf/50">
            <div className="space-y-2">
              <div className="h-2.5 w-32 bg-[#252525] rounded" />
              <div className="h-4 w-24 bg-[#2e2e2e] rounded" />
            </div>
            <div className="flex gap-1.5">
              <div className="h-8 w-8 rounded-lg bg-[#1a1a1a] border border-[#2b2b2b]" />
              <div className="h-8 w-8 rounded-lg bg-[#1a1a1a] border border-[#2b2b2b]" />
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="h-2 w-20 bg-[#222222] rounded" />
            <div className="flex flex-wrap gap-1.5">
              <div className="h-6 w-16 bg-[#222222] rounded-md" />
              <div className="h-6 w-24 bg-[#222222] rounded-md" />
              <div className="h-6 w-20 bg-[#222222] rounded-md" />
            </div>
          </div>
          <div className="space-y-2 pt-3 border-t border-shelf/50">
            <div className="h-2 w-36 bg-[#222222] rounded mb-3" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-[#141414] border border-shelf/60">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-[#252525]" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-20 bg-[#2a2a2a] rounded" />
                    <div className="h-2 w-14 bg-[#202020] rounded" />
                  </div>
                </div>
                <div className="h-4 w-16 bg-[#222222] rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Skeleton Deck Stage */}
      <div className="w-full flex-1 min-w-0">
        <div className="relative pt-6 sm:pt-8 pr-3 sm:pr-6 md:pr-10">
          <div className="relative rounded-2xl border border-shelf/80 bg-abyss-2 p-5 sm:p-7 shadow-xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-tvl-amber/40" />
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-[#222222] border border-[#333333]" />
                <div className="space-y-2">
                  <div className="h-3 w-28 bg-[#222222] rounded" />
                  <div className="h-6 w-44 bg-[#2a2a2a] rounded" />
                  <div className="h-3 w-32 bg-[#222222] rounded" />
                </div>
              </div>
              <div className="h-6 w-24 bg-[#222222] rounded" />
            </div>
            <div className="space-y-2 my-4">
              <div className="h-3 w-full bg-[#202020] rounded" />
              <div className="h-3 w-4/5 bg-[#202020] rounded" />
            </div>
            <div className="flex gap-2 my-4">
              <div className="h-5 w-16 bg-[#222222] rounded-md" />
              <div className="h-5 w-20 bg-[#222222] rounded-md" />
              <div className="h-5 w-14 bg-[#222222] rounded-md" />
            </div>
            <div className="aspect-[16/9] w-full rounded-xl bg-[#141414] border border-[#262626] flex items-center justify-center">
              <div className="flex items-center gap-2 text-tvl-amber/60 font-mono text-xs">
                <span className="h-2 w-2 rounded-full bg-tvl-amber animate-ping" />
                <span>Preloading Specialist Deck & Profiles...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const TeamShowcase: React.FC = () => {
  // Synchronous read from instant cache for 0ms initial render without blank screen
  const cached = typeof window !== "undefined" ? getCachedTeamsData() : null;
  const [pods, setPods] = useState<TeamPod[]>(
    cached?.teams?.length ? cached.teams : FALLBACK_PODS
  );
  const [members, setMembers] = useState<TeamMemberUser[]>(
    cached?.members?.length ? cached.members.filter((m) => !isDummyMember(m)) : []
  );
  const [isHydrating, setIsHydrating] = useState<boolean>(!cached?.members?.length);
  const [selectedPodId, setSelectedPodId] = useState<string>("all");
  const [activeMemberIndex, setActiveMemberIndex] = useState<number>(0);

  useEffect(() => {
    let active = true;

    // 1. Subscribe to live cache updates across components and tabs
    const unsubscribe = subscribeTeamsCache((cachedData) => {
      if (!active) return;
      if (cachedData.teams?.length) {
        setPods(
          cachedData.teams.map((t: TeamPod) => ({
            ...t,
            leaderName:
              t.leaderName && DUMMY_NAMES.has(t.leaderName.trim().toLowerCase())
                ? "Unassigned"
                : t.leaderName,
            memberIds: (t.memberIds || []).filter((id) => !DUMMY_IDS.has(id)),
          }))
        );
      }
      if (cachedData.members?.length) {
        setMembers(cachedData.members.filter((m: TeamMemberUser) => !isDummyMember(m)));
        setIsHydrating(false);
      }
    });

    // 2. Consume / await eager background preloader
    async function syncTeams() {
      try {
        const payload = await preloadTeamsData();
        if (!active) return;
        if (payload) {
          if (Array.isArray(payload.teams) && payload.teams.length > 0) {
            setPods(
              payload.teams.map((t: TeamPod) => ({
                ...t,
                leaderName:
                  t.leaderName && DUMMY_NAMES.has(t.leaderName.trim().toLowerCase())
                    ? "Unassigned"
                    : t.leaderName,
                memberIds: (t.memberIds || []).filter((id) => !DUMMY_IDS.has(id)),
              }))
            );
          }
          if (Array.isArray(payload.members)) {
            setMembers(payload.members.filter((m: TeamMemberUser) => !isDummyMember(m)));
          }
        }
      } catch {
        // Fallback state remains active on network glitch
      } finally {
        if (active) {
          setIsHydrating(false);
        }
      }
    }

    void syncTeams();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Set of valid pod IDs
  const validPodIds = new Set(pods.map((p) => p.id));

  // 1. Strictly filter out unassigned members and dummy seed characters
  const assignedMembers = members.filter(
    (m) =>
      !isDummyMember(m) &&
      Boolean(m.teamId) &&
      m.teamId !== "unassigned" &&
      validPodIds.has(m.teamId!)
  );

  // 2. Selection Logic: Card Leader + Top 3 Members (up to 4 cards total)
  const pool =
    selectedPodId === "all"
      ? assignedMembers
      : assignedMembers.filter((m) => m.teamId === selectedPodId);

  // Identify Card Leader: designated pod leader, matching pod.leaderId, or fallback to first pool member
  const leader =
    pool.find((m) => m.isLeader || pods.some((p) => p.leaderId === m.id)) || pool[0];

  // Identify Top 3 Members (excluding the leader)
  const topMembers = pool.filter((m) => m.id !== leader?.id).slice(0, 3);

  // Combine into deck: 1 Card Leader + up to 3 Members (max 4 cards total)
  const filteredMembers = leader ? [leader, ...topMembers] : [];

  const totalMembers = filteredMembers.length;
  const safeIndex = totalMembers > 0 ? Math.min(activeMemberIndex, totalMembers - 1) : 0;
  const currentMember = filteredMembers[safeIndex];

  const handlePrevCard = () => {
    if (totalMembers <= 1) return;
    setActiveMemberIndex((prev) => (prev === 0 ? totalMembers - 1 : prev - 1));
  };

  const handleNextCard = () => {
    if (totalMembers <= 1) return;
    setActiveMemberIndex((prev) => (prev + 1) % totalMembers);
  };

  // Total portfolio websites across members
  const totalPortfolioCount = filteredMembers.reduce((acc, m) => {
    const collCount = m.portfolioCollection?.length || 0;
    return acc + (collCount > 0 ? collCount : m.portfolioUrl ? 1 : 0);
  }, 0);

  // Background peek cards for tactile 3D stack
  const peekIndex1 = totalMembers > 1 ? (safeIndex + 1) % totalMembers : null;
  const peekMember1 = peekIndex1 !== null ? filteredMembers[peekIndex1] : null;
  const peekPod1 = peekMember1 ? pods.find((p) => p.id === peekMember1.teamId) : null;

  const peekIndex2 = totalMembers > 2 ? (safeIndex + 2) % totalMembers : null;
  const peekMember2 = peekIndex2 !== null ? filteredMembers[peekIndex2] : null;
  const peekPod2 = peekMember2 ? pods.find((p) => p.id === peekMember2.teamId) : null;

  return (
    <section
      id="team"
      aria-labelledby="team-title"
      className="relative scroll-mt-16 bg-black py-16 sm:py-24 lg:py-28 text-white overflow-hidden"
    >
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <SectionHeader
            eyebrow="Specialized Pods & Personnel"
            title="Team & Portfolio Deck"
            titleId="team-title"
            intro="Tactile, interactive specialist card deck. Explore dedicated studio leads, full-stack architects, and creative directors with verified production builds, design systems, and published platforms."
          />

          {/* Portfolio Archive Badge */}
          <div className="inline-flex items-center gap-2.5 rounded-xl border border-shelf/80 bg-abyss-2 px-4 py-2.5 self-start md:self-auto shrink-0">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-tvl-amber/15 text-tvl-amber">
              <Icon name="library" className="h-3.5 w-3.5" />
            </span>
            <div className="font-mono text-xs">
              <span className="text-white font-bold">{totalPortfolioCount} Production Sites</span>
              <span className="text-gray-400 block text-[10px]">Archived & Active</span>
            </div>
          </div>
        </div>

        {/* Master Card Deck & Controls Stage */}
        {isHydrating && filteredMembers.length === 0 ? (
          <TeamDeckSkeleton />
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">
          {/* Left Controls & Specialist Roster Panel */}
          <div className="w-full lg:w-80 xl:w-96 shrink-0 space-y-4">
            <div className="rounded-2xl border border-shelf/80 bg-abyss-2 p-4 sm:p-5 shadow-lg">
              {/* Deck HUD Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-shelf/50">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-tvl-amber block">
                    SPECIALIST DECK • LEADER & TOP 3
                  </span>
                  <span className="font-monument text-sm font-bold uppercase text-white">
                    Card {String(safeIndex + 1).padStart(2, "0")} / {String(totalMembers).padStart(2, "0")}
                  </span>
                </div>
                {/* Deck Prev / Next controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevCard}
                    disabled={totalMembers <= 1}
                    aria-label="Previous specialist card"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#181818] hover:bg-tvl-amber hover:text-black text-gray-300 disabled:opacity-40 disabled:pointer-events-none border border-[#333333] transition-colors"
                  >
                    <Icon name="chevron-left" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextCard}
                    disabled={totalMembers <= 1}
                    aria-label="Next specialist card"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#181818] hover:bg-tvl-amber hover:text-black text-gray-300 disabled:opacity-40 disabled:pointer-events-none border border-[#333333] transition-colors"
                  >
                    <Icon name="chevron-right" className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Pod Filters */}
              <div className="space-y-1.5 mb-4">
                <span className="font-mono text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
                  Filter by Pod
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPodId("all");
                      setActiveMemberIndex(0);
                    }}
                    className={`rounded-md px-2.5 py-1 font-mono text-[11px] font-bold uppercase transition-all ${
                      selectedPodId === "all"
                        ? "bg-tvl-amber text-black"
                        : "bg-[#181818] text-gray-400 hover:text-white border border-[#2A2A2A]"
                    }`}
                  >
                    All ({assignedMembers.length})
                  </button>
                  {pods.map((pod) => {
                    const count = assignedMembers.filter((m) => m.teamId === pod.id).length;
                    const isSelected = selectedPodId === pod.id;
                    return (
                      <button
                        key={pod.id}
                        type="button"
                        onClick={() => {
                          setSelectedPodId(pod.id);
                          setActiveMemberIndex(0);
                        }}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[11px] font-bold uppercase transition-all ${
                          isSelected
                            ? "bg-tvl-amber text-black"
                            : "bg-[#181818] text-gray-400 hover:text-white border border-[#2A2A2A]"
                        }`}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: isSelected ? "#000000" : pod.color || "#FBD227" }}
                        />
                        <span>{pod.name.replace(" Pod", "")}</span>
                        <span className="opacity-70 text-[9px]">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Specialist Roster List */}
              <div className="space-y-1.5 pt-3 border-t border-shelf/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    Roster Quick Select (Leader + Top 3)
                  </span>
                  <span className="font-mono text-[10px] text-tvl-amber font-bold">
                    {totalMembers} / 4 in Deck
                  </span>
                </div>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {filteredMembers.length === 0 ? (
                    <div className="py-6 px-3 text-center border border-dashed border-[#262626] rounded-xl bg-[#121212]">
                      <p className="font-mono text-xs text-gray-500">
                        No specialists assigned to this pod yet.
                      </p>
                    </div>
                  ) : (
                    filteredMembers.map((m, idx) => {
                      const mPod = pods.find((p) => p.id === m.teamId);
                    const mColor = mPod?.color || "#FBD227";
                    const isActive = idx === safeIndex;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setActiveMemberIndex(idx)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all border ${
                          isActive
                            ? "bg-[#1C1C1C] border-tvl-amber text-white shadow-md ring-1 ring-tvl-amber/40"
                            : "bg-[#141414] border-shelf/60 text-gray-300 hover:bg-[#1A1A1A] hover:border-gray-500"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-monument text-xs font-bold text-white border overflow-hidden"
                            style={{
                              backgroundColor: "#161616",
                              borderColor: `${mColor}80`,
                            }}
                          >
                            {isImageUrl(m.avatar || m.avatarUrl) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={m.avatar || m.avatarUrl}
                                alt={m.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              m.avatar || m.name.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-monument text-xs font-bold uppercase truncate">
                                {m.name}
                              </span>
                              {m.isLeader && (
                                <span className="h-1.5 w-1.5 rounded-full bg-tvl-amber shrink-0" title="Pod Lead" />
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-gray-400 block truncate">
                              {m.roleTitle}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded tracking-wider uppercase shrink-0 ${
                            isActive
                              ? idx === 0
                                ? "bg-tvl-amber text-black font-extrabold shadow-sm"
                                : "bg-white text-black font-extrabold shadow-sm"
                              : idx === 0
                              ? "text-tvl-amber bg-tvl-amber/10 border border-tvl-amber/30"
                              : "text-gray-400 bg-[#181818] border border-[#2B2B2B]"
                          }`}
                        >
                          {idx === 0 ? "CARD LEADER" : `MEMBER 0${idx}`}
                        </span>
                      </button>
                    );
                  })
                )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Main Stage: Strictly Interactive Tactile 3D Card Deck */}
          <div className="w-full flex-1 min-w-0">
            <div className="relative pt-6 sm:pt-8 pr-3 sm:pr-6 md:pr-10">
              {currentMember ? (
                <>
                  {/* Background stacked cards (Tactile peeking card layers) */}
                  {totalMembers > 1 && (
                    <>
                      {/* Background card 2 (deepest peek) */}
                      {peekMember2 && peekIndex2 !== null && (
                        <div
                          onClick={() => setActiveMemberIndex(peekIndex2)}
                          title={`Click to draw ${peekMember2.name}'s card to front`}
                          className="absolute inset-0 rounded-2xl border border-shelf/70 bg-[#0E0E0E] transition-all duration-300 cursor-pointer hover:border-tvl-amber/70 shadow-xl overflow-hidden pointer-events-auto"
                          style={{
                            transform: "translate(24px, -18px) rotate(2.5deg) scale(0.95)",
                            zIndex: 1,
                            opacity: 0.45,
                          }}
                        >
                          <div className="h-1.5 w-full" style={{ backgroundColor: peekPod2?.color || "#FBD227" }} />
                          <div className="flex items-center justify-between p-3.5 font-mono text-xs text-gray-400">
                            <span className="font-monument font-bold uppercase text-white truncate max-w-[10rem]">
                              {peekMember2.name}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-tvl-amber bg-tvl-amber/10 px-2 py-0.5 rounded border border-tvl-amber/20">
                              DRAW {peekIndex2 === 0 ? "CARD LEADER" : `MEMBER 0${peekIndex2}`}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Background card 1 (middle peek) */}
                      {peekMember1 && peekIndex1 !== null && (
                        <div
                          onClick={() => setActiveMemberIndex(peekIndex1)}
                          title={`Click to draw ${peekMember1.name}'s card to front`}
                          className="absolute inset-0 rounded-2xl border border-shelf/80 bg-[#121212] transition-all duration-300 cursor-pointer hover:border-tvl-amber/80 shadow-2xl overflow-hidden pointer-events-auto"
                          style={{
                            transform: "translate(12px, -9px) rotate(1.2deg) scale(0.975)",
                            zIndex: 2,
                            opacity: 0.75,
                          }}
                        >
                          <div className="h-1.5 w-full" style={{ backgroundColor: peekPod1?.color || "#FBD227" }} />
                          <div className="flex items-center justify-between p-3.5 font-mono text-xs text-gray-400">
                            <div className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: peekPod1?.color || "#FBD227" }} />
                              <span className="font-monument font-bold uppercase text-white">
                                {peekMember1.name}
                              </span>
                              <span className="text-gray-500 text-[10px] hidden sm:inline">
                                {"// "}{peekMember1.roleTitle}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-tvl-amber bg-tvl-amber/10 px-2 py-0.5 rounded border border-tvl-amber/20">
                              DRAW {peekIndex1 === 0 ? "CARD LEADER" : `MEMBER 0${peekIndex1}`}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Active Foreground Front Card */}
                  <div className="relative z-10">
                    <TeamMemberCard
                      member={currentMember}
                      pod={pods.find((p) => p.id === currentMember.teamId)}
                      cardIndex={safeIndex}
                      totalCards={totalMembers}
                      isCardLeader={safeIndex === 0}
                      showDeckControls={totalMembers > 1}
                      onPrevCard={handlePrevCard}
                      onNextCard={handleNextCard}
                    />
                  </div>

                  {/* Deck interaction helper tip */}
                  {totalMembers > 1 && (
                    <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-gray-500 px-1">
                      <span className="flex items-center gap-1.5">
                        <Icon name="bolt" className="h-3 w-3 text-tvl-amber" />
                        <span>Tip: Click any peeking card behind, or click names in the roster list to flip through the deck.</span>
                      </span>
                      <span className="text-gray-400 font-bold hidden sm:inline">
                        {safeIndex === 0 ? "Card Leader" : `Member 0${safeIndex}`} ({safeIndex + 1} of {totalMembers} in deck)
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="relative rounded-2xl border border-shelf/80 bg-[#101010] p-8 sm:p-12 text-center overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-tvl-amber/40" />
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#181818] border border-[#282828] text-tvl-amber mb-4">
                    <Icon name="bolt" className="h-6 w-6" />
                  </div>
                  <h4 className="font-monument text-sm sm:text-base font-bold uppercase text-white mb-2">
                    Specialist Pods Active & Ready
                  </h4>
                  <p className="font-sans text-xs text-gray-400 max-w-md mx-auto leading-relaxed mb-4">
                    Our pods are structured around specialized brand identity, edge architecture, and rapid strategy sprints. Specialist portfolio cards appear here as staff are assigned to active delivery pods.
                  </p>
                  <span className="inline-flex items-center gap-2 font-mono text-[11px] text-tvl-amber bg-tvl-amber/10 border border-tvl-amber/20 px-3 py-1 rounded-full uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-tvl-amber animate-pulse" />
                    Delivery Pods Ready
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

      {/* Slant Divider transitioning seamlessly into the Products section (bg-tvl-amber) */}
      <SlantDivider toTone="amber" />
    </section>
  );
};
