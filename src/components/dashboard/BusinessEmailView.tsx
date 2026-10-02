"use client";

import React, { useState, useEffect, useRef } from "react";
import { db, EmailThread, EmailMessage } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { Modal, fieldClass, labelClass, btnPrimary, btnDark } from "./ui";
import { AutomatedEmailsModal } from "./AutomatedEmailsModal";

interface PendingDispatch {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  isReply: boolean;
}

export const BusinessEmailView: React.FC = () => {
  const [emails, setEmails] = useState<EmailThread[]>(() => db.getEmailThreads());
  const [activeFolder, setActiveFolder] = useState<"inbox" | "inquiries" | "sent" | "starred">("inbox");
  const [selectedEmail, setSelectedEmail] = useState<EmailThread | undefined>(emails[0]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // Compose Form
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [composeDraftSaved, setComposeDraftSaved] = useState(false);

  // Inline Reply Form
  const [replyBody, setReplyBody] = useState("");
  const [replyDraftSaved, setReplyDraftSaved] = useState(false);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  // Sending, Feedback & Undo Send
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [pendingDispatch, setPendingDispatch] = useState<PendingDispatch | null>(null);
  const [undoSeconds, setUndoSeconds] = useState(5);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const undoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial IMAP Sync on component mount
  const handleSync = async (silent = false) => {
    if (syncing) return;
    if (!silent) setSyncing(true);
    try {
      const res = await fetch("/api/email/sync");
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && Array.isArray(data.emails)) {
        db.syncIncomingEmails(data.emails);
        const updated = db.getEmailThreads();
        setEmails(updated);
        setSelectedEmail((prev) => {
          if (!prev) return updated[0];
          return updated.find((e) => e.id === prev.id) || prev;
        });
        const nowStr = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date());
        setLastSynced(nowStr);
        if (!silent && data.emails.length > 0) {
          setSuccessNotice(`Synced ${data.emails.length} emails from Namecheap PrivateEmail.`);
          setTimeout(() => setSuccessNotice(null), 5000);
        }
      } else if (!silent && data?.error) {
        setSendError(data.error);
      }
    } catch (err: unknown) {
      if (!silent) {
        const msg = err instanceof Error ? err.message : "Failed to sync inbox.";
        setSendError(msg);
      }
    } finally {
      if (!silent) setSyncing(false);
    }
  };

  useEffect(() => {
    // Sync on initial mount
    void handleSync(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. LocalStorage Auto-Drafting for Compose Modal
  useEffect(() => {
    if (isComposeOpen) {
      const saved = localStorage.getItem("tvl_email_compose_draft");
      if (saved && !toEmail && !subject && !body) {
        try {
          const parsed = JSON.parse(saved);
          setToEmail(parsed.to || "");
          setSubject(parsed.subject || "");
          setBody(parsed.body || "");
        } catch {
          // ignore corrupted local storage
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComposeOpen]);

  useEffect(() => {
    if (isComposeOpen && (toEmail || subject || body)) {
      localStorage.setItem("tvl_email_compose_draft", JSON.stringify({ to: toEmail, subject, body }));
      setComposeDraftSaved(true);
      const timer = setTimeout(() => setComposeDraftSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [toEmail, subject, body, isComposeOpen]);

  // 3. LocalStorage Auto-Drafting for Inline Reply
  useEffect(() => {
    if (selectedEmail) {
      const saved = localStorage.getItem(`tvl_draft_reply_${selectedEmail.id}`);
      setReplyBody(saved || "");
    }
  }, [selectedEmail?.id]);

  useEffect(() => {
    if (selectedEmail && replyBody) {
      localStorage.setItem(`tvl_draft_reply_${selectedEmail.id}`, replyBody);
      setReplyDraftSaved(true);
      const timer = setTimeout(() => setReplyDraftSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [replyBody, selectedEmail?.id]);

  // Star Toggle
  const handleToggleStar = (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    db.toggleStar(threadId);
    setEmails(db.getEmailThreads());
    setSelectedEmail((prev) => (prev?.id === threadId ? { ...prev, starred: !prev.starred } : prev));
  };

  // Filter messages by activeFolder and search query
  const folderFiltered = emails.filter((m) => {
    // 1. Folder match
    if (activeFolder === "starred") {
      if (!m.starred) return false;
    } else if (activeFolder === "inquiries") {
      if (m.folder !== "inquiries") return false;
    } else if (activeFolder === "sent") {
      if (m.folder !== "sent") return false;
    } else {
      // inbox includes standard incoming and inquiries
      if (m.folder !== "inbox" && m.folder !== "inquiries") return false;
    }

    // 2. Search match
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.subject.toLowerCase().includes(q) ||
      m.sender.toLowerCase().includes(q) ||
      m.senderEmail.toLowerCase().includes(q) ||
      m.preview.toLowerCase().includes(q) ||
      m.body.toLowerCase().includes(q)
    );
  });

  // 4. Physical Dispatch Function (called after Undo countdown or on Send Now)
  const executePhysicalDispatch = async (dispatch: PendingDispatch) => {
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: dispatch.to,
          subject: dispatch.subject,
          body: dispatch.body,
          inReplyTo: dispatch.inReplyTo,
          references: dispatch.inReplyTo,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Delivery failed (Status ${res.status})`);
      }

      if (dispatch.isReply && dispatch.threadId) {
        // Append message to existing thread
        const updatedThread = db.addReplyToThread(dispatch.threadId, {
          sender: "The Virtus Labs",
          senderEmail: "hello@thevirtuslabs.com",
          recipient: dispatch.to,
          body: dispatch.body,
        });
        setEmails(db.getEmailThreads());
        if (updatedThread) setSelectedEmail({ ...updatedThread });
        localStorage.removeItem(`tvl_draft_reply_${dispatch.threadId}`);
        setReplyBody("");
      } else {
        // Create new Sent email
        const newSent = db.sendEmail({
          sender: "The Virtus Labs",
          senderEmail: "hello@thevirtuslabs.com",
          recipient: dispatch.to,
          subject: dispatch.subject,
          preview: dispatch.body.substring(0, 70) + "...",
          body: dispatch.body,
          folder: "sent",
        });
        setEmails(db.getEmailThreads());
        setSelectedEmail(newSent);
        setActiveFolder("sent");
        setIsComposeOpen(false);
        setToEmail("");
        setSubject("");
        setBody("");
        localStorage.removeItem("tvl_email_compose_draft");
      }

      setSuccessNotice(`Email dispatched successfully to ${dispatch.to}`);
      setTimeout(() => setSuccessNotice(null), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to deliver email.";
      setSendError(msg);
    } finally {
      setSending(false);
      setPendingDispatch(null);
    }
  };

  // 5. Initiate Sending with 5-Second Undo Grace Period
  const startUndoCountdown = (dispatch: PendingDispatch) => {
    // Clear any existing timer
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);

    setPendingDispatch(dispatch);
    setUndoSeconds(5);

    // If modal is open, close it so user sees the undo bar
    if (isComposeOpen) setIsComposeOpen(false);

    undoIntervalRef.current = setInterval(() => {
      setUndoSeconds((s) => {
        if (s <= 1) {
          if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    undoTimerRef.current = setTimeout(() => {
      void executePhysicalDispatch(dispatch);
    }, 5000);
  };

  const handleCancelUndo = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    const cancelled = pendingDispatch;
    setPendingDispatch(null);
    if (cancelled && !cancelled.isReply) {
      // Re-open compose modal with content preserved
      setIsComposeOpen(true);
    }
    setSuccessNotice("Dispatch cancelled. Draft preserved.");
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const handleSendNowImmediately = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    if (pendingDispatch) {
      void executePhysicalDispatch(pendingDispatch);
    }
  };

  // Handle Form Submissions
  const handleComposeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail || !subject || !body || sending) return;
    startUndoCountdown({
      to: toEmail,
      subject,
      body,
      isReply: false,
    });
  };

  const handleInlineReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmail || !replyBody.trim() || sending) return;
    const dest = selectedEmail.senderEmail || selectedEmail.recipient;
    const subj = selectedEmail.subject.startsWith("Re:") ? selectedEmail.subject : `Re: ${selectedEmail.subject}`;
    startUndoCountdown({
      to: dest,
      subject: subj,
      body: replyBody.trim(),
      threadId: selectedEmail.id,
      inReplyTo: selectedEmail.messageId,
      isReply: true,
    });
  };

  // Rich Text Helpers (Formatting insertions)
  const insertFormatting = (target: "compose" | "reply", prefix: string, suffix = "") => {
    if (target === "reply" && replyInputRef.current) {
      const el = replyInputRef.current;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const val = el.value;
      const selectedText = val.substring(start, end) || "text";
      const nextVal = val.substring(0, start) + prefix + selectedText + suffix + val.substring(end);
      setReplyBody(nextVal);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
      }, 0);
    } else if (target === "compose") {
      setBody((prev) => prev + `\n${prefix}text${suffix}`);
    }
  };

  // Discard draft handlers
  const discardReplyDraft = () => {
    if (selectedEmail) {
      localStorage.removeItem(`tvl_draft_reply_${selectedEmail.id}`);
      setReplyBody("");
    }
  };

  const discardComposeDraft = () => {
    localStorage.removeItem("tvl_email_compose_draft");
    setToEmail("");
    setSubject("");
    setBody("");
    setIsComposeOpen(false);
  };

  // Build thread message stack for conversation view
  const conversationMessages: EmailMessage[] = selectedEmail?.messages && selectedEmail.messages.length > 0
    ? selectedEmail.messages
    : selectedEmail
    ? [
        {
          id: selectedEmail.id,
          sender: selectedEmail.sender,
          senderEmail: selectedEmail.senderEmail,
          recipient: selectedEmail.recipient,
          body: selectedEmail.body,
          timestamp: selectedEmail.timestamp,
        },
      ]
    : [];

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-white font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#262626] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-400">
              Operations OS · Email Hub
            </span>
            {lastSynced && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A1A1A] border border-[#262626] text-gray-400">
                Synced {lastSynced}
              </span>
            )}
          </div>
          <h1 className="font-monument text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 uppercase">
            Business Email & Inquiries
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            2-way IMAP sync & SMTP dispatch via <code className="text-[#FBD227]">hello@thevirtuslabs.com</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSync(false)}
            disabled={syncing}
            className={`${btnDark} inline-flex items-center gap-1.5`}
            title="Fetch new incoming emails from Namecheap PrivateEmail (IMAP)"
          >
            <span className={`inline-block ${syncing ? "animate-spin" : ""}`}>
              <Icon name="refresh" className="h-4 w-4" />
            </span>
            {syncing ? "Syncing..." : "Sync Inbox"}
          </button>

          <button
            type="button"
            onClick={() => setIsTemplatesOpen(true)}
            className={`${btnDark} inline-flex items-center gap-1.5`}
            title="Configure automated email responses & sequences"
          >
            <Icon name="settings" className="h-4 w-4 text-[#FBD227]" />
            <span>Automations</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSendError(null);
              setIsComposeOpen(true);
            }}
            className={btnPrimary}
          >
            <Icon name="pencil" className="mr-1.5 inline h-4 w-4 align-[-0.2em]" />Compose
          </button>
        </div>
      </div>

      {/* Global Notifications */}
      {successNotice && (
        <div className="p-3.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Icon name="check-circle" className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button type="button" onClick={() => setSuccessNotice(null)} className="text-gray-400 hover:text-white px-2">
            ✕
          </button>
        </div>
      )}

      {sendError && (
        <div className="p-3.5 rounded bg-red-950/70 border border-red-500/50 text-red-200 text-xs font-mono flex items-center justify-between shadow-lg">
          <span className="font-bold">Error: {sendError}</span>
          <button type="button" onClick={() => setSendError(null)} className="text-gray-400 hover:text-white px-2">
            ✕
          </button>
        </div>
      )}

      {/* Split-pane Email Client */}
      <div className="bg-[#111111] border border-[#262626] rounded-lg shadow-2xs overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[42rem]">
        {/* Left Column: Mailboxes (3 cols on md) */}
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
                activeFolder === "inbox" ? "bg-[#FBD227] text-black" : "text-gray-400 hover:bg-[#1A1A1A] hover:text-white"
              }`}
            >
              <span className="inline-flex items-center gap-2"><Icon name="inbox" className="h-4 w-4" />Inbox</span>
              <span className={`text-xs px-1.5 py-0.2 rounded font-mono ${activeFolder === "inbox" ? "bg-black text-[#FBD227]" : "bg-[#1C1C1C] text-gray-300"}`}>
                {emails.filter((m) => m.folder === "inbox").length}
              </span>
            </button>

            <button
              type="button"
              aria-pressed={activeFolder === "starred"}
              onClick={() => setActiveFolder("starred")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded font-bold transition-colors ${
                activeFolder === "starred" ? "bg-[#FBD227] text-black" : "text-gray-400 hover:bg-[#1A1A1A] hover:text-white"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Icon name="star" className={`h-4 w-4 ${activeFolder === "starred" ? "text-black" : "text-amber-400"}`} />
                Starred
              </span>
              <span className={`text-xs px-1.5 py-0.2 rounded font-mono ${activeFolder === "starred" ? "bg-black text-[#FBD227]" : "bg-[#1C1C1C] text-gray-300"}`}>
                {emails.filter((m) => m.starred).length}
              </span>
            </button>

            <button
              type="button"
              aria-pressed={activeFolder === "inquiries"}
              onClick={() => setActiveFolder("inquiries")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded font-bold transition-colors ${
                activeFolder === "inquiries" ? "bg-[#FBD227] text-black" : "text-gray-400 hover:bg-[#1A1A1A] hover:text-white"
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
                activeFolder === "sent" ? "bg-[#FBD227] text-black" : "text-gray-400 hover:bg-[#1A1A1A] hover:text-white"
              }`}
            >
              <span className="inline-flex items-center gap-2"><Icon name="send" className="h-4 w-4" />Sent</span>
              <span className={`text-xs px-1.5 py-0.2 rounded font-mono ${activeFolder === "sent" ? "bg-black text-[#FBD227]" : "bg-[#1C1C1C] text-gray-300"}`}>
                {emails.filter((m) => m.folder === "sent").length}
              </span>
            </button>
          </div>

          <div className="pt-4 border-t border-[#262626] text-xs text-gray-500 space-y-1">
            <span className="font-bold block text-gray-300">Namecheap PrivateEmail</span>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              <span>IMAP 993 / SMTP 465 Active</span>
            </div>
            <p className="text-[10px] text-gray-500">Connected to hello@thevirtuslabs.com</p>
          </div>
        </div>

        {/* Middle Column: Thread List with Search (4 cols on md) */}
        <div className="md:col-span-4 border-r border-[#262626] flex flex-col bg-[#111111] max-h-[42rem]">
          {/* Gmail-Style Search Bar */}
          <div className="p-3 border-b border-[#262626] bg-[#0E0E0E]">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-500">
                <Icon name="search" className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search mail by sender, topic or body..."
                className="w-full pl-8 pr-7 py-1.5 bg-[#181818] border border-[#262626] focus:border-[#FBD227] rounded text-xs font-mono text-white placeholder-gray-500 outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-500 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Threads list */}
          <div className="divide-y divide-[#1F1F1F] overflow-y-auto flex-1">
            {folderFiltered.length === 0 && (
              <div className="p-8 text-center font-mono text-xs text-gray-500">
                {searchQuery ? "No emails matching your search." : "No messages in this folder."}
              </div>
            )}
            {folderFiltered.map((msg) => {
              const isSelected = selectedEmail?.id === msg.id;
              const hasReplies = msg.messages && msg.messages.length > 1;
              return (
                <div
                  key={msg.id}
                  onClick={() => setSelectedEmail(msg)}
                  className={`p-3.5 cursor-pointer transition-colors relative group ${
                    isSelected ? "bg-[#1A1A1A] border-l-4 border-[#FBD227]" : "hover:bg-[#161616]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                      <button
                        type="button"
                        onClick={(e) => handleToggleStar(e, msg.id)}
                        className="text-gray-500 hover:text-amber-400 shrink-0"
                        title={msg.starred ? "Unstar" : "Star"}
                      >
                        <Icon
                          name="star"
                          className={`h-3.5 w-3.5 ${msg.starred ? "text-amber-400 fill-amber-400" : "text-gray-600 hover:text-gray-400"}`}
                        />
                      </button>
                      <span className="font-bold text-xs text-white truncate">{msg.sender}</span>
                      {hasReplies && (
                        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[#262626] text-[#FBD227]">
                          {msg.messages?.length}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs text-gray-400 shrink-0">{msg.timestamp.split(",")[0]}</span>
                  </div>
                  <h4 className="font-bold text-xs text-gray-200 leading-snug line-clamp-1">{msg.subject}</h4>
                  <p className="text-[0.72rem] text-gray-400 line-clamp-2 mt-1 leading-normal">{msg.preview}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Gmail-Style Conversation Thread & Inline Reply (5 cols on md) */}
        <div className="md:col-span-5 flex flex-col justify-between overflow-y-auto max-h-[42rem] bg-[#0E0E0E]">
          {selectedEmail ? (
            <div className="p-5 flex-1 flex flex-col justify-between space-y-6">
              {/* Thread Header */}
              <div className="border-b border-[#262626] pb-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs bg-[#1C1C1C] border border-[#262626] px-2 py-0.5 rounded text-[#FBD227] font-bold uppercase">
                    {selectedEmail.folder}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleToggleStar(e, selectedEmail.id)}
                    className="flex items-center gap-1.5 text-xs font-mono text-gray-400 hover:text-amber-400"
                  >
                    <Icon
                      name="star"
                      className={`h-4 w-4 ${selectedEmail.starred ? "text-amber-400 fill-amber-400" : "text-gray-500"}`}
                    />
                    <span>{selectedEmail.starred ? "Starred" : "Star"}</span>
                  </button>
                </div>

                <h2 className="text-base sm:text-lg font-bold text-white mt-2 leading-snug font-monument">
                  {selectedEmail.subject}
                </h2>
              </div>

              {/* Conversation Messages Stack */}
              <div className="space-y-4 flex-1">
                {conversationMessages.map((msg, index) => {
                  const isVirtus = msg.senderEmail.toLowerCase().includes("thevirtuslabs");
                  const initial = msg.sender.charAt(0).toUpperCase() || "V";

                  return (
                    <div
                      key={msg.id || index}
                      className={`p-4 rounded-lg border text-xs font-sans ${
                        isVirtus
                          ? "bg-[#141414] border-[#2A2A2A] ml-2 sm:ml-4"
                          : "bg-[#111111] border-[#222222] mr-2 sm:mr-4"
                      }`}
                    >
                      {/* Message author header */}
                      <div className="flex items-center justify-between mb-3 border-b border-[#1F1F1F] pb-2 font-mono">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs ${
                              isVirtus ? "bg-[#FBD227] text-black" : "bg-[#2A2A2A] text-white"
                            }`}
                          >
                            {initial}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{msg.sender}</span>
                            <span className="text-[11px] text-gray-500">{msg.senderEmail}</span>
                          </div>
                        </div>
                        <span className="text-[11px] text-gray-400 shrink-0">{msg.timestamp}</span>
                      </div>

                      {/* Message body */}
                      <div className="whitespace-pre-line text-xs text-gray-300 leading-relaxed">
                        {msg.body}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Gmail-Style Inline Reply Box */}
              <div className="pt-4 border-t border-[#262626]">
                <form onSubmit={handleInlineReplySubmit} className="space-y-3">
                  <div className="flex items-center justify-between font-mono text-xs text-gray-400">
                    <span>
                      Reply to: <strong className="text-white">{selectedEmail.senderEmail || selectedEmail.recipient}</strong>
                    </span>
                    {replyDraftSaved && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                        Draft saved
                      </span>
                    )}
                  </div>

                  {/* Formatting Toolbar */}
                  <div className="flex items-center gap-1 bg-[#161616] p-1.5 rounded-t border-t border-x border-[#2A2A2A]">
                    <button
                      type="button"
                      onClick={() => insertFormatting("reply", "**", "**")}
                      className="px-2 py-0.5 rounded text-xs font-bold text-gray-300 hover:bg-[#262626] hover:text-white"
                      title="Bold (**text**)"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting("reply", "*", "*")}
                      className="px-2 py-0.5 rounded text-xs italic text-gray-300 hover:bg-[#262626] hover:text-white"
                      title="Italic (*text*)"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting("reply", "\n• ")}
                      className="px-2 py-0.5 rounded text-xs text-gray-300 hover:bg-[#262626] hover:text-white"
                      title="Bullet list"
                    >
                      • List
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting("reply", "[", "](https://)")}
                      className="px-2 py-0.5 rounded text-xs text-gray-300 hover:bg-[#262626] hover:text-white"
                      title="Insert link"
                    >
                      🔗 Link
                    </button>
                  </div>

                  {/* Textarea */}
                  <textarea
                    ref={replyInputRef}
                    rows={4}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder={`Reply to ${selectedEmail.sender}...`}
                    disabled={sending}
                    className="w-full p-3 bg-[#111111] border-b border-x border-[#2A2A2A] rounded-b text-xs font-mono text-white placeholder-gray-500 outline-none focus:border-[#FBD227] resize-y"
                  />

                  {/* Actions */}
                  <div className="flex items-center justify-between font-mono text-xs">
                    <button
                      type="button"
                      onClick={discardReplyDraft}
                      disabled={!replyBody}
                      className="text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Discard draft
                    </button>

                    <button
                      type="submit"
                      disabled={!replyBody.trim() || sending}
                      className={`${btnPrimary} ${sending ? "opacity-75 cursor-wait" : ""}`}
                    >
                      <Icon name="send" className="h-3.5 w-3.5 mr-1.5 inline align-[-0.15em]" />
                      Send Reply
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="text-center py-32 text-gray-500 font-mono text-xs">
              Select an email from the list to view conversation
            </div>
          )}
        </div>
      </div>

      {/* Floating Gmail-Style "Undo Send" Notification Bar */}
      {pendingDispatch && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-lg bg-[#181818] border-2 border-[#FBD227] shadow-2xl flex items-center gap-4 text-xs font-mono animate-bounce-once">
          <div className="flex items-center gap-2 text-white">
            <span className="h-2 w-2 rounded-full bg-[#FBD227] animate-ping"></span>
            <span>
              Sending to <strong className="text-[#FBD227]">{pendingDispatch.to}</strong> in {undoSeconds}s...
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelUndo}
              className="px-3 py-1 rounded bg-[#262626] hover:bg-[#333333] text-white font-bold transition-colors"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={handleSendNowImmediately}
              className="px-3 py-1 rounded bg-[#FBD227] hover:bg-white text-black font-bold transition-colors"
            >
              Send now
            </button>
          </div>
        </div>
      )}

      {/* Compose Email Modal */}
      <Modal open={isComposeOpen} onClose={() => { if (!sending) setIsComposeOpen(false); }} title="Compose email">
        <div>
          <div className="flex items-center justify-between mb-4 font-mono text-xs text-gray-400">
            <p>
              Dispatched via PrivateEmail SMTP (<code className="text-[#FBD227]">hello@thevirtuslabs.com</code>).
            </p>
            {composeDraftSaved && (
              <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                Draft saved
              </span>
            )}
          </div>

          <form onSubmit={handleComposeSubmit} className="space-y-4 font-mono text-xs text-white">
            <div>
              <label htmlFor="mail-field-1" className={labelClass}>
                To (Recipient Email) *
              </label>
              <input
                id="mail-field-1"
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
              <input
                id="mail-field-2"
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
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="mail-field-3" className={labelClass}>
                  Message Body *
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => insertFormatting("compose", "**", "**")}
                    className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-[#1C1C1C] text-gray-300 hover:text-white"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting("compose", "*", "*")}
                    className="px-1.5 py-0.5 rounded text-[11px] italic bg-[#1C1C1C] text-gray-300 hover:text-white"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting("compose", "\n• ")}
                    className="px-1.5 py-0.5 rounded text-[11px] bg-[#1C1C1C] text-gray-300 hover:text-white"
                  >
                    • List
                  </button>
                </div>
              </div>
              <textarea
                id="mail-field-3"
                rows={6}
                required
                disabled={sending}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email message..."
                className={fieldClass}
              />
            </div>

            <div className="pt-3 border-t border-[#262626] flex items-center justify-between">
              <button
                type="button"
                onClick={discardComposeDraft}
                className="text-gray-500 hover:text-gray-300"
              >
                Discard draft
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => setIsComposeOpen(false)}
                  className={btnDark}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={sending || !toEmail || !subject || !body}
                  className={`${btnPrimary} ${sending ? "opacity-75 cursor-wait" : ""}`}
                >
                  <Icon name="send" className="h-3.5 w-3.5 mr-1.5 inline align-[-0.15em]" />
                  Send Email
                </button>
              </div>
            </div>
          </form>
        </div>
      </Modal>

      {/* Automated Emails Customization Modal */}
      <AutomatedEmailsModal
        open={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
      />
    </div>
  );
};
