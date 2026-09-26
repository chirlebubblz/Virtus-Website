import React from "react";
import type { ApprovalStatus } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { btnOutline, btnYellow, cardPad, eyebrow } from "./styles";

interface Props {
  phase: string;
  approval: ApprovalStatus;
  name: string;
  deliverableCount: number;
  busy: boolean;
  confirming: boolean;
  onAsk: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onRequestChanges: () => void;
  onUndo: () => void;
}

export function MilestoneReview(p: Props) {
  const approved = p.approval === "approved";
  return (
    <section aria-labelledby="review-title" className={cardPad}>
      <div className="flex items-center gap-3">
        <span className={eyebrow}>Milestone review</span>
        {approved && (
          <span className="inline-flex items-center gap-1.5 bg-[#FBD227] px-2 py-0.5 font-sans text-xs font-bold uppercase tracking-[0.12em] text-black">
            <Icon name="check-circle" className="h-3.5 w-3.5" />
            Approved
          </span>
        )}
      </div>
      <h2 id="review-title" className="mt-3 font-monument text-xl font-bold uppercase text-white">
        {approved ? "Signed off" : p.approval === "changes_requested" ? "Changes requested" : "Your decision"}
      </h2>
      <p className="mt-3 max-w-[60ch] font-sans text-base leading-relaxed text-[#D4D4D4]">
        {approved
          ? `Thank you, ${p.name}. Your sign-off is recorded and the team moves to the next step.`
          : p.approval === "changes_requested"
          ? "Your team is working through your latest request. Send another request, or approve once you are happy."
          : `Review the latest ${p.phase} work in Deliverables. Approve it, or tell us what to change.`}
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {!approved && !p.confirming && (
          <button type="button" className={btnYellow} disabled={p.busy || p.deliverableCount === 0} onClick={p.onAsk}>
            Approve milestone
          </button>
        )}
        {!approved && p.confirming && (
          <>
            <button type="button" className={btnYellow} disabled={p.busy} onClick={p.onConfirm}>
              Confirm approval
            </button>
            <button type="button" className={btnOutline} disabled={p.busy} onClick={p.onCancel}>
              Cancel
            </button>
          </>
        )}
        <button type="button" className={btnOutline} disabled={p.busy} onClick={p.onRequestChanges}>
          Request changes
        </button>
        {approved && (
          <button type="button" className={btnOutline} disabled={p.busy} onClick={p.onUndo}>
            Undo approval
          </button>
        )}
      </div>
      {!approved && p.deliverableCount === 0 && (
        <p className="mt-4 font-sans text-sm text-[#A3A3A3]">Approval opens once your team shares the first deliverable.</p>
      )}
    </section>
  );
}
