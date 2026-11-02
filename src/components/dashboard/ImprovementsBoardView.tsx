"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import type { ImprovementItem } from "@/db";
import { Modal, fieldClass, labelClass, btnPrimary, btnGhost, fieldCompact } from "./ui";

interface ImprovementsBoardViewProps {
  role?: "admin" | "team";
  activeMember?: string;
}

type WorkshopBucketKey = "free-samples" | "starter-packs" | "social-hooks" | "operations";

interface WorkshopBucketMeta {
  key: WorkshopBucketKey;
  icon: string;
  badge: string;
  title: string;
  subtitle: string;
  prompt: string;
  starterExamples: string[];
  accentColor: string;
  borderColor: string;
  bgLight: string;
}

const WORKSHOP_BUCKETS: WorkshopBucketMeta[] = [
  {
    key: "free-samples",
    icon: "🎁",
    badge: "Bucket 01 // Front Door",
    title: "Free Samples & Diagnostic Tools",
    subtitle: "High-value interactive lead magnets that prove our skills in under 60 seconds.",
    prompt: "What 60-second test, scorecard, or free tool would make a visitor immediately trade their email to see their score?",
    starterExamples: [
      "Website Conversion Diagnostic Scorecard (Grade A-F)",
      "Brand Identity & Clarity Quiz for Founders",
      "Instant 2026 UI/UX Checklist & Score Report",
      "Interactive ROI Calculator: In-House vs Studio Partner",
    ],
    accentColor: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    bgLight: "bg-emerald-500/10",
  },
  {
    key: "starter-packs",
    icon: "⚡",
    badge: "Bucket 02 // Stepping Stone",
    title: "Starter Packs & Stepping Stones",
    subtitle: "Low-friction $1,000–$2,000 productized entry offers that build instant trust.",
    prompt: "What tight, scoped deliverable can we complete in 5 days that recovers our ad costs and makes upgrading a no-brainer?",
    starterExamples: [
      "$1,250 5-Day Landing Page Redesign Sprint",
      "$950 Mobile Experience & Speed Teardown",
      "Brand Identity Starter Kit (Logo + Tokens + Fonts)",
      "High-Converting Sales Funnel Blueprint & Wireframe",
    ],
    accentColor: "text-amber-400",
    borderColor: "border-amber-500/30",
    bgLight: "bg-amber-500/10",
  },
  {
    key: "social-hooks",
    icon: "🎣",
    badge: "Bucket 03 // Distribution",
    title: "Social Hooks & Bio Bridges",
    subtitle: "Content strategies and bio links that guide social attention straight into our vault.",
    prompt: "How can we turn casual views on LinkedIn, Twitter/X, or Instagram into clicks that land on our free tools?",
    starterExamples: [
      "Profile Bio CTA: 'Is your website leaking 95% of guests? Take our 60s quiz'",
      "5-Slide Carousel breakdowns showing client before/after website revamps",
      "Weekly 'Teardown Tuesday' video clips critiquing broken landing pages",
      "Free Figma Template giveaway with email opt-in link",
    ],
    accentColor: "text-blue-400",
    borderColor: "border-blue-500/30",
    bgLight: "bg-blue-500/10",
  },
  {
    key: "operations",
    icon: "⚙️",
    badge: "Bucket 04 // Engine",
    title: "How We Run It (Tech & Operations)",
    subtitle: "Automations, database storage in Neon, Slack alerts, and weekly team review rituals.",
    prompt: "What automations or processes will ensure zero leads slip through the cracks?",
    starterExamples: [
      "Neon DB automated lead capture for every quiz completion",
      "Instant Slack notification with score breakdown when a lead enters",
      "Stripe payment link onboarding for 1-click starter package booking",
      "Weekly 15-minute Monday standup to review live quiz completions & upgrades",
    ],
    accentColor: "text-purple-400",
    borderColor: "border-purple-500/30",
    bgLight: "bg-purple-500/10",
  },
];

