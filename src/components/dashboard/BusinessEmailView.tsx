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

export type EmailSortKey = "date" | "sender" | "subject" | "activity";
export type EmailSortDir = "asc" | "desc";
export type EmailReadFilter = "all" | "unread" | "read";
export type EmailTypeFilter = "all" | "inquiries" | "direct" | "replies";
export type EmailDateFilter = "all" | "today" | "7days" | "30days";

export function parseEmailDate(timestamp: string): number {
  if (!timestamp) return 0;
  const trimmed = timestamp.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "just now") return Date.now();

  const now = new Date();

  if (lower.startsWith("today")) {
    const timePart = trimmed.split(",")[1]?.trim();
    if (timePart) {
      const match = timePart.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        let hour = parseInt(match[1], 10);
        const min = parseInt(match[2], 10);
        if (match[3].toUpperCase() === "PM" && hour < 12) hour += 12;
        if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0;
        const d = new Date(now);
        d.setHours(hour, min, 0, 0);
        return d.getTime();
      }
    }
    return now.getTime();
  }

  if (lower.startsWith("yesterday")) {
    const timePart = trimmed.split(",")[1]?.trim();
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    if (timePart) {
      const match = timePart.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        let hour = parseInt(match[1], 10);
        const min = parseInt(match[2], 10);
        if (match[3].toUpperCase() === "PM" && hour < 12) hour += 12;
        if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0;
        d.setHours(hour, min, 0, 0);
        return d.getTime();
      }
    }
    return d.getTime();
  }

  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) return parsed;

  const currentYear = now.getFullYear();
  const parsedWithYear = Date.parse(`${trimmed}, ${currentYear}`);
  if (!isNaN(parsedWithYear)) return parsedWithYear;

  return 0;
}

interface BusinessEmailViewProps {
  onNavigate?: (tab: string) => void;
}

