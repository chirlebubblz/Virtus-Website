"use client";

import React, { useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { EmailAttachment } from "@/db";

interface FloatingDockedComposeProps {
  open: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  onToggleMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
  to: string;
  setTo: (val: string) => void;
  subject: string;
  setSubject: (val: string) => void;
  body: string;
  setBody: (val: string) => void;
  attachments: EmailAttachment[];
  onRemoveAttachment: (index: number) => void;
  onProcessFiles: (fileList: FileList | File[]) => void;
  formatFileSize: (bytes: number) => string;
  sending: boolean;
  draftSaved: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSaveDraft: () => void;
  onDiscardDraft: () => void;
  onOpenAIDrafter: () => void;
}

export const FloatingDockedCompose: React.FC<FloatingDockedComposeProps> = ({
  open,
  isMinimized,
  isMaximized,
  onToggleMinimize,
  onToggleMaximize,
  onClose,
  to,
  setTo,
  subject,
  setSubject,
  body,
  setBody,
  attachments,
  onRemoveAttachment,
  onProcessFiles,
  formatFileSize,
  sending,
  draftSaved,
  onSubmit,
  onSaveDraft,
  onDiscardDraft,
  onOpenAIDrafter,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!open) return null;

  // 1. Minimized View: Floating Dock Pill at bottom right
  if (isMinimized) {
    return (
      <div
        onClick={onToggleMinimize}
        className="fixed bottom-0 right-6 z-50 w-72 sm:w-80 bg-[#161616] border border-[#2D2D2D] rounded-t-lg shadow-2xl px-3 py-2.5 flex items-center justify-between text-xs font-mono text-white cursor-pointer hover:bg-[#1E1E1E] transition-all hover:border-[#FBD227]/50"
      >
        <div className="flex items-center gap-2 truncate">
          <Icon name="pencil" className="h-3.5 w-3.5 text-[#FBD227] shrink-0" />
          <span className="truncate font-semibold text-gray-200">
            {subject.trim() ? subject : to ? `Draft to: ${to}` : "New Message"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onToggleMinimize}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#2A2A2A]"
            title="Expand compose window"
          >
            <Icon name="maximize" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-[#2A2A2A]"
            title="Close draft"
          >
            <Icon name="close" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  const insertFormatting = (prefix: string, suffix = "") => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = el.value;
    const selectedText = val.substring(start, end) || "text";
    const nextVal = val.substring(0, start) + prefix + selectedText + suffix + val.substring(end);
    setBody(nextVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  const containerClasses = isMaximized
    ? "fixed inset-4 sm:inset-10 z-50 bg-[#111111] border border-[#2D2D2D] rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150"
    : "fixed bottom-0 right-4 sm:right-8 z-50 w-[580px] max-w-[94vw] h-[590px] max-h-[88vh] bg-[#111111] border border-[#2D2D2D] rounded-t-xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 duration-150";

  return (
    <div className={containerClasses}>
      {/* Gmail Window Header */}
      <div className="bg-[#181818] px-4 py-2.5 rounded-t-xl border-b border-[#262626] flex items-center justify-between text-xs font-mono text-gray-300 select-none">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-white truncate">
            {subject.trim() ? subject : "New Message"}
          </span>
          {draftSaved && (
            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.2 rounded font-sans">
              Saved
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleMinimize}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#252525] transition-colors"
            title="Minimize"
          >
            <Icon name="minus" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggleMaximize}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#252525] transition-colors"
            title={isMaximized ? "Restore size" : "Full screen"}
          >
            <Icon name={isMaximized ? "minimize" : "maximize"} className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-[#252525] transition-colors"
            title="Save draft and close"
          >
            <Icon name="close" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Form Area */}
      <form onSubmit={onSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
        <div className="p-3 sm:p-4 space-y-2 overflow-y-auto flex-1 font-sans text-xs">
          {/* Recipients Row */}
          <div className="flex items-center border-b border-[#222222] pb-1.5 focus-within:border-[#FBD227]/60 transition-colors">
            <span className="text-gray-500 font-mono text-xs w-16 shrink-0">To</span>
            <input
              type="email"
              required
              disabled={sending}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="client@company.com"
              className="w-full bg-transparent text-white outline-none placeholder-gray-600 text-xs font-mono"
            />
          </div>

          {/* Subject Line Row */}
          <div className="flex items-center border-b border-[#222222] pb-1.5 focus-within:border-[#FBD227]/60 transition-colors">
            <span className="text-gray-500 font-mono text-xs w-16 shrink-0">Subject</span>
            <input
              type="text"
              required
              disabled={sending}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject line"
              className="w-full bg-transparent text-white font-medium outline-none placeholder-gray-600 text-xs font-sans"
            />
          </div>

          {/* AI Drafter Quick Trigger Bar */}
          <div className="flex items-center justify-between py-1 bg-[#151515] px-2.5 rounded border border-[#222222]">
            <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1.5">
              <span>Dispatched via <code className="text-[#FBD227]">hello@thevirtuslabs.com</code></span>
            </span>
            <button
              type="button"
              onClick={onOpenAIDrafter}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1C1C1C] hover:bg-[#242424] border border-[#FBD227]/40 text-[#FBD227] text-[11px] font-mono transition-colors cursor-pointer"
              title="Automate email body using Studio templates and presets"
            >
              <span>✨ AI Drafter</span>
            </button>
          </div>

          {/* Rich Formatting Strip */}
          <div className="flex items-center gap-1 bg-[#141414] px-2 py-1 rounded border border-[#222222] text-gray-400 font-mono text-xs">
            <button
              type="button"
              onClick={() => insertFormatting("**", "**")}
              className="px-1.5 py-0.5 rounded hover:bg-[#222] hover:text-white font-bold"
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("*", "*")}
              className="px-1.5 py-0.5 rounded hover:bg-[#222] hover:text-white italic"
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("\n• ")}
              className="px-1.5 py-0.5 rounded hover:bg-[#222] hover:text-white"
              title="Bullet list"
            >
              • List
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("[", "](https://)")}
              className="px-1.5 py-0.5 rounded hover:bg-[#222] hover:text-white"
              title="Link"
            >
              🔗 Link
            </button>
            <div className="h-3 w-[1px] bg-[#2A2A2A] mx-1" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-1.5 py-0.5 rounded hover:bg-[#222] hover:text-[#FBD227] flex items-center gap-1"
              title="Attach files (up to 10 MB each)"
            >
              <Icon name="paperclip" className="h-3.5 w-3.5 text-[#FBD227]" />
              <span>Attach</span>
            </button>
          </div>

          {/* Email Body Textarea */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                onProcessFiles(e.dataTransfer.files);
              }
            }}
            className={`flex-1 relative transition-colors ${
              isDragging ? "bg-[#FBD227]/5 ring-1 ring-[#FBD227]" : ""
            }`}
          >
            <textarea
              ref={textareaRef}
              rows={isMaximized ? 18 : 10}
              required
              disabled={sending}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email here, or click '✨ AI Drafter' above to auto-generate from studio templates..."
              className="w-full h-full bg-transparent text-white text-xs leading-relaxed outline-none placeholder-gray-600 resize-none font-sans"
            />
            {isDragging && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded border-2 border-dashed border-[#FBD227] text-xs font-mono text-[#FBD227]">
                Drop attachments here
              </div>
            )}
          </div>

          {/* Attachments Chips */}
          {attachments.length > 0 && (
            <div className="pt-2 border-t border-[#222222] space-y-1.5">
              <div className="text-[11px] font-mono text-gray-400 flex items-center gap-1.5">
                <Icon name="paperclip" className="h-3 w-3 text-[#FBD227]" />
                <span>{attachments.length} Attachment{attachments.length > 1 ? "s" : ""}:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {attachments.map((att, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] border border-[#2A2A2A] text-xs font-mono text-gray-200"
                  >
                    <Icon name="paperclip" className="h-3 w-3 text-[#FBD227]" />
                    <span className="max-w-[150px] truncate font-medium">{att.filename}</span>
                    <span className="text-[10px] text-gray-500">({formatFileSize(att.size)})</span>
                    <button
                      type="button"
                      onClick={() => onRemoveAttachment(idx)}
                      className="text-gray-500 hover:text-rose-400 font-bold ml-0.5 cursor-pointer"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onProcessFiles(e.target.files);
                e.target.value = "";
              }
            }}
          />
        </div>

        {/* Gmail Bottom Actions Strip */}
        <div className="p-3 bg-[#151515] border-t border-[#242424] flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={sending || !to || !subject || !body}
              className="px-4 py-2 rounded-lg bg-[#FBD227] hover:bg-[#ffe25c] text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-[#FBD227]/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Icon name="send" className="h-3.5 w-3.5" />
              <span>{sending ? "Sending..." : "Send"}</span>
            </button>

            <button
              type="button"
              onClick={onSaveDraft}
              disabled={!to && !subject && !body}
              className="px-2.5 py-1.5 rounded text-gray-400 hover:text-[#FBD227] hover:bg-[#222] transition-colors disabled:opacity-30 disabled:hover:text-gray-400 cursor-pointer"
              title="Save to Drafts mailbox folder"
            >
              <span>Save draft</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDiscardDraft}
              className="p-1.5 rounded text-gray-500 hover:text-rose-400 hover:bg-[#222] transition-colors cursor-pointer"
              title="Discard draft"
            >
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
