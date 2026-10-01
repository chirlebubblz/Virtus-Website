"use client";

import React, { useState, useEffect } from "react";
import type { Opportunity } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { fieldClass, fieldCompact, btnPrimary, btnDark } from "./ui";

interface ProspectProfileDrawerProps {
  opportunity: Opportunity | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (updated: Opportunity) => void;
  onOpenEmail?: (email: string, subject: string) => void;
  onOpenProposal?: (opp: Opportunity) => void;
}

const TEAM_LEADERS = [
  "Paks (Studio Director)",
  "Kai (Brand Lead)",
  "Ren (Engineering Lead)",
  "Sora (Strategy Lead)",
];

const STAGES = [
  { id: "new_inquiry", label: "1. New Inquiry" },
  { id: "qualified", label: "2. Qualified / Discovery" },
  { id: "proposal_sent", label: "3. Proposal Sent" },
  { id: "in_review", label: "4. In Review / SOW" },
  { id: "won", label: "5. Won / Kickoff" },
  { id: "lost", label: "6. Lost" },
] as const;

export const ProspectProfileDrawer: React.FC<ProspectProfileDrawerProps> = ({
  opportunity,
  open,
  onClose,
  onUpdate,
  onOpenEmail,
  onOpenProposal,
}) => {
  const [activeTab, setActiveTab] = useState<"analysis" | "solutions" | "operations">("analysis");
  const [roleLeader, setRoleLeader] = useState<string>("");
  const [leadScore, setLeadScore] = useState<"Hot" | "Warm" | "Cold">("Warm");
  const [internalNotes, setInternalNotes] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Sync state whenever selected opportunity changes
  useEffect(() => {
    if (opportunity) {
      setRoleLeader(opportunity.roleLeader || "Kai (Brand Lead)");
      setLeadScore(opportunity.leadScore || "Warm");
      setInternalNotes(opportunity.internalNotes || "");
      setTags(opportunity.tags || ["#WebsiteInquiry"]);
      setSaveFeedback(null);
    }
  }, [opportunity]);

  if (!open || !opportunity) return null;

  const handleSaveOperations = async () => {
    setSaving(true);
    setSaveFeedback(null);
    try {
      const res = await fetch("/api/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: opportunity.id,
          roleLeader,
          leadScore,
          internalNotes,
          tags,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        onUpdate({
          ...opportunity,
          roleLeader,
          leadScore,
          internalNotes,
          tags,
        });
        setSaveFeedback("Changes saved successfully!");
        setTimeout(() => setSaveFeedback(null), 3000);
      } else {
        setSaveFeedback("Could not save changes.");
      }
    } catch {
      setSaveFeedback("Network error saving changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    const formatted = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    if (!tags.includes(formatted)) {
      setTags([...tags, formatted]);
    }
    setNewTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleStageChange = async (nextStage: Opportunity["stage"]) => {
    try {
      const res = await fetch("/api/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: opportunity.id, stage: nextStage }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        onUpdate({ ...opportunity, stage: nextStage });
      }
    } catch {
      // ignore stage error
    }
  };

  const scoreBadgeColors = {
    Hot: "bg-red-500/20 text-red-400 border-red-500/40",
    Warm: "bg-amber-500/20 text-[#FBD227] border-amber-500/40",
    Cold: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-xs flex justify-end animate-fade-in">
      {/* Click outside backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-over Panel */}
      <div className="w-full max-w-2xl bg-[#0D0D0D] border-l border-[#262626] h-full flex flex-col shadow-2xl overflow-hidden font-sans text-white">
        {/* Drawer Header */}
        <div className="p-6 border-b border-[#262626] bg-[#121212] flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-black border border-[#333333] text-gray-300 uppercase tracking-wider font-bold">
                Prospect Dossier
              </span>
              <span className={`font-mono text-[11px] px-2 py-0.5 rounded border uppercase font-bold ${scoreBadgeColors[leadScore]}`}>
                {leadScore === "Hot" ? "🔥 Hot Lead" : leadScore === "Warm" ? "⚡ Warm Opportunity" : "❄️ Cold Lead"}
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#FBD227]/10 text-[#FBD227] border border-[#FBD227]/40 font-bold">
                ${opportunity.dealValue.toLocaleString()} Estimated Value
              </span>
            </div>

            <h2 className="font-monument text-2xl font-black text-white tracking-tight uppercase truncate">
              {opportunity.company}
            </h2>

            <p className="text-xs text-gray-400 font-mono">
              Primary Contact: <strong className="text-white">{opportunity.name}</strong> · Stage:{" "}
              <span className="text-[#FBD227] capitalize">{opportunity.stage.replace(/_/g, " ")}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded bg-[#1C1C1C] hover:bg-[#262626] text-gray-400 hover:text-white transition-colors shrink-0"
            title="Close Drawer"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Contact & Digital Footprint Bar */}
        <div className="px-6 py-3 border-b border-[#222222] bg-[#141414] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div>
            <span className="text-gray-500 block text-[10px] uppercase font-bold">Location</span>
            <span className="text-gray-200 truncate block">
              {opportunity.location || "United States (PST)"}
            </span>
          </div>

          <div>
            <span className="text-gray-500 block text-[10px] uppercase font-bold">Direct Email</span>
            <a
              href={`mailto:${opportunity.email}`}
              className="text-[#FBD227] hover:underline truncate block"
              title={opportunity.email}
            >
              {opportunity.email}
            </a>
          </div>

          <div>
            <span className="text-gray-500 block text-[10px] uppercase font-bold">Phone Number</span>
            <span className="text-gray-200 truncate block">
              {opportunity.phone || "(Not provided)"}
            </span>
          </div>

          <div>
            <span className="text-gray-500 block text-[10px] uppercase font-bold">Website / Link</span>
            {opportunity.websiteUrl || opportunity.company ? (
              <a
                href={opportunity.websiteUrl || `https://${opportunity.company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`}
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:underline flex items-center gap-1 truncate"
              >
                <span>Visit Site</span>
                <Icon name="external" className="h-3 w-3 shrink-0" />
              </a>
            ) : (
              <span className="text-gray-500">None</span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#262626] bg-[#0E0E0E] px-6 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab("analysis")}
            className={`py-3 px-4 font-bold border-b-2 transition-colors ${
              activeTab === "analysis"
                ? "border-[#FBD227] text-[#FBD227] bg-[#141414]"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            1. Business Analysis & Brief
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("solutions")}
            className={`py-3 px-4 font-bold border-b-2 transition-colors ${
              activeTab === "solutions"
                ? "border-[#FBD227] text-[#FBD227] bg-[#141414]"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            2. How We Assist (Solutions)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("operations")}
            className={`py-3 px-4 font-bold border-b-2 transition-colors ${
              activeTab === "operations"
                ? "border-[#FBD227] text-[#FBD227] bg-[#141414]"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            3. Role Leader & Strategy
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Business Analysis & Brief */}
          {activeTab === "analysis" && (
            <div className="space-y-6">
              {/* Primary Bottleneck Card */}
              <div className="p-4 rounded-lg bg-red-950/20 border border-red-500/30 space-y-2">
                <span className="font-mono text-xs font-bold uppercase text-red-400 flex items-center gap-1.5">
                  <Icon name="bolt" className="h-4 w-4" />
                  Primary Operational Bottleneck / Stated Pain
                </span>
                <p className="text-xs text-gray-200 leading-relaxed font-sans font-medium">
                  {opportunity.currentBottleneck ||
                    "Client is experiencing manual operational friction and needs modern digital infrastructure to scale revenue."}
                </p>
              </div>

              {/* Business Overview Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded bg-[#141414] border border-[#262626] space-y-1">
                  <span className="font-mono text-[11px] text-gray-500 uppercase font-bold block">
                    Industry / Market
                  </span>
                  <span className="text-xs font-semibold text-white">
                    {opportunity.industry || "Digital Agency / B2B Services"}
                  </span>
                </div>

                <div className="p-3.5 rounded bg-[#141414] border border-[#262626] space-y-1">
                  <span className="font-mono text-[11px] text-gray-500 uppercase font-bold block">
                    Target Growth Goal
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">
                    {opportunity.growthGoal || "Automate client intake and double conversion rates."}
                  </span>
                </div>

                <div className="p-3.5 rounded bg-[#141414] border border-[#262626] space-y-1">
                  <span className="font-mono text-[11px] text-gray-500 uppercase font-bold block">
                    Project Timeline
                  </span>
                  <span className="text-xs font-semibold text-white">
                    {opportunity.timeline || "In a few weeks"}
                  </span>
                </div>

                <div className="p-3.5 rounded bg-[#141414] border border-[#262626] space-y-1">
                  <span className="font-mono text-[11px] text-gray-500 uppercase font-bold block">
                    Budget Bracket
                  </span>
                  <span className="text-xs font-semibold text-[#FBD227]">
                    {opportunity.budgetBracket || "$5,000 – $10,000"}
                  </span>
                </div>
              </div>

              {/* Raw Client Inquiry Message */}
              <div className="space-y-2">
                <span className="font-mono text-xs font-bold uppercase text-gray-400 block">
                  Original Brief Notes / Submission
                </span>
                <div className="p-4 rounded bg-[#111111] border border-[#262626] text-xs text-gray-300 leading-relaxed whitespace-pre-line font-mono">
                  {opportunity.message || "(No additional project notes provided.)"}
                </div>
              </div>

              {/* Social Footprint */}
              {opportunity.socialMedia && (
                <div className="space-y-2">
                  <span className="font-mono text-xs font-bold uppercase text-gray-400 block">
                    Social Footprint
                  </span>
                  <div className="flex gap-2">
                    {opportunity.socialMedia.instagram && (
                      <span className="px-2.5 py-1 rounded bg-[#1A1A1A] border border-[#2A2A2A] text-xs font-mono text-pink-400">
                        IG: {opportunity.socialMedia.instagram}
                      </span>
                    )}
                    {opportunity.socialMedia.linkedin && (
                      <span className="px-2.5 py-1 rounded bg-[#1A1A1A] border border-[#2A2A2A] text-xs font-mono text-sky-400">
                        LI: {opportunity.socialMedia.linkedin}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: How We Assist (Tailored Solutions) */}
          {activeTab === "solutions" && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-[#141414] border border-[#262626] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FBD227]">
                    Recommended Architecture & Scope
                  </span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-black border border-[#FBD227] text-[#FBD227] font-bold">
                    Tier: {opportunity.recommendedTier} System
                  </span>
                </div>
                <p className="text-xs text-gray-300 font-sans">
                  The strategic pillars and technical deliverables identified to solve the client&apos;s core bottleneck:
                </p>
              </div>

              {/* Strategic Solution Checklist */}
              <div className="space-y-3">
                <span className="font-mono text-xs font-bold uppercase text-gray-400 block">
                  Actionable Virtus Solutions
                </span>
                <div className="space-y-2.5">
                  {(opportunity.howWeAssist || [
                    "Tailored high-converting Next.js digital experience",
                    "Integrated Cal.com conflict-free discovery booking flow",
                    "Automated lead nurturing & email follow-up sequences",
                  ]).map((solution, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded bg-[#111111] border border-[#222222] flex items-start gap-3 text-xs"
                    >
                      <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon name="check" className="h-3 w-3" />
                      </span>
                      <span className="text-gray-200 font-sans leading-relaxed">{solution}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deliverable Scopes */}
              {opportunity.deliverables && opportunity.deliverables.length > 0 && (
                <div className="space-y-3">
                  <span className="font-mono text-xs font-bold uppercase text-gray-400 block">
                    Deliverables Included in Scope
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {opportunity.deliverables.map((del, i) => (
                      <div
                        key={i}
                        className="px-3 py-2 rounded bg-[#161616] border border-[#262626] text-xs font-mono text-gray-300 flex items-center gap-2"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-[#FBD227]" />
                        <span>{del}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Role Leader & Strategy Operations */}
          {activeTab === "operations" && (
            <div className="space-y-6">
              {/* Role Leader Assignment */}
              <div className="space-y-2">
                <label className="font-mono text-xs font-bold uppercase text-gray-400 block">
                  👑 Assigned Role Leader (Account Owner)
                </label>
                <select
                  value={roleLeader}
                  onChange={(e) => setRoleLeader(e.target.value)}
                  className={fieldClass}
                >
                  {TEAM_LEADERS.map((leader) => (
                    <option key={leader} value={leader} className="bg-black text-white">
                      {leader}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 font-mono">
                  The designated pod lead responsible for discovery, milestone delivery, and client communication.
                </p>
              </div>

              {/* Lead Readiness Score */}
              <div className="space-y-2">
                <label className="font-mono text-xs font-bold uppercase text-gray-400 block">
                  🎯 Lead Readiness Score
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(["Hot", "Warm", "Cold"] as const).map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setLeadScore(score)}
                      className={`py-2 px-3 rounded font-mono text-xs font-bold border transition-colors ${
                        leadScore === score
                          ? scoreBadgeColors[score] + " ring-2 ring-white/20"
                          : "bg-[#141414] border-[#262626] text-gray-400 hover:text-white"
                      }`}
                    >
                      {score === "Hot" ? "🔥 Hot" : score === "Warm" ? "⚡ Warm" : "❄️ Cold"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags Manager */}
              <div className="space-y-2">
                <label className="font-mono text-xs font-bold uppercase text-gray-400 block">
                  🏷️ Opportunity Tags
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded bg-[#1C1C1C] border border-[#333333] text-xs font-mono text-[#FBD227] flex items-center gap-1.5"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-gray-500 hover:text-red-400 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Add tag (e.g. #VIPClient, #ECommerce)..."
                    className={`${fieldClass} text-xs font-mono`}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-1.5 rounded bg-[#262626] hover:bg-[#333333] text-xs font-mono text-white font-bold"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Internal Strategy Notes */}
              <div className="space-y-2">
                <label className="font-mono text-xs font-bold uppercase text-gray-400 block">
                  📝 Private Internal Strategy Notes
                </label>
                <textarea
                  rows={4}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Record private conversation notes, budget nuances, or stakeholder background..."
                  className={`${fieldClass} text-xs font-mono`}
                />
                <p className="text-[11px] text-gray-500 font-mono">
                  Strictly internal: never visible to the client.
                </p>
              </div>

              {/* Save Operations Button */}
              <div className="flex items-center justify-between pt-2">
                {saveFeedback && (
                  <span className="text-xs font-mono text-emerald-400">{saveFeedback}</span>
                )}
                <button
                  type="button"
                  onClick={handleSaveOperations}
                  disabled={saving}
                  className={`${btnPrimary} ml-auto`}
                >
                  {saving ? "Saving..." : "Save Profile Details"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Action Footer */}
        <div className="p-4 border-t border-[#262626] bg-[#121212] flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-gray-400 text-xs">Stage:</span>
            <select
              value={opportunity.stage}
              onChange={(e) => handleStageChange(e.target.value as Opportunity["stage"])}
              className={fieldCompact}
            >
              {STAGES.map((s) => (
                <option key={s.id} value={s.id} className="bg-black text-white">
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                if (onOpenEmail) {
                  onOpenEmail(opportunity.email, `Discovery Strategy Session: ${opportunity.company}`);
                } else {
                  window.location.hash = "#email";
                }
                onClose();
              }}
              className={btnDark}
            >
              <Icon name="mail" className="h-3.5 w-3.5 mr-1.5 inline align-[-0.15em]" />
              Email Prospect
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenProposal) {
                  onOpenProposal(opportunity);
                } else {
                  window.location.hash = "#proposals";
                }
                onClose();
              }}
              className={btnPrimary}
            >
              <Icon name="file" className="h-3.5 w-3.5 mr-1.5 inline align-[-0.15em]" />
              Generate Proposal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
