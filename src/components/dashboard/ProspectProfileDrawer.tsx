"use client";

import React, { useState, useEffect } from "react";
import type { Opportunity } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { fieldClass, fieldCompact, btnPrimary, btnDark, btnGhost } from "./ui";

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
  const [isEditing, setIsEditing] = useState(false);

  // Editable Profile State
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [dealValue, setDealValue] = useState<number>(0);

  // Tab 1: Business Analysis & Brief
  const [bottleneck, setBottleneck] = useState("");
  const [industry, setIndustry] = useState("");
  const [growthGoal, setGrowthGoal] = useState("");
  const [timeline, setTimeline] = useState("");
  const [budgetBracket, setBudgetBracket] = useState("");
  const [message, setMessage] = useState("");

  // Tab 2: How We Assist (Solutions)
  const [solutions, setSolutions] = useState<string[]>([]);
  const [newSolutionInput, setNewSolutionInput] = useState("");

  // Tab 3: Role Leader & Strategy Operations
  const [roleLeader, setRoleLeader] = useState<string>("");
  const [leadScore, setLeadScore] = useState<"Hot" | "Warm" | "Cold">("Warm");
  const [internalNotes, setInternalNotes] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reset / Sync state whenever selected opportunity changes
  const syncOpportunityState = (opp: Opportunity) => {
    setCompany(opp.company || "");
    setName(opp.name || "");
    setEmail(opp.email || "");
    setPhone(opp.phone || "");
    setLocation(opp.location || "United States (PST)");
    setWebsiteUrl(opp.websiteUrl || "");
    setDealValue(opp.dealValue || 0);

    setBottleneck(
      opp.currentBottleneck ||
        "Client is experiencing manual operational friction and needs modern digital infrastructure to scale revenue."
    );
    setIndustry(opp.industry || "Digital Agency / B2B Services");
    setGrowthGoal(opp.growthGoal || "Automate client intake and double conversion rates.");
    setTimeline(opp.timeline || "In a few weeks");
    setBudgetBracket(opp.budgetBracket || "$5,000 – $10,000");
    setMessage(opp.message || "");

    setSolutions(
      opp.howWeAssist && opp.howWeAssist.length > 0
        ? opp.howWeAssist
        : [
            "Tailored high-converting Next.js digital experience",
            "Integrated Cal.com conflict-free discovery booking flow",
            "Automated lead nurturing & email follow-up sequences",
          ]
    );

    setRoleLeader(opp.roleLeader || "Kai (Brand Lead)");
    setLeadScore(opp.leadScore || "Warm");
    setInternalNotes(opp.internalNotes || "");
    setTags(opp.tags || ["#WebsiteInquiry"]);
    setSaveFeedback(null);
    setSaveError(null);
  };

  useEffect(() => {
    if (opportunity) {
      syncOpportunityState(opportunity);
      setIsEditing(false);
    }
  }, [opportunity]);

  if (!open || !opportunity) return null;

  // Save all profile changes
  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveFeedback(null);
    setSaveError(null);

    const payload = {
      id: opportunity.id,
      company: company.trim() || opportunity.company,
      name: name.trim() || opportunity.name,
      email: email.trim(),
      phone: phone.trim(),
      location: location.trim(),
      websiteUrl: websiteUrl.trim(),
      dealValue: Number(dealValue) || opportunity.dealValue,
      currentBottleneck: bottleneck.trim(),
      industry: industry.trim(),
      growthGoal: growthGoal.trim(),
      timeline: timeline.trim(),
      budgetBracket: budgetBracket.trim(),
      message: message.trim(),
      howWeAssist: solutions,
      roleLeader,
      leadScore,
      internalNotes,
      tags,
    };

    try {
      const res = await fetch("/api/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        const updated: Opportunity = {
          ...opportunity,
          ...payload,
        };
        onUpdate(updated);
        setSaveFeedback("Profile updated successfully! ✅");
        setIsEditing(false);
        setTimeout(() => setSaveFeedback(null), 4000);
      } else {
        setSaveError(json?.error || "Could not save profile changes.");
      }
    } catch {
      setSaveError("Network error while saving changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    syncOpportunityState(opportunity);
    setIsEditing(false);
    setSaveFeedback(null);
    setSaveError(null);
  };

  // Add / Remove Solution Points
  const handleAddSolution = () => {
    if (!newSolutionInput.trim()) return;
    setSolutions([...solutions, newSolutionInput.trim()]);
    setNewSolutionInput("");
  };

  const handleRemoveSolution = (indexToRemove: number) => {
    setSolutions(solutions.filter((_, idx) => idx !== indexToRemove));
  };

  // Tags
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
      // Soft fail
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
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-black border border-[#333333] text-gray-300 uppercase tracking-wider font-bold">
                Prospect Dossier
              </span>
              <span className={`font-mono text-[11px] px-2 py-0.5 rounded border uppercase font-bold ${scoreBadgeColors[leadScore]}`}>
                {leadScore === "Hot" ? "🔥 Hot Lead" : leadScore === "Warm" ? "⚡ Warm Opportunity" : "❄️ Cold Lead"}
              </span>

              {isEditing ? (
                <div className="flex items-center gap-1 bg-black/80 border border-[#FBD227] px-2 py-0.5 rounded">
                  <span className="text-[#FBD227] font-mono text-xs font-bold">$</span>
                  <input
                    type="number"
                    value={dealValue}
                    onChange={(e) => setDealValue(Number(e.target.value))}
                    className="w-24 bg-transparent font-mono text-xs text-[#FBD227] font-bold focus:outline-none"
                    placeholder="Deal value"
                  />
                  <span className="text-[10px] text-gray-400 font-mono">Value</span>
                </div>
              ) : (
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#FBD227]/10 text-[#FBD227] border border-[#FBD227]/40 font-bold">
                  ${dealValue.toLocaleString()} Estimated Value
                </span>
              )}
            </div>

            {/* Editable or Display Company Title */}
            {isEditing ? (
              <div className="space-y-1.5 pt-1">
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company Name"
                  className="w-full bg-[#181818] border border-[#FBD227] px-3 py-1.5 rounded font-monument text-lg font-bold text-white focus:outline-none uppercase"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono">Contact:</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contact Name"
                    className="flex-1 bg-[#181818] border border-[#333333] px-2.5 py-1 rounded text-xs font-mono text-white focus:outline-none focus:border-[#FBD227]"
                  />
                </div>
              </div>
            ) : (
              <div>
                <h2 className="font-monument text-2xl font-black text-white tracking-tight uppercase truncate">
                  {company}
                </h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  Primary Contact: <strong className="text-white">{name}</strong> · Stage:{" "}
                  <span className="text-[#FBD227] capitalize">{opportunity.stage.replace(/_/g, " ")}</span>
                </p>
              </div>
            )}
          </div>

          {/* Action Header Buttons: Edit / Save / Close */}
          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 rounded text-xs font-mono text-gray-400 hover:text-white border border-[#333333] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveProfile}
                  className="px-3.5 py-1.5 rounded text-xs font-mono font-bold bg-[#FBD227] text-black hover:bg-white transition-all shadow-md disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider bg-[#1C1C1C] border border-[#333333] text-[#FBD227] hover:border-[#FBD227] hover:bg-[#252525] transition-all"
                title="Edit this prospect profile"
              >
                <Icon name="bolt" className="h-3 w-3" />
                Edit Profile
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded bg-[#1C1C1C] hover:bg-[#262626] text-gray-400 hover:text-white transition-colors"
              title="Close Drawer"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Save Feedback Banner */}
        {saveFeedback && (
          <div className="bg-emerald-950/40 border-b border-emerald-500/40 px-6 py-2 text-xs font-mono font-bold text-emerald-300 flex items-center justify-between">
            <span>{saveFeedback}</span>
            <button onClick={() => setSaveFeedback(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}
        {saveError && (
          <div className="bg-rose-950/40 border-b border-rose-500/40 px-6 py-2 text-xs font-mono font-bold text-rose-300 flex items-center justify-between">
            <span>{saveError}</span>
            <button onClick={() => setSaveError(null)} className="text-rose-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Quick Contact & Digital Footprint Bar */}
        <div className="px-6 py-3 border-b border-[#222222] bg-[#141414] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div>
            <span className="text-gray-500 block text-[10px] uppercase font-bold">Location</span>
            {isEditing ? (
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. United States (PST)"
                className="w-full bg-[#181818] border border-[#333333] px-2 py-1 rounded text-xs text-white focus:outline-none focus:border-[#FBD227]"
              />
            ) : (
              <span className="text-gray-200 truncate block">
                {location || "United States (PST)"}
              </span>
            )}
          </div>

          <div>
            <span className="text-gray-500 block text-[10px] uppercase font-bold">Direct Email</span>
            {isEditing ? (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@company.com"
                className="w-full bg-[#181818] border border-[#333333] px-2 py-1 rounded text-xs text-white focus:outline-none focus:border-[#FBD227]"
              />
            ) : (
              <a
                href={`mailto:${email}`}
                className="text-[#FBD227] hover:underline truncate block"
                title={email}
              >
                {email}
              </a>
            )}
          </div>

          <div>
            <span className="text-gray-500 block text-[10px] uppercase font-bold">Phone Number</span>
            {isEditing ? (
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-[#181818] border border-[#333333] px-2 py-1 rounded text-xs text-white focus:outline-none focus:border-[#FBD227]"
              />
            ) : (
              <span className="text-gray-200 truncate block">
                {phone || "(Not provided)"}
              </span>
            )}
          </div>

          <div>
            <span className="text-gray-500 block text-[10px] uppercase font-bold">Website / Link</span>
            {isEditing ? (
              <input
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://company.com"
                className="w-full bg-[#181818] border border-[#333333] px-2 py-1 rounded text-xs text-white focus:outline-none focus:border-[#FBD227]"
              />
            ) : websiteUrl || company ? (
              <a
                href={websiteUrl || `https://${company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`}
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
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={bottleneck}
                    onChange={(e) => setBottleneck(e.target.value)}
                    placeholder="Describe client bottleneck..."
                    className="w-full bg-[#181818] border border-red-500/40 p-2.5 rounded text-xs text-white focus:outline-none focus:border-[#FBD227] leading-relaxed font-sans"
                  />
                ) : (
                  <p className="text-xs text-gray-200 leading-relaxed font-sans font-medium">
                    {bottleneck}
                  </p>
                )}
              </div>

              {/* Business Overview Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded bg-[#141414] border border-[#262626] space-y-1">
                  <span className="font-mono text-[11px] text-gray-500 uppercase font-bold block">
                    Industry / Market
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g. Digital Agency / B2B"
                      className="w-full bg-[#181818] border border-[#333333] px-2.5 py-1 rounded text-xs text-white focus:outline-none focus:border-[#FBD227]"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-white block">
                      {industry}
                    </span>
                  )}
                </div>

                <div className="p-3.5 rounded bg-[#141414] border border-[#262626] space-y-1">
                  <span className="font-mono text-[11px] text-gray-500 uppercase font-bold block">
                    Target Growth Goal
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={growthGoal}
                      onChange={(e) => setGrowthGoal(e.target.value)}
                      placeholder="e.g. Double conversion rates"
                      className="w-full bg-[#181818] border border-[#333333] px-2.5 py-1 rounded text-xs text-emerald-400 focus:outline-none focus:border-[#FBD227]"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-emerald-400 block">
                      {growthGoal}
                    </span>
                  )}
                </div>

                <div className="p-3.5 rounded bg-[#141414] border border-[#262626] space-y-1">
                  <span className="font-mono text-[11px] text-gray-500 uppercase font-bold block">
                    Project Timeline
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={timeline}
                      onChange={(e) => setTimeline(e.target.value)}
                      placeholder="e.g. 2 to 4 weeks"
                      className="w-full bg-[#181818] border border-[#333333] px-2.5 py-1 rounded text-xs text-white focus:outline-none focus:border-[#FBD227]"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-white block">
                      {timeline}
                    </span>
                  )}
                </div>

                <div className="p-3.5 rounded bg-[#141414] border border-[#262626] space-y-1">
                  <span className="font-mono text-[11px] text-gray-500 uppercase font-bold block">
                    Budget Bracket
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={budgetBracket}
                      onChange={(e) => setBudgetBracket(e.target.value)}
                      placeholder="e.g. $5,000 – $10,000"
                      className="w-full bg-[#181818] border border-[#333333] px-2.5 py-1 rounded text-xs text-[#FBD227] focus:outline-none focus:border-[#FBD227]"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-[#FBD227] block">
                      {budgetBracket}
                    </span>
                  )}
                </div>
              </div>

              {/* Raw Client Inquiry Message */}
              <div className="space-y-2">
                <span className="font-mono text-xs font-bold uppercase text-gray-400 block">
                  Original Brief Notes / Submission
                </span>
                {isEditing ? (
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter project submission details..."
                    className="w-full bg-[#111111] border border-[#333333] p-3 rounded text-xs text-gray-200 font-mono leading-relaxed focus:outline-none focus:border-[#FBD227]"
                  />
                ) : (
                  <div className="p-4 rounded bg-[#111111] border border-[#262626] text-xs text-gray-300 leading-relaxed whitespace-pre-line font-mono">
                    {message || "(No additional project notes provided.)"}
                  </div>
                )}
              </div>
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
                  Actionable Virtus Solutions ({solutions.length})
                </span>

                <div className="space-y-2.5">
                  {solutions.map((solution, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded bg-[#111111] border border-[#222222] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon name="check" className="h-3 w-3" />
                        </span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={solution}
                            onChange={(e) => {
                              const updated = [...solutions];
                              updated[i] = e.target.value;
                              setSolutions(updated);
                            }}
                            className="flex-1 bg-[#181818] border border-[#333333] px-2 py-1 rounded text-xs text-gray-200 focus:outline-none focus:border-[#FBD227]"
                          />
                        ) : (
                          <span className="text-gray-200 font-sans leading-relaxed">{solution}</span>
                        )}
                      </div>

                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSolution(i)}
                          className="text-xs text-rose-400 hover:text-rose-300 font-mono px-2 py-1"
                          title="Remove solution"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add New Solution Input */}
                {isEditing && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Add an actionable solution recommendation..."
                      value={newSolutionInput}
                      onChange={(e) => setNewSolutionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSolution();
                        }
                      }}
                      className="flex-1 bg-[#161616] border border-[#333333] px-3 py-2 rounded text-xs text-white focus:outline-none focus:border-[#FBD227]"
                    />
                    <button
                      type="button"
                      onClick={handleAddSolution}
                      className="px-3 py-2 rounded bg-[#222222] border border-[#333333] text-xs font-mono text-[#FBD227] hover:bg-[#2A2A2A]"
                    >
                      + Add Solution
                    </button>
                  </div>
                )}
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

              {/* Opportunity Tags */}
              <div className="space-y-2">
                <label className="font-mono text-xs font-bold uppercase text-gray-400 block">
                  🏷️ Pipeline Tags & Milestones
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1C1C1C] border border-[#333333] font-mono text-xs text-[#FBD227]"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-gray-400 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add tag (e.g. #FastTrack, #Referral)..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="flex-1 bg-[#141414] border border-[#333333] px-3 py-1.5 rounded text-xs text-white font-mono focus:outline-none focus:border-[#FBD227]"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-1.5 bg-[#262626] text-white text-xs font-mono font-bold rounded hover:bg-[#333333]"
                  >
                    + Add
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

              {/* Direct Save Button inside Tab 3 */}
              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className={btnPrimary}
                >
                  <Icon name="check" className="h-4 w-4 mr-1" />
                  {saving ? "Saving..." : "Save Strategy Details"}
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
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className={btnGhost}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveProfile}
                  className={btnPrimary}
                >
                  <Icon name="check" className="h-4 w-4 mr-1" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
