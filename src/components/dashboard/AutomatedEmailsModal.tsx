"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@/components/icons/Icon";
import { Modal, fieldClass, labelClass, btnPrimary, btnDark, btnGhost } from "./ui";
import type { AutomatedEmailTemplate } from "@/lib/emailTemplates";

interface AutomatedEmailsModalProps {
  open: boolean;
  onClose: () => void;
}

const COMMON_SYSTEM_VARS = [
  "{{clientName}}",
  "{{company}}",
  "{{service}}",
  "{{timeline}}",
  "{{dealValue}}",
  "{{bookingDate}}",
  "{{bookingTime}}",
  "{{meetingUrl}}",
  "{{hostName}}",
  "{{proposalUrl}}",
  "{{signingUrl}}",
  "{{invoiceNumber}}",
  "{{invoiceAmount}}",
  "{{dueDate}}",
  "{{portalUrl}}",
  "{{accessToken}}",
  "{{milestoneName}}",
  "{{reviewUrl}}",
];

export const AutomatedEmailsModal: React.FC<AutomatedEmailsModalProps> = ({ open, onClose }) => {
  const [templates, setTemplates] = useState<AutomatedEmailTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>("brief_confirmation");
  const [mode, setMode] = useState<"edit" | "create">("edit");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [_loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Active Template Form State (Edit Mode)
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [testEmailAddress, setTestEmailAddress] = useState("thevirtuslabs@gmail.com");

  // Create Mode Form State
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<AutomatedEmailTemplate["category"]>("Custom");
  const [newTrigger, setNewTrigger] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newVariables, setNewVariables] = useState<string[]>(["{{clientName}}", "{{company}}"]);
  const [customVarInput, setCustomVarInput] = useState("");

  // Fetch templates from API
  const loadTemplates = () => {
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
  };

  useEffect(() => {
    if (!open) return;
    loadTemplates();
  }, [open]);

  // When selected template changes, update form
  const handleSelectTemplate = (t: AutomatedEmailTemplate) => {
    setSelectedId(t.id);
    setSubject(t.subject);
    setBody(t.body);
    setEnabled(t.enabled);
    setMode("edit");
    setFeedback(null);
    setError(null);
  };

  const activeTemplate = templates.find((t) => t.id === selectedId);

  // Variable insertion
  const insertVariable = (varName: string) => {
    if (mode === "create") {
      setNewBody((prev) => `${prev} ${varName}`);
    } else {
      setBody((prev) => `${prev} ${varName}`);
    }
  };

  // Add custom variable to creator
  const handleAddCustomVar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customVarInput.trim()) return;
    const clean = customVarInput.trim().replace(/^\{+|\}+$/g, "");
    const formatted = `{{${clean}}}`;
    if (!newVariables.includes(formatted)) {
      setNewVariables((prev) => [...prev, formatted]);
    }
    setCustomVarInput("");
  };

  // Save Template Changes (Edit Mode)
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
        setFeedback("Template saved successfully! ✅");
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

  // Create Template from Scratch
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSubject.trim() || !newBody.trim()) {
      setError("Please fill in template name, subject, and body.");
      return;
    }

    setSaving(true);
    setFeedback(null);
    setError(null);

    try {
      const res = await fetch("/api/email/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_template",
          name: newName,
          category: newCategory,
          description: newTrigger || "Custom studio automation",
          triggerEvent: newTrigger || "Manual or event triggered",
          subject: newSubject,
          body: newBody,
          variables: newVariables,
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && data.template) {
        setTemplates((prev) => [...prev, data.template]);
        setSelectedId(data.template.id);
        setSubject(data.template.subject);
        setBody(data.template.body);
        setEnabled(data.template.enabled);
        setMode("edit");
        setFeedback("Custom template created from scratch! 🚀");
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setError(data?.error || "Failed to create template.");
      }
    } catch {
      setError("Network error creating template.");
    } finally {
      setSaving(false);
    }
  };

  // Delete Custom Template
  const handleDeleteTemplate = async () => {
    if (!activeTemplate || !activeTemplate.isCustom) return;
    if (!window.confirm(`Delete the custom template "${activeTemplate.name}"?`)) return;

    try {
      const res = await fetch(`/api/email/templates?id=${encodeURIComponent(activeTemplate.id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== activeTemplate.id));
        const remaining = templates.filter((t) => t.id !== activeTemplate.id);
        if (remaining.length > 0) {
          handleSelectTemplate(remaining[0]);
        }
        setFeedback("Custom template removed.");
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch {
      setError("Failed to delete template.");
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
        body: JSON.stringify({
          templateId: activeTemplate.id,
          testRecipient: testEmailAddress.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setFeedback(`Test email dispatched to ${data.recipient}! 🚀 Check your inbox.`);
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
  const renderPreview = (content: string) => {
    if (!content) return "";
    return content
      .replace(/\{\{clientName\}\}/g, "Alex Rivera")
      .replace(/\{\{company\}\}/g, "Apex Horizon Labs")
      .replace(/\{\{service\}\}/g, "Headless Web & Digital Architecture")
      .replace(/\{\{timeline\}\}/g, "2 to 4 weeks")
      .replace(/\{\{budget\}\}/g, "$7,500+")
      .replace(/\{\{dealValue\}\}/g, "$8,500")
      .replace(/\{\{bookingDate\}\}/g, "Friday, October 16, 2026")
      .replace(/\{\{bookingTime\}\}/g, "02:00 PM – 02:30 PM (PST)")
      .replace(/\{\{meetingUrl\}\}/g, "https://zoom.us/j/2842703476")
      .replace(/\{\{hostName\}\}/g, "Paks (Studio Director)")
      .replace(/\{\{proposalUrl\}\}/g, "https://thevirtuslabs.com/proposals/prop-apex-2026")
      .replace(/\{\{validUntil\}\}/g, "November 1, 2026")
      .replace(/\{\{contractTitle\}\}/g, "Master Services Agreement (MSA) & Sprint 1 SOW")
      .replace(/\{\{signingUrl\}\}/g, "https://thevirtuslabs.com/portal/sign/con-apex-992")
      .replace(/\{\{invoiceNumber\}\}/g, "INV-2026-089")
      .replace(/\{\{invoiceAmount\}\}/g, "$4,250.00")
      .replace(/\{\{dueDate\}\}/g, "October 10, 2026")
      .replace(/\{\{invoiceUrl\}\}/g, "https://thevirtuslabs.com/portal/invoice/inv-2026-089")
      .replace(/\{\{portalUrl\}\}/g, "https://thevirtuslabs.com/client/login")
      .replace(/\{\{accessToken\}\}/g, "TVL-PORTAL-8829-XP")
      .replace(/\{\{milestoneName\}\}/g, "Phase 1: Brand System & Interactive 3D Canvas")
      .replace(/\{\{reviewUrl\}\}/g, "https://thevirtuslabs.com/client/approval");
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesCat = categoryFilter === "all" || t.category === categoryFilter;
    const matchesQuery =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const categories = ["all", "Lead Acquisition", "Commercial & Billing", "Sprint Delivery", "Custom"];

  return (
    <Modal open={open} onClose={onClose} title="Automated Email Templates & Flows">
      <div className="flex flex-col space-y-4 text-white">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#262626] pb-3">
          <p className="text-xs text-[#999999] max-w-xl">
            Choose from predefined studio templates or craft customized automations from scratch. Automated emails dispatch via PrivateEmail SMTP.
          </p>

          <button
            type="button"
            onClick={() => {
              setMode("create");
              setNewName("");
              setNewTrigger("");
              setNewSubject("");
              setNewBody("");
              setFeedback(null);
              setError(null);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-sans font-bold uppercase tracking-wider transition-all ${
              mode === "create"
                ? "bg-[#FBD227] text-black shadow-md"
                : "border border-[#FBD227] text-[#FBD227] hover:bg-[#FBD227] hover:text-black"
            }`}
          >
            <Icon name="bolt" className="h-3.5 w-3.5" />
            + Create From Scratch
          </button>
        </div>

        {/* Feedback & Error Alerts */}
        {feedback && (
          <div className="rounded border border-emerald-500/40 bg-emerald-950/30 p-3 text-xs font-semibold text-emerald-300 flex items-center gap-2">
            <Icon name="check-circle" className="h-4 w-4 text-emerald-400" />
            <span>{feedback}</span>
          </div>
        )}
        {error && (
          <div className="rounded border border-rose-500/40 bg-rose-950/30 p-3 text-xs font-semibold text-rose-300 flex items-center gap-2">
            <Icon name="alert" className="h-4 w-4 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Two-Column Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[38rem]">
          {/* LEFT: Template Navigation & Filtering (4 cols) */}
          <div className="lg:col-span-4 border border-[#262626] bg-[#0E0E0E] rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              {/* Search Bar */}
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-[#333333] bg-[#161616] px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-[#FBD227] focus:outline-none"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 border-b border-[#222222]">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold transition-colors ${
                      categoryFilter === cat
                        ? "bg-[#FBD227] text-black"
                        : "bg-[#181818] text-gray-400 hover:text-white"
                    }`}
                  >
                    {cat === "all" ? "All" : cat}
                  </button>
                ))}
              </div>

              {/* Template Items List */}
              <div className="space-y-2 max-h-[30rem] overflow-y-auto pr-1">
                {filteredTemplates.length === 0 ? (
                  <p className="text-xs text-gray-500 italic p-3 text-center">No matching templates found.</p>
                ) : (
                  filteredTemplates.map((t) => {
                    const isSelected = selectedId === t.id && mode === "edit";
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTemplate(t)}
                        className={`cursor-pointer rounded-lg border p-3 transition-all ${
                          isSelected
                            ? "border-[#FBD227] bg-[#1A1A1A] shadow-md"
                            : "border-[#222222] bg-[#121212] hover:border-[#383838]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5 mb-1">
                          <span className="font-bold text-xs text-white leading-tight">{t.name}</span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                              t.enabled
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-gray-700/20 text-gray-400"
                            }`}
                          >
                            {t.enabled ? "Active" : "Disabled"}
                          </span>
                        </div>

                        <span className="text-[10px] font-mono text-[#FBD227] block mb-1">
                          {t.category || "General"} {t.isCustom && "· Custom"}
                        </span>
                        <p className="text-[11px] text-[#888888] line-clamp-2 leading-relaxed">
                          {t.description}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="border-t border-[#222222] pt-3 text-[11px] text-gray-500 font-mono">
              Total Automations: {templates.length}
            </div>
          </div>

          {/* RIGHT: Active Editor & Live Preview (8 cols) */}
          <div className="lg:col-span-8 border border-[#262626] bg-[#121212] rounded-xl p-5 overflow-y-auto max-h-[42rem]">
            {/* ----------------- MODE A: EDIT TEMPLATE ----------------- */}
            {mode === "edit" && activeTemplate && (
              <div className="space-y-5">
                {/* Header Information */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#262626] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-monument text-lg font-bold text-white uppercase">{activeTemplate.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FBD227]/10 text-[#FBD227] border border-[#FBD227]/30">
                        {activeTemplate.category || "General"}
                      </span>
                      {activeTemplate.isCustom && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#888888] mt-1">{activeTemplate.description}</p>
                    <span className="text-[11px] font-mono text-gray-500 block mt-0.5">
                      Trigger: {activeTemplate.triggerEvent}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeTemplate.isCustom && (
                      <button
                        type="button"
                        onClick={handleDeleteTemplate}
                        className="text-xs font-mono text-rose-400 hover:text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded"
                        title="Delete custom template"
                      >
                        Delete
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEnabled((v) => !v)}
                      className={`text-xs font-mono font-bold px-3 py-1 rounded border transition-colors ${
                        enabled
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-gray-800 text-gray-400 border-gray-700"
                      }`}
                    >
                      {enabled ? "✓ Automation Enabled" : "✕ Disabled"}
                    </button>
                  </div>
                </div>

                {/* Email Subject Line */}
                <div>
                  <label className={labelClass}>Subject Line</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className={fieldClass}
                  />
                </div>

                {/* Dynamic Variables Pill Bar */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                    Click to Insert Dynamic Variable
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(activeTemplate.variables || COMMON_SYSTEM_VARS).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(v)}
                        className="font-mono text-xs px-2.5 py-1 rounded bg-[#1C1C1C] border border-[#333333] text-[#FBD227] hover:border-[#FBD227] transition-all"
                        title="Click to insert into email body"
                      >
                        {v} +
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email Body Editor */}
                <div>
                  <label className={labelClass}>Email Body Copy</label>
                  <textarea
                    rows={8}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className={`${fieldClass} font-mono text-xs leading-relaxed`}
                  />
                </div>

                {/* Live Rendered Preview */}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Live Rendered Preview (Sample Client Data)
                  </span>
                  <div className="rounded-xl border border-[#333333] bg-[#0A0A0A] p-4 text-xs font-sans text-gray-300 space-y-2 whitespace-pre-line border-l-4 border-l-[#FBD227]">
                    <div className="font-bold text-white border-b border-[#222222] pb-2 font-mono">
                      Subject: {renderPreview(subject)}
                    </div>
                    <div>{renderPreview(body)}</div>
                  </div>
                </div>

                {/* Footer Controls: Save & Send Test */}
                <div className="border-t border-[#262626] pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      placeholder="test@example.com"
                      className="rounded border border-[#333333] bg-[#161616] px-3 py-1.5 text-xs text-white font-mono w-52"
                    />
                    <button
                      type="button"
                      disabled={testing}
                      onClick={handleSendTest}
                      className={btnDark}
                      title="Send real test email via PrivateEmail SMTP"
                    >
                      <Icon name="mail" />
                      {testing ? "Sending…" : "Send Test to Inbox"}
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSave}
                    className={btnPrimary}
                  >
                    <Icon name="check" />
                    {saving ? "Saving…" : "Save Template Changes"}
                  </button>
                </div>
              </div>
            )}

            {/* ----------------- MODE B: CREATE FROM SCRATCH ----------------- */}
            {mode === "create" && (
              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div className="border-b border-[#262626] pb-3">
                  <h3 className="font-monument text-lg font-bold text-white uppercase">
                    Assemble New Custom Template
                  </h3>
                  <p className="text-xs text-[#888888] mt-1">
                    Define custom email copy, parameters, and variable placeholders for your bespoke studio workflow.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Template Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. VIP Retainer Onboarding"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as AutomatedEmailTemplate["category"])}
                      className={fieldClass}
                    >
                      <option value="Custom">Custom Automation</option>
                      <option value="Lead Acquisition">Lead Acquisition</option>
                      <option value="Commercial & Billing">Commercial & Billing</option>
                      <option value="Sprint Delivery">Sprint Delivery</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Trigger Event / Context</label>
                  <input
                    type="text"
                    placeholder="e.g. Dispatched when a retainer client pays milestone deposit"
                    value={newTrigger}
                    onChange={(e) => setNewTrigger(e.target.value)}
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Subject Line *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Welcome to {{company}} Priority Sprint"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className={fieldClass}
                  />
                </div>

                {/* Variable Pills in Creator */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Available Dynamic Variables (Click to insert into body)
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {newVariables.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(v)}
                        className="font-mono text-xs px-2.5 py-1 rounded bg-[#1C1C1C] border border-[#333333] text-[#FBD227] hover:border-[#FBD227]"
                      >
                        {v} +
                      </button>
                    ))}
                  </div>

                  {/* Add Custom Variable Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add custom variable, e.g. {{portalUrl}}"
                      value={customVarInput}
                      onChange={(e) => setCustomVarInput(e.target.value)}
                      className="rounded border border-[#333333] bg-[#161616] px-2.5 py-1 text-xs text-white font-mono w-60"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomVar}
                      className="text-xs font-mono font-bold text-[#FBD227] border border-[#FBD227]/30 px-2 py-1 rounded hover:bg-[#FBD227]/10"
                    >
                      + Add Variable
                    </button>
                  </div>
                </div>

                {/* Body Textarea */}
                <div>
                  <label className={labelClass}>Body Copy *</label>
                  <textarea
                    rows={8}
                    required
                    placeholder="Write your email template body here. Use variables like {{clientName}} and {{company}}..."
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    className={`${fieldClass} font-mono text-xs leading-relaxed`}
                  />
                </div>

                {/* Live Preview */}
                {newBody && (
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                      Rendered Preview
                    </span>
                    <div className="rounded-xl border border-[#333333] bg-[#0A0A0A] p-4 text-xs font-sans text-gray-300 space-y-2 whitespace-pre-line border-l-4 border-l-[#FBD227]">
                      <div className="font-bold text-white border-b border-[#222222] pb-2 font-mono">
                        Subject: {renderPreview(newSubject)}
                      </div>
                      <div>{renderPreview(newBody)}</div>
                    </div>
                  </div>
                )}

                <div className="border-t border-[#262626] pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setMode("edit")}
                    className={btnGhost}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={btnPrimary}
                  >
                    <Icon name="check" />
                    {saving ? "Creating…" : "Save Custom Template"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
