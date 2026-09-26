"use client";

import React, { useState } from "react";
import { db, EmailThread } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { Modal, fieldClass } from "./ui";

export const BusinessEmailView: React.FC = () => {
  const [emails, setEmails] = useState<EmailThread[]>(() => db.getEmailThreads());
  const [activeFolder, setActiveFolder] = useState<"inbox" | "inquiries" | "sent">("inbox");
  const [selectedEmail, setSelectedEmail] = useState<EmailThread | undefined>(emails[0]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Compose Form
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const folderFiltered = emails.filter((m) => {
    if (activeFolder === "inquiries") return m.folder === "inquiries";
    if (activeFolder === "sent") return m.folder === "sent";
    return m.folder === "inbox" || m.folder === "inquiries";
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail || !subject) return;

    const newSent = db.sendEmail({
      sender: "Paks (Studio Director)",
      senderEmail: "paks@thevirtuslabs.com",
      recipient: toEmail,
      subject,
      preview: body.substring(0, 70) + "...",
      body,
      folder: "sent",
    });

    setEmails(db.getEmailThreads());
    setSelectedEmail(newSent);
    setIsComposeOpen(false);
    setToEmail("");
    setSubject("");
    setBody("");
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-[#000000]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-500">
              Operations OS · Email
            </span>
          </div>
          <h1 className="font-monument text-2xl sm:text-3xl font-black text-[#000000] tracking-tight mt-1 uppercase">
            Business Email & Inquiries
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Client threads and website brief inquiries. Email delivery is not connected yet, so composed messages are saved here only.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsComposeOpen(true)}
          className="border-2 border-black bg-black text-[#FBD227] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider shadow-xs hover:bg-[#FBD227] hover:text-black transition-colors"
        >
          <Icon name="pencil" className="mr-1.5 inline h-4 w-4 align-[-0.2em]" />Compose Email
        </button>
      </div>

      {/* Split-pane Email Client */}
      <div className="bg-white border border-gray-300 rounded-lg shadow-2xs overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[38rem]">
        {/* Left Column: Folders (3 cols on md) */}
        <div className="md:col-span-3 border-r border-gray-200 p-4 bg-gray-50/50 flex flex-col justify-between font-mono text-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600 block px-2 mb-2">
              Mailboxes
            </span>
            <button
              type="button"
              aria-pressed={activeFolder === "inbox"}
              onClick={() => setActiveFolder("inbox")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded font-bold transition-colors ${
                activeFolder === "inbox"
                  ? "bg-black text-[#FBD227]"
                  : "text-gray-700 hover:bg-gray-200/60"
              }`}
            >
              <span className="inline-flex items-center gap-2"><Icon name="inbox" className="h-4 w-4" />Inbox</span>
              <span className="text-xs bg-gray-200 text-black px-1.5 py-0.2 rounded font-mono">
                {emails.filter((m) => m.folder === "inbox").length}
              </span>
            </button>
            <button
              type="button"
              aria-pressed={activeFolder === "inquiries"}
              onClick={() => setActiveFolder("inquiries")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded font-bold transition-colors ${
                activeFolder === "inquiries"
                  ? "bg-black text-[#FBD227]"
                  : "text-gray-700 hover:bg-gray-200/60"
              }`}
            >
              <span className="inline-flex items-center gap-2"><Icon name="bolt" className="h-4 w-4" />Brief Inquiries</span>
              <span className="text-xs bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-mono">
                {emails.filter((m) => m.folder === "inquiries").length}
              </span>
            </button>
            <button
              type="button"
              aria-pressed={activeFolder === "sent"}
              onClick={() => setActiveFolder("sent")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded font-bold transition-colors ${
                activeFolder === "sent"
                  ? "bg-black text-[#FBD227]"
                  : "text-gray-700 hover:bg-gray-200/60"
              }`}
            >
              <span className="inline-flex items-center gap-2"><Icon name="send" className="h-4 w-4" />Sent</span>
              <span className="text-xs text-gray-600">
                {emails.filter((m) => m.folder === "sent").length}
              </span>
            </button>
          </div>

          <div className="pt-4 border-t border-gray-200 text-xs text-gray-500">
            <span className="font-bold block text-black">Not connected to a mail server</span>
            <span>Messages composed here are stored in this workspace and not delivered.</span>
          </div>
        </div>

        {/* Middle Column: Thread List (4 cols on md) */}
        <div className="md:col-span-4 border-r border-gray-200 divide-y divide-gray-100 overflow-y-auto max-h-[38rem]">
          {folderFiltered.length === 0 && (
            <p className="p-6 text-center font-mono text-xs text-gray-600">No messages in this folder.</p>
          )}
          {folderFiltered.map((msg) => {
            const isSelected = selectedEmail?.id === msg.id;
            return (
              <div
                key={msg.id}
                onClick={() => setSelectedEmail(msg)}
                className={`p-3.5 cursor-pointer transition-colors ${
                  isSelected ? "bg-amber-50/70 border-l-4 border-black" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-gray-900 truncate max-w-[160px]">
                    {msg.sender}
                  </span>
                  <span className="font-mono text-xs text-gray-600 shrink-0">
                    {msg.timestamp.split(",")[0]}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-gray-800 leading-snug line-clamp-1">
                  {msg.subject}
                </h4>
                <p className="text-[0.72rem] text-gray-500 line-clamp-2 mt-1 leading-normal">
                  {msg.preview}
                </p>
              </div>
            );
          })}
        </div>

        {/* Right Column: Email Content View (5 cols on md) */}
        <div className="md:col-span-5 p-5 flex flex-col justify-between overflow-y-auto max-h-[38rem] bg-white">
          {selectedEmail ? (
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-3">
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-bold uppercase">
                  {selectedEmail.folder}
                </span>
                <h2 className="text-base font-bold text-gray-900 mt-2 leading-snug">
                  {selectedEmail.subject}
                </h2>
                <div className="flex items-center justify-between text-xs text-gray-500 font-mono mt-2">
                  <div>
                    <span className="font-bold text-black">{selectedEmail.sender}</span> (
                    {selectedEmail.senderEmail})
                  </div>
                  <span>{selectedEmail.timestamp}</span>
                </div>
              </div>

              <div className="whitespace-pre-line text-xs sm:text-sm text-gray-800 leading-relaxed font-sans">
                {selectedEmail.body}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-gray-600 font-mono text-xs">
              Select an email from the left to read
            </div>
          )}

          {/* Quick Actions at bottom */}
          {selectedEmail && (
            <div className="pt-4 border-t border-gray-200 flex items-center justify-between gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  setToEmail(selectedEmail.senderEmail);
                  setSubject(`Re: ${selectedEmail.subject}`);
                  setIsComposeOpen(true);
                }}
                className="px-3.5 py-1.5 rounded bg-black text-[#FBD227] font-bold hover:bg-[#FBD227] hover:text-black transition-colors"
              >
                Reply
              </button>

            </div>
          )}
        </div>
      </div>

      {/* Compose Email Modal */}
      <Modal open={isComposeOpen} onClose={() => setIsComposeOpen(false)} title="Compose message">
        <div>
          <p className="mb-4 font-mono text-xs text-gray-700">
            Email delivery is not connected. This saves the message to Sent in this workspace only.
          </p>
            <form onSubmit={handleSend} className="space-y-4 font-mono text-xs">
              <div>
                <label htmlFor="mail-field-1" className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  To (Recipient Email) *
                </label>
                <input id="mail-field-1"
                  type="email"
                  required
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  placeholder="client@company.com"
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="mail-field-2" className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Subject Line *
                </label>
                <input id="mail-field-2"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Sprint 2 Prototype Review & Next Steps"
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="mail-field-3" className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Message Body *
                </label>
                <textarea id="mail-field-3"
                  rows={5}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your email message..."
                  className={fieldClass}
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded font-bold text-gray-700 hover:bg-gray-100"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-[#FBD227] border-2 border-black font-bold uppercase tracking-wider hover:bg-[#FBD227] hover:text-black transition-colors"
                >
                  Save to sent
                </button>
              </div>
            </form>
        </div>
      </Modal>
    </div>
  );
};
