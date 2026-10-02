"use client";

import React, { useState } from "react";
import { Icon } from "@/components/icons/Icon";

export interface UpsellItem {
  id: string;
  title: string;
  badge: string;
  price: number;
  description: string;
  highlights: string[];
}

export const UPSELL_OPTIONS: UpsellItem[] = [
  {
    id: "3d_visuals",
    title: "3D Photorealistic Asset Suite",
    badge: "Most Popular",
    price: 1500,
    description: "Cinematic, studio-grade 3D renders of your brand, products, or spatial digital environments.",
    highlights: ["4K High-Res Still Visuals", "360° Interactive Canvas Embed", "Studio Lighting & Textures"],
  },
  {
    id: "fast_track",
    title: "VIP 7-Day Fast-Track Delivery",
    badge: "Speed Priority",
    price: 2000,
    description: "Bypass the standard production queue with an exclusively reserved engineering sprint pod.",
    highlights: ["Kickoff within 24 Hours", "Dedicated Senior Pod Lead", "Daily Async Video Demos"],
  },
  {
    id: "ai_concierge",
    title: "AI Lead Concierge & CRM Automation",
    badge: "High ROI",
    price: 2500,
    description: "Equip your website with conversational lead routing, automated SMS/email follow-ups, and CRM sync.",
    highlights: ["Automated Inbound Lead Triage", "Instant 24/7 Email Autoresponders", "Connected Pipeline Workflows"],
  },
];

interface AcceleratedSprintUpsellProps {
  opportunityId: string;
  initialDealValue?: number;
  clientName: string;
  company: string;
  clientEmail: string;
  onFinished: (updatedDealValue: number, acceptedAddOns: UpsellItem[]) => void;
  onSkip: () => void;
}

export const AcceleratedSprintUpsell: React.FC<AcceleratedSprintUpsellProps> = ({
  opportunityId,
  initialDealValue = 6500,
  clientName,
  company,
  clientEmail,
  onFinished,
  onSkip,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(["3d_visuals"]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedItems = UPSELL_OPTIONS.filter((item) => selectedIds.includes(item.id));
  const addOnTotal = selectedItems.reduce((sum, item) => sum + item.price, 0);
  const finalTotal = initialDealValue + addOnTotal;

  const handleConfirmUpsell = async () => {
    if (selectedItems.length === 0) {
      onSkip();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/upsell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId,
          selectedAddOns: selectedItems.map((item) => ({
            id: item.id,
            title: item.title,
            price: item.price,
          })),
          clientName,
          company,
          clientEmail,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to update project scope");
      }

      setIsSuccess(true);
      setTimeout(() => {
        onFinished(data.updatedDealValue || finalTotal, selectedItems);
      }, 1600);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "An error occurred while updating scope");
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="rounded-2xl border-2 border-[#FBD227] bg-[#111111] p-8 text-center text-white shadow-2xl animate-fade-in">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FBD227]/20 border border-[#FBD227] text-[#FBD227]">
          <Icon name="check" className="h-8 w-8" />
        </div>
        <h3 className="font-monument text-2xl font-bold uppercase tracking-tight text-white">
          Scope Accelerated!
        </h3>
        <p className="mt-2 text-sm text-[#A3A3A3]">
          We have updated your discovery brief for <strong className="text-white">{company}</strong>.
        </p>
        <div className="mt-4 inline-block rounded-lg border border-[#333333] bg-[#1A1A1A] px-4 py-2 font-mono text-sm text-[#FBD227]">
          Updated Estimated Investment: ${finalTotal.toLocaleString()}
        </div>
        <p className="mt-3 text-xs text-[#888888]">
          A revised confirmation has been dispatched to <strong>{clientEmail}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border-2 border-black bg-[#0E0E0E] text-white p-6 sm:p-8 shadow-2xl">
      {/* Header */}
      <div className="border-b border-[#262626] pb-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-[#FBD227] animate-pulse" />
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#FBD227]">
            Sprint Acceleration · Special Add-Ons
          </span>
        </div>
        <h2 className="font-monument text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
          Supercharge Your <span className="text-[#FBD227]">Engagement.</span>
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-[#999999] max-w-[65ch]">
          Bundle specialized production sprints into your upcoming discovery roadmap at locked client rates.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300 font-mono">
          {error}
        </div>
      )}

      {/* Add-on Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {UPSELL_OPTIONS.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <div
              key={item.id}
              onClick={() => toggleSelect(item.id)}
              className={`cursor-pointer rounded-xl border-2 p-5 transition-all flex flex-col justify-between select-none ${
                isSelected
                  ? "border-[#FBD227] bg-[#1A1A1A] shadow-[0_0_20px_rgba(251,210,39,0.15)]"
                  : "border-[#262626] bg-[#121212] hover:border-[#444444]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="rounded bg-[#FBD227]/10 border border-[#FBD227]/30 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#FBD227]">
                    {item.badge}
                  </span>
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                      isSelected
                        ? "border-[#FBD227] bg-[#FBD227] text-black"
                        : "border-[#444444] bg-[#1A1A1A]"
                    }`}
                  >
                    {isSelected && <Icon name="check" className="h-3.5 w-3.5" />}
                  </div>
                </div>

                <h4 className="font-bold text-sm text-white">{item.title}</h4>
                <div className="font-mono text-base font-bold text-[#FBD227] my-2">
                  +${item.price.toLocaleString()}
                </div>
                <p className="text-xs text-[#999999] leading-relaxed mb-4">
                  {item.description}
                </p>
              </div>

              <div className="border-t border-[#262626] pt-3 space-y-1.5">
                {item.highlights.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-[#CCCCCC]">
                    <span className="text-[#FBD227] font-bold">✓</span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Investment Bar & Actions */}
      <div className="rounded-xl border border-[#262626] bg-[#141414] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <span className="text-xs text-[#888888] uppercase tracking-wider font-mono block">
            Scope Value Summary
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xs text-[#A3A3A3]">Base: ${initialDealValue.toLocaleString()}</span>
            <span className="text-xs text-[#FBD227] font-bold">
              {addOnTotal > 0 ? `+ $${addOnTotal.toLocaleString()}` : "+ $0"}
            </span>
            <span className="text-lg font-monument font-black text-white ml-2">
              = ${finalTotal.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 sm:flex-initial px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider text-[#888888] hover:text-white transition-colors"
          >
            Skip Add-Ons
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirmUpsell}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-[#FBD227] px-6 py-3 font-sans text-xs font-bold uppercase tracking-[0.12em] text-black shadow-lg hover:bg-white hover:text-black transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              "Updating Scope..."
            ) : (
              <>
                Confirm & Add to Scope
                <Icon name="arrow-right" className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
