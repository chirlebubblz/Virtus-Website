"use client";

import React, { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Modal, fieldClass, labelClass, btnPrimary, btnDark } from "./ui";
import { useClients } from "./useClients";

export interface GeneratedDraft {
  recipient: string;
  subject: string;
  body: string;
}

interface EmailDrafterModalProps {
  open: boolean;
  onClose: () => void;
  onApplyDraft: (draft: GeneratedDraft) => void;
  onSaveToDraftsFolder?: (draft: GeneratedDraft) => void;
  initialRecipient?: string;
  initialSubject?: string;
}

type DraftIntent =
  | "milestone_update"
  | "proposal_followup"
  | "invoice_reminder"
  | "contract_signing"
  | "discovery_followup"
  | "design_review"
  | "custom_prompt";

type DraftTone = "executive" | "consultative" | "direct" | "formal";

export const EmailDrafterModal: React.FC<EmailDrafterModalProps> = ({
  open,
  onClose,
  onApplyDraft,
  onSaveToDraftsFolder,
  initialRecipient = "",
  initialSubject = "",
}) => {
  const { clients } = useClients();

  const [intent, setIntent] = useState<DraftIntent>("milestone_update");
  const [tone, setTone] = useState<DraftTone>("executive");

  // Client Context
  const [clientName, setClientName] = useState("");
  const [company, setCompany] = useState("");
  const [recipientEmail, setRecipientEmail] = useState(initialRecipient);

  // Template-Specific Parameters
  const [milestoneName, setMilestoneName] = useState("Phase 1 Design & Architecture System");
  const [progressPercent, setProgressPercent] = useState("65%");
  const [demoUrl, setDemoUrl] = useState("https://thevirtuslabs.com");
  const [nextSteps, setNextSteps] = useState("Finalize frontend interactions and prepare staging build for QA review.");

  const [proposalScope, setProposalScope] = useState("Integrated Architectural Brand & Web Build");
  const [dealValue, setDealValue] = useState("$8,500");
  const [proposalUrl, setProposalUrl] = useState("https://thevirtuslabs.com/proposals");

  const [invoiceNumber, setInvoiceNumber] = useState("INV-2026-004");
  const [invoiceAmount, setInvoiceAmount] = useState("$4,250.00");
  const [dueDate, setDueDate] = useState("November 1, 2026");
  const [paymentUrl, setPaymentUrl] = useState("https://buy.stripe.com/...");

  const [contractTitle, setContractTitle] = useState("Master Services Agreement & Statement of Work");
  const [signingUrl, setSigningUrl] = useState("https://thevirtuslabs.com/sign");

  const [keyTakeaway, setKeyTakeaway] = useState("Streamlining legacy manual workflows into high-speed automated pipelines.");
  const [customPrompt, setCustomPrompt] = useState(
    "Request access to brand vector logo assets, brand guidelines, and Figma workspaces by this Friday."
  );

  // Generated Result
  const [generatedSubject, setGeneratedSubject] = useState(initialSubject);
  const [generatedBody, setGeneratedBody] = useState("");
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Pre-fill client when selected from dropdown
  const handleSelectClient = (compName: string) => {
    setCompany(compName);
    const found = clients.find((c) => c.company === compName);
    if (found) {
      setClientName(found.name || found.contactName || "");
      setRecipientEmail(found.email || "");
    }
  };

  const generateContent = () => {
    const cName = clientName.trim() || "there";
    const comp = company.trim() || "your team";

    let subj = "";
    let body = "";

    const toneSignoff =
      tone === "formal"
        ? "Sincerely,\nThe Virtus Labs Commercial Operations\nbilling@thevirtuslabs.com · thevirtuslabs.com"
        : tone === "consultative"
        ? "Warm regards,\nYour Virtus Studio Pod\nhello@thevirtuslabs.com · thevirtuslabs.com"
        : "Best regards,\nThe Virtus Labs Team\nhello@thevirtuslabs.com · thevirtuslabs.com";

    if (intent === "milestone_update") {
      subj = `Sprint Progress Update: ${milestoneName} (${comp})`;
      body = `Hello ${cName},

We are pleased to share our latest delivery progress update for ${comp}.

Project Status Overview:
• Active Milestone: ${milestoneName}
• Current Progress: ${progressPercent} complete
• Live Demo / Staging Preview: ${demoUrl}

Key Deliverables Completed:
• Architectural wireframes and structural system finalized
• Core high-performance frontend components integrated
• Visual direction and design tokens aligned with brand specifications

Target Next Steps:
${nextSteps}

Please review the progress demo at your earliest convenience and let us know if you have any questions or feedback.

${toneSignoff}`;
    } else if (intent === "proposal_followup") {
      subj = `Following Up: Strategic Proposal for ${comp} (${dealValue})`;
      body = `Hello ${cName},

I hope your week is off to a productive start.

Following our strategy review, I wanted to follow up on the tailored scope proposal we prepared for ${comp}.

Engagement Summary:
• Strategic Scope: ${proposalScope}
• Planned Investment: ${dealValue}
• SOW & Proposal Room: ${proposalUrl}

Our technical and creative pods are currently reserving capacity for the upcoming sprint cycle. Could we lock in 15 minutes this week to address any questions, refine deliverables, or confirm your launch schedule?

${toneSignoff}`;
    } else if (intent === "invoice_reminder") {
      subj = `Settlement Reminder: Invoice ${invoiceNumber} for ${comp} (${invoiceAmount})`;
      body = `Hello ${cName},

This is a courtesy reminder regarding Invoice ${invoiceNumber} for your active studio engagement with ${comp}.

Invoice Details:
• Invoice Number: ${invoiceNumber}
• Balance Due: ${invoiceAmount}
• Due Date: ${dueDate}
• Secure Payment Link: ${paymentUrl}

You can settle this invoice securely online via credit card, ACH transfer, or wire remittance. Please reference ${invoiceNumber} on all transfers.

If payment has already been initiated, please disregard this notice with our thanks.

${toneSignoff}`;
    } else if (intent === "contract_signing") {
      subj = `Action Required: Electronic Signature for ${contractTitle} (${comp})`;
      body = `Hello ${cName},

Your Master Services Agreement & Statement of Work for ${comp} is now prepared for secure digital execution.

Document Summary:
• Agreement: ${contractTitle}
• Signer: ${cName} (${comp})
• Digital Execution Portal: ${signingUrl}

Please review and execute the document using the secure link above. Upon completion, a countersigned copy will be automatically emailed to you, and our pod lead will immediately initiate your studio onboarding.

${toneSignoff}`;
    } else if (intent === "discovery_followup") {
      subj = `Key Takeaways & Recommended Roadmap: Discovery Session with ${comp}`;
      body = `Hello ${cName},

Thank you for your time during our discovery strategy session today. It was great learning more about ${comp} and your vision for scaling your digital architecture.

Key Objectives Diagnosed:
• Core Focus: ${keyTakeaway}
• Immediate Bottleneck: Streamlining performance and modernizing client touchpoints
• Recommended Solution: Bespoke digital architecture paired with automated workflows

Next Steps:
Our team is compiling a tailored Statement of Work and sprint delivery roadmap based on our discussion. We will dispatch the full proposal for your review within 24 business hours.

In the meantime, feel free to reply directly to this thread with any additional reference materials.

${toneSignoff}`;
    } else if (intent === "design_review") {
      subj = `Review & Feedback Request: Design Deliverables for ${comp}`;
      body = `Hello ${cName},

Our design pod has completed the latest batch of visual deliverables for ${comp} and they are now ready for your review.

Review Instructions:
• Deliverable Scope: ${milestoneName}
• Interactive Prototype: ${demoUrl}
• Target Feedback Cutoff: Within 3 business days

Please walk through the user flow and leave your comments directly inside the preview workspace or reply here with consolidated notes. We look forward to your thoughts!

${toneSignoff}`;
    } else {
      // custom_prompt
      subj = `Important Project Update: ${comp}`;
      body = `Hello ${cName},

I am writing regarding our active project collaboration for ${comp}.

${customPrompt.trim()}

Summary of Action Items:
• Please review the request above at your earliest convenience
• Provide any required assets, approvals, or references
• Let us know if you need any assistance from our studio pod

Thank you for your continued partnership.

${toneSignoff}`;
    }

    setGeneratedSubject(subj);
    setGeneratedBody(body);
    setHasGenerated(true);
  };

  const handleApply = () => {
    onApplyDraft({
      recipient: recipientEmail.trim(),
      subject: generatedSubject.trim(),
      body: generatedBody.trim(),
    });
    onClose();
  };

  const handleSaveToDrafts = () => {
    if (onSaveToDraftsFolder) {
      onSaveToDraftsFolder({
        recipient: recipientEmail.trim(),
        subject: generatedSubject.trim(),
        body: generatedBody.trim(),
      });
    }
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${generatedSubject}\n\n${generatedBody}`).then(() => {
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2500);
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="✨ Automated Studio Email Drafter">
      <div className="space-y-5 text-white font-mono text-xs max-h-[82vh] overflow-y-auto pr-1">
        {/* Intro */}
        <div className="p-3 bg-[#141414] border border-[#262626] rounded-lg text-gray-300 space-y-1">
          <p className="font-bold text-white flex items-center gap-1.5">
            <span className="text-[#FBD227]">⚡</span> Automated Email Content Generator
          </p>
          <p className="text-[11px] text-gray-400">
            Generate polished, studio-grade emails with one click. Select an automated email workflow, calibrate variables, and insert directly into your composer or save to drafts.
          </p>
        </div>

        {/* 1. Workflow & Tone Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Email Workflow / Intent</label>
            <select
              value={intent}
              onChange={(e) => setIntent(e.target.value as DraftIntent)}
              className={fieldClass}
            >
              <option value="milestone_update">🚀 Sprint & Milestone Progress Update</option>
              <option value="proposal_followup">📄 Proposal & SOW Follow-up</option>
              <option value="invoice_reminder">💳 Invoice Settlement Reminder</option>
              <option value="contract_signing">📝 Contract E-Signature Execution</option>
              <option value="discovery_followup">📅 Discovery Strategy Session Follow-up</option>
              <option value="design_review">🎨 Design Deliverable Review Request</option>
              <option value="custom_prompt">✍️ Custom Prompt AI Drafter</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Brand Tone & Voice</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as DraftTone)}
              className={fieldClass}
            >
              <option value="executive">Executive & Polished (Agency Standard)</option>
              <option value="consultative">Warm & Consultative (Collaborative)</option>
              <option value="direct">Direct & Action-Oriented (Concise)</option>
              <option value="formal">Formal Commercial (Billing / Legal)</option>
            </select>
          </div>
        </div>

        {/* 2. Recipient & Company Information */}
        <div className="p-3.5 bg-[#0D0D0D] border border-[#222222] rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#FBD227] font-bold">
              Recipient Context
            </span>
            {clients.length > 0 && (
              <span className="text-[10px] text-gray-500">Auto-fill from client directory</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Quick Client</label>
              <select
                value={company}
                onChange={(e) => handleSelectClient(e.target.value)}
                className={fieldClass}
              >
                <option value="">(Select client account)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.company}>
                    {c.company} ({c.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Contact Name</label>
              <input
                type="text"
                placeholder="e.g. Jordan Smith"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Recipient Email</label>
              <input
                type="email"
                placeholder="client@company.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
        </div>

        {/* 3. Workflow-Specific Dynamic Fields */}
        <div className="p-3.5 bg-[#0D0D0D] border border-[#222222] rounded-lg space-y-3">
          <span className="text-[11px] uppercase tracking-wider text-[#FBD227] font-bold block">
            Automated Parameters
          </span>

          {intent === "milestone_update" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Milestone Deliverable</label>
                <input
                  type="text"
                  value={milestoneName}
                  onChange={(e) => setMilestoneName(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Current Progress (%)</label>
                <input
                  type="text"
                  value={progressPercent}
                  onChange={(e) => setProgressPercent(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Demo / Staging Preview URL</label>
                <input
                  type="url"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Target Next Steps</label>
                <textarea
                  rows={2}
                  value={nextSteps}
                  onChange={(e) => setNextSteps(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
          )}

          {intent === "proposal_followup" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Proposal Scope Tier</label>
                <input
                  type="text"
                  value={proposalScope}
                  onChange={(e) => setProposalScope(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Planned Investment ($)</label>
                <input
                  type="text"
                  value={dealValue}
                  onChange={(e) => setDealValue(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Proposal Link</label>
                <input
                  type="url"
                  value={proposalUrl}
                  onChange={(e) => setProposalUrl(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
          )}

          {intent === "invoice_reminder" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Invoice Reference</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Balance Due ($)</label>
                <input
                  type="text"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Payment Due Date</label>
                <input
                  type="text"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Payment Link / Wire</label>
                <input
                  type="url"
                  value={paymentUrl}
                  onChange={(e) => setPaymentUrl(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
          )}

          {intent === "contract_signing" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Agreement Title</label>
                <input
                  type="text"
                  value={contractTitle}
                  onChange={(e) => setContractTitle(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Digital Signature URL</label>
                <input
                  type="url"
                  value={signingUrl}
                  onChange={(e) => setSigningUrl(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
          )}

          {intent === "discovery_followup" && (
            <div>
              <label className={labelClass}>Core Takeaway & Identified Bottleneck</label>
              <textarea
                rows={2}
                value={keyTakeaway}
                onChange={(e) => setKeyTakeaway(e.target.value)}
                className={fieldClass}
              />
            </div>
          )}

          {intent === "design_review" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Deliverable / Batch Name</label>
                <input
                  type="text"
                  value={milestoneName}
                  onChange={(e) => setMilestoneName(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Figma / Prototype Link</label>
                <input
                  type="url"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
          )}

          {intent === "custom_prompt" && (
            <div>
              <label className={labelClass}>Custom Instructions / Draft Prompt</label>
              <textarea
                rows={3}
                placeholder="Describe what this email should communicate..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className={fieldClass}
              />
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={generateContent}
              className="px-4 py-2 bg-[#FBD227] hover:bg-white text-black font-bold uppercase rounded text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-[#FBD227]/20"
            >
              <span>⚡ Generate Automated Draft</span>
            </button>
          </div>
        </div>

        {/* 4. Generated Output Preview & Inline Editor */}
        {hasGenerated && (
          <div className="border border-[#262626] bg-[#0A0A0A] p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#222222] pb-2">
              <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold">
                ✓ Generated Email Content
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2 py-0.5 rounded bg-[#1C1C1C] hover:bg-[#2C2C2C] text-gray-300 text-[11px] transition-colors"
                >
                  {copiedNotice ? "Copied! ✓" : "📋 Copy"}
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>Subject Line</label>
              <input
                type="text"
                value={generatedSubject}
                onChange={(e) => setGeneratedSubject(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Message Body</label>
              <textarea
                rows={9}
                value={generatedBody}
                onChange={(e) => setGeneratedBody(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#262626] flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={onClose} className={btnDark}>
            Close
          </button>

          <div className="flex items-center gap-2">
            {hasGenerated && onSaveToDraftsFolder && (
              <button
                type="button"
                onClick={handleSaveToDrafts}
                className="px-3 py-1.5 bg-[#1C1C1C] border border-[#333333] hover:border-white text-gray-200 rounded text-xs font-bold transition-colors"
              >
                💾 Save as Draft
              </button>
            )}
            <button
              type="button"
              disabled={!hasGenerated}
              onClick={handleApply}
              className={`${btnPrimary} ${!hasGenerated ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Icon name="check" className="mr-1 inline h-4 w-4 align-[-0.2em]" />
              Insert into Email Composer
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