export const BusinessEmailView: React.FC<BusinessEmailViewProps> = ({ onNavigate }) => {
  const [emails, setEmails] = useState<EmailThread[]>(() => db.getEmailThreads());
  const [activeFolder, setActiveFolder] = useState<"inbox" | "inquiries" | "sent" | "starred">("inbox");
  const [selectedEmail, setSelectedEmail] = useState<EmailThread | undefined>(emails[0]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Sorting & Filtering State
  const [sortKey, setSortKey] = useState<EmailSortKey>("date");
  const [sortDir, setSortDir] = useState<EmailSortDir>("desc");
  const [readFilter, setReadFilter] = useState<EmailReadFilter>("all");
  const [typeFilter, setTypeFilter] = useState<EmailTypeFilter>("all");
  const [dateFilter, setDateFilter] = useState<EmailDateFilter>("all");
  const [starredFilter, setStarredFilter] = useState<boolean>(false);
  const [hideSampleEmails, setHideSampleEmails] = useState<boolean>(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);

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
    // Silent background refresh every 30 seconds so incoming emails arrive automatically
    const interval = setInterval(() => {
      void handleSync(true);
    }, 30000);
    return () => clearInterval(interval);
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

  // Read / Unread Toggle
  const handleToggleRead = (e: React.MouseEvent | undefined, threadId: string) => {
    if (e) e.stopPropagation();
    const thread = emails.find((t) => t.id === threadId);
    if (!thread) return;
    const newStatus = !thread.isRead;
    db.setEmailRead(threadId, newStatus);
    const updated = db.getEmailThreads();
    setEmails(updated);
    setSelectedEmail((prev) => (prev?.id === threadId ? { ...prev, isRead: newStatus } : prev));
  };

  // Mark all emails in the current folder as read
  const handleMarkAllRead = () => {
    db.markAllEmailsRead(activeFolder);
    const updated = db.getEmailThreads();
    setEmails(updated);
    setSelectedEmail((prev) => (prev ? { ...prev, isRead: true } : prev));
    setSuccessNotice(`Marked all ${activeFolder} emails as read.`);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  // Select Thread & Mark Read
  const handleSelectThread = (msg: EmailThread) => {
    setSelectedEmail(msg);
    if (!msg.isRead) {
      db.setEmailRead(msg.id, true);
      const updated = db.getEmailThreads();
      setEmails(updated);
      setSelectedEmail({ ...msg, isRead: true });
    }
  };

  // Open Pipeline Tab & Highlight Opportunity
  const handleOpenPipeline = (companyName?: string) => {
    if (companyName) {
      sessionStorage.setItem("tvl_pipeline_target", companyName);
    }
    if (onNavigate) {
      onNavigate("leads");
    } else {
      window.location.hash = "#leads";
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setReadFilter("all");
    setTypeFilter("all");
    setDateFilter("all");
    setStarredFilter(false);
    setHideSampleEmails(false);
    setSortKey("date");
    setSortDir("desc");
    setSearchQuery("");
  };

  // Clear mock/demo sample emails
  const handleClearSampleEmails = () => {
    if (window.confirm("Remove seeded sample/demo emails? Only real inbox messages and manual lead notices will remain.")) {
      db.clearMockEmails();
      const updated = db.getEmailThreads();
      setEmails(updated);
      setSelectedEmail(updated[0]);
      setSuccessNotice("Sample demo emails cleared from inbox.");
      setTimeout(() => setSuccessNotice(null), 4000);
    }
  };

  // Delete an individual email thread
  const handleDeleteThread = (threadId: string) => {
    if (window.confirm("Are you sure you want to delete this email thread?")) {
      db.deleteEmail(threadId);
      const updated = db.getEmailThreads();
      setEmails(updated);
      setSelectedEmail(updated[0]);
      setSuccessNotice("Email thread deleted.");
      setTimeout(() => setSuccessNotice(null), 3000);
    }
  };

  // Counts
  const inboxUnread = emails.filter((m) => (m.folder === "inbox" || m.folder === "inquiries") && !m.isRead).length;
  const inquiriesUnread = emails.filter((m) => m.folder === "inquiries" && !m.isRead).length;

  const activeFiltersCount =
    (readFilter !== "all" ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (dateFilter !== "all" ? 1 : 0) +
    (starredFilter ? 1 : 0) +
    (hideSampleEmails ? 1 : 0) +
    (sortKey !== "date" || sortDir !== "desc" ? 1 : 0);

  // Filter messages by activeFolder, search query, read status, type, and date horizon
  const folderFiltered = emails
    .filter((m) => {
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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          m.subject.toLowerCase().includes(q) ||
          m.sender.toLowerCase().includes(q) ||
          m.senderEmail.toLowerCase().includes(q) ||
          m.preview.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // 3. Read status match
      if (readFilter === "unread" && m.isRead) return false;
      if (readFilter === "read" && !m.isRead) return false;

      // 4. Starred filter match
      if (starredFilter && !m.starred) return false;

      // 5. Type filter match
      if (typeFilter === "inquiries" && m.folder !== "inquiries") return false;
      if (typeFilter === "direct" && m.folder === "inquiries") return false;
      if (typeFilter === "replies" && (!m.messages || m.messages.length <= 1)) return false;

      // 6. Date horizon filter
      if (dateFilter !== "all") {
        const emailTime = parseEmailDate(m.timestamp);
        const now = Date.now();
        const startOfToday = new Date().setHours(0, 0, 0, 0);
        if (dateFilter === "today" && emailTime < startOfToday) return false;
        if (dateFilter === "7days" && emailTime < now - 7 * 86400000) return false;
        if (dateFilter === "30days" && emailTime < now - 30 * 86400000) return false;
      }

      // 7. Hide sample/mock emails
      if (hideSampleEmails && m.isMock) return false;

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortKey === "date") {
        const timeA = parseEmailDate(a.timestamp);
        const timeB = parseEmailDate(b.timestamp);
        comparison = timeA - timeB;
      } else if (sortKey === "sender") {
        comparison = a.sender.localeCompare(b.sender);
      } else if (sortKey === "subject") {
        comparison = a.subject.localeCompare(b.subject);
      } else if (sortKey === "activity") {
        const msgsA = a.messages?.length || 1;
        const msgsB = b.messages?.length || 1;
        comparison = msgsA - msgsB;
      }
      return sortDir === "desc" ? -comparison : comparison;
    });

  const unreadInView = folderFiltered.filter((m) => !m.isRead).length;

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
              <div className="flex items-center gap-1.5">
                {inboxUnread > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeFolder === "inbox" ? "bg-black text-[#FBD227]" : "bg-[#FBD227] text-black"}`}>
                    {inboxUnread} new
                  </span>
                )}
                <span className={`text-xs px-1.5 py-0.2 rounded font-mono ${activeFolder === "inbox" ? "bg-black text-[#FBD227]" : "bg-[#1C1C1C] text-gray-300"}`}>
                  {emails.filter((m) => m.folder === "inbox" || m.folder === "inquiries").length}
                </span>
              </div>
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
              <div className="flex items-center gap-1.5">
                {inquiriesUnread > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeFolder === "inquiries" ? "bg-black text-[#FBD227]" : "bg-[#FBD227] text-black"}`}>
                    {inquiriesUnread} new
                  </span>
                )}
                <span className={`text-xs px-1.5 py-0.2 rounded font-mono ${activeFolder === "inquiries" ? "bg-black text-[#FBD227]" : "bg-[#1C1C1C] text-gray-300"}`}>
                  {emails.filter((m) => m.folder === "inquiries").length}
                </span>
              </div>
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

        {/* Middle Column: Thread List with Search, Sorting & Filters (4 cols on md) */}
        <div className="md:col-span-4 border-r border-[#262626] flex flex-col bg-[#111111] max-h-[42rem]">
          {/* Search, Filter & Sort Controls Header */}
          <div className="p-3 border-b border-[#262626] bg-[#0E0E0E] space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-500">
                  <Icon name="search" className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sender, topic, body..."
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

              {/* Filter Drawer Toggle Button */}
              <button
                type="button"
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                className={`px-2 py-1.5 rounded border text-xs font-mono flex items-center gap-1 transition-colors ${
                  isFilterPanelOpen || activeFiltersCount > 0
                    ? "bg-[#FBD227]/10 border-[#FBD227] text-[#FBD227]"
                    : "bg-[#181818] border-[#262626] text-gray-400 hover:text-white hover:border-[#383838]"
                }`}
                title="Open advanced filter options"
              >
                <Icon name="filter" className="h-3.5 w-3.5" />
                {activeFiltersCount > 0 && (
                  <span className="px-1 py-0.2 rounded-full bg-[#FBD227] text-black text-[10px] font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Quick Sort Direction Toggle */}
              <button
                type="button"
                onClick={() => setSortDir((prev) => (prev === "desc" ? "asc" : "desc"))}
                className="px-2 py-1.5 rounded border bg-[#181818] border-[#262626] text-gray-400 hover:text-white hover:border-[#383838] text-xs font-mono flex items-center gap-1 transition-colors"
                title={`Sort direction: ${sortDir === "desc" ? "Descending / Newest" : "Ascending / Oldest"}`}
              >
                <Icon name="sort" className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase">{sortDir}</span>
              </button>
            </div>

            {/* Quick Filter Pills Row */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px] font-mono no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setReadFilter("all");
                  setTypeFilter("all");
                  setStarredFilter(false);
                }}
                className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                  readFilter === "all" && typeFilter === "all" && !starredFilter
                    ? "bg-[#2A2A2A] text-white font-bold"
                    : "text-gray-400 hover:text-white hover:bg-[#1A1A1A]"
                }`}
              >
                All
              </button>

              <button
                type="button"
                onClick={() => setReadFilter((prev) => (prev === "unread" ? "all" : "unread"))}
                className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors whitespace-nowrap ${
                  readFilter === "unread"
                    ? "bg-[#FBD227] text-black font-bold"
                    : "text-gray-400 hover:text-white hover:bg-[#1A1A1A]"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span>Unread</span>
                {unreadInView > 0 && <span className="text-[10px] opacity-80">({unreadInView})</span>}
              </button>

              <button
                type="button"
                onClick={() => setStarredFilter((prev) => !prev)}
                className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors whitespace-nowrap ${
                  starredFilter
                    ? "bg-amber-400 text-black font-bold"
                    : "text-gray-400 hover:text-white hover:bg-[#1A1A1A]"
                }`}
              >
                <Icon name="star" className="h-3 w-3" />
                <span>Starred</span>
              </button>

              <button
                type="button"
                onClick={() => setTypeFilter((prev) => (prev === "inquiries" ? "all" : "inquiries"))}
                className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors whitespace-nowrap ${
                  typeFilter === "inquiries"
                    ? "bg-[#FBD227] text-black font-bold"
                    : "text-gray-400 hover:text-white hover:bg-[#1A1A1A]"
                }`}
              >
                <Icon name="bolt" className="h-3 w-3" />
                <span>Inquiries</span>
              </button>

              <button
                type="button"
                onClick={() => setTypeFilter((prev) => (prev === "replies" ? "all" : "replies"))}
                className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                  typeFilter === "replies"
                    ? "bg-[#FBD227] text-black font-bold"
                    : "text-gray-400 hover:text-white hover:bg-[#1A1A1A]"
                }`}
              >
                💬 With Replies
              </button>
            </div>

            {/* Expandable Advanced Filter & Sort Drawer */}
            {isFilterPanelOpen && (
              <div className="pt-2.5 pb-1 border-t border-[#1F1F1F] space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                    Filters & Sorting
                  </span>
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-[11px] text-[#FBD227] hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Sort By Selector */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Sort By</label>
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as EmailSortKey)}
                      className="w-full bg-[#181818] border border-[#262626] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#FBD227]"
                    >
                      <option value="date">Date / Time</option>
                      <option value="sender">Sender Name</option>
                      <option value="subject">Subject Line</option>
                      <option value="activity">Thread Activity</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Order</label>
                    <select
                      value={sortDir}
                      onChange={(e) => setSortDir(e.target.value as EmailSortDir)}
                      className="w-full bg-[#181818] border border-[#262626] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#FBD227]"
                    >
                      <option value="desc">{sortKey === "date" ? "Newest First" : sortKey === "activity" ? "Most Active" : "Z to A"}</option>
                      <option value="asc">{sortKey === "date" ? "Oldest First" : sortKey === "activity" ? "Least Active" : "A to Z"}</option>
                    </select>
                  </div>
                </div>

                {/* Read Status Filter */}
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Read Status</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(["all", "unread", "read"] as EmailReadFilter[]).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setReadFilter(val)}
                        className={`py-1 rounded text-center text-[11px] border capitalize transition-colors ${
                          readFilter === val
                            ? "bg-[#252525] border-[#FBD227] text-white font-bold"
                            : "bg-[#161616] border-[#222222] text-gray-400 hover:text-white"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Horizon Filter */}
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Date Horizon</label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { id: "all", label: "Any Time" },
                      { id: "today", label: "Today" },
                      { id: "7days", label: "7 Days" },
                      { id: "30days", label: "30 Days" },
                    ].map((val) => (
                      <button
                        key={val.id}
                        type="button"
                        onClick={() => setDateFilter(val.id as EmailDateFilter)}
                        className={`py-1 rounded text-center text-[10px] border transition-colors ${
                          dateFilter === val.id
                            ? "bg-[#252525] border-[#FBD227] text-white font-bold"
                            : "bg-[#161616] border-[#222222] text-gray-400 hover:text-white"
                        }`}
                      >
                        {val.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Bulk Action & Sample Email Controls */}
                <div className="pt-2 border-t border-[#1C1C1C] flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">
                    Showing <strong className="text-white">{folderFiltered.length}</strong> of {emails.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[#FBD227] hover:underline inline-flex items-center gap-1"
                  >
                    <Icon name="check" className="h-3 w-3" />
                    <span>Mark all as read</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-[#1C1C1C] flex items-center justify-between text-[11px]">
                  <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-white">
                    <input
                      type="checkbox"
                      checked={hideSampleEmails}
                      onChange={(e) => setHideSampleEmails(e.target.checked)}
                      className="rounded bg-black border-[#333333] text-[#FBD227] focus:ring-0"
                    />
                    <span>Hide Sample / Demo Emails</span>
                  </label>
                  {emails.some((e) => e.isMock) && (
                    <button
                      type="button"
                      onClick={handleClearSampleEmails}
                      className="text-red-400 hover:text-red-300 hover:underline font-bold"
                      title="Permanently remove seeded sample emails from local state"
                    >
                      Clear Sample Emails
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Threads list */}
          <div className="divide-y divide-[#1F1F1F] overflow-y-auto flex-1">
            {folderFiltered.length === 0 && (
              <div className="p-8 text-center font-mono text-xs text-gray-500 space-y-2">
                <Icon name="inbox" className="h-6 w-6 mx-auto text-gray-600" />
                <p>{searchQuery ? "No emails matching your search." : "No messages matching your filter criteria."}</p>
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-[11px] text-[#FBD227] hover:underline"
                  >
                    Reset all filters
                  </button>
                )}
              </div>
            )}
            {folderFiltered.map((msg) => {
              const isSelected = selectedEmail?.id === msg.id;
              const hasReplies = msg.messages && msg.messages.length > 1;
              const isUnread = !msg.isRead;
              return (
                <div
                  key={msg.id}
                  onClick={() => handleSelectThread(msg)}
                  className={`p-3.5 cursor-pointer transition-colors relative group ${
                    isSelected
                      ? "bg-[#1A1A1A] border-l-4 border-[#FBD227]"
                      : isUnread
                      ? "bg-[#141414] hover:bg-[#181818]"
                      : "hover:bg-[#161616]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                      {/* Unread Indicator Dot */}
                      {isUnread ? (
                        <span
                          className="h-2 w-2 rounded-full bg-[#FBD227] shrink-0 shadow-[0_0_8px_rgba(251,210,39,0.8)]"
                          title="Unread message"
                        />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-transparent shrink-0" />
                      )}

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

                      <span className={`truncate text-xs ${isUnread ? "font-black text-white" : "font-semibold text-gray-300"}`}>
                        {msg.sender}
                      </span>

                      {hasReplies && (
                        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[#262626] text-[#FBD227] shrink-0">
                          {msg.messages?.length}
                        </span>
                      )}

                      {msg.folder === "inquiries" && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
                          Inquiry
                        </span>
                      )}

                      {msg.isMock && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 shrink-0 font-bold uppercase tracking-wider" title="Seeded sample email">
                          SAMPLE
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Mark Read/Unread Quick Button on Hover */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleRead(e, msg.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-gray-500 hover:text-white hover:bg-[#262626]"
                        title={isUnread ? "Mark as read" : "Mark as unread"}
                      >
                        <Icon name={isUnread ? "check" : "mail"} className="h-3 w-3" />
                      </button>
                      <span className="font-mono text-xs text-gray-400">{msg.timestamp.split(",")[0]}</span>
                    </div>
                  </div>

                  <h4 className={`text-xs leading-snug line-clamp-1 ${isUnread ? "font-extrabold text-white" : "font-medium text-gray-300"}`}>
                    {msg.subject}
                  </h4>
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
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-[#1C1C1C] border border-[#262626] px-2 py-0.5 rounded text-[#FBD227] font-bold uppercase">
                      {selectedEmail.folder}
                    </span>
                    {selectedEmail.isMock && (
                      <span className="font-mono text-[10px] bg-sky-950/60 border border-sky-500/40 text-sky-300 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        SAMPLE / DEMO
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleToggleRead(undefined, selectedEmail.id)}
                      className="flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded border border-[#262626] hover:border-[#FBD227] text-gray-300 hover:text-white transition-colors"
                      title={selectedEmail.isRead ? "Mark as unread" : "Mark as read"}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${selectedEmail.isRead ? "bg-gray-600" : "bg-[#FBD227]"}`} />
                      <span>{selectedEmail.isRead ? "Mark unread" : "Mark read"}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
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
                    <button
                      type="button"
                      onClick={() => handleDeleteThread(selectedEmail.id)}
                      className="flex items-center gap-1 text-xs font-mono text-gray-500 hover:text-red-400 transition-colors ml-1"
                      title="Delete this email thread"
                    >
                      <Icon name="close" className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
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
                      {(() => {
                        const pipelineRegex = /View Opportunity in Pipeline\s*(?:->|→)?/i;
                        const hasPipelineLink = pipelineRegex.test(msg.body);
                        if (!hasPipelineLink) {
                          return (
                            <div className="whitespace-pre-line text-xs text-gray-300 leading-relaxed">
                              {msg.body}
                            </div>
                          );
                        }

                        const textContent = msg.body.replace(pipelineRegex, "").trimEnd();
                        const companyMatch = msg.body.match(/Company:\s*([^\n\r]+)/i);
                        const targetCompany = companyMatch ? companyMatch[1].trim() : (selectedEmail?.clientName || "Nova AI Audio");

                        return (
                          <div className="space-y-4">
                            <div className="whitespace-pre-line text-xs text-gray-300 leading-relaxed">
                              {textContent}
                            </div>
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={() => handleOpenPipeline(targetCompany)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#FBD227] hover:bg-[#ffe25c] text-black font-sans font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#FBD227]/20 group active:scale-95 cursor-pointer"
                              >
                                <span>View Opportunity in Pipeline</span>
                                <Icon name="arrow-right" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                              </button>
                            </div>
                          </div>
                        );
                      })()}
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
