"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import type { RevisionTicket } from "@/db";
import { Icon } from "@/components/icons/Icon";

const CATEGORIES = [
  "Visual & UI Styling",
  "Copy & Typography",
  "Functionality & Interactions",
  "Mobile Responsiveness",
  "Brand Assets & Colors",
];
const TARGET_AREAS = [
  "Overall project",
  "Design & visuals",
  "Copy & content",
  "Functionality",
  "Mobile experience",
  "Other",
];
const PRIORITIES: { value: "routine" | "important" | "blocker"; label: string }[] = [
  { value: "routine", label: "Routine" },
  { value: "important", label: "Important" },
  { value: "blocker", label: "Blocker" },
];

interface RevisionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: (ticket: RevisionTicket) => void;
}

const fieldClass =
  "w-full border border-white/25 bg-[#111111] px-3 py-2.5 font-sans text-base text-white placeholder-[#8A8A8A] focus:border-[#FBD227] focus:outline-none focus:ring-2 focus:ring-[#FBD227]/40";
const labelClass = "mb-2 block font-sans text-eyebrow font-bold uppercase text-[#D4D4D4]";

export function RevisionDialog({ open, onClose, onSubmitted }: RevisionDialogProps) {
  const uid = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const [categories, setCategories] = useState<string[]>([CATEGORIES[0]]);
  const [targetArea, setTargetArea] = useState(TARGET_AREAS[0]);
  const [priority, setPriority] = useState<"routine" | "important" | "blocker">("important");
  const [details, setDetails] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [attachmentName, setAttachmentName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLTextAreaElement>("textarea")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const reset = () => {
    setCategories([CATEGORIES[0]]);
    setTargetArea(TARGET_AREAS[0]);
    setPriority("important");
    setDetails("");
    setReferenceUrl("");
    setAttachments([]);
    setAttachmentName("");
    setError(null);
  };

  const toggleCategory = (category: string) =>
    setCategories((current) =>
      current.includes(category)
        ? current.length > 1
          ? current.filter((c) => c !== category)
          : current
        : [...current, category]
    );

  const addAttachment = () => {
    const name = attachmentName.trim();
    if (name && attachments.length < 10) {
      setAttachments((current) => [...current, name]);
      setAttachmentName("");
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (!details.trim()) {
      setError("Describe the changes you would like.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/client/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories, targetArea, priority, details, referenceUrl, attachments }),
      });
      if (res.status === 401) {
        window.location.assign("/client/login?reason=expired");
        return;
      }
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        setError(body?.error ?? "Could not send your request. Try again.");
        return;
      }
      onSubmitted(body.data as RevisionTicket);
      reset();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Backdrop click: the click target is the dialog element itself, not its form.
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby={`${uid}-title`}
      className="m-auto w-[calc(100%-2rem)] max-w-2xl border border-white/20 bg-[#0F0F0F] p-0 text-white [color-scheme:dark] shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={submit} noValidate>
        <div className="flex items-center justify-between border-b border-white/15 px-5 py-4 sm:px-8">
          <h2 id={`${uid}-title`} className="font-monument text-xl font-bold uppercase text-white">
            Request changes
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center border border-white/25 text-white hover:border-[#FBD227] hover:text-[#FBD227] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#FBD227]"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-8">
          <fieldset>
            <legend className={labelClass}>What needs work? (select all that apply)</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => {
                const selected = categories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleCategory(category)}
                    className={`border border-white/25 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#FBD227] px-3 py-2 font-sans text-sm font-bold ${
                      selected ? "border-[#FBD227] bg-[#FBD227] text-black" : "bg-transparent text-white hover:border-[#FBD227] hover:text-[#FBD227]"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor={`${uid}-area`} className={labelClass}>
                Where?
              </label>
              <select
                id={`${uid}-area`}
                value={targetArea}
                onChange={(e) => setTargetArea(e.target.value)}
                className={fieldClass}
              >
                {TARGET_AREAS.map((area) => (
                  <option key={area}>{area}</option>
                ))}
              </select>
            </div>
            <fieldset>
              <legend className={labelClass}>Priority</legend>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    aria-pressed={priority === p.value}
                    onClick={() => setPriority(p.value)}
                    className={`flex-1 border border-white/25 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#FBD227] px-2 py-2.5 font-sans text-sm font-bold ${
                      priority === p.value ? "border-[#FBD227] bg-[#FBD227] text-black" : "bg-transparent text-white hover:border-[#FBD227] hover:text-[#FBD227]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div>
            <label htmlFor={`${uid}-details`} className={labelClass}>
              Describe the changes
            </label>
            <textarea
              id={`${uid}-details`}
              rows={6}
              maxLength={4000}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className={fieldClass}
              placeholder="One change per line works best."
            />
          </div>

          <div>
            <label htmlFor={`${uid}-ref`} className={labelClass}>
              Reference link (optional)
            </label>
            <input
              id={`${uid}-ref`}
              type="url"
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              className={fieldClass}
              placeholder="https://"
            />
          </div>

          <div>
            <label htmlFor={`${uid}-file`} className={labelClass}>
              Files you will send us (optional)
            </label>
            <div className="flex gap-2">
              <input
                id={`${uid}-file`}
                value={attachmentName}
                onChange={(e) => setAttachmentName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAttachment();
                  }
                }}
                className={fieldClass}
                placeholder="File name, e.g. hero-markup.png"
              />
              <button
                type="button"
                onClick={addAttachment}
                className="border border-white/25 px-4 font-sans text-eyebrow font-bold uppercase text-white hover:border-[#FBD227] hover:text-[#FBD227] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#FBD227]"
              >
                Add
              </button>
            </div>
            {attachments.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {attachments.map((name, index) => (
                  <li key={`${name}-${index}`} className="flex items-center gap-2 border border-white/25 px-2 py-1 font-sans text-sm text-white">
                    {name}
                    <button
                      type="button"
                      aria-label={`Remove ${name}`}
                      onClick={() => setAttachments((c) => c.filter((_, i) => i !== index))}
                      className="font-bold hover:underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#FBD227]"
                    >
                      <Icon name="close" className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 font-sans text-sm text-[#A3A3A3]">
              File names only. Your account lead will ask you to share the files by email.
            </p>
          </div>

          {error && (
            <p role="alert" className="border-l-4 border-[#DD7230] bg-[#DD7230]/15 px-4 py-3 font-sans text-base font-semibold text-white">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/15 px-5 py-4 sm:flex-row sm:justify-end sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="border-2 border-white/25 px-6 py-3 font-sans text-eyebrow font-bold uppercase text-white hover:border-[#FBD227] hover:text-[#FBD227] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#FBD227]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="border-2 border-[#FBD227] bg-[#FBD227] px-6 py-3 font-sans text-eyebrow font-bold uppercase text-black hover:bg-transparent hover:text-[#FBD227] disabled:opacity-60 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#FBD227]"
          >
            {pending ? "Sending…" : "Send request"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