export function ImprovementsBoardView({
  role = "admin",
  activeMember = "Specialist",
}: ImprovementsBoardViewProps) {
  const [items, setItems] = useState<ImprovementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sub-tab Navigation: Discussion Board vs Digital Home Workshop Canvas
  const [activeSubTab, setActiveSubTab] = useState<"discussion" | "workshop">("discussion");

  // Filters for Discussion Board
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create Modal State (for active discussion board)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ImprovementItem["category"]>("Something to Add");
  const [priority, setPriority] = useState<ImprovementItem["priority"]>("Medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Discussion Thread State (shared across views)
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  // Workshop Canvas Inline Idea Form State
  const [activeBucketForm, setActiveBucketForm] = useState<WorkshopBucketKey | null>(null);
  const [workshopTitle, setWorkshopTitle] = useState("");
  const [workshopDesc, setWorkshopDesc] = useState("");
  const [workshopPriority, setWorkshopPriority] = useState<ImprovementItem["priority"]>("High");
  const [workshopSubmitting, setWorkshopSubmitting] = useState(false);
  const [workshopSuccess, setWorkshopSuccess] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/improvements", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data?.ok) {
        setItems(data.data || []);
      } else {
        setError(data?.error || "Failed to load board items.");
      }
    } catch {
      setError("Network error loading bulletin board.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setIsSubmitting(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/improvements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.ok) {
        setItems((prev) => [data.data, ...prev]);
        setIsCreateOpen(false);
        setTitle("");
        setDescription("");
        setCategory("Something to Add");
        setPriority("Medium");
      } else {
        setCreateError(data?.error || "Could not post suggestion.");
      }
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWorkshopSubmit = async (bucketKey: WorkshopBucketKey) => {
    if (!workshopTitle.trim() || !workshopDesc.trim()) return;
    setWorkshopSubmitting(true);

    try {
      const res = await fetch("/api/improvements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: workshopTitle.trim(),
          description: workshopDesc.trim(),
          category: "Digital Home Idea",
          bucket: bucketKey,
          priority: workshopPriority,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.ok) {
        setItems((prev) => [data.data, ...prev]);
        setWorkshopTitle("");
        setWorkshopDesc("");
        setWorkshopPriority("High");
        setActiveBucketForm(null);
        setWorkshopSuccess(`Saved "${data.data.title}" permanently to database & bulletin board!`);
        setTimeout(() => setWorkshopSuccess(null), 4000);
      } else {
        alert(data?.error || "Could not save workshop idea.");
      }
    } catch {
      alert("Network error saving workshop idea.");
    } finally {
      setWorkshopSubmitting(false);
    }
  };

  const handleToggleUpvote = async (itemId: string) => {
    // Optimistic UI update
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const hasVoted = item.upvotedBy.includes(activeMember);
        return {
          ...item,
          upvotedBy: hasVoted
            ? item.upvotedBy.filter((n) => n !== activeMember)
            : [...item.upvotedBy, activeMember],
        };
      })
    );

    try {
      const res = await fetch("/api/improvements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, action: "toggle_upvote" }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        setItems((prev) => prev.map((item) => (item.id === itemId ? data.data : item)));
      }
    } catch {
      void fetchItems();
    }
  };

  const handleUpdateStatus = async (itemId: string, newStatus: ImprovementItem["status"]) => {
    // Optimistic UI update
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status: newStatus } : item))
    );

    try {
      const res = await fetch("/api/improvements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: itemId,
          action: "update_status",
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        setItems((prev) => prev.map((item) => (item.id === itemId ? data.data : item)));
      }
    } catch {
      void fetchItems();
    }
  };

  const handleAddComment = async (itemId: string) => {
    if (!replyMessage.trim()) return;
    setReplySubmitting(true);

    try {
      const res = await fetch("/api/improvements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: itemId,
          action: "add_comment",
          message: replyMessage.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        setItems((prev) => prev.map((item) => (item.id === itemId ? data.data : item)));
        setReplyMessage("");
      }
    } catch {
      // Ignore
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm("Are you sure you want to remove this proposal?")) return;
    setItems((prev) => prev.filter((item) => item.id !== itemId));

    try {
      await fetch(`/api/improvements?id=${encodeURIComponent(itemId)}`, {
        method: "DELETE",
      });
    } catch {
      void fetchItems();
    }
  };

  // Helper to retrieve ideas matching a workshop bucket
  const getBucketItems = (bucketKey: WorkshopBucketKey) => {
    return items.filter((item) => {
      if (item.bucket === bucketKey) return true;
      // Fallback matching
      const t = `${item.title} ${item.description}`.toLowerCase();
      if (bucketKey === "free-samples" && (t.includes("free sample") || t.includes("quiz") || t.includes("scorecard") || t.includes("calculator") || t.includes("checklist"))) return true;
      if (bucketKey === "starter-packs" && (t.includes("starter") || t.includes("stepping stone") || t.includes("1,250") || t.includes("sprint") || t.includes("pack"))) return true;
      if (bucketKey === "social-hooks" && (t.includes("social") || t.includes("hook") || t.includes("bio") || t.includes("carousel") || t.includes("linkedin") || t.includes("post"))) return true;
      if (bucketKey === "operations" && (t.includes("neon") || t.includes("slack") || t.includes("stripe") || t.includes("vault") || t.includes("operation") || t.includes("ritual"))) return true;
      return false;
    });
  };

  // Filter items for Tab 1
  const filteredItems = items.filter((item) => {
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    return true;
  });

  const countAdd = items.filter((i) => i.category === "Something to Add").length;
  const countFix = items.filter((i) => i.category === "Something to Fix").length;
  const countShipped = items.filter((i) => i.status === "Shipped / Fixed").length;
  const countWorkshop = items.filter((i) => i.category === "Digital Home Idea" || i.bucket).length;

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* 1. TOP HEADER & PRIMARY TITLE */}
      {/* ============================================================== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#262626] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[#FBD227]/20 text-[#FBD227]">
              <Icon name="bolt" className="h-3 w-3" />
            </span>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FBD227]">
              Studio Innovation & Workshop Floor
            </span>
          </div>
          <h2 className="font-monument text-lg sm:text-2xl font-bold uppercase text-white tracking-wide">
            Team Bulletin Board
          </h2>
          <p className="font-sans text-xs text-gray-400 mt-0.5 max-w-2xl leading-relaxed">
            Open collaborative floor where team members propose features, brainstorm on the Digital Home workshop canvas, and track shipped ideas.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href="/digital-home-presentation.html"
            target="_blank"
            rel="noopener noreferrer"
            title="Open the 10-slide interactive presentation deck in a new tab"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#383838] bg-[#161616] hover:bg-[#202020] text-gray-200 hover:text-[#FBD227] font-mono text-xs font-bold transition-all shadow-md group"
          >
            <span>🏛️ Open Slide Deck</span>
            <Icon name="external" className="h-3.5 w-3.5 text-gray-400 group-hover:text-[#FBD227]" />
          </a>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className={`${btnPrimary} flex items-center gap-1.5 font-monument text-xs font-bold uppercase px-4 py-2.5 shadow-lg shrink-0`}
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            <span>+ Post Proposal</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. SUB-TAB SWITCHER */}
      {/* ============================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111111] p-1.5 rounded-xl border border-[#222222]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("discussion")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all ${
              activeSubTab === "discussion"
                ? "bg-[#FBD227] text-black shadow-md"
                : "bg-transparent text-gray-400 hover:text-white"
            }`}
          >
            <span>📋 Active Discussion & Ideas</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                activeSubTab === "discussion" ? "bg-black/20 text-black font-extrabold" : "bg-[#202020] text-gray-400"
              }`}
            >
              {items.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("workshop")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all ${
              activeSubTab === "workshop"
                ? "bg-[#FBD227] text-black shadow-md"
                : "bg-transparent text-gray-400 hover:text-white"
            }`}
          >
            <span>🏛️ Digital Home Workshop Canvas</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                activeSubTab === "workshop"
                  ? "bg-black/20 text-black"
                  : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
              }`}
            >
              Interactive Blueprint
            </span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-gray-500 pr-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Permanently synced with Neon Database</span>
        </div>
      </div>

      {/* Global Success Notification */}
      {workshopSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{workshopSuccess}</span>
          </div>
          <button
            onClick={() => setWorkshopSuccess(null)}
            className="text-emerald-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW A: ACTIVE DISCUSSION & IDEAS (Tab 1) */}
      {/* ============================================================== */}
      {activeSubTab === "discussion" && (
        <div className="space-y-6">
          {/* Stats Counter Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl bg-[#141414] border border-[#242424]">
              <span className="font-mono text-[10px] text-gray-500 uppercase block font-bold">Total Suggestions</span>
              <span className="font-monument text-lg font-bold text-white">{items.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#141414] border border-[#242424]">
              <span className="font-mono text-[10px] text-emerald-400 uppercase block font-bold">Something to Add</span>
              <span className="font-monument text-lg font-bold text-emerald-400">{countAdd}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#141414] border border-[#242424]">
              <span className="font-mono text-[10px] text-rose-400 uppercase block font-bold">Something to Fix</span>
              <span className="font-monument text-lg font-bold text-rose-400">{countFix}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#141414] border border-[#242424]">
              <span className="font-mono text-[10px] text-purple-400 uppercase block font-bold">Digital Home Ideas</span>
              <span className="font-monument text-lg font-bold text-purple-400">{countWorkshop}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#141414] border border-[#242424]">
              <span className="font-mono text-[10px] text-[#FBD227] uppercase block font-bold">Shipped / Fixed</span>
              <span className="font-monument text-lg font-bold text-[#FBD227]">{countShipped}</span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase font-bold text-gray-500 mr-1">Type:</span>
              {[
                { id: "all", label: "All Items" },
                { id: "Something to Add", label: "Something to Add" },
                { id: "Something to Fix", label: "Something to Fix" },
                { id: "Workflow / Process", label: "Workflow / Process" },
                { id: "Digital Home Idea", label: "🏛️ Digital Home Ideas" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`px-3 py-1 rounded-lg font-mono text-xs font-bold transition-all ${
                    categoryFilter === tab.id
                      ? "bg-[#FBD227] text-black shadow-sm"
                      : "bg-[#161616] text-gray-400 hover:text-white border border-[#262626]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase font-bold text-gray-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`${fieldCompact} text-xs`}
              >
                <option value="all">All Statuses</option>
                <option value="Suggested">Suggested</option>
                <option value="Under Review">Under Review</option>
                <option value="In Progress">In Progress</option>
                <option value="Shipped / Fixed">Shipped / Fixed</option>
              </select>
            </div>
          </div>

          {/* Main Cards Feed */}
          {loading ? (
            <div className="py-12 text-center font-mono text-xs text-gray-500 bg-[#121212] rounded-xl border border-[#242424]">
              <span className="h-2 w-2 rounded-full bg-[#FBD227] animate-ping inline-block mr-2" />
              Loading Team Bulletin Board...
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs">
              {error}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-14 text-center bg-[#121212] rounded-xl border border-dashed border-[#262626] p-6">
              <Icon name="bolt" className="h-8 w-8 text-gray-600 mx-auto mb-2.5" />
              <h4 className="font-monument text-sm font-bold uppercase text-white mb-1">
                No proposals in this view
              </h4>
              <p className="font-sans text-xs text-gray-400 max-w-sm mx-auto mb-4 leading-relaxed">
                Have an idea for a feature to add, a friction to fix, or a Digital Home tool to build? Share it with the studio!
              </p>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className={`${btnPrimary} font-mono text-xs font-bold uppercase px-3.5 py-1.5`}
              >
                + Post to Bulletin Board
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => {
                const hasUpvoted = item.upvotedBy.includes(activeMember);
                const isAuthor = item.authorName.toLowerCase() === activeMember.toLowerCase();
                const canDelete = role === "admin" || isAuthor;
                const isThreadOpen = expandedThreadId === item.id;

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[#242424] bg-[#141414] p-4 sm:p-5 flex flex-col justify-between hover:border-[#383838] transition-all shadow-md group"
                  >
                    <div>
                      {/* Card Header: Category & Priority Pills */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span
                          className={`font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            item.category === "Digital Home Idea"
                              ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                              : item.category === "Something to Add"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : item.category === "Something to Fix"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : "bg-[#FBD227]/10 text-[#FBD227] border-[#FBD227]/30"
                          }`}
                        >
                          {item.category === "Digital Home Idea" ? "🏛️ Digital Home Idea" : item.category}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                              item.priority === "Critical"
                                ? "bg-rose-500 text-black border-rose-500 font-extrabold"
                                : item.priority === "High"
                                ? "bg-amber-500/15 text-[#FBD227] border-amber-500/30"
                                : "bg-white/5 text-gray-400 border-[#262626]"
                            }`}
                          >
                            {item.priority}
                          </span>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="h-6 w-6 rounded hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 flex items-center justify-center transition-colors"
                              title="Delete item"
                            >
                              <Icon name="trash" className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 className="font-monument text-sm font-bold uppercase text-white tracking-wide mb-1.5">
                        {item.title}
                      </h3>
                      <p className="font-sans text-xs text-gray-300 leading-relaxed whitespace-pre-wrap mb-3.5">
                        {item.description}
                      </p>
                    </div>

                    <div>
                      {/* Author & Timestamp Row */}
                      <div className="pt-2.5 border-t border-[#222222] flex items-center justify-between text-xs font-mono text-gray-400 mb-3">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#202020] border border-[#333333] text-[9px] font-bold text-white">
                            {item.authorName.charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate text-white font-medium">{item.authorName}</span>
                          <span className="text-gray-500 text-[10px] hidden sm:inline">
                            • {item.authorRole}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-500 shrink-0">
                          {new Date(item.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Action Bar: Upvote, Status Selector, and Discussion Toggle */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#202020]">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleUpvote(item.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs font-bold border transition-all ${
                              hasUpvoted
                                ? "bg-[#FBD227] text-black border-[#FBD227] shadow-sm"
                                : "bg-[#181818] text-gray-300 hover:text-white border-[#2E2E2E] hover:border-gray-500"
                            }`}
                            title={hasUpvoted ? "Remove upvote" : "Upvote this suggestion"}
                          >
                            <span className="text-xs">▲</span>
                            <span>{item.upvotedBy.length}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedThreadId(isThreadOpen ? null : item.id)
                            }
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#181818] hover:bg-[#222222] text-gray-400 hover:text-[#FBD227] font-mono text-xs border border-[#2E2E2E] transition-colors"
                          >
                            <Icon name="chat" className="h-3 w-3" />
                            <span>{item.comments.length}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-gray-500 uppercase font-bold">
                            Stage:
                          </span>
                          <select
                            value={item.status}
                            onChange={(e) =>
                              handleUpdateStatus(
                                item.id,
                                e.target.value as ImprovementItem["status"]
                              )
                            }
                            className={`${fieldCompact} text-[11px] font-bold ${
                              item.status === "Shipped / Fixed"
                                ? "text-[#FBD227] border-[#FBD227]/40"
                                : item.status === "In Progress"
                                ? "text-blue-400 border-blue-500/40"
                                : "text-gray-300"
                            }`}
                          >
                            <option value="Suggested">Suggested</option>
                            <option value="Under Review">Under Review</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Shipped / Fixed">Shipped / Fixed</option>
                          </select>
                        </div>
                      </div>

                      {/* Expandable Discussion & Updates Thread */}
                      {isThreadOpen && (
                        <div className="mt-3 pt-3 border-t border-[#222222] space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-monument text-[10px] font-bold uppercase text-gray-400">
                              Discussion & Updates ({item.comments.length})
                            </span>
                          </div>

                          {item.comments.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {item.comments.map((c) => (
                                <div
                                  key={c.id}
                                  className="p-2.5 rounded-lg bg-[#181818] border border-[#262626] text-xs"
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1 font-mono text-[10px]">
                                    <span className="font-bold text-white">{c.authorName}</span>
                                    <span className="text-gray-500">
                                      {new Date(c.createdAt).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                  <p className="font-sans text-gray-300 leading-relaxed">
                                    {c.message}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] font-mono text-gray-500 italic">
                              No replies yet. Be the first to add context.
                            </p>
                          )}

                          <div className="flex gap-1.5 pt-1">
                            <input
                              type="text"
                              value={replyMessage}
                              onChange={(e) => setReplyMessage(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  void handleAddComment(item.id);
                                }
                              }}
                              placeholder="Write a note, feedback, or update..."
                              className={`${fieldClass} text-xs py-1.5`}
                            />
                            <button
                              type="button"
                              onClick={() => handleAddComment(item.id)}
                              disabled={replySubmitting || !replyMessage.trim()}
                              className={`${btnPrimary} px-3 text-xs font-mono font-bold shrink-0 disabled:opacity-50`}
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW B: DIGITAL HOME WORKSHOP CANVAS (Tab 2) */}
      {/* ============================================================== */}
      {activeSubTab === "workshop" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Canvas Strategic Header Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-virtus-yellow/30 bg-gradient-to-br from-[#181818] via-[#121212] to-[#0D0D0D] p-6 sm:p-8 shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FBD227]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FBD227]/10 border border-[#FBD227]/30 text-[#FBD227] font-mono text-xs font-bold uppercase tracking-wider">
                  <span>🏛️ Studio Blueprint & Interactive Canvas</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="/digital-home-presentation.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#FBD227] text-black font-mono text-xs font-extrabold uppercase hover:bg-yellow-400 transition-colors shadow-md"
                  >
                    <span>🚀 Launch 10-Slide Deck</span>
                    <Icon name="external" className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              <div>
                <h2 className="font-monument text-xl sm:text-3xl font-extrabold uppercase text-white tracking-wide">
                  The Virtus Digital Home Workshop Canvas
                </h2>
                <p className="font-sans text-xs sm:text-sm text-gray-300 mt-2 max-w-3xl leading-relaxed">
                  How we turn <span className="text-white font-semibold">virtuslabs.com</span> from a static brochure website that repels 95% of guests into a welcoming, revenue-generating <span className="text-[#FBD227] font-semibold">Digital Home</span>: giving free samples at the front door, offering low-friction starter kits on the counter, and permanently saving every lead into our private database vault.
                </p>
              </div>

              {/* 4 Key Business Metrics Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                  <span className="font-mono text-[10px] text-gray-400 uppercase block">Bounce Rate</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xs line-through text-rose-400 font-mono">95%</span>
                    <span className="font-monument text-sm font-bold text-emerald-400">&lt;40%</span>
                  </div>
                  <span className="font-sans text-[10px] text-gray-500">Brochure vs Digital Home</span>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                  <span className="font-mono text-[10px] text-gray-400 uppercase block">Lead Capture</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xs line-through text-rose-400 font-mono">1.5%</span>
                    <span className="font-monument text-sm font-bold text-emerald-400">12.5%+</span>
                  </div>
                  <span className="font-sans text-[10px] text-gray-500">Free samples at the door</span>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                  <span className="font-mono text-[10px] text-gray-400 uppercase block">Payback Velocity</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xs line-through text-rose-400 font-mono">90 Days</span>
                    <span className="font-monument text-sm font-bold text-[#FBD227]">&lt;21 Days</span>
                  </div>
                  <span className="font-sans text-[10px] text-gray-500">$1,250 Starter Kit model</span>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                  <span className="font-mono text-[10px] text-gray-400 uppercase block">Customer Vault</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xs line-through text-rose-400 font-mono">0 Leads</span>
                    <span className="font-monument text-sm font-bold text-purple-400">Owned CRM</span>
                  </div>
                  <span className="font-sans text-[10px] text-gray-500">Protected from ad algorithms</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 1: WHERE WE ARE RIGHT NOW */}
          {/* ========================================================== */}
          <div className="rounded-2xl border border-[#262626] bg-[#111111] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-mono text-[11px] font-bold uppercase">
                Step 01 // Current State Diagnosis
              </span>
              <h3 className="font-monument text-base font-bold uppercase text-white">
                Where We Are Right Now (The Brochure Trap)
              </h3>
            </div>
            <p className="font-sans text-xs text-gray-400 leading-relaxed max-w-3xl">
              Traditional corporate brochure websites are failing in 2026. Visitors arrive, see vague marketing copy, get intimidated by a high-friction &ldquo;Book a Call&rdquo; button, and leave forever.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="rounded-xl border border-rose-500/30 bg-[#161616] p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-rose-400 font-bold mb-2">
                    <span>🚪 Only One Locked Door</span>
                    <span>01</span>
                  </div>
                  <h4 className="font-monument text-xs font-bold uppercase text-white mb-1.5">
                    &ldquo;Book a 30-Min Call&rdquo; Friction
                  </h4>
                  <p className="font-sans text-xs text-gray-300 leading-relaxed">
                    95 out of 100 visitors are just looking around. Demanding a high-pressure sales call before providing any value repels potential clients before we can prove our capability.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-[#262626] flex items-center justify-between text-[11px] font-mono text-gray-400">
                  <span>Visitors Leaving:</span>
                  <span className="text-rose-400 font-bold">95 out of 100</span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-[#161616] p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-amber-400 font-bold mb-2">
                    <span>🏝️ Rented Land Trap</span>
                    <span>02</span>
                  </div>
                  <h4 className="font-monument text-xs font-bold uppercase text-white mb-1.5">
                    Lost in Social Media Silos
                  </h4>
                  <p className="font-sans text-xs text-gray-300 leading-relaxed">
                    Social networks algorithmically punish external links. When users click bio links, 88% bounce in under 5 seconds with zero permanent email or contact record retained.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-[#262626] flex items-center justify-between text-[11px] font-mono text-gray-400">
                  <span>Direct Retention:</span>
                  <span className="text-amber-400 font-bold">0 Contacts Saved</span>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-700 bg-[#161616] p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-gray-400 font-bold mb-2">
                    <span>💸 Sunk Cost Center</span>
                    <span>03</span>
                  </div>
                  <h4 className="font-monument text-xs font-bold uppercase text-white mb-1.5">
                    100% Cost for 5% Yield
                  </h4>
                  <p className="font-sans text-xs text-gray-300 leading-relaxed">
                    Brochure sites are passive digital flyers. When 95% bounce, we pay full price for advertising and design but throw 95% of the attention directly in the trash.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-[#262626] flex items-center justify-between text-[11px] font-mono text-gray-400">
                  <span>Economic Model:</span>
                  <span className="text-zinc-300 font-bold">Cost Center (Negative ROI)</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 2: WHERE WE END UP IF WE CHANGE NOTHING */}
          {/* ========================================================== */}
          <div className="rounded-2xl border border-[#262626] bg-[#111111] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-[11px] font-bold uppercase">
                Step 02 // The Risk Horizon
              </span>
              <h3 className="font-monument text-base font-bold uppercase text-white">
                Where We End Up If We Change Nothing
              </h3>
            </div>
            <p className="font-sans text-xs text-gray-400 leading-relaxed max-w-3xl">
              The 2026 web landscape is separating businesses into two camps: brochure sites that bleed out traffic, and Digital Homes with owned software tools and customer vaults.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="rounded-xl border border-[#262626] bg-[#161616] p-4">
                <div className="text-xs font-mono text-purple-400 font-bold mb-1">🤖 AI Search Takes All Clicks</div>
                <h4 className="font-monument text-xs font-bold uppercase text-white mb-1.5">
                  ChatGPT & Google AI Bypass Us
                </h4>
                <p className="font-sans text-xs text-gray-300 leading-relaxed">
                  AI answer engines give searchers direct summaries. They skip vague brochure websites and only cite platforms with structured schemas, interactive calculators, and original diagnostic tools.
                </p>
                <span className="mt-3 inline-block font-mono text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                  Search clicks dropping 20%+ YoY
                </span>
              </div>

              <div className="rounded-xl border border-[#262626] bg-[#161616] p-4">
                <div className="text-xs font-mono text-rose-400 font-bold mb-1">📈 Costly Ads & CAC Inflation</div>
                <h4 className="font-monument text-xs font-bold uppercase text-white mb-1.5">
                  Paying Again and Again for Attention
                </h4>
                <p className="font-sans text-xs text-gray-300 leading-relaxed">
                  Without an owned customer list, we have to pay Meta, Google, and LinkedIn repeatedly to re-acquire the exact same prospects. Ad prices rise 15–25% every year.
                </p>
                <span className="mt-3 inline-block font-mono text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                  Customer acquisition cost unsustainable
                </span>
              </div>

              <div className="rounded-xl border border-[#262626] bg-[#161616] p-4">
                <div className="text-xs font-mono text-gray-400 font-bold mb-1">📉 Zero Enterprise Value</div>
                <h4 className="font-monument text-xs font-bold uppercase text-white mb-1.5">
                  Fragile Agency Multiples
                </h4>
                <p className="font-sans text-xs text-gray-300 leading-relaxed">
                  An agency without an owned proprietary audience or software assets is valued at only 1x revenue. A studio with an active customer vault and self-funding productized funnel trades at 3–5x.
                </p>
                <span className="mt-3 inline-block font-mono text-[10px] text-gray-300 bg-white/5 px-2 py-0.5 rounded">
                  Vulnerable to algorithm changes
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 3: WHERE WE WANT TO GO */}
          {/* ========================================================== */}
          <div className="rounded-2xl border border-virtus-yellow/30 bg-[#111111] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#FBD227]/15 border border-[#FBD227]/30 text-[#FBD227] font-mono text-[11px] font-bold uppercase">
                Step 03 // Target State
              </span>
              <h3 className="font-monument text-base font-bold uppercase text-white">
                Where We Want To Go (The Virtus Digital Home)
              </h3>
            </div>
            <p className="font-sans text-xs text-gray-400 leading-relaxed max-w-3xl">
              Like a welcoming brick-and-mortar storefront: helpful free samples at the door, an affordable starter kit on the counter, and custom high-ticket builds in the back room for qualified buyers.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div className="rounded-xl border border-emerald-500/30 bg-[#161616] p-4 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-mono font-bold text-emerald-400 mb-1">Level 01 // Front Porch</div>
                  <h4 className="font-monument text-xs font-bold uppercase text-white mb-1">Free Samples</h4>
                  <p className="font-sans text-xs text-gray-300 leading-relaxed mb-3">
                    60-second diagnostic quizzes, website scorecards, and audit calculators. Zero sales pressure.
                  </p>
                </div>
                <div className="pt-2 border-t border-[#262626] font-mono text-[11px] text-emerald-400 font-bold">
                  Conversion: 12%+
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-[#161616] p-4 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-mono font-bold text-amber-400 mb-1">Level 02 // Stepping Stone</div>
                  <h4 className="font-monument text-xs font-bold uppercase text-white mb-1">$1,250 Starter Kit</h4>
                  <p className="font-sans text-xs text-gray-300 leading-relaxed mb-3">
                    5-day landing page sprint or brand refresh. Recovers acquisition cost within 21 days.
                  </p>
                </div>
                <div className="pt-2 border-t border-[#262626] font-mono text-[11px] text-amber-400 font-bold">
                  21-Day ROI Payback
                </div>
              </div>

              <div className="rounded-xl border border-blue-500/30 bg-[#161616] p-4 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-mono font-bold text-blue-400 mb-1">Level 03 // Master Suite</div>
                  <h4 className="font-monument text-xs font-bold uppercase text-white mb-1">$15k–$50k Builds</h4>
                  <p className="font-sans text-xs text-gray-300 leading-relaxed mb-3">
                    Bespoke web platforms, design systems, and apps for clients who already trust our execution.
                  </p>
                </div>
                <div className="pt-2 border-t border-[#262626] font-mono text-[11px] text-blue-400 font-bold">
                  High-Ticket Custom Deals
                </div>
              </div>

              <div className="rounded-xl border border-purple-500/30 bg-[#161616] p-4 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-mono font-bold text-purple-400 mb-1">Level 04 // Owned Vault</div>
                  <h4 className="font-monument text-xs font-bold uppercase text-white mb-1">Owned Database & MRR</h4>
                  <p className="font-sans text-xs text-gray-300 leading-relaxed mb-3">
                    Every lead stored in Neon DB, automated email nurturing, and recurring monthly retainers ($2k–$6k/mo).
                  </p>
                </div>
                <div className="pt-2 border-t border-[#262626] font-mono text-[11px] text-purple-400 font-bold">
                  Compounding Studio Equity
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 4: HOW DO WE GET THERE? (INTERACTIVE TEAM CONTRIBUTION BUCKETS) */}
          {/* ========================================================== */}
          <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-[#262626] pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FBD227]/15 border border-[#FBD227]/30 text-[#FBD227] font-mono text-[11px] font-bold uppercase">
                    Step 04 // Interactive Team Buckets
                  </span>
                </div>
                <h3 className="font-monument text-base sm:text-xl font-bold uppercase text-white tracking-wide">
                  How Do We Get There? (Team Ideas & Contributions)
                </h3>
                <p className="font-sans text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
                  Submit ideas into the 4 buckets below. Every suggestion is permanently stored in our Neon database and recorded on the bulletin board for all upcoming meetings!
                </p>
              </div>

              <span className="font-mono text-xs text-gray-400 bg-[#161616] px-3 py-1.5 rounded-lg border border-[#2B2B2B]">
                Posting as: <strong className="text-white">{activeMember}</strong>
              </span>
            </div>

            {/* 4 Collaborative Buckets Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {WORKSHOP_BUCKETS.map((bucket) => {
                const bucketItems = getBucketItems(bucket.key);
                const isFormOpen = activeBucketForm === bucket.key;

                return (
                  <div
                    key={bucket.key}
                    className={`rounded-2xl border ${bucket.borderColor} bg-[#121212] p-5 sm:p-6 flex flex-col justify-between shadow-xl transition-all hover:border-gray-500`}
                  >
                    <div>
                      {/* Bucket Title & Meta */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <span className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${bucket.bgLight} ${bucket.accentColor} border ${bucket.borderColor}`}>
                            {bucket.badge}
                          </span>
                          <h4 className="font-monument text-sm sm:text-base font-bold uppercase text-white mt-1.5 flex items-center gap-2">
                            <span>{bucket.icon}</span>
                            <span>{bucket.title}</span>
                          </h4>
                          <p className="font-sans text-xs text-gray-300 mt-0.5 leading-relaxed">
                            {bucket.subtitle}
                          </p>
                        </div>

                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-[#181818] border border-[#2B2B2B] text-gray-300 shrink-0">
                          {bucketItems.length} {bucketItems.length === 1 ? "Idea" : "Ideas"}
                        </span>
                      </div>

                      {/* Prompt banner */}
                      <div className="p-3 rounded-xl bg-black/40 border border-[#262626] text-xs font-sans text-gray-300 mb-4 leading-relaxed">
                        <strong className={`${bucket.accentColor} font-mono block text-[11px] mb-0.5`}>
                          Question for the Team:
                        </strong>
                        {bucket.prompt}
                      </div>

                      {/* Existing Ideas Feed in this Bucket */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="font-monument text-[10px] font-bold uppercase text-gray-400">
                            Recorded Team Proposals ({bucketItems.length})
                          </span>
                        </div>

                        {bucketItems.length === 0 ? (
                          <div className="p-4 rounded-xl bg-[#161616] border border-dashed border-[#282828] text-center">
                            <p className="font-mono text-xs text-gray-500 italic">
                              No ideas posted for this bucket yet. Be the first to propose one below!
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                            {bucketItems.map((item) => {
                              const hasUpvoted = item.upvotedBy.includes(activeMember);
                              const isThreadOpen = expandedThreadId === item.id;
                              const canDelete = role === "admin" || item.authorName.toLowerCase() === activeMember.toLowerCase();

                              return (
                                <div
                                  key={item.id}
                                  className="p-3 rounded-xl bg-[#181818] border border-[#292929] hover:border-gray-600 transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <h5 className="font-monument text-xs font-bold text-white uppercase tracking-wide">
                                      {item.title}
                                    </h5>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span
                                        className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${
                                          item.status === "Shipped / Fixed"
                                            ? "bg-[#FBD227]/20 text-[#FBD227] border-[#FBD227]/40"
                                            : item.status === "In Progress"
                                            ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                                            : "bg-white/5 text-gray-400 border-white/10"
                                        }`}
                                      >
                                        {item.status}
                                      </span>
                                      {canDelete && (
                                        <button
                                          onClick={() => handleDelete(item.id)}
                                          className="text-gray-500 hover:text-rose-400 text-xs px-1"
                                          title="Delete idea"
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <p className="font-sans text-xs text-gray-300 mt-1 leading-relaxed whitespace-pre-wrap">
                                    {item.description}
                                  </p>

                                  <div className="mt-2.5 pt-2 border-t border-[#242424] flex items-center justify-between text-xs font-mono">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                      <span className="text-white font-bold">{item.authorName}</span>
                                      <span>•</span>
                                      <span>
                                        {new Date(item.createdAt).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleUpvote(item.id)}
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                                          hasUpvoted
                                            ? "bg-[#FBD227] text-black border-[#FBD227]"
                                            : "bg-[#202020] text-gray-300 hover:text-white border-[#333]"
                                        }`}
                                      >
                                        <span>▲</span>
                                        <span>{item.upvotedBy.length}</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedThreadId(isThreadOpen ? null : item.id)
                                        }
                                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-gray-400 hover:text-[#FBD227] bg-[#202020] border border-[#333]"
                                      >
                                        <Icon name="chat" className="h-2.5 w-2.5" />
                                        <span>{item.comments.length}</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Inline Comments thread if opened */}
                                  {isThreadOpen && (
                                    <div className="mt-2.5 pt-2 border-t border-[#262626] space-y-2">
                                      {item.comments.map((c) => (
                                        <div key={c.id} className="p-2 rounded bg-black/40 text-[11px]">
                                          <div className="flex items-center justify-between font-mono text-[9px] text-gray-400 mb-0.5">
                                            <span className="font-bold text-white">{c.authorName}</span>
                                            <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                          </div>
                                          <p className="text-gray-300">{c.message}</p>
                                        </div>
                                      ))}

                                      <div className="flex gap-1 pt-1">
                                        <input
                                          type="text"
                                          value={replyMessage}
                                          onChange={(e) => setReplyMessage(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                              e.preventDefault();
                                              void handleAddComment(item.id);
                                            }
                                          }}
                                          placeholder="Add a thought or context..."
                                          className={`${fieldClass} text-[11px] py-1`}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleAddComment(item.id)}
                                          disabled={replySubmitting || !replyMessage.trim()}
                                          className={`${btnPrimary} px-2.5 text-[10px] font-mono font-bold shrink-0`}
                                        >
                                          Reply
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bucket Action & Inline Form */}
                    <div className="pt-3 border-t border-[#242424]">
                      {!isFormOpen ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBucketForm(bucket.key);
                            setWorkshopTitle("");
                            setWorkshopDesc("");
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#181818] hover:bg-[#222222] text-gray-200 hover:text-white border border-[#2B2B2B] hover:border-[#FBD227] font-mono text-xs font-bold transition-all shadow-sm group"
                        >
                          <Icon name="plus" className="h-3 w-3 text-[#FBD227] group-hover:scale-110 transition-transform" />
                          <span>+ Add Idea to {bucket.title.split("&")[0].trim()}</span>
                        </button>
                      ) : (
                        <div className="p-4 rounded-xl bg-[#161616] border border-[#333333] space-y-3 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <span>{bucket.icon}</span>
                              <span>New Suggestion for {bucket.title}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveBucketForm(null)}
                              className="text-gray-400 hover:text-white text-xs"
                            >
                              ✕ Cancel
                            </button>
                          </div>

                          <div>
                            <input
                              type="text"
                              value={workshopTitle}
                              onChange={(e) => setWorkshopTitle(e.target.value)}
                              placeholder={`e.g. ${bucket.starterExamples[0]}`}
                              className={`${fieldClass} text-xs py-2`}
                            />
                          </div>

                          <div>
                            <textarea
                              rows={3}
                              value={workshopDesc}
                              onChange={(e) => setWorkshopDesc(e.target.value)}
                              placeholder="Describe how it works, why it converts visitors, and what we need to build..."
                              className={`${fieldClass} text-xs py-2 resize-none`}
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] text-gray-400 uppercase font-bold">Priority:</span>
                              <select
                                value={workshopPriority}
                                onChange={(e) => setWorkshopPriority(e.target.value as ImprovementItem["priority"])}
                                className={`${fieldCompact} text-[11px]`}
                              >
                                <option value="Low">Low - Nice to have</option>
                                <option value="Medium">Medium - Standard</option>
                                <option value="High">High - Core Priority</option>
                                <option value="Critical">Critical - Launch blocker</option>
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleWorkshopSubmit(bucket.key)}
                              disabled={workshopSubmitting || !workshopTitle.trim() || !workshopDesc.trim()}
                              className={`${btnPrimary} px-3.5 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 disabled:opacity-50`}
                            >
                              <Icon name="check" className="h-3 w-3" />
                              <span>{workshopSubmitting ? "Saving..." : "Save to Database"}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Summary Callout */}
          <div className="p-6 rounded-2xl border border-[#2B2B2B] bg-[#141414] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <h4 className="font-monument text-sm font-bold uppercase text-white">
                Ready for the Next Studio Standup?
              </h4>
              <p className="font-sans text-xs text-gray-400 max-w-xl">
                All ideas submitted here are also visible in the Active Discussion Board tab, where team members can upvote, sort by priority, and update project stages.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab("discussion");
                  setCategoryFilter("Digital Home Idea");
                }}
                className={`${btnGhost} font-mono text-xs font-bold border border-[#333] hover:border-white px-4 py-2.5`}
              >
                View Ideas in Active Board &rarr;
              </button>
              <a
                href="/digital-home-presentation.html"
                target="_blank"
                rel="noopener noreferrer"
                className={`${btnPrimary} font-monument text-xs font-bold uppercase px-4 py-2.5 flex items-center gap-1.5`}
              >
                <span>Full Slide Deck</span>
                <Icon name="external" className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. CREATE PROPOSAL MODAL (Shared / Tab 1) */}
      {/* ============================================================== */}
      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Post to Team Bulletin Board"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-white">
          <div className="p-3 rounded-lg bg-[#141414] border border-[#262626] flex items-center justify-between text-xs font-mono">
            <span className="text-gray-400">Submitting as:</span>
            <span className="text-white font-bold">{activeMember}</span>
          </div>

          <div>
            <label className={labelClass}>Proposal Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "Something to Add", label: "Add Feature" },
                { id: "Something to Fix", label: "Fix Friction" },
                { id: "Workflow / Process", label: "Workflow" },
                { id: "Digital Home Idea", label: "🏛️ Digital Home" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCategory(opt.id as ImprovementItem["category"])}
                  className={`py-2 px-2 rounded-lg font-mono text-xs font-bold border transition-all text-center ${
                    category === opt.id
                      ? "bg-[#FBD227] text-black border-[#FBD227]"
                      : "bg-[#161616] text-gray-400 border-[#2A2A2A] hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Website Conversion Scorecard, Fix mobile preview jitter, Add client contract download..."
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Details & Context</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the suggestion, why it matters, how it helps our team or clients, or how to reproduce..."
              className={`${fieldClass} resize-none`}
            />
          </div>

          <div>
            <label className={labelClass}>Priority / Urgency</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as ImprovementItem["priority"])}
              className={fieldClass}
            >
              <option value="Low">Low - Nice to have</option>
              <option value="Medium">Medium - Meaningful improvement</option>
              <option value="High">High - Impeding delivery / strategic priority</option>
              <option value="Critical">Critical - Production blocker</option>
            </select>
          </div>

          {createError && (
            <p className="font-mono text-xs text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20">
              {createError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className={btnGhost}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !description.trim()}
              className={`${btnPrimary} flex items-center gap-1.5 font-mono text-xs font-bold disabled:opacity-50`}
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              <span>{isSubmitting ? "Posting..." : "Post to Bulletin Board"}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
