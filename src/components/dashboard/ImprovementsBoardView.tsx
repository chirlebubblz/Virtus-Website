"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import type { ImprovementItem } from "@/db";
import { Modal, fieldClass, labelClass, btnPrimary, btnGhost, fieldCompact } from "./ui";

interface ImprovementsBoardViewProps {
  role?: "admin" | "team";
  activeMember?: string;
}

export function ImprovementsBoardView({
  role = "admin",
  activeMember = "Specialist",
}: ImprovementsBoardViewProps) {
  const [items, setItems] = useState<ImprovementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ImprovementItem["category"]>("Something to Add");
  const [priority, setPriority] = useState<ImprovementItem["priority"]>("Medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Expanded discussion card IDs
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

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
      setError("Network error loading improvements board.");
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
    if (!window.confirm("Are you sure you want to remove this item?")) return;
    setItems((prev) => prev.filter((item) => item.id !== itemId));

    try {
      await fetch(`/api/improvements?id=${encodeURIComponent(itemId)}`, {
        method: "DELETE",
      });
    } catch {
      void fetchItems();
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    return true;
  });

  const countAdd = items.filter((i) => i.category === "Something to Add").length;
  const countFix = items.filter((i) => i.category === "Something to Fix").length;
  const countShipped = items.filter((i) => i.status === "Shipped / Fixed").length;

  return (
    <div className="space-y-6">
      {/* Board Header & Metrics Strip */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#262626] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[#FBD227]/20 text-[#FBD227]">
              <Icon name="bolt" className="h-3 w-3" />
            </span>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FBD227]">
              Studio Innovation & Feedback Floor
            </span>
          </div>
          <h2 className="font-monument text-lg sm:text-xl font-bold uppercase text-white tracking-wide">
            Something to Add or Fix Board
          </h2>
          <p className="font-sans text-xs text-gray-400 mt-0.5">
            Open collaborative board where all team members and studio leads propose features, flag friction, and track shipped fixes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className={`${btnPrimary} flex items-center gap-1.5 font-monument text-xs font-bold uppercase px-4 py-2.5 shadow-lg shrink-0`}
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
          <span>+ Post Something to Add or Fix</span>
        </button>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

      {/* Main Board Feed */}
      {loading ? (
        <div className="py-12 text-center font-mono text-xs text-gray-500 bg-[#121212] rounded-xl border border-[#242424]">
          <span className="h-2 w-2 rounded-full bg-[#FBD227] animate-ping inline-block mr-2" />
          Loading Something to Add or Fix Board...
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
            Have an idea for a feature to add, or noticed a bug/friction to fix? Share it with the studio!
          </p>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className={`${btnPrimary} font-mono text-xs font-bold uppercase px-3.5 py-1.5`}
          >
            + Post Something to Add or Fix
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
                        item.category === "Something to Add"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : item.category === "Something to Fix"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          : "bg-[#FBD227]/10 text-[#FBD227] border-[#FBD227]/30"
                      }`}
                    >
                      {item.category}
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
                      {/* Upvote Button */}
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

                      {/* Discussion toggle */}
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

                    {/* Status Dropdown */}
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

                      {/* Comments Feed */}
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

                      {/* Reply input */}
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

      {/* ============================================================== */}
      {/* MODAL: POST SOMETHING TO ADD OR FIX */}
      {/* ============================================================== */}
      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Post Something to Add or Fix"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-white">
          <div className="p-3 rounded-lg bg-[#141414] border border-[#262626] flex items-center justify-between text-xs font-mono">
            <span className="text-gray-400">Submitting as:</span>
            <span className="text-white font-bold">{activeMember}</span>
          </div>

          <div>
            <label className={labelClass}>Proposal Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "Something to Add", label: "Add Feature" },
                { id: "Something to Fix", label: "Fix Bug" },
                { id: "Workflow / Process", label: "Workflow" },
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
              placeholder="e.g. Add client contract download button, Fix mobile preview jitter..."
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
              placeholder="Explain what needs to be added or fixed, why it matters, or how to reproduce..."
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
              <option value="High">High - Impeding delivery</option>
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
              <span>{isSubmitting ? "Posting..." : "Post to Board"}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
