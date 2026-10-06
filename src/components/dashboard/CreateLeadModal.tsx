"use client";

import React, { useState } from "react";
import type { Opportunity } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { Modal, fieldClass, labelClass, btnPrimary, btnDark } from "./ui";

interface CreateLeadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (lead: Opportunity) => void;
}

const AVAILABLE_NEEDS = [
  "Brand & Creative",
  "Web & Digital",
  "Content Engine",
  "AI & Automation",
  "Mobile & WebGL",
  "Headless Commerce",
];

const AVAILABLE_STAGES: { id: Opportunity["stage"]; label: string }[] = [
  { id: "new_inquiry", label: "1. New Inquiry" },
  { id: "qualified", label: "2. Qualified / Discovery" },
  { id: "proposal_sent", label: "3. Proposal Sent" },
  { id: "in_review", label: "4. In Review / SOW" },
  { id: "won", label: "5. Won / Kickoff" },
  { id: "lost", label: "6. Lost" },
];

const AVAILABLE_TIERS: Opportunity["recommendedTier"][] = ["Growth", "Focused", "Integrated"];
const AVAILABLE_SCORES: NonNullable<Opportunity["leadScore"]>[] = ["Hot", "Warm", "Cold"];
const AVAILABLE_LEADERS = [
  "Kai (Brand Lead)",
  "Ren (Lead Dev)",
  "Paks (Studio Director)",
  "Sora (UX & Design)",
];

const TIMELINE_OPTIONS = [
  "Urgent (< 2 weeks)",
  "In a few weeks",
  "Next quarter",
  "Flexible / Q4 Launch",
];

