"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { MediaAsset } from "@/db";
import type { LabProject, LabProjectPillar, LabProjectStatus } from "@/lib/labProjectsStore";
import { Icon } from "@/components/icons/Icon";
import { Chip, Modal, Panel, btnDark, btnGhost, btnPrimary, fieldClass, labelClass } from "./ui";
import { errorText, workspaceApi } from "./api";

const PILLARS: readonly LabProjectPillar[] = [
  "Brand & Creative",
  "Web & Digital",
  "Content & Video",
  "AI & Automation",
];

type StatusFilter = "all" | LabProjectStatus;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending_approval", label: "Pending Approval" },
  { id: "draft", label: "Drafts" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const STATUS_META: Record<
  LabProjectStatus,
  { label: string; tone: "plain" | "yellow" | "orange" | "black"; icon: "pencil" | "clock" | "check" | "alert" }
> = {
  draft: { label: "Draft", tone: "plain", icon: "pencil" },
  pending_approval: { label: "Pending Approval", tone: "yellow", icon: "clock" },
  approved: { label: "Approved · Live", tone: "black", icon: "check" },
  rejected: { label: "Rejected", tone: "orange", icon: "alert" },
};

const isSafeLiveUrl = (url: string | null | undefined): url is string =>
  Boolean(url && (/^https?:\/\//i.test(url) || (url.startsWith("/") && !url.startsWith("//"))));

interface LabProjectsManagerProps {
  role: "admin" | "team";
  assets?: MediaAsset[];
}

export const LabProjectsManager: React.FC<LabProjectsManagerProps> = ({ role, assets = [] }) => {
  const [projects, setProjects] = useState<LabProject[]>([]);
  const [load, setLoad] = useState<"loading" | "ready" | "error">("loading");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LabProject | null>(null);
  const [title, setTitle] = useState("");
  const [pillar, setPillar] = useState<LabProjectPillar>("Web & Digital");
  const [summary, setSummary] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadProjects = useCallback(() => {
    setLoad("loading");
    workspaceApi<LabProject[]>("/api/lab-projects")
      .then((data) => {
        setProjects(data);
        setLoad("ready");
      })
      .catch(() => setLoad("error"));
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const libraryLinks = useMemo(() => {
    return assets
      .filter((a) => !a.clientId && (a.url.startsWith("/library/") || a.mime === "text/html" || a.filename.toLowerCase().endsWith(".html") || a.category === "Website / Landing Page"))
      .map((a) => {
        const cleanSlug = a.filename.replace(/\.html?$/i, "").toLowerCase().replace(/[^a-z0-9-_]/g, "-");
        const url = a.url.startsWith("/library/") ? a.url : `/library/${a.slug || cleanSlug}`;
        return { id: a.id, title: a.title, url };
      });
  }, [assets]);

  const counts = useMemo(() => {
    const map: Record<StatusFilter, number> = {
      all: projects.length,
      draft: 0,
      pending_approval: 0,
      approved: 0,
      rejected: 0,
    };
    for (const p of projects) {
      map[p.status] += 1;
    }
    return map;
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (statusFilter === "all") return projects;
    return projects.filter((p) => p.status === statusFilter);
  }, [projects, statusFilter]);

  const openCreateModal = () => {
    setEditing(null);
    setTitle("");
    setPillar("Web & Digital");
    setSummary("");
    setLiveUrl("");
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (project: LabProject) => {
    setEditing(project);
    setTitle(project.title);
    setPillar(project.pillar);
    setSummary(project.summary);
    setLiveUrl(project.liveUrl ?? "");
    setFormError(null);
    setModalOpen(true);
  };

  const submitForm = async (targetStatus: LabProjectStatus) => {
    const trimmedTitle = title.trim();
    const trimmedSummary = summary.trim();
    const trimmedUrl = liveUrl.trim();

    if (!trimmedTitle) {
      setFormError("Project title is required.");
      return;
    }
    if (!trimmedSummary) {
      setFormError("Summary is required.");
      return;
    }
    if (trimmedUrl && !isSafeLiveUrl(trimmedUrl)) {
      setFormError("Live URL must start with /library/ (or /) or https://");
      return;
    }

    setSaving(true);
    setFormError(null);
    setActionError(null);

    try {
      if (editing) {
        const updated = await workspaceApi<LabProject>("/api/lab-projects", "PATCH", {
          id: editing.id,
          title: trimmedTitle,
          pillar,
          summary: trimmedSummary,
          liveUrl: trimmedUrl || null,
          status: targetStatus,
        });
        setProjects((cur) => cur.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await workspaceApi<LabProject>("/api/lab-projects", "POST", {
          title: trimmedTitle,
          pillar,
          summary: trimmedSummary,
          liveUrl: trimmedUrl || null,
          status: targetStatus,
        });
        setProjects((cur) => [created, ...cur]);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(errorText(err, "Could not save lab project. Try again."));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (project: LabProject, nextStatus: LabProjectStatus) => {
    setBusyId(project.id);
    setActionError(null);
    try {
      const updated = await workspaceApi<LabProject>("/api/lab-projects", "PATCH", {
        id: project.id,
        status: nextStatus,
      });
      setProjects((cur) => cur.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      setActionError(errorText(err, "Could not update project status. Try again."));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (project: LabProject) => {
    if (!window.confirm(`Delete lab project "${project.title}"? This cannot be undone.`)) return;
    setBusyId(project.id);
    setActionError(null);
    try {
      await workspaceApi("/api/lab-projects", "DELETE", { id: project.id });
      setProjects((cur) => cur.filter((p) => p.id !== project.id));
    } catch (err) {
      setActionError(errorText(err, "Could not delete lab project. Try again."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <Panel className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#FBD227] block mb-1">
            Public Showcase CMS
          </span>
          <h2 className="font-monument text-xl font-bold uppercase text-white">
            Lab Projects &amp; Approval Queue
          </h2>
          <p className="mt-1 text-xs text-gray-400">
            {role === "admin"
              ? "Review team submissions, publish approved builds to the public Lab Showcase, or manage drafts."
              : "Draft Lab Projects (including /library/... builds) and submit them for Admin approval to go live."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={loadProjects} className={btnDark} title="Refresh list">
            <Icon name="refresh" className="h-4 w-4" />
            Refresh
          </button>
          <button type="button" onClick={openCreateModal} className={btnPrimary}>
            <Icon name="plus" className="h-4 w-4" />
            New Lab Project
          </button>
        </div>
      </Panel>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={statusFilter === f.id}
            onClick={() => setStatusFilter(f.id)}
            className={`px-3 py-1.5 text-xs font-mono uppercase rounded border transition-colors ${
              statusFilter === f.id
                ? "bg-[#FBD227] text-black border-[#FBD227] font-bold"
                : "bg-[#141414] text-gray-400 border-[#262626] hover:text-white"
            }`}
          >
            {f.label} ({counts[f.id]})
          </button>
        ))}
      </div>

      {load === "error" && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-[#DD7230] bg-[#DD7230]/10 px-4 py-3 text-xs">
          <span>Could not load Lab Projects. Check your connection and try again.</span>
          <button type="button" onClick={loadProjects} className={btnDark}>
            Retry
          </button>
        </div>
      )}

      {actionError && (
        <p role="alert" className="border border-[#DD7230] bg-[#DD7230]/10 px-3 py-2 font-sans text-xs text-white">
          {actionError}
        </p>
      )}

      {load === "loading" && (
        <p className="text-xs font-mono text-gray-400">Loading Lab Projects…</p>
      )}

      {load === "ready" && filteredProjects.length === 0 && (
        <div className="border border-[#262626] bg-[#111111] p-8 text-center">
          <p className="text-xs font-mono text-gray-400">
            No lab projects in this view yet. Click &ldquo;New Lab Project&rdquo; to create one.
          </p>
        </div>
      )}

      {/* Projects List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredProjects.map((project) => {
          const meta = STATUS_META[project.status];
          const isBusy = busyId === project.id;
          const teamEditable =
            role === "team" && (project.status === "draft" || project.status === "rejected");
          const teamDeletable = role === "team" && project.status === "draft";

          return (
            <div
              key={project.id}
              className="border border-[#262626] bg-[#111111] rounded-lg p-5 flex flex-col justify-between gap-4 hover:border-[#383838] transition-colors"
            >
              <div className="space-y-3">
                {/* Status + Pillar */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {project.status === "approved" ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 font-sans text-xs font-bold uppercase tracking-[0.1em] bg-emerald-950/70 text-emerald-300 border border-emerald-500/40">
                        <Icon name="check" className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                    ) : (
                      <Chip tone={meta.tone}>
                        <Icon name={meta.icon} className="h-3.5 w-3.5" />
                        {meta.label}
                      </Chip>
                    )}
                    <span className="px-2 py-0.5 text-[11px] font-mono uppercase border border-[#262626] bg-[#181818] text-gray-300">
                      {project.pillar}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-gray-500">
                    {project.updatedAt.slice(0, 10)}
                  </span>
                </div>

                {/* Title & Summary */}
                <div>
                  <h3 className="font-monument text-base font-bold uppercase text-white leading-snug">
                    {project.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-300 whitespace-pre-line">
                    {project.summary}
                  </p>
                </div>

                {/* Live URL */}
                {isSafeLiveUrl(project.liveUrl) && (
                  <div className="px-3 py-2 bg-[#161616] border border-[#262626] rounded flex items-center justify-between gap-2 text-xs font-mono">
                    <span className="flex items-center gap-2 text-[#FBD227] truncate">
                      <Icon name="link" className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{project.liveUrl}</span>
                    </span>
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 font-bold text-white hover:text-[#FBD227] underline flex items-center gap-1"
                    >
                      Open
                      <Icon name="arrow-up-right" className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* Attribution */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-gray-500">
                  <span>
                    Submitted by:{" "}
                    <span className="text-gray-300">
                      {project.submittedByName || project.submittedBy || "Staff"}
                    </span>
                  </span>
                  {project.reviewedBy && (
                    <span>
                      Reviewed by:{" "}
                      <span className="text-gray-300">
                        {project.reviewedByName || project.reviewedBy}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-3 border-t border-[#262626] flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Admin Workflow Actions */}
                  {role === "admin" && (
                    <>
                      {project.status !== "approved" && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => changeStatus(project, "approved")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FBD227] text-black text-xs font-bold uppercase tracking-wider hover:bg-white disabled:opacity-50 transition-colors"
                        >
                          <Icon name="check" className="h-3.5 w-3.5" />
                          Approve
                        </button>
                      )}
                      {project.status !== "rejected" && project.status !== "draft" && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => changeStatus(project, "rejected")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#DD7230] bg-[#DD7230]/15 text-[#DD7230] text-xs font-bold uppercase tracking-wider hover:bg-[#DD7230] hover:text-black disabled:opacity-50 transition-colors"
                        >
                          <Icon name="close" className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      )}
                      {project.status === "approved" && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => changeStatus(project, "draft")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#333333] bg-[#181818] text-gray-300 text-xs font-bold uppercase tracking-wider hover:border-[#FBD227] hover:text-[#FBD227] disabled:opacity-50 transition-colors"
                        >
                          Move to Draft
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => openEditModal(project)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#333333] bg-[#141414] text-white text-xs font-bold uppercase tracking-wider hover:border-[#FBD227] hover:text-[#FBD227] disabled:opacity-50 transition-colors"
                      >
                        <Icon name="pencil" className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    </>
                  )}

                  {/* Team Workflow Actions */}
                  {role === "team" && teamEditable && (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => openEditModal(project)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#333333] bg-[#141414] text-white text-xs font-bold uppercase tracking-wider hover:border-[#FBD227] hover:text-[#FBD227] disabled:opacity-50 transition-colors"
                      >
                        <Icon name="pencil" className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => changeStatus(project, "pending_approval")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FBD227] text-black text-xs font-bold uppercase tracking-wider hover:bg-white disabled:opacity-50 transition-colors"
                      >
                        <Icon name="send" className="h-3.5 w-3.5" />
                        {project.status === "rejected" ? "Resubmit for Approval" : "Submit for Approval"}
                      </button>
                    </>
                  )}

                  {role === "team" && project.status === "pending_approval" && (
                    <span className="text-[11px] font-mono text-[#FBD227]">
                      Awaiting Admin review
                    </span>
                  )}

                  {role === "team" && project.status === "approved" && (
                    <span className="text-[11px] font-mono text-emerald-400">
                      Live on public showcase
                    </span>
                  )}
                </div>

                {/* Delete Action */}
                {(role === "admin" || teamDeletable) && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleDelete(project)}
                    aria-label={`Delete ${project.title}`}
                    className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-[#DD7230] disabled:opacity-50 transition-colors"
                  >
                    <Icon name="trash" className="h-3.5 w-3.5" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? "Edit Lab Project" : "New Lab Project"}
        maxWidth="max-w-xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitForm(role === "admin" ? (editing?.status ?? "approved") : "draft");
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="lab-project-title" className={labelClass}>
              Project Title
            </label>
            <input
              id="lab-project-title"
              required
              maxLength={200}
              disabled={saving}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Oak Harbor Growth Strategy"
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="lab-project-pillar" className={labelClass}>
              Service Pillar
            </label>
            <select
              id="lab-project-pillar"
              disabled={saving}
              value={pillar}
              onChange={(e) => setPillar(e.target.value as LabProjectPillar)}
              className={fieldClass}
            >
              {PILLARS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="lab-project-summary" className={labelClass}>
              Summary
            </label>
            <textarea
              id="lab-project-summary"
              required
              rows={3}
              maxLength={2000}
              disabled={saving}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Concise statement describing what was built and why it matters."
              className={fieldClass}
            />
          </div>

          {libraryLinks.length > 0 && (
            <div>
              <label htmlFor="lab-project-library-pick" className={labelClass}>
                Quick-Fill from General Library (optional)
              </label>
              <select
                id="lab-project-library-pick"
                disabled={saving}
                value=""
                onChange={(e) => {
                  const chosen = libraryLinks.find((item) => item.url === e.target.value);
                  if (chosen) {
                    setLiveUrl(chosen.url);
                    if (!title.trim()) setTitle(chosen.title);
                  }
                }}
                className={fieldClass}
              >
                <option value="">Select a /library/... deliverable to link…</option>
                {libraryLinks.map((item) => (
                  <option key={item.id} value={item.url}>
                    {item.title} ({item.url})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="lab-project-live-url" className={labelClass}>
              Live URL (optional)
            </label>
            <input
              id="lab-project-live-url"
              maxLength={500}
              disabled={saving}
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              placeholder="/library/oak-harbor-strategy or https://example.com"
              className={fieldClass}
            />
            <p className="mt-1 text-[11px] font-mono text-gray-500">
              Supports internal Library subpages (e.g. /library/...) or external https:// URLs.
            </p>
          </div>

          {formError && (
            <p role="alert" className="border border-[#DD7230] bg-[#DD7230]/10 px-3 py-2 font-sans text-xs text-white">
              {formError}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[#262626]">
            <button
              type="button"
              disabled={saving}
              onClick={() => setModalOpen(false)}
              className={btnGhost}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => submitForm("draft")}
              className={btnDark}
            >
              {saving ? "Saving…" : "Save Draft"}
            </button>
            {role === "admin" ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => submitForm("approved")}
                className={btnPrimary}
              >
                <Icon name="check" className="h-4 w-4" />
                {saving ? "Saving…" : "Approve & Publish"}
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => submitForm("pending_approval")}
                className={btnPrimary}
              >
                <Icon name="send" className="h-4 w-4" />
                {saving ? "Submitting…" : "Submit for Approval"}
              </button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
};
