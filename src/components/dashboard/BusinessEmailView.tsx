"use client";

import React, { useState } from "react";
import { db, EmailThread } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { Modal, fieldClass, labelClass, btnPrimary, btnDark } from "./ui";

export const BusinessEmailView: React.FC = () => {
  const [emails, setEmails] = useState<EmailThread[]>(() => db.getEmailThreads());
  const [activeFolder, setActiveFolder] = useState<"inbox" | "inquiries" | "sent">("inbox");
  const [selectedEmail, setSelectedEmail] = useState<EmailThread | undefined>(emails[0]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Compose Form
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const folderFiltered = emails.filter((m) => {
    if (activeFolder === "inquiries") return m.folder === "inquiries";
    if (activeFolder === "sent") return m.folder === "sent";
    return m.folder === "inbox" || m.folder === "inquiries";
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail || !subject || sending) return;

    setSending(true);
    setSendError(null);

    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: toEmail, subject, body }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Failed to send email (Status ${res.status})`);
      }

      const newSent = db.sendEmail({
        sender: "The Virtus Labs",
        senderEmail: "hello@thevirtuslabs.com",
        recipient: toEmail,
        subject,
        preview: body.substring(0, 70) + "...",
        body,
        folder: "sent",
      });

      setEmails(db.getEmailThreads());
      setSelectedEmail(newSent);
      setActiveFolder("sent");
      setIsComposeOpen(false);
      setToEmail("");
      setSubject("");
      setBody("");
      setSuccessNotice(`Email dispatched successfully to ${toEmail}`);
      setTimeout(() => setSuccessNotice(null), 6000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send email.";
      setSendError(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-white font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#262626] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-400">
              Operations OS · Email
            </span>
          </div>
          <h1 className="font-monument text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 uppercase">
            Business Email & Inquiries
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Client threads and website brief inquiries. Outgoing emails are dispatched via PrivateEmail SMTP.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSendError(null);
            setIsComposeOpen(true);
          }}
          className={btnPrimary}
        >
          <Icon name="pencil" className="mr-1.5 inline h-4 w-4 align-[-0.2em]" />Compose Email
        </button>
      </div>

      {/* Success Notification */}
      {successNotice && (
        <div className="p-3.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Icon name="check-circle" className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="text-gray-400 hover:text-white px-2 py-0.5 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Split-pane Email Client */}
      <div className="bg-[#111111] border border-[#262626] rounded-lg shadow-2xs overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[38rem]">
        {/* Left Column: Folders (3 cols on md) */}
        <div className="md:col-span-3 border-r border-[#262626] p-4 bg-[#0E0E0E] flex flex-col justify-between font-mono text-xs">
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block px-2 mb-2">
              Mailboxes
            </span>
            <button
              type="button"
              aria-pressed={activeFolder === "inbox"}
              onClick={() => setActiveFolder("inbox")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded font-bold transition-colors ${
                activeFolder === "inbox"
                  ? "bg-[#FBD227] text-black"
                  : "text-gray-400 hover:bg-[#1A1A1A] hover:text-white"
              }`}
            >
              <span className="inline-flex items-center gap-2"><Icon name="inbox" className="h-4 w-4" />Inbox</span>
              <span className={`text-xs px-1.5 py-0.2 rounded font-mono ${activeFolder === "inbox" ? "bg-black text-[#FBD227]" : "bg-[#1C1C1C] text-gray-300"}`}>
                {emails.filter((m) => m.folder === "inbox").length}
              </span>
            </button>
            <button
              type="button"
              aria-pressed={activeFolder === "inquiries"}
              onClick={() => setActiveFolder("inquiries")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded font-bold transition-colors ${
                activeFolder === "inquiries"
                  ? "bg-[#FBD227] text-black"
                  : "text-gray-400 hover:bg-[#1A1A1A] hover:text-white"
              }`}
            >
              <span className="inline-flex items-center gap-2"><Icon name="bolt" className="h-4 w-4" />Brief Inquiries</span>
              <span className={`text-xs px-1.5 py-0.2 rounded font-mono ${activeFolder === "inquiries" ? "bg-black text-[#FBD227]" : "bg-[#1C1C1C] text-gray-300"}`}>
                {emails.filter((m) => m.folder === "inquiries").length}
              </span>
            </button>
            <button
              type="button"
              aria-pressed={activeFolder === "sent"}
              onClick={() => setActiveFolder("sent")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded font-bold transition-colors ${
                activeFolder === "sent"
                  ? "bg-[#FBD227] text-black"
                  : "text-gray-400 hover:bg-[#1A1A1A] hover:text-white"
              }`}
            >
              <span className="inline-flex items-center gap-2"><Icon name="send" className="h-4 w-4" />Sent</span>
              <span className={`text-xs px-1.5 py-0.2 rounded font-mono ${activeFolder === "sent" ? "bg-black text-[#FBD227]" : "bg-[#1C1C1C] text-gray-300"}`}>
                {emails.filter((m) => m.folder === "sent").length}
              </span>
            </button>
          </div>

          <div className="pt-4 border-t border-[#262626] text-xs text-gray-500">
            <span className="font-bold block text-gray-300">PrivateEmail SMTP</span>
            <span>Dispatched via hello@thevirtuslabs.com (mail.privateemail.com).</span>
          </div>
        </div>

        {/* Middle Column: Thread List (4 cols on md) */}
        <div className="md:col-span-4 border-r border-[#262626] divide-y divide-[#1F1F1F] overflow-y-auto max-h-[38rem] bg-[#111111]">
          {folderFiltered.length === 0 && (
            <p className="p-6 text-center font-mono text-xs text-gray-500">No messages in this folder.</p>
          )}
          {folderFiltered.map((msg) => {
            const isSelected = selectedEmail?.id === msg.id;
            return (
              <div
                key={msg.id}
                onClick={() => setSelectedEmail(msg)}
                className={`p-3.5 cursor-pointer transition-colors ${
                  isSelected ? "bg-[#1A1A1A] border-l-4 border-[#FBD227]" : "hover:bg-[#161616]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-white truncate max-w-[160px]">
                    {msg.sender}
                  </span>
                  <span className="font-mono text-xs text-gray-400 shrink-0">
                    {msg.timestamp.split(",")[0]}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-gray-200 leading-snug line-clamp-1">
                  {msg.subject}
                </h4>
                <p className="text-[0.72rem] text-gray-400 line-clamp-2 mt-1 leading-normal">
                  {msg.preview}
                </p>
              </div>
            );
          })}
        </div>

        {/* Right Column: Email Content View (5 cols on md) */}
        <div className="md:col-span-5 p-5 flex flex-col justify-between overflow-y-auto max-h-[38rem] bg-[#0E0E0E]">
          {selectedEmail ? (
            <div className="space-y-4">
              <div className="border-b border-[#262626] pb-3">
                <span className="font-mono text-xs bg-[#1C1C1C] border border-[#262626] px-2 py-0.5 rounded text-[#FBD227] font-bold uppercase">
                  {selectedEmail.folder}
                </span>
                <h2 className="text-base font-bold text-white mt-2 leading-snug font-monument">
                  {selectedEmail.subject}
                </h2>
                <div className="flex items-center justify-between text-xs text-gray-400 font-mono mt-2">
                  <div>
                    <span className="font-bold text-white">{selectedEmail.sender}</span> (
                    {selectedEmail.senderEmail})
                  </div>
                  <span>{selectedEmail.timestamp}</span>
                </div>
              </div>

              <div className="whitespace-pre-line text-xs sm:text-sm text-gray-300 leading-relaxed font-sans">
                {selectedEmail.body}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-gray-500 font-mono text-xs">
              Select an email from the left to read
            </div>
          )}

          {/* Quick Actions at bottom */}
          {selectedEmail && (
            <div className="pt-4 border-t border-[#262626] flex items-center justify-between gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  setToEmail(selectedEmail.senderEmail);
                  setSubject(`Re: ${selectedEmail.subject}`);
                  setIsComposeOpen(true);
                }}
                className="px-3.5 py-1.5 rounded bg-[#FBD227] text-black font-bold hover:bg-white transition-colors"
              >
                Reply
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Compose Email Modal */}
      <Modal open={isComposeOpen} onClose={() => { if (!sending) setIsComposeOpen(false); }} title="Compose email">
        <div>
          <p className="mb-4 font-mono text-xs text-gray-400">
            Dispatched via PrivateEmail SMTP (<code className="text-[#FBD227]">hello@thevirtuslabs.com</code>). Message will be delivered directly to the recipient and logged in Sent.
          </p>

          {sendError && (
            <div className="mb-4 p-3 rounded bg-red-950/70 border border-red-500/50 text-red-200 text-xs font-mono space-y-1">
              <span className="font-bold text-red-400 block">Delivery Error:</span>
              <p>{sendError}</p>
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-4 font-mono text-xs text-white">
            <div>
              <label htmlFor="mail-field-1" className={labelClass}>
                To (Recipient Email) *
              </label>
              <input id="mail-field-1"
                type="email"
                required
                disabled={sending}
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="client@company.com"
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="mail-field-2" className={labelClass}>
                Subject Line *
              </label>
              <input id="mail-field-2"
                type="text"
                required
                disabled={sending}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Sprint 2 Prototype Review & Next Steps"
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="mail-field-3" className={labelClass}>
                Message Body *
              </label>
              <textarea id="mail-field-3"
                rows={6}
                required
                disabled={sending}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email message..."
                className={fieldClass}
              />
            </div>

            <div className="pt-3 border-t border-[#262626] flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={sending}
                onClick={() => setIsComposeOpen(false)}
                className={`${btnDark} ${sending ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={sending}
                className={`${btnPrimary} ${sending ? "opacity-75 cursor-wait" : ""}`}
              >
                {sending ? "Sending..." : "Send Email"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