export const CreateLeadModal: React.FC<CreateLeadModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dealValue, setDealValue] = useState("5000");
  const [stage, setStage] = useState<Opportunity["stage"]>("new_inquiry");
  const [recommendedTier, setRecommendedTier] = useState<Opportunity["recommendedTier"]>("Growth");
  const [leadScore, setLeadScore] = useState<Opportunity["leadScore"]>("Warm");
  const [timeline, setTimeline] = useState("Urgent (< 2 weeks)");
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>(["Brand & Creative", "Web & Digital"]);
  const [location, setLocation] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [roleLeader, setRoleLeader] = useState("Kai (Brand Lead)");
  const [notes, setNotes] = useState("");
  const [notifyTeam, setNotifyTeam] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setCompany("");
    setName("");
    setEmail("");
    setPhone("");
    setDealValue("5000");
    setStage("new_inquiry");
    setRecommendedTier("Growth");
    setLeadScore("Warm");
    setTimeline("Urgent (< 2 weeks)");
    setSelectedNeeds(["Brand & Creative", "Web & Digital"]);
    setLocation("");
    setWebsiteUrl("");
    setIndustry("");
    setRoleLeader("Kai (Brand Lead)");
    setNotes("");
    setNotifyTeam(true);
    setError(null);
    setIsSubmitting(false);
  };

  const handleToggleNeed = (need: string) => {
    setSelectedNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCompany = company.trim();
    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanCompany) {
      setError("Please provide a Company or Client name.");
      return;
    }
    if (!cleanName) {
      setError("Please provide a Contact Name.");
      return;
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please provide a valid Contact Email address.");
      return;
    }

    const numericDealValue = Number(dealValue) || 0;

    setIsSubmitting(true);

    try {
      const payload = {
        name: cleanName,
        company: cleanCompany,
        email: cleanEmail,
        phone: phone.trim() || undefined,
        dealValue: numericDealValue,
        stage,
        recommendedTier,
        leadScore,
        timeline,
        needs: selectedNeeds.length > 0 ? selectedNeeds : ["Brand & Creative", "Web & Digital"],
        deliverables: selectedNeeds,
        location: location.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        industry: industry.trim() || undefined,
        roleLeader,
        internalNotes: notes.trim() || undefined,
        message: notes.trim() || undefined,
        tags: ["#ManualLead", `#${recommendedTier}`, leadScore === "Hot" ? "#HotLead" : "#Inquiry"],
        notifyTeam,
      };

      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to create lead in pipeline.");
      }

      const createdLead: Opportunity = Array.isArray(json.data) ? json.data[0] : json.data;
      if (createdLead) {
        onSuccess(createdLead);
      }
      resetForm();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating lead.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isSubmitting) {
          resetForm();
          onClose();
        }
      }}
      title="Create New Lead / Opportunity"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-white font-sans text-xs">
        {error && (
          <div className="p-3 bg-red-950/70 border border-red-500/50 rounded text-red-200 text-xs font-mono">
            {error}
          </div>
        )}

        {/* Company & Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Company / Brand Name *</label>
            <input
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Nova AI Audio"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Primary Contact Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jackson Meyer"
              className={fieldClass}
            />
          </div>
        </div>

        {/* Email & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Contact Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. jackson@novaaudio.ai"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 (512) 839-4410"
              className={fieldClass}
            />
          </div>
        </div>

        {/* Deal Value, Stage, Tier */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Deal Value ($) *</label>
            <input
              type="number"
              min="0"
              step="100"
              required
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Initial Stage</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as Opportunity["stage"])}
              className={fieldClass}
            >
              {AVAILABLE_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Recommended Tier</label>
            <select
              value={recommendedTier}
              onChange={(e) => setRecommendedTier(e.target.value as Opportunity["recommendedTier"])}
              className={fieldClass}
            >
              {AVAILABLE_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Urgency, Lead Score, Role Leader */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Timeline / Urgency</label>
            <select
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              className={fieldClass}
            >
              {TIMELINE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Lead Score</label>
            <select
              value={leadScore}
              onChange={(e) => setLeadScore(e.target.value as Opportunity["leadScore"])}
              className={fieldClass}
            >
              {AVAILABLE_SCORES.map((score) => (
                <option key={score} value={score}>
                  {score}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Role Leader</label>
            <select
              value={roleLeader}
              onChange={(e) => setRoleLeader(e.target.value)}
              className={fieldClass}
            >
              {AVAILABLE_LEADERS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Needs / Service Capabilities Toggle Pills */}
        <div>
          <label className={labelClass}>Service Scope & Capabilities</label>
          <div className="flex flex-wrap gap-2 pt-1">
            {AVAILABLE_NEEDS.map((need) => {
              const active = selectedNeeds.includes(need);
              return (
                <button
                  key={need}
                  type="button"
                  onClick={() => handleToggleNeed(need)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors border ${
                    active
                      ? "bg-[#FBD227] text-black border-[#FBD227] font-bold"
                      : "bg-[#181818] text-gray-400 border-[#333333] hover:text-white"
                  }`}
                >
                  {need}
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Location, Website, Industry */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Austin, TX"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Website URL</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://..."
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Industry</label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. AI / Spatial Audio"
              className={fieldClass}
            />
          </div>
        </div>

        {/* Internal Notes */}
        <div>
          <label className={labelClass}>Project Scope & Internal Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Key client deliverables, timeline notes, or intake summary..."
            className={fieldClass}
          />
        </div>

        {/* Team Email Notification Checkbox */}
        <div className="p-3 bg-[#141414] border border-[#2B2B2B] rounded flex items-start gap-2.5">
          <input
            type="checkbox"
            id="notifyTeamCheckbox"
            checked={notifyTeam}
            onChange={(e) => setNotifyTeam(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[#444444] bg-black text-[#FBD227] focus:ring-[#FBD227]"
          />
          <label htmlFor="notifyTeamCheckbox" className="cursor-pointer select-none">
            <span className="font-bold text-white block">
              Send Lead Intake Notice to Team Email Inbox
            </span>
            <span className="text-[11px] text-gray-400 block mt-0.5">
              Generates an intake notification email with a direct clickable &quot;View Opportunity in Pipeline &rarr;&quot; button for the entire studio team.
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#262626]">
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={isSubmitting}
            className={btnDark}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={btnPrimary}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Creating Lead...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Icon name="user-plus" className="h-3.5 w-3.5" />
                <span>Create Lead Card</span>
              </span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
