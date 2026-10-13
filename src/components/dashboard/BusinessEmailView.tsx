"use client";

import React, { useState, useEffect, useRef } from "react";
import { db, EmailThread, EmailMessage, EmailAttachment } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { AutomatedEmailsModal } from "./AutomatedEmailsModal";
import { EmailDrafterModal, type GeneratedDraft } from "./EmailDrafterModal";
import { FloatingDockedCompose } from "./FloatingDockedCompose";

interface PendingDispatch {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  attachments?: EmailAttachment[];
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
    const d = new Date(now.getTime() - 86400000);
    const timePart = trimmed.split(",")[1]?.trim();
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
  const [activeFolder, setActiveFolder] = useState<
    "inbox" | "inquiries" | "sent" | "starred" | "drafts" | "trash" | "archive"
  >("inbox");
  const [activeCategoryTab, setActiveCategoryTab] = useState<"primary" | "inquiries" | "automations">("primary");
  const [selectedEmail, setSelectedEmail] = useState<EmailThread | undefined>(emails[0]);
  const [viewMode, setViewMode] = useState<"split" | "full">("split");
  const [fullViewOpen, setFullViewOpen] = useState(false);

  // Modals & Floating Windows
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isComposeMinimized, setIsComposeMinimized] = useState(false);
  const [isComposeMaximized, setIsComposeMaximized] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isDrafterOpen, setIsDrafterOpen] = useState(false);
  const [drafterTarget, setDrafterTarget] = useState<"compose" | "reply">("compose");
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  // Multi-Selection State (Gmail Select Toolbar)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectDropdownOpen, setIsSelectDropdownOpen] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<EmailSortKey>("date");
  const [sortDir, setSortDir] = useState<EmailSortDir>("desc");
  const [readFilter, setReadFilter] = useState<EmailReadFilter>("all");
  const [typeFilter, setTypeFilter] = useState<EmailTypeFilter>("all");
  const [dateFilter, setDateFilter] = useState<EmailDateFilter>("all");
  const [starredFilter, setStarredFilter] = useState<boolean>(false);
  const [hideSampleEmails, setHideSampleEmails] = useState<boolean>(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // IMAP Sync state
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // Compose Form
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [composeDraftSaved, setComposeDraftSaved] = useState(false);
  const [composeAttachments, setComposeAttachments] = useState<EmailAttachment[]>([]);

  // Inline Reply Form
  const [replyBody, setReplyBody] = useState("");
  const [replyDraftSaved, setReplyDraftSaved] = useState(false);
  const [replyAttachments, setReplyAttachments] = useState<EmailAttachment[]>([]);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const [isDraggingReply, setIsDraggingReply] = useState(false);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  // Sending, Feedback & 5-Second Undo Grace Period
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [pendingDispatch, setPendingDispatch] = useState<PendingDispatch | null>(null);
  const [undoSeconds, setUndoSeconds] = useState(5);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const undoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processFiles = async (fileList: FileList | File[], target: "compose" | "reply") => {
    const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB per file
    const added: EmailAttachment[] = [];
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_FILE_BYTES) {
        setSendError(`"${file.name}" exceeds the 10 MB limit.`);
        continue;
      }
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        added.push({
          id: Math.random().toString(36).substring(2, 9),
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          data: dataUrl,
        });
      } catch {
        setSendError(`Failed to read "${file.name}".`);
      }
    }
    if (target === "compose") {
      setComposeAttachments((prev) => [...prev, ...added]);
    } else {
      setReplyAttachments((prev) => [...prev, ...added]);
    }
  };

  const removeComposeAttachment = (index: number) => {
    setComposeAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const removeReplyAttachment = (index: number) => {
    setReplyAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // 1. Initial IMAP Sync on component mount & 30s background poll
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
    void handleSync(true);
    const interval = setInterval(() => {
      void handleSync(true);
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Keyboard Shortcuts (c = compose, Escape = close compose/unselect)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setIsComposeOpen(true);
        setIsComposeMinimized(false);
      }
      if (e.key === "Escape") {
        if (fullViewOpen) {
          setFullViewOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullViewOpen]);

  // 3. LocalStorage Auto-Drafting for Compose Modal
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

  // 4. LocalStorage Auto-Drafting for Inline Reply
  useEffect(() => {
    if (selectedEmail) {
      const saved = localStorage.getItem(`tvl_draft_reply_${selectedEmail.id}`);
      setReplyBody(saved || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmail?.id]);

  useEffect(() => {
    if (selectedEmail && replyBody) {
      localStorage.setItem(`tvl_draft_reply_${selectedEmail.id}`, replyBody);
      setReplyDraftSaved(true);
      const timer = setTimeout(() => setReplyDraftSaved(false), 2000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Select Thread
  const handleSelectThread = (msg: EmailThread) => {
    setSelectedEmail(msg);
    if (!msg.isRead) {
      db.setEmailRead(msg.id, true);
      const updated = db.getEmailThreads();
      setEmails(updated);
      setSelectedEmail({ ...msg, isRead: true });
    }
    if (viewMode === "full") {
      setFullViewOpen(true);
    }
  };

  // Multi-Selection Logic
  const handleToggleSelectOne = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(folderFiltered.map((m) => m.id));
    setIsSelectDropdownOpen(false);
  };

  const handleSelectNone = () => {
    setSelectedIds([]);
    setIsSelectDropdownOpen(false);
  };

  const handleSelectRead = () => {
    setSelectedIds(folderFiltered.filter((m) => m.isRead).map((m) => m.id));
    setIsSelectDropdownOpen(false);
  };

  const handleSelectUnread = () => {
    setSelectedIds(folderFiltered.filter((m) => !m.isRead).map((m) => m.id));
    setIsSelectDropdownOpen(false);
  };

  const handleSelectStarred = () => {
    setSelectedIds(folderFiltered.filter((m) => m.starred).map((m) => m.id));
    setIsSelectDropdownOpen(false);
  };

  // Batch Operations
  const handleBatchMoveToTrash = () => {
    if (selectedIds.length === 0) return;
    db.batchMoveToTrash(selectedIds);
    const updated = db.getEmailThreads();
    setEmails(updated);
    setSelectedIds([]);
    setSelectedEmail(updated[0]);
    setSuccessNotice(`Moved ${selectedIds.length} email(s) to Trash.`);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  const handleBatchArchive = () => {
    if (selectedIds.length === 0) return;
    db.batchArchive(selectedIds);
    const updated = db.getEmailThreads();
    setEmails(updated);
    setSelectedIds([]);
    setSelectedEmail(updated[0]);
    setSuccessNotice(`Archived ${selectedIds.length} email(s).`);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  const handleBatchMarkRead = (isRead: boolean) => {
    if (selectedIds.length === 0) return;
    db.batchSetRead(selectedIds, isRead);
    const updated = db.getEmailThreads();
    setEmails(updated);
    setSelectedIds([]);
    setSuccessNotice(`Marked ${selectedIds.length} email(s) as ${isRead ? "read" : "unread"}.`);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  const handleBatchStar = (starVal: boolean) => {
    if (selectedIds.length === 0) return;
    db.batchToggleStar(selectedIds, starVal);
    const updated = db.getEmailThreads();
    setEmails(updated);
    setSelectedIds([]);
    setSuccessNotice(`Updated star on ${selectedIds.length} email(s).`);
    setTimeout(() => setSuccessNotice(null), 3000);
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

  // Delete / Trash thread
  const handleDeleteThread = (threadId: string) => {
    db.moveToTrash(threadId);
    const updated = db.getEmailThreads();
    setEmails(updated);
    setSelectedEmail(updated.find((e) => e.id !== threadId) || updated[0]);
    setSuccessNotice("Moved thread to Trash.");
    setTimeout(() => setSuccessNotice(null), 3000);
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

  // Filter messages
  const folderFiltered = emails
    .filter((m) => {
      // 1. Folder match
      if (activeFolder === "starred") {
        if (!m.starred) return false;
      } else if (activeFolder === "inquiries") {
        if (m.folder !== "inquiries") return false;
      } else if (activeFolder === "sent") {
        if (m.folder !== "sent") return false;
      } else if (activeFolder === "drafts") {
        if (m.folder !== "drafts") return false;
      } else if (activeFolder === "trash") {
        if (m.folder !== "trash") return false;
      } else if (activeFolder === "archive") {
        if (m.folder !== "archive") return false;
      } else {
        // Inbox shows active incoming and inquiries, excluding drafts, trash, archive, sent
        if (m.folder === "trash" || m.folder === "archive" || m.folder === "drafts" || m.folder === "sent") {
          return false;
        }
        // Category tabs filter (when on inbox)
        if (activeCategoryTab === "primary" && m.folder === "inquiries") return false;
        if (activeCategoryTab === "inquiries" && m.folder !== "inquiries") return false;
        if (
          activeCategoryTab === "automations" &&
          !m.subject.toLowerCase().includes("invoice") &&
          !m.subject.toLowerCase().includes("brief") &&
          !m.subject.toLowerCase().includes("quote")
        ) {
          return false;
        }
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

  // Paginated Slice
  const totalPages = Math.max(1, Math.ceil(folderFiltered.length / pageSize));
  const paginatedEmails = folderFiltered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Physical Dispatch Execution
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
          attachments: dispatch.attachments,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Delivery failed (Status ${res.status})`);
      }

      if (dispatch.isReply && dispatch.threadId) {
        const updatedThread = db.addReplyToThread(dispatch.threadId, {
          sender: "The Virtus Labs",
          senderEmail: "hello@thevirtuslabs.com",
          recipient: dispatch.to,
          body: dispatch.body,
          attachments: dispatch.attachments,
        });
        setEmails(db.getEmailThreads());
        if (updatedThread) setSelectedEmail({ ...updatedThread });
        localStorage.removeItem(`tvl_draft_reply_${dispatch.threadId}`);
        setReplyBody("");
        setReplyAttachments([]);
      } else {
        if (activeDraftId) {
          db.deleteEmail(activeDraftId);
          setActiveDraftId(null);
        }
        const newSent = db.sendEmail({
          sender: "The Virtus Labs",
          senderEmail: "hello@thevirtuslabs.com",
          recipient: dispatch.to,
          subject: dispatch.subject,
          preview: dispatch.body.substring(0, 70) + "...",
          body: dispatch.body,
          folder: "sent",
          attachments: dispatch.attachments,
        });
        setEmails(db.getEmailThreads());
        setSelectedEmail(newSent);
        setActiveFolder("sent");
        setIsComposeOpen(false);
        setToEmail("");
        setSubject("");
        setBody("");
        setComposeAttachments([]);
        localStorage.removeItem("tvl_email_compose_draft");
      }

      const attCount = dispatch.attachments?.length || 0;
      setSuccessNotice(
        `Email dispatched successfully to ${dispatch.to}${attCount > 0 ? ` (${attCount} attachment${attCount > 1 ? "s" : ""})` : ""}`
      );
      setTimeout(() => setSuccessNotice(null), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to deliver email.";
      setSendError(msg);
    } finally {
      setSending(false);
      setPendingDispatch(null);
    }
  };

  // Undo countdown
  const startUndoCountdown = (dispatch: PendingDispatch) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);

    setPendingDispatch(dispatch);
    setUndoSeconds(5);
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
      attachments: composeAttachments.length > 0 ? composeAttachments : undefined,
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
      attachments: replyAttachments.length > 0 ? replyAttachments : undefined,
      isReply: true,
    });
  };

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
    }
  };

  const discardReplyDraft = () => {
    if (selectedEmail) {
      localStorage.removeItem(`tvl_draft_reply_${selectedEmail.id}`);
      setReplyBody("");
      setReplyAttachments([]);
    }
  };

  const discardComposeDraft = () => {
    if (activeDraftId) {
      db.deleteEmail(activeDraftId);
      setEmails(db.getEmailThreads());
      setActiveDraftId(null);
    }
    localStorage.removeItem("tvl_email_compose_draft");
    setToEmail("");
    setSubject("");
    setBody("");
    setComposeAttachments([]);
    setIsComposeOpen(false);
  };

  // Automated Email Drafter Integration
  const openDrafter = (target: "compose" | "reply") => {
    setDrafterTarget(target);
    setIsDrafterOpen(true);
  };

  const handleApplyGeneratedDraft = (draft: GeneratedDraft) => {
    if (drafterTarget === "compose") {
      if (draft.recipient) setToEmail(draft.recipient);
      if (draft.subject) setSubject(draft.subject);
      setBody(draft.body);
      setIsComposeOpen(true);
      setIsComposeMinimized(false);
    } else {
      setReplyBody(draft.body);
      if (replyInputRef.current) {
        replyInputRef.current.focus();
      }
    }
    setIsDrafterOpen(false);
  };

  const handleSaveDraftDirectly = (draft: GeneratedDraft) => {
    const saved = db.saveDraft({
      id: activeDraftId || undefined,
      recipient: draft.recipient || "client@company.com",
      subject: draft.subject || "(Draft Subject)",
      body: draft.body,
    });
    setEmails(db.getEmailThreads());
    setSelectedEmail(saved);
    setActiveFolder("drafts");
    setIsDrafterOpen(false);
    setSuccessNotice("Draft saved to Drafts folder.");
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const handleResumeDraft = (draftThread: EmailThread) => {
    setActiveDraftId(draftThread.id);
    setToEmail(draftThread.recipient || draftThread.senderEmail || "");
    setSubject(draftThread.subject || "");
    setBody(draftThread.body || "");
    if (draftThread.attachments) {
      setComposeAttachments([...draftThread.attachments]);
    } else {
      setComposeAttachments([]);
    }
    setIsComposeOpen(true);
    setIsComposeMinimized(false);
  };

  const handleSaveComposeDraft = () => {
    if (!toEmail && !subject && !body) return;
    const saved = db.saveDraft({
      id: activeDraftId || undefined,
      recipient: toEmail || "client@company.com",
      subject: subject || "(Draft Subject)",
      body: body,
      attachments: composeAttachments.length > 0 ? composeAttachments : undefined,
    });
    setEmails(db.getEmailThreads());
    setSelectedEmail(saved);
    setIsComposeOpen(false);
    setActiveDraftId(null);
    setSuccessNotice("Draft saved to Drafts mailbox.");
    setTimeout(() => setSuccessNotice(null), 4000);
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
          attachments: selectedEmail.attachments,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans flex flex-col">
      {/* 1. Gmail-Style Top Omnisearch Bar */}
      <header className="sticky top-0 z-30 bg-[#0E0E0E] border-b border-[#222222] px-4 py-2.5 flex items-center justify-between gap-4 shadow-sm">
        {/* Brand / Logo Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-[#FBD227] flex items-center justify-center text-black font-black text-sm shadow-md shadow-[#FBD227]/20">
            ✉
          </div>
          <div>
            <h1 className="font-monument text-xs sm:text-sm font-black tracking-tight uppercase flex items-center gap-1.5 text-white">
              <span>Virtus Mail</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#1C1C1C] text-[#FBD227] font-normal border border-[#2E2E2E]">
                OS
              </span>
            </h1>
            <p className="text-[10px] font-mono text-gray-500 hidden sm:block">
              hello@thevirtuslabs.com
            </p>
          </div>
        </div>

        {/* Gmail Rounded Search Pill */}
        <div className="flex-1 max-w-2xl relative">
          <div className="flex items-center bg-[#161616] border border-[#262626] rounded-full px-3.5 py-2 text-xs focus-within:border-[#FBD227] focus-within:bg-[#111111] focus-within:shadow-md focus-within:shadow-[#FBD227]/10 transition-all">
            <Icon name="search" className="h-4 w-4 text-gray-400 mr-2.5 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in mail (sender, subject, brief, or keyword)..."
              className="w-full bg-transparent text-white outline-none placeholder-gray-500 font-sans text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-gray-500 hover:text-white mr-1.5 cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen((prev) => !prev)}
              className={`p-1 rounded-full hover:bg-[#252525] transition-colors ${
                activeFiltersCount > 0 ? "text-[#FBD227]" : "text-gray-400 hover:text-white"
              }`}
              title="Show search filters"
            >
              <Icon name="filter" className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Quick Filter Drawer Popover */}
          {isFilterPanelOpen && (
            <div className="absolute top-12 left-0 right-0 z-40 bg-[#161616] border border-[#2E2E2E] rounded-xl shadow-2xl p-4 text-xs font-sans space-y-3 animate-in fade-in duration-100">
              <div className="flex items-center justify-between border-b border-[#242424] pb-2 font-mono">
                <span className="font-bold text-gray-200">Search Filters</span>
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-[11px] text-[#FBD227] hover:underline"
                  >
                    Reset all
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1 font-mono">Sort By</label>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as EmailSortKey)}
                    className="w-full bg-[#1F1F1F] border border-[#2A2A2A] rounded p-1.5 text-xs text-white outline-none focus:border-[#FBD227]"
                  >
                    <option value="date">Date / Time</option>
                    <option value="sender">Sender Name</option>
                    <option value="subject">Subject Line</option>
                    <option value="activity">Thread Activity</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1 font-mono">Order</label>
                  <select
                    value={sortDir}
                    onChange={(e) => setSortDir(e.target.value as EmailSortDir)}
                    className="w-full bg-[#1F1F1F] border border-[#2A2A2A] rounded p-1.5 text-xs text-white outline-none focus:border-[#FBD227]"
                  >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1 font-mono">Read Status</label>
                  <select
                    value={readFilter}
                    onChange={(e) => setReadFilter(e.target.value as EmailReadFilter)}
                    className="w-full bg-[#1F1F1F] border border-[#2A2A2A] rounded p-1.5 text-xs text-white outline-none focus:border-[#FBD227]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="unread">Unread Only</option>
                    <option value="read">Read Only</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1 font-mono">Time Horizon</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as EmailDateFilter)}
                    className="w-full bg-[#1F1F1F] border border-[#2A2A2A] rounded p-1.5 text-xs text-white outline-none focus:border-[#FBD227]"
                  >
                    <option value="all">Any Time</option>
                    <option value="today">Today</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-[#242424] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-gray-300">
                    <input
                      type="checkbox"
                      checked={hideSampleEmails}
                      onChange={(e) => setHideSampleEmails(e.target.checked)}
                      className="accent-[#FBD227]"
                    />
                    <span>Hide Demo Emails</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleClearSampleEmails}
                    className="text-[10px] font-mono text-gray-500 hover:text-rose-400 transition-colors"
                    title="Permanently remove seeded sample emails from database"
                  >
                    Clear Demo Seeds
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFilterPanelOpen(false)}
                  className="px-3 py-1 rounded bg-[#2A2A2A] hover:bg-[#333] text-white text-xs font-mono"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Status & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleSync(false)}
            disabled={syncing}
            className="p-2 rounded-full hover:bg-[#1C1C1C] text-gray-400 hover:text-white transition-colors cursor-pointer"
            title={lastSynced ? `Fetch emails (Last: ${lastSynced})` : "Sync inbox"}
          >
            <span className={`inline-block ${syncing ? "animate-spin text-[#FBD227]" : ""}`}>
              <Icon name="refresh" className="h-4 w-4" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsTemplatesOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#161616] border border-[#262626] hover:border-[#FBD227]/50 text-gray-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
            title="Configure automated responses & sequences"
          >
            <Icon name="settings" className="h-3.5 w-3.5 text-[#FBD227]" />
            <span>Automations</span>
          </button>

          <button
            type="button"
            onClick={() => openDrafter("compose")}
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#1C1C1C] border border-[#FBD227]/40 text-[#FBD227] hover:bg-[#FBD227]/10 text-xs font-mono transition-colors cursor-pointer"
            title="Auto-draft email using AI templates"
          >
            <span>✨ AI Drafter</span>
          </button>
        </div>
      </header>

      {/* Global Notifications */}
      {successNotice && (
        <div className="m-3 p-3 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Icon name="check-circle" className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button type="button" onClick={() => setSuccessNotice(null)} className="text-gray-400 hover:text-white px-2 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {sendError && (
        <div className="m-3 p-3 rounded-lg bg-red-950/70 border border-red-500/50 text-red-200 text-xs font-mono flex items-center justify-between shadow-lg">
          <span className="font-bold">Error: {sendError}</span>
          <button type="button" onClick={() => setSendError(null)} className="text-gray-400 hover:text-white px-2 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* 2. Main Gmail Layout Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (250px on desktop) */}
        <aside className="w-64 border-r border-[#1F1F1F] bg-[#0E0E0E] flex flex-col justify-between shrink-0 font-sans p-3">
          <div className="space-y-4">
            {/* Iconic Gmail Pill Compose Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setActiveDraftId(null);
                  setIsComposeOpen(true);
                  setIsComposeMinimized(false);
                }}
                className="w-full py-3 px-5 rounded-full bg-[#FBD227] hover:bg-[#ffe25c] text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg shadow-[#FBD227]/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Icon name="pencil" className="h-4 w-4 stroke-[2.5]" />
                <span>Compose</span>
              </button>
            </div>

            {/* Folder Mailbox List */}
            <nav className="space-y-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setActiveFolder("inbox");
                  setFullViewOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-r-full text-left transition-colors cursor-pointer ${
                  activeFolder === "inbox"
                    ? "bg-[#FBD227]/15 text-[#FBD227] font-bold border-l-4 border-[#FBD227]"
                    : "text-gray-300 hover:bg-[#181818] hover:text-white"
                }`}
              >
                <span className="inline-flex items-center gap-3">
                  <Icon name="inbox" className="h-4 w-4" />
                  <span>Inbox</span>
                </span>
                {inboxUnread > 0 ? (
                  <span className="text-[11px] px-2 py-0.2 rounded-full font-bold bg-[#FBD227] text-black">
                    {inboxUnread}
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-500 font-mono">
                    {emails.filter((m) => m.folder === "inbox" || m.folder === "inquiries").length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveFolder("starred");
                  setFullViewOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-r-full text-left transition-colors cursor-pointer ${
                  activeFolder === "starred"
                    ? "bg-[#FBD227]/15 text-[#FBD227] font-bold border-l-4 border-[#FBD227]"
                    : "text-gray-300 hover:bg-[#181818] hover:text-white"
                }`}
              >
                <span className="inline-flex items-center gap-3">
                  <Icon name="star" className={`h-4 w-4 ${activeFolder === "starred" ? "text-[#FBD227]" : "text-amber-400"}`} />
                  <span>Starred</span>
                </span>
                <span className="text-[11px] text-gray-500 font-mono">
                  {emails.filter((m) => m.starred).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveFolder("inquiries");
                  setFullViewOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-r-full text-left transition-colors cursor-pointer ${
                  activeFolder === "inquiries"
                    ? "bg-[#FBD227]/15 text-[#FBD227] font-bold border-l-4 border-[#FBD227]"
                    : "text-gray-300 hover:bg-[#181818] hover:text-white"
                }`}
              >
                <span className="inline-flex items-center gap-3">
                  <Icon name="bolt" className="h-4 w-4 text-amber-300" />
                  <span>Brief Inquiries</span>
                </span>
                {inquiriesUnread > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-400 text-black">
                    {inquiriesUnread} new
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveFolder("sent");
                  setFullViewOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-r-full text-left transition-colors cursor-pointer ${
                  activeFolder === "sent"
                    ? "bg-[#FBD227]/15 text-[#FBD227] font-bold border-l-4 border-[#FBD227]"
                    : "text-gray-300 hover:bg-[#181818] hover:text-white"
                }`}
              >
                <span className="inline-flex items-center gap-3">
                  <Icon name="send" className="h-4 w-4" />
                  <span>Sent</span>
                </span>
                <span className="text-[11px] text-gray-500 font-mono">
                  {emails.filter((m) => m.folder === "sent").length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveFolder("drafts");
                  setFullViewOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-r-full text-left transition-colors cursor-pointer ${
                  activeFolder === "drafts"
                    ? "bg-[#FBD227]/15 text-[#FBD227] font-bold border-l-4 border-[#FBD227]"
                    : "text-gray-300 hover:bg-[#181818] hover:text-white"
                }`}
              >
                <span className="inline-flex items-center gap-3">
                  <Icon name="pencil" className="h-4 w-4" />
                  <span>Drafts</span>
                </span>
                <span className="text-[11px] text-gray-500 font-mono">
                  {emails.filter((m) => m.folder === "drafts").length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveFolder("trash");
                  setFullViewOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-r-full text-left transition-colors cursor-pointer ${
                  activeFolder === "trash"
                    ? "bg-[#FBD227]/15 text-[#FBD227] font-bold border-l-4 border-[#FBD227]"
                    : "text-gray-400 hover:bg-[#181818] hover:text-white"
                }`}
              >
                <span className="inline-flex items-center gap-3">
                  <Icon name="trash" className="h-4 w-4" />
                  <span>Trash</span>
                </span>
                <span className="text-[11px] text-gray-500 font-mono">
                  {emails.filter((m) => m.folder === "trash").length}
                </span>
              </button>
            </nav>

            {/* Labels / Categories */}
            <div className="pt-3 border-t border-[#1C1C1C] space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 block px-2">
                Categories
              </span>
              <div className="space-y-1 text-xs text-gray-400">
                <button
                  type="button"
                  onClick={() => setTypeFilter(typeFilter === "direct" ? "all" : "direct")}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1 rounded hover:bg-[#181818] text-left hover:text-white transition-colors"
                >
                  <span className="h-2 w-2 rounded-full bg-yellow-400" />
                  <span>Client Direct</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter(typeFilter === "inquiries" ? "all" : "inquiries")}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1 rounded hover:bg-[#181818] text-left hover:text-white transition-colors"
                >
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span>Inbound Leads</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter(typeFilter === "replies" ? "all" : "replies")}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1 rounded hover:bg-[#181818] text-left hover:text-white transition-colors"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Active Threads</span>
                </button>
              </div>
            </div>
          </div>

          {/* PrivateEmail Protocol Card */}
          <div className="pt-3 border-t border-[#1C1C1C] text-[11px] font-mono text-gray-500 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>IMAP 993 / SMTP 465</span>
            </div>
            <p className="text-[10px] text-gray-400 truncate">PrivateEmail Active</p>
          </div>
        </aside>

        {/* 3. Main Center / Right Area */}
        <main className="flex-1 flex flex-col bg-[#111111] overflow-hidden">
          {/* Gmail Master Action Toolbar */}
          <div className="bg-[#141414] border-b border-[#222222] px-4 py-2 flex items-center justify-between text-xs font-mono text-gray-300 select-none">
            {/* Left Toolbar: Master Checkbox & Dynamic Batch Action Buttons */}
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  aria-label="Select all in view"
                  checked={
                    folderFiltered.length > 0 &&
                    folderFiltered.every((m) => selectedIds.includes(m.id))
                  }
                  onChange={(e) => {
                    if (e.target.checked) handleSelectAll();
                    else handleSelectNone();
                  }}
                  className="accent-[#FBD227] h-4 w-4 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setIsSelectDropdownOpen((prev) => !prev)}
                  className="ml-1 p-0.5 rounded hover:bg-[#252525] text-gray-400 hover:text-white cursor-pointer"
                  title="Selection options"
                >
                  <Icon name="chevron-down" className="h-3 w-3" />
                </button>

                {isSelectDropdownOpen && (
                  <div className="absolute top-6 left-0 z-50 bg-[#1A1A1A] border border-[#2D2D2D] rounded shadow-xl py-1 text-xs font-mono w-28">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="w-full text-left px-3 py-1 hover:bg-[#262626] text-white"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectNone}
                      className="w-full text-left px-3 py-1 hover:bg-[#262626] text-gray-300"
                    >
                      None
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectRead}
                      className="w-full text-left px-3 py-1 hover:bg-[#262626] text-gray-300"
                    >
                      Read
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectUnread}
                      className="w-full text-left px-3 py-1 hover:bg-[#262626] text-gray-300"
                    >
                      Unread
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectStarred}
                      className="w-full text-left px-3 py-1 hover:bg-[#262626] text-gray-300"
                    >
                      Starred
                    </button>
                  </div>
                )}
              </div>

              {selectedIds.length > 0 ? (
                <div className="flex items-center gap-1 border-l border-[#262626] pl-2 animate-in fade-in duration-100">
                  <span className="text-[11px] font-bold text-[#FBD227] mr-1">
                    {selectedIds.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={handleBatchMoveToTrash}
                    className="p-1.5 rounded hover:bg-[#242424] text-gray-300 hover:text-rose-400 transition-colors"
                    title="Move selected to Trash"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchArchive}
                    className="p-1.5 rounded hover:bg-[#242424] text-gray-300 hover:text-white transition-colors"
                    title="Archive selected"
                  >
                    <Icon name="archive" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBatchMarkRead(true)}
                    className="p-1.5 rounded hover:bg-[#242424] text-gray-300 hover:text-white transition-colors"
                    title="Mark selected as read"
                  >
                    <Icon name="mail" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBatchStar(true)}
                    className="p-1.5 rounded hover:bg-[#242424] text-gray-300 hover:text-amber-400 transition-colors"
                    title="Star selected"
                  >
                    <Icon name="star" className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 border-l border-[#262626] pl-2">
                  <button
                    type="button"
                    onClick={() => handleSync(false)}
                    className="p-1.5 rounded hover:bg-[#242424] text-gray-400 hover:text-white transition-colors"
                    title="Refresh"
                  >
                    <Icon name="refresh" className={`h-4 w-4 ${syncing ? "animate-spin text-[#FBD227]" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="p-1.5 rounded hover:bg-[#242424] text-gray-400 hover:text-white transition-colors"
                    title="Mark all as read"
                  >
                    <Icon name="check" className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Right Toolbar: View Switcher (Split vs Full) & Pagination */}
            <div className="flex items-center gap-3">
              {/* Split Pane vs Full View Switcher */}
              <div className="flex items-center bg-[#1A1A1A] p-0.5 rounded border border-[#262626]">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("split");
                    setFullViewOpen(false);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition-colors ${
                    viewMode === "split"
                      ? "bg-[#2A2A2A] text-white font-bold"
                      : "text-gray-400 hover:text-white"
                  }`}
                  title="Split Preview Pane"
                >
                  <Icon name="columns" className="h-3 w-3" />
                  <span className="hidden md:inline">Split</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("full")}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition-colors ${
                    viewMode === "full"
                      ? "bg-[#2A2A2A] text-white font-bold"
                      : "text-gray-400 hover:text-white"
                  }`}
                  title="Full Table View"
                >
                  <Icon name="layout" className="h-3 w-3" />
                  <span className="hidden md:inline">Table</span>
                </button>
              </div>

              {/* Pagination Info & Controls */}
              <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
                <span>
                  {folderFiltered.length === 0
                    ? "0 of 0"
                    : `${(currentPage - 1) * pageSize + 1}–${Math.min(
                        currentPage * pageSize,
                        folderFiltered.length
                      )} of ${folderFiltered.length}`}
                </span>
                <div className="flex items-center">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded hover:bg-[#242424] disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Newer"
                  >
                    <Icon name="chevron-left" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded hover:bg-[#242424] disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Older"
                  >
                    <Icon name="chevron-right" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Category Tabs (Active on Inbox folder) */}
          {activeFolder === "inbox" && (
            <div className="bg-[#121212] border-b border-[#222222] flex items-center px-2">
              <button
                type="button"
                onClick={() => setActiveCategoryTab("primary")}
                className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeCategoryTab === "primary"
                    ? "border-[#FBD227] text-[#FBD227]"
                    : "border-transparent text-gray-400 hover:text-white hover:bg-[#161616]"
                }`}
              >
                <Icon name="mail" className="h-3.5 w-3.5" />
                <span>Primary</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategoryTab("inquiries")}
                className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeCategoryTab === "inquiries"
                    ? "border-[#FBD227] text-[#FBD227]"
                    : "border-transparent text-gray-400 hover:text-white hover:bg-[#161616]"
                }`}
              >
                <Icon name="bolt" className="h-3.5 w-3.5 text-amber-400" />
                <span>Brief Inquiries</span>
                {inquiriesUnread > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-400 text-black font-mono">
                    {inquiriesUnread} new
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveCategoryTab("automations")}
                className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeCategoryTab === "automations"
                    ? "border-[#FBD227] text-[#FBD227]"
                    : "border-transparent text-gray-400 hover:text-white hover:bg-[#161616]"
                }`}
              >
                <Icon name="settings" className="h-3.5 w-3.5" />
                <span>Automations & Invoices</span>
              </button>
            </div>
          )}

          {/* 4. Split / Full View Container */}
          <div className="flex-1 flex overflow-hidden">
            {/* Mail List Table View */}
            {(!fullViewOpen || viewMode === "split") && (
              <div
                className={`flex flex-col bg-[#111111] overflow-y-auto ${
                  viewMode === "split"
                    ? "w-full md:w-[460px] lg:w-[480px] border-r border-[#222222] shrink-0"
                    : "w-full"
                }`}
              >
                {paginatedEmails.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 font-mono text-xs">
                    <Icon name="inbox" className="h-8 w-8 text-gray-600 mb-2" />
                    <p className="text-gray-400 font-semibold">No emails in {activeFolder}</p>
                    <p className="text-[11px] text-gray-600 mt-1">
                      New messages received via PrivateEmail IMAP will appear automatically.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#1C1C1C]">
                    {paginatedEmails.map((msg) => {
                      const isSelected = selectedEmail?.id === msg.id;
                      const isChecked = selectedIds.includes(msg.id);
                      const isUnread = !msg.isRead;

                      return (
                        <div
                          key={msg.id}
                          onClick={() => handleSelectThread(msg)}
                          className={`group relative flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${
                            isSelected && viewMode === "split"
                              ? "bg-[#181818] border-l-2 border-[#FBD227]"
                              : isUnread
                              ? "bg-[#151515] hover:bg-[#1A1A1A]"
                              : "bg-transparent hover:bg-[#161616]"
                          }`}
                        >
                          {/* Checkbox */}
                          <div
                            onClick={(e) => handleToggleSelectOne(e, msg.id)}
                            className="shrink-0 flex items-center"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="accent-[#FBD227] h-3.5 w-3.5 cursor-pointer"
                            />
                          </div>

                          {/* Star Toggle */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleStar(e, msg.id)}
                            className="shrink-0 p-0.5 rounded text-gray-600 hover:text-amber-400 transition-colors"
                            title={msg.starred ? "Starred" : "Not starred"}
                          >
                            <Icon
                              name="star"
                              className={`h-3.5 w-3.5 ${
                                msg.starred ? "text-amber-400 fill-amber-400" : "text-gray-600"
                              }`}
                            />
                          </button>

                          {/* Sender Column */}
                          <div className="w-28 sm:w-36 shrink-0 truncate">
                            <span
                              className={`text-xs truncate block ${
                                isUnread ? "font-black text-white" : "font-normal text-gray-300"
                              }`}
                            >
                              {msg.sender}
                            </span>
                          </div>

                          {/* Subject & Preview Snippet */}
                          <div className="flex-1 min-w-0 flex items-center gap-2 truncate">
                            <span
                              className={`text-xs truncate ${
                                isUnread ? "font-bold text-white" : "font-normal text-gray-300"
                              }`}
                            >
                              {msg.subject}
                            </span>
                            <span className="text-[11px] text-gray-500 truncate hidden sm:inline">
                              — {msg.preview}
                            </span>

                            {msg.folder === "inquiries" && (
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 shrink-0">
                                Inquiry
                              </span>
                            )}

                            {msg.isMock && (
                              <span
                                className="text-[9px] font-mono px-1 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 shrink-0 uppercase tracking-wider font-bold"
                                title="Seeded sample email"
                              >
                                SAMPLE
                              </span>
                            )}
                          </div>

                          {/* Attachments Clip Indicator */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="shrink-0 text-gray-500" title={`${msg.attachments.length} attachment(s)`}>
                              <Icon name="paperclip" className="h-3 w-3 text-[#FBD227]" />
                            </div>
                          )}

                          {/* Date & Hover Action Bar */}
                          <div className="shrink-0 flex items-center gap-2 pl-2">
                            {/* Hover Action Bar */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-[#1A1A1A] px-1 py-0.5 rounded border border-[#2D2D2D] shadow">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteThread(msg.id);
                                }}
                                className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-[#252525]"
                                title="Delete"
                              >
                                <Icon name="trash" className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleToggleRead(e, msg.id)}
                                className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#252525]"
                                title={isUnread ? "Mark as read" : "Mark as unread"}
                              >
                                <Icon name={isUnread ? "check" : "mail"} className="h-3 w-3" />
                              </button>
                            </div>

                            <span className="text-[11px] font-mono text-gray-500 group-hover:hidden">
                              {msg.timestamp.split(",")[0]}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Conversation Thread Viewer (Right Column in Split View, or Full View) */}
            {(viewMode === "split" || fullViewOpen) && (
              <div className="flex-1 flex flex-col justify-between overflow-y-auto bg-[#0E0E0E]">
                {selectedEmail ? (
                  <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between space-y-6">
                    {/* Thread Navigation & Header */}
                    <div className="border-b border-[#222222] pb-4 space-y-3">
                      {/* Back Button (Active in Full View) */}
                      {viewMode === "full" && (
                        <div className="pb-1">
                          <button
                            type="button"
                            onClick={() => setFullViewOpen(false)}
                            className="inline-flex items-center gap-1.5 text-xs font-mono text-gray-400 hover:text-[#FBD227] transition-colors cursor-pointer"
                          >
                            <Icon name="arrow-left" className="h-3.5 w-3.5" />
                            <span>Back to inbox</span>
                          </button>
                        </div>
                      )}

                      {/* Header Actions Bar */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-[#1A1A1A] border border-[#262626] px-2 py-0.5 rounded text-[#FBD227] font-bold uppercase">
                            {selectedEmail.folder}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleRead(undefined, selectedEmail.id)}
                            className="flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded border border-[#262626] hover:border-[#FBD227] text-gray-300 hover:text-white transition-colors cursor-pointer"
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
                            className="flex items-center gap-1.5 text-xs font-mono text-gray-400 hover:text-amber-400 cursor-pointer"
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
                            className="flex items-center gap-1 text-xs font-mono text-gray-500 hover:text-rose-400 transition-colors ml-1 cursor-pointer"
                            title="Delete this email thread"
                          >
                            <Icon name="trash" className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>

                      <h2 className="text-base sm:text-xl font-bold text-white font-monument leading-snug">
                        {selectedEmail.subject}
                      </h2>
                    </div>

                    {/* Draft Status Banner */}
                    {selectedEmail.folder === "drafts" && (
                      <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-amber-300 text-xs font-mono">
                          <Icon name="pencil" className="h-4 w-4 shrink-0 text-[#FBD227]" />
                          <span>This is an unsent draft. You can resume editing, auto-complete content, or send when ready.</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleResumeDraft(selectedEmail)}
                            className="px-3 py-1.5 rounded bg-[#FBD227] hover:bg-white text-black font-mono font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Icon name="pencil" className="h-3.5 w-3.5" />
                            <span>Resume Editing</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteThread(selectedEmail.id)}
                            className="px-2.5 py-1.5 rounded bg-[#1A1A1A] hover:bg-rose-950/60 text-gray-400 hover:text-rose-300 font-mono text-xs border border-[#2E2E2E] transition-colors cursor-pointer"
                          >
                            Discard
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Message Stack */}
                    <div className="space-y-4 flex-1">
                      {conversationMessages.map((msg, index) => {
                        const isVirtus = msg.senderEmail.toLowerCase().includes("thevirtuslabs");
                        const initial = msg.sender.charAt(0).toUpperCase() || "V";

                        return (
                          <div
                            key={msg.id || index}
                            className={`p-4 rounded-xl border text-xs font-sans ${
                              isVirtus
                                ? "bg-[#141414] border-[#2A2A2A] ml-2 sm:ml-4"
                                : "bg-[#111111] border-[#222222] mr-2 sm:mr-4"
                            }`}
                          >
                            {/* Author Row */}
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

                            {/* Message Body */}
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

                            {/* Attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-[#1F1F1F] space-y-2">
                                <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-400">
                                  <Icon name="paperclip" className="h-3.5 w-3.5 text-[#FBD227]" />
                                  <span>{msg.attachments.length} Attachment{msg.attachments.length > 1 ? "s" : ""}:</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {msg.attachments.map((att, aIdx) => (
                                    <a
                                      key={aIdx}
                                      href={att.data || "#"}
                                      download={att.filename}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="group inline-flex items-center gap-2 p-2 rounded bg-black/60 border border-[#2E2E2E] hover:border-[#FBD227] text-white transition-colors"
                                    >
                                      {att.contentType?.startsWith("image/") && att.data ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img
                                          src={att.data}
                                          alt={att.filename}
                                          className="h-8 w-8 object-cover rounded border border-[#333333]"
                                        />
                                      ) : (
                                        <div className="h-8 w-8 rounded bg-[#1A1A1A] flex items-center justify-center text-gray-400 group-hover:text-[#FBD227]">
                                          <Icon name="file" className="h-4 w-4" />
                                        </div>
                                      )}
                                      <div className="text-left font-mono">
                                        <span className="block text-xs font-bold text-gray-200 group-hover:text-white max-w-[160px] truncate">
                                          {att.filename}
                                        </span>
                                        <span className="text-[10px] text-gray-500 block">
                                          {formatFileSize(att.size)} · ⬇ Download
                                        </span>
                                      </div>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Gmail-Style Inline Reply Box */}
                    <div className="pt-4 border-t border-[#222222]">
                      <form
                        onSubmit={handleInlineReplySubmit}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingReply(true);
                        }}
                        onDragLeave={() => setIsDraggingReply(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingReply(false);
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            void processFiles(e.dataTransfer.files, "reply");
                          }
                        }}
                        className={`space-y-3 p-2 rounded-lg transition-colors ${
                          isDraggingReply ? "bg-[#FBD227]/5 border border-[#FBD227]" : ""
                        }`}
                      >
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
                        <div className="flex items-center justify-between bg-[#161616] p-1.5 rounded-t border-t border-x border-[#2A2A2A]">
                          <div className="flex items-center gap-1">
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
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openDrafter("reply")}
                              className="px-2 py-0.5 rounded text-xs text-[#FBD227] hover:bg-[#262626] flex items-center gap-1 transition-colors font-medium cursor-pointer"
                              title="Auto-draft email response using AI templates"
                            >
                              <span>✨ Auto-Draft</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => replyFileInputRef.current?.click()}
                              className="px-2 py-0.5 rounded text-xs text-gray-300 hover:bg-[#262626] hover:text-[#FBD227] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Attach files (PDF, image, docs, zip)"
                            >
                              <Icon name="paperclip" className="h-3.5 w-3.5 text-[#FBD227]" />
                              <span>Attach</span>
                            </button>
                            <input
                              ref={replyFileInputRef}
                              type="file"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  void processFiles(e.target.files, "reply");
                                  e.target.value = "";
                                }
                              }}
                            />
                          </div>
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

                        {/* Reply Attachments Chips */}
                        {replyAttachments.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {replyAttachments.map((att, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181818] border border-[#2E2E2E] text-xs font-mono text-gray-200"
                              >
                                <Icon name="paperclip" className="h-3 w-3 text-[#FBD227]" />
                                <span className="max-w-[140px] truncate font-medium">{att.filename}</span>
                                <span className="text-[10px] text-gray-500">({formatFileSize(att.size)})</span>
                                <button
                                  type="button"
                                  onClick={() => removeReplyAttachment(idx)}
                                  className="text-gray-500 hover:text-rose-400 font-bold ml-1 cursor-pointer"
                                  title="Remove attachment"
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between font-mono text-xs">
                          <button
                            type="button"
                            onClick={discardReplyDraft}
                            disabled={!replyBody}
                            className="text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            Discard draft
                          </button>

                          <button
                            type="submit"
                            disabled={!replyBody.trim() || sending}
                            className="px-4 py-2 rounded-lg bg-[#FBD227] hover:bg-[#ffe25c] text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-[#FBD227]/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Icon name="send" className="h-3.5 w-3.5" />
                            <span>Send Reply</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 font-mono text-xs">
                    <Icon name="mail" className="h-8 w-8 text-gray-600 mb-2" />
                    <p>Select a message to view conversation</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Floating 5-Second Undo Grace Notification Bar */}
      {pendingDispatch && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-lg bg-[#181818] border-2 border-[#FBD227] shadow-2xl flex items-center gap-4 text-xs font-mono animate-bounce-once">
          <div className="flex items-center gap-2 text-white">
            <span className="h-2 w-2 rounded-full bg-[#FBD227] animate-ping" />
            <span>
              Sending to <strong className="text-[#FBD227]">{pendingDispatch.to}</strong> in {undoSeconds}s...
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelUndo}
              className="px-3 py-1 rounded bg-[#262626] hover:bg-[#333333] text-white font-bold transition-colors cursor-pointer"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={handleSendNowImmediately}
              className="px-3 py-1 rounded bg-[#FBD227] hover:bg-white text-black font-bold transition-colors cursor-pointer"
            >
              Send now
            </button>
          </div>
        </div>
      )}

      {/* Gmail Bottom-Right Floating Docked Compose Window */}
      <FloatingDockedCompose
        open={isComposeOpen}
        isMinimized={isComposeMinimized}
        isMaximized={isComposeMaximized}
        onToggleMinimize={() => setIsComposeMinimized((prev) => !prev)}
        onToggleMaximize={() => setIsComposeMaximized((prev) => !prev)}
        onClose={discardComposeDraft}
        to={toEmail}
        setTo={setToEmail}
        subject={subject}
        setSubject={setSubject}
        body={body}
        setBody={setBody}
        attachments={composeAttachments}
        onRemoveAttachment={removeComposeAttachment}
        onProcessFiles={(files) => void processFiles(files, "compose")}
        formatFileSize={formatFileSize}
        sending={sending}
        draftSaved={composeDraftSaved}
        onSubmit={handleComposeSubmit}
        onSaveDraft={handleSaveComposeDraft}
        onDiscardDraft={discardComposeDraft}
        onOpenAIDrafter={() => openDrafter("compose")}
      />

      {/* Automated Emails Settings Modal */}
      <AutomatedEmailsModal
        open={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
      />

      {/* AI Studio Email Drafter Modal */}
      <EmailDrafterModal
        open={isDrafterOpen}
        onClose={() => setIsDrafterOpen(false)}
        onApplyDraft={handleApplyGeneratedDraft}
        onSaveToDraftsFolder={handleSaveDraftDirectly}
        initialRecipient={drafterTarget === "reply" ? (selectedEmail?.senderEmail || selectedEmail?.recipient || "") : toEmail}
        initialSubject={drafterTarget === "reply" ? (selectedEmail?.subject || "") : subject}
      />
    </div>
  );
};
