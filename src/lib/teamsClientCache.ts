"use client";

import type { TeamPod, TeamMemberUser } from "@/db";

const CACHE_KEY = "tvl_teams_cache_v2";

export interface CachedTeamsPayload {
  teams: TeamPod[];
  members: TeamMemberUser[];
  timestamp: number;
}

let inFlightPreload: Promise<CachedTeamsPayload | null> | null = null;
let memoryCache: CachedTeamsPayload | null = null;

function isImageUrl(url?: string | null): boolean {
  if (!url) return false;
  const s = url.trim();
  return (
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("data:image/") ||
    s.startsWith("/") ||
    s.startsWith("blob:")
  );
}

/**
 * Preloads every member avatar image and portfolio preview screenshot
 * into the browser cache so they decode before the user scrolls to view them.
 */
export function preloadMemberImages(members: TeamMemberUser[]): void {
  if (typeof window === "undefined") return;

  for (const m of members) {
    const avatar = m.avatar || m.avatarUrl;
    if (isImageUrl(avatar)) {
      const img = new Image();
      img.src = avatar!;
    }

    if (Array.isArray(m.portfolioCollection)) {
      for (const card of m.portfolioCollection) {
        if (card.previewImage && isImageUrl(card.previewImage)) {
          const cardImg = new Image();
          cardImg.src = card.previewImage;
        }
      }
    }
  }
}

/**
 * Synchronous read from memory or localStorage.
 * Enables 0ms Frame-1 render without waiting for React useEffect or network fetches!
 */
export function getCachedTeamsData(): CachedTeamsPayload | null {
  if (memoryCache) return memoryCache;
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedTeamsPayload;
    if (Array.isArray(parsed?.teams) && Array.isArray(parsed?.members)) {
      memoryCache = parsed;
      return parsed;
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
}

/**
 * Synchronously writes teams and members to memory & localStorage,
 * preloads images, and broadcasts to all active components.
 */
export function setCachedTeamsData(teams: TeamPod[], members: TeamMemberUser[]): void {
  const payload: CachedTeamsPayload = {
    teams,
    members,
    timestamp: Date.now(),
  };

  memoryCache = payload;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
      // Storage quota safety
    }

    // Trigger instant background asset preloading
    preloadMemberImages(members);

    // Broadcast update across components & tabs
    window.dispatchEvent(
      new CustomEvent<CachedTeamsPayload>("tvl_teams_updated", { detail: payload })
    );
  }
}

/**
 * Module-level eager preloader.
 * Kicks off immediately when the page loads, while the user is still reading the top Hero.
 */
export function preloadTeamsData(): Promise<CachedTeamsPayload | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (inFlightPreload) return inFlightPreload;

  inFlightPreload = (async () => {
    try {
      const res = await fetch("/api/teams", {
        cache: "no-store",
        priority: "high",
      } as RequestInit & { priority?: string });

      if (!res.ok) return null;
      const data = await res.json();

      if (data?.ok && Array.isArray(data.teams) && Array.isArray(data.members)) {
        const payload: CachedTeamsPayload = {
          teams: data.teams as TeamPod[],
          members: data.members as TeamMemberUser[],
          timestamp: Date.now(),
        };

        setCachedTeamsData(payload.teams, payload.members);
        return payload;
      }
    } catch (err) {
      console.warn("Eager preloadTeamsData warning:", err);
    }
    return null;
  })();

  return inFlightPreload;
}

/**
 * Subscribes to live team cache updates (e.g., when saving in MyProfileCardView or UsersRolesView).
 */
export function subscribeTeamsCache(
  callback: (data: CachedTeamsPayload) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<CachedTeamsPayload>;
    if (custom.detail) callback(custom.detail);
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === CACHE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue) as CachedTeamsPayload;
        if (parsed?.teams && parsed?.members) {
          memoryCache = parsed;
          callback(parsed);
        }
      } catch {
        // Ignore
      }
    }
  };

  window.addEventListener("tvl_teams_updated", handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener("tvl_teams_updated", handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}

// Automatically trigger eager preload on client module initialization!
if (typeof window !== "undefined") {
  setTimeout(() => {
    void preloadTeamsData();
  }, 0);
}
