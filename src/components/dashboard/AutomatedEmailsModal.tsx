"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@/components/icons/Icon";
import { Modal, fieldClass, labelClass, btnPrimary, btnDark } from "./ui";
import type { AutomatedEmailTemplate } from "@/lib/emailTemplates";

interface AutomatedEmailsModalProps {
  open: boolean;
  onClose: () => void;
}

export const AutomatedEmailsModal: React.FC<AutomatedEmailsModalProps> = ({ open, onClose }) => {
  const [templates, setTemplates] = useState<AutomatedEmailTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>("brief_confirmation");
  const [_loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Active Template Form State
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [enabled, setEnabled] = useState(true);

  // Fetch templates from API
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch("/api/email/templates")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.ok && Array.isArray(data.templates)) {
          setTemplates(data.templates);
          const current = data.templates.find((t: AutomatedEmailTemplate) => t.id === selectedId) || data.templates[0];
          if (current) {
            setSelectedId(current.id);
            setSubject(current.subject);
            setBody(current.body);
            setEnabled(current.enabled);
          }
        }
      })
      .catch(() => setError("Failed to load automated email templates."))
      .finally(() => setLoading(false));
  }, [open]);

  // When selected template changes, update form
  const handleSelectTemplate = (t: AutomatedEmailTemplate) => {
    setSelectedId(t.id);
    setSubject(t.subject);
    setBody(t.body);
    setEnabled(t.enabled);
    setFeedback(null);
    setError(null);
  };

  const activeTemplate = templates.find((t) => t.id === selectedId);

  // Variable insertion into active body
  const insertVariable = (varName: string) => {
    setBody((prev) => `${prev} ${varName}`);
  };

  // Save Template Changes
  const handleSave = async () => {
    if (!activeTemplate) return;
    setSaving(true);
    setFeedback(null);
    setError(null);

    const updated: AutomatedEmailTemplate = {
      ...activeTemplate,
      subject,
      body,
      enabled,
    };

    try {
      const res = await fetch("/api/email/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: updated }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setTemplates((list) => list.map((t) => (t.id === updated.id ? updated : t)));
        setFeedback("Automated email template saved successfully! ✅");
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setError(data?.error || "Could not save template.");
      }
    } catch {
      setError("Network error saving template.");
    } finally {
      setSaving(false);
    }
  };

  // Send Live Test Email via SMTP
  const handleSendTest = async () => {
    if (!activeTemplate) return;
    setTesting(true);
    setFeedback(null);
    setError(null);

    try {
      const res = await fetch("/api/email/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: activeTemplate.id }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setFeedback(`Test email dispatched to ${data.recipient || "thevirtuslabs@gmail.com"}! 🚀 Check your inbox.`);
        setTimeout(() => setFeedback(null), 6000);
      } else {
        setError(data?.error || "Failed to dispatch test email.");
      }
    } catch {
      setError("Network error dispatching test email.");
    } finally {
      setTesting(false);
    }
  };

  // Live preview rendered with sample data
  const renderPreview = () => {
    if (!body) return "";
    return body
      .replace(/\{\{clientName\}\}/g, "Alex Rivera")
      .replace(/\{\{company\}\}/g, "Apex Horizon Labs")
      .replace(/\{\{service\}\}/g, "Headless Web & Digital Architecture")
      .replace(/\{\{timeline\}\}/g, "2 to 4 weeks")
      .replace(/\{\{budget\}\}/g, "$7,500+")
      .replace(/\{\{bookingDate\}\}/g, "Friday, October 16, 2026")
      .replace(/\{\{bookingTime\}\}/g, "02:00 PM – 02:30 PM (PST)")
      .replace(/\{\{meetingUrl\}\}/g, "https://meet.google.com/tvl-disc-8922")
      .replace(/\{\{hostName\}\}/g, "Paks (Studio Director)")
      .replace(/\{\{clientEmail\}\}/g, "alex@apexhorizon.io")
      .replace(/\{\{phone\}\}/g, "+1 (555) 234-5678")
      .replace(/\{\{dealValue\}\}/g, "$8,500")
      .replace(/\{\{bottleneck\}\}/g, "High drop-off on mobile checkout and manual lead booking")
      .replace(/\{\{upsellName\}\}/g, "3D Photorealistic Canister Visuals (+$1,500)");
  };

  return (
    <Modal open={open} onClose={onClose} title="Automated Emails & Sequences">
      <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1 font-sans text-white">
        <p className="font-mono text-xs text-gray-400">
          Configure automated email responses sent via <code className="text-[#FBD227]">hello@thevirtuslabs.com</code> when visitors submit inquiries, book discovery calls, or accept project add-ons.
        </p>

        {feedback && (
          <div className="p-3 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between">
            <span>{feedback}</span>
            <button type="button" onClick={() => setFeedback(null)} className="text-gray-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 rounded bg-red-950/70 border border-red-500/50 text-red-200 text-xs font-mono flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-gray-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Template Selector Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {templates.map((tmpl) => {
            const isSelected = tmpl.id === selectedId;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleSelectTemplate(tmpl)}
                className={`p-3 rounded text-left transition-all border ${
                  isSelected
                    ? "bg-[#181818] border-[#FBD227] shadow-md"
                    : "bg-[#111111] border-[#222222] hover:bg-[#141414] hover:border-[#333333]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${tmpl.enabled ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40" : "bg-[#222222] text-gray-500"}`}>
                    {tmpl.enabled ? "Active" : "Paused"}
                  </span>
                  {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-[#FBD227]" />}
                </div>
                <h4 className="font-bold text-xs text-white line-clamp-1">{tmpl.name}</h4>
                <p className="text-[10px] text-gray-400 line-clamp-2 mt-1 font-mono">{tmpl.triggerEvent}</p>
              </button>
            );
          })}
        </div>

        {/* Selected Template Editor */}
        {activeTemplate && (
          <div className="p-5 rounded-lg bg-[#111111] border border-[#262626] space-y-5">
            {/* Header with Enable Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222222] pb-4">
              <div>
                <h3 className="font-monument text-sm font-bold text-white uppercase">{activeTemplate.name}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{activeTemplate.description}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono text-gray-300">Automation Status:</span>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold transition-colors border ${
                    enabled
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                      : "bg-[#222222] text-gray-400 border-[#333333]"
                  }`}
                >
                  {enabled ? "✓ Enabled" : "✕ Paused"}
                </button>
              </div>
            </div>

            {/* Subject Line Field */}
            <div className="space-y-1.5 font-mono text-xs">
              <label htmlFor="tpl-subject" className={labelClass}>
                Email Subject Line *
              </label>
              <input
                id="tpl-subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={fieldClass}
                placeholder="Subject line..."
              />
            </div>

            {/* Dynamic Variable Pill Inserters */}
            <div className="space-y-1.5">
              <span className="text-xs font-mono text-gray-400 block font-bold">
                Insert Dynamic Variables (click to insert into body):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(activeTemplate.variables || []).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="px-2 py-0.5 rounded bg-[#1C1C1C] hover:bg-[#262626] text-xs font-mono text-[#FBD227] border border-[#333333] transition-colors"
                    title={`Click to append ${v} into message body`}
                  >
                    + {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Body Copy Textarea */}
            <div className="space-y-1.5 font-mono text-xs">
              <label htmlFor="tpl-body" className={labelClass}>
                Message Body Copy *
              </label>
              <textarea
                id="tpl-body"
                rows={9}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className={`${fieldClass} resize-y font-mono text-xs`}
                placeholder="Write your email body copy..."
              />
            </div>

            {/* Live Preview Box */}
            <div className="space-y-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Icon name="mail" className="h-3.5 w-3.5" />
                Live Preview (How Client Sees It)
              </span>
              <div className="p-4 rounded bg-[#0A0A0A] border border-[#222222] font-mono text-xs text-gray-300 whitespace-pre-line leading-relaxed">
                <div className="border-b border-[#222222] pb-2 mb-3 text-gray-400 text-[11px]">
                  <strong>Subject:</strong> {subject.replace(/\{\{company\}\}/g, "Apex Horizon Labs").replace(/\{\{clientName\}\}/g, "Alex Rivera")}
                </div>
                {renderPreview()}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-4 border-t border-[#222222] flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">
              <button
                type="button"
                onClick={handleSendTest}
                disabled={testing}
                className={`${btnDark} inline-flex items-center gap-1.5`}
                title="Send a real test email to thevirtuslabs@gmail.com"
              >
                <Icon name="send" className="h-3.5 w-3.5" />
                {testing ? "Sending Test..." : "Send Test to My Inbox"}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={btnDark}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !subject || !body}
                  className={`${btnPrimary} ${saving ? "opacity-75 cursor-wait" : ""}`}
                >
                  {saving ? "Saving..." : "Save Template Changes"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
