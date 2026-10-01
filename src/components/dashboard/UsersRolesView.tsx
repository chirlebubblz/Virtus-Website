"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { SkeletonRows } from "./Skeleton";
import { Chip, Modal, PageHeader, Panel, btnDark, btnGhost, btnPrimary, fieldClass, labelClass } from "./ui";
import type { TeamPod, TeamMemberUser } from "@/db";

interface StaffRow {
  id: string;
  name: string;
  email: string;
  role: "team" | "admin";
  memberLabel: string | null;
  status: "active" | "disabled";
  createdAt: string;
  lastLoginAt: string | null;
}

interface PendingInvite {
  id: string;
  email: string | null;
  role: "team" | "admin";
  expiresAt: string;
}

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never";

const matrix = [
  { capability: "Financials, invoices and contracts", admin: true, team: false },
  { capability: "Leads pipeline and client accounts", admin: true, team: false },
  { capability: "Create client links and staff invites", admin: true, team: false },
  { capability: "Assigned sprint tasks and projects", admin: true, team: true },
  { capability: "Own schedule and studio assets", admin: true, team: true },
];

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(url, init);
    const body = await res.json().catch(() => null);
    if (res.ok && body?.ok) return { ok: true, data: (body.data ?? body) as T };
    return { ok: false, error: body?.error ?? "Something went wrong. Try again." };
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again." };
  }
}

export const UsersRolesView: React.FC = () => {
  const [subTab, setSubTab] = useState<"pods" | "accounts">("pods");

  // Staff accounts & invites state
  const [users, setUsers] = useState<StaffRow[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteLoadError, setInviteLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"team" | "admin">("team");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [link, setLink] = useState<{ title: string; url: string; note: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Teams & Pods state
  const [pods, setPods] = useState<TeamPod[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberUser[]>([]);
  const [_podLoading, setPodLoading] = useState(false);

  // Pod Modals
  const [createPodOpen, setCreatePodOpen] = useState(false);
  const [podName, setPodName] = useState("");
  const [podFocus, setPodFocus] = useState("");
  const [podLeaderId, setPodLeaderId] = useState("");
  const [podColor, setPodColor] = useState("#FBD227");
  const [podSubmitting, setPodSubmitting] = useState(false);

  // Add Member Modal
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memName, setMemName] = useState("");
  const [memRole, setMemRole] = useState("");
  const [memEmail, setMemEmail] = useState("");
  const [memPodId, setMemPodId] = useState("");
  const [memPermission, setMemPermission] = useState<TeamMemberUser["permission"]>("Specialist");
  const [memSubmitting, setMemSubmitting] = useState(false);

  // Leader Reassignment Modal
  const [reassignPod, setReassignPod] = useState<TeamPod | null>(null);
  const [newLeaderId, setNewLeaderId] = useState("");

  // Edit / Update Pod Modal
  const [editingPod, setEditingPod] = useState<TeamPod | null>(null);
  const [editPodName, setEditPodName] = useState("");
  const [editPodFocus, setEditPodFocus] = useState("");
  const [editPodLeaderId, setEditPodLeaderId] = useState("");
  const [editPodColor, setEditPodColor] = useState("#FBD227");
  const [editPodActiveProjects, setEditPodActiveProjects] = useState(1);
  const [editPodSubmitting, setEditPodSubmitting] = useState(false);

  const openEditPodModal = (pod: TeamPod) => {
    setEditingPod(pod);
    setEditPodName(pod.name);
    setEditPodFocus(pod.focusArea);
    setEditPodLeaderId(pod.leaderId);
    setEditPodColor(pod.color || "#FBD227");
    setEditPodActiveProjects(pod.activeProjectsCount ?? 1);
  };

  const loadTeams = useCallback(async () => {
    setPodLoading(true);
    const res = await api<{ teams: TeamPod[]; members: TeamMemberUser[] }>("/api/teams");
    if (res.ok && res.data) {
      setPods(res.data.teams || []);
      setTeamMembers(res.data.members || []);
      if (res.data.members && res.data.members.length > 0 && !podLeaderId) {
        setPodLeaderId(res.data.members[0].id);
      }
    }
    setPodLoading(false);
  }, [podLeaderId]);

  const load = useCallback(async () => {
    const [u, i] = await Promise.all([
      api<{ users: StaffRow[]; currentId: string }>("/api/staff/users"),
      api<PendingInvite[]>("/api/staff/invites"),
    ]);
    if (!u.ok) setError(u.error ?? "Could not load staff.");
    else {
      setError(null);
      setUsers(u.data!.users);
      setCurrentId(u.data!.currentId);
    }
    if (i.ok) setInvites(i.data!);
    else setInviteLoadError(i.error ?? "Could not load pending invites.");
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    void loadTeams();
  }, [load, loadTeams]);

  const revokeInvite = async (id: string, email: string | null) => {
    if (busyId || !window.confirm(`Revoke the invite for ${email ?? "any email address"}? The link stops working.`)) return;
    setBusyId(id);
    setNotice(null);
    const res = await api<unknown>(`/api/staff/invites/${encodeURIComponent(id)}`, { method: "DELETE" });
    setBusyId(null);
    setNotice(res.ok ? "Invite revoked." : res.error ?? "Could not revoke the invite.");
    await load();
  };

  const act = async (id: string, body: Record<string, unknown>, success: string) => {
    if (busyId) return;
    setBusyId(id);
    setNotice(null);
    const res = await api<StaffRow | { token: string }>(`/api/staff/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusyId(null);
    if (!res.ok) {
      setNotice(res.error ?? "Action failed.");
      return;
    }
    if (body.action === "reset_link" && res.data && "token" in res.data) {
      const person = users.find((u) => u.id === id);
      setLink({
        title: "Password reset link",
        url: `${window.location.origin}/staff/reset#token=${res.data.token}`,
        note: `Send this to ${person?.name ?? "them"}. It works once and expires in 1 hour.`,
      });
      setCopied(false);
      return;
    }
    setNotice(success);
    await load();
  };

  const createInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteSubmitting) return;
    if (inviteRole === "admin" && !inviteEmail.trim()) {
      setInviteError("Admin invites must be tied to an email address.");
      return;
    }
    setInviteSubmitting(true);
    setInviteError(null);
    const res = await api<{ token: string; email: string | null; role: string; expiresAt: string }>("/api/staff/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    setInviteSubmitting(false);
    if (!res.ok) return setInviteError(res.error ?? "Could not create the invite.");
    setInviteOpen(false);
    setInviteEmail("");
    setLink({
      title: "Invite link ready",
      url: `${window.location.origin}/staff/register#invite=${res.data!.token}`,
      note: `Single use. ${res.data!.email ? `Only ${res.data!.email} can use it. ` : ""}Expires ${when(res.data!.expiresAt)}. Shown once.`,
    });
    setCopied(false);
    await load();
  };

  const handleCreatePod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podName.trim()) return;
    setPodSubmitting(true);
    const res = await api<{ team: TeamPod }>("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_team",
        name: podName,
        focusArea: podFocus,
        leaderId: podLeaderId,
        color: podColor,
      }),
    });
    setPodSubmitting(false);
    if (res.ok) {
      setCreatePodOpen(false);
      setPodName("");
      setPodFocus("");
      setNotice(`New Pod "${podName}" created successfully!`);
      await loadTeams();
    } else {
      setNotice(res.error || "Failed to create pod.");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memName.trim() || !memRole.trim() || !memEmail.trim()) return;
    setMemSubmitting(true);
    const res = await api<{ member: TeamMemberUser }>("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_member",
        name: memName,
        roleTitle: memRole,
        email: memEmail,
        teamId: memPodId || undefined,
        permission: memPermission,
      }),
    });
    setMemSubmitting(false);
    if (res.ok) {
      setAddMemberOpen(false);
      setMemName("");
      setMemRole("");
      setMemEmail("");
      setNotice(`Team member ${memName} added to roster!`);
      await loadTeams();
    } else {
      setNotice(res.error || "Failed to add member.");
    }
  };

  const handleAssignLeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignPod || !newLeaderId) return;
    const res = await api<{ team: TeamPod }>("/api/teams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "assign_leader",
        id: reassignPod.id,
        leaderId: newLeaderId,
      }),
    });
    if (res.ok) {
      setReassignPod(null);
      setNotice(`Assigned new Pod Leader for ${reassignPod.name}!`);
      await loadTeams();
    } else {
      setNotice(res.error || "Failed to reassign leader.");
    }
  };

  const handleUpdatePod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPod || !editPodName.trim()) return;
    setEditPodSubmitting(true);

    const leader = teamMembers.find((m) => m.id === editPodLeaderId);

    const res = await api<{ team: TeamPod }>("/api/teams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_team",
        id: editingPod.id,
        name: editPodName.trim(),
        focusArea: editPodFocus.trim() || "Multi-disciplinary Design & Engineering",
        color: editPodColor,
        activeProjectsCount: Number(editPodActiveProjects) || 0,
        leaderId: leader ? leader.id : editingPod.leaderId,
        leaderName: leader ? leader.name : editingPod.leaderName,
        leaderRole: leader ? leader.roleTitle : editingPod.leaderRole,
      }),
    });
    setEditPodSubmitting(false);

    if (res.ok) {
      setEditingPod(null);
      setNotice(`Pod "${editPodName.trim()}" updated successfully!`);
      await loadTeams();
    } else {
      setNotice(res.error || "Failed to update pod.");
    }
  };

  const handleDeletePod = async () => {
    if (!editingPod) return;
    if (!window.confirm(`Are you sure you want to remove "${editingPod.name}"? Team members assigned to this pod will remain in the general roster.`)) return;
    setEditPodSubmitting(true);
    const res = await api<{ ok: boolean }>(`/api/teams?type=team&id=${encodeURIComponent(editingPod.id)}`, {
      method: "DELETE",
    });
    setEditPodSubmitting(false);
    if (res.ok) {
      setEditingPod(null);
      setNotice(`Pod "${editingPod.name}" has been deleted.`);
      await loadTeams();
    } else {
      setNotice(res.error || "Failed to delete pod.");
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
    } catch {
      window.prompt("Copy this link:", link.url);
    }
  };

  const dynamicProfiles = teamMembers.map((m) => `${m.name} (${m.roleTitle})`);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8 text-white font-sans">
      <PageHeader
        eyebrow="Organization & Governance"
        title="Teams, Pods & Staff Access"
        description="Structure multi-disciplinary pods, assign pod leaders, calibrate specialized roles, and manage system access credentials."
        actions={
          <div className="flex items-center gap-2">
            {subTab === "pods" ? (
              <>
                <button
                  type="button"
                  onClick={() => setAddMemberOpen(true)}
                  className={btnDark}
                >
                  <Icon name="user-plus" />
                  Add Team Member
                </button>
                <button
                  type="button"
                  onClick={() => setCreatePodOpen(true)}
                  className={btnPrimary}
                >
                  <Icon name="bolt" />
                  Create New Pod
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setInviteError(null);
                  setInviteOpen(true);
                }}
                className={btnPrimary}
              >
                <Icon name="user-plus" />
                Invite Staff
              </button>
            )}
          </div>
        }
      />

      {/* Subtab Navigation Strip */}
      <div className="flex items-center gap-2 border-b border-[#262626] pb-3">
        <button
          type="button"
          onClick={() => setSubTab("pods")}
          className={`flex items-center gap-2 px-4 py-2 font-sans text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            subTab === "pods"
              ? "border-[#FBD227] text-white bg-[#141414]"
              : "border-transparent text-[#888888] hover:text-white"
          }`}
        >
          <Icon name="users" className="h-4 w-4 text-[#FBD227]" />
          Pods & Team Leaders ({pods.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab("accounts")}
          className={`flex items-center gap-2 px-4 py-2 font-sans text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            subTab === "accounts"
              ? "border-[#FBD227] text-white bg-[#141414]"
              : "border-transparent text-[#888888] hover:text-white"
          }`}
        >
          <Icon name="shield" className="h-4 w-4 text-[#FBD227]" />
          Staff Accounts & Credentials ({users.length})
        </button>
      </div>

      {notice && (
        <p role="status" className="flex items-center gap-3 border-l-4 border-[#FBD227] bg-[#161616] border border-[#262626] px-4 py-3 font-sans text-sm font-semibold text-white rounded-r">
          <Icon name="check-circle" className="h-5 w-5 text-[#FBD227]" />
          <span className="flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-xs font-bold uppercase text-[#FBD227] hover:underline">
            Dismiss
          </button>
        </p>
      )}
      {error && (
        <p role="alert" className="flex items-center gap-3 border-l-4 border-rose-500 bg-rose-950/30 border border-rose-500/30 px-4 py-3 font-sans text-sm font-semibold text-rose-300 rounded-r">
          <Icon name="alert" className="h-5 w-5" />
          {error}
        </p>
      )}

      {/* ============================================================== */}
      {/* SUBTAB 1: PODS & TEAM LEADERS */}
      {/* ============================================================== */}
      {subTab === "pods" && (
        <div className="space-y-6">
          {/* Studio Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-[#262626] bg-[#111111] p-4">
              <span className="text-xs font-sans uppercase font-bold text-[#888888] block">Active Pods</span>
              <span className="font-monument text-2xl font-bold text-white mt-1 block">{pods.length}</span>
              <span className="text-[11px] text-[#666666]">Specialized delivery squads</span>
            </div>
            <div className="border border-[#262626] bg-[#111111] p-4">
              <span className="text-xs font-sans uppercase font-bold text-[#888888] block">Assigned Pod Leads</span>
              <span className="font-monument text-2xl font-bold text-[#FBD227] mt-1 block">
                {pods.filter((p) => p.leaderId).length}
              </span>
              <span className="text-[11px] text-[#666666]">Accountable for project kickoff</span>
            </div>
            <div className="border border-[#262626] bg-[#111111] p-4">
              <span className="text-xs font-sans uppercase font-bold text-[#888888] block">Total Personnel</span>
              <span className="font-monument text-2xl font-bold text-white mt-1 block">{teamMembers.length}</span>
              <span className="text-[11px] text-[#666666]">Engineers, designers & leads</span>
            </div>
            <div className="border border-[#262626] bg-[#111111] p-4">
              <span className="text-xs font-sans uppercase font-bold text-[#888888] block">Active Workstreams</span>
              <span className="font-monument text-2xl font-bold text-sky-400 mt-1 block">
                {pods.reduce((sum, p) => sum + p.activeProjectsCount, 0)}
              </span>
              <span className="text-[11px] text-[#666666]">Live client projects in flight</span>
            </div>
          </div>

          {/* Pods Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {pods.map((pod) => {
              const membersInPod = teamMembers.filter((m) => m.teamId === pod.id || pod.memberIds?.includes(m.id));

              return (
                <div
                  key={pod.id}
                  className="rounded-xl border border-[#262626] bg-[#111111] overflow-hidden flex flex-col justify-between shadow-lg"
                >
                  {/* Pod Color Banner */}
                  <div style={{ backgroundColor: pod.color }} className="h-2 w-full" />

                  <div className="p-5 flex-1">
                    {/* Header: Name + Badge + Edit Action */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-monument text-base font-bold text-white uppercase tracking-tight">
                          {pod.name}
                        </h3>
                        <p className="text-xs text-[#888888] mt-1 leading-relaxed">
                          {pod.focusArea}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditPodModal(pod)}
                          className="font-mono text-xs px-2.5 py-1 rounded bg-[#1A1A1A] border border-[#333333] text-gray-300 hover:text-[#FBD227] hover:border-[#FBD227]/50 hover:bg-[#222222] transition-colors flex items-center gap-1.5"
                          title="Edit / Update Pod details"
                        >
                          <Icon name="pencil" className="h-3 w-3 text-[#FBD227]" />
                          <span>Edit</span>
                        </button>
                        <span className="font-mono text-xs px-2 py-1 rounded bg-black/60 border border-[#333333] text-[#FBD227] shrink-0 font-bold">
                          {pod.activeProjectsCount} Projects
                        </span>
                      </div>
                    </div>

                    {/* Assigned Pod Leader Box */}
                    <div className="my-4 rounded-lg border border-[#333333] bg-[#161616] p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FBD227] font-monument font-black text-black text-sm">
                          {pod.leaderName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">{pod.leaderName}</span>
                            <span className="text-[10px] font-mono text-[#FBD227] bg-[#FBD227]/10 border border-[#FBD227]/30 px-1 rounded">
                              👑 Pod Leader
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-[#999999] block">{pod.leaderRole}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setReassignPod(pod);
                          setNewLeaderId(pod.leaderId);
                        }}
                        className="text-xs font-mono font-bold text-[#FBD227] hover:underline"
                        title="Reassign team leader for this pod"
                      >
                        Change
                      </button>
                    </div>

                    {/* Member Roster */}
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[#777777] block mb-2 font-bold">
                        Pod Roster ({membersInPod.length})
                      </span>
                      <div className="space-y-2">
                        {membersInPod.length === 0 ? (
                          <p className="text-xs text-[#666666] italic">No specialists assigned yet.</p>
                        ) : (
                          membersInPod.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between border border-[#222222] bg-[#141414] px-3 py-2 rounded text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded bg-[#262626] font-mono font-bold text-[11px] text-gray-300">
                                  {m.avatar}
                                </span>
                                <div>
                                  <span className="font-bold text-white block">{m.name}</span>
                                  <span className="text-[10px] font-mono text-[#888888]">{m.roleTitle}</span>
                                </div>
                              </div>
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                                  m.status === "Active"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                    : "bg-gray-700/20 text-gray-400"
                                }`}
                              >
                                {m.status}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pod Footer Actions */}
                  <div className="border-t border-[#262626] bg-[#0E0E0E] px-5 py-3 flex items-center justify-between text-xs font-mono text-[#888888]">
                    <span>Created {pod.createdAt}</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => openEditPodModal(pod)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        Edit Pod
                      </button>
                      <span className="text-[#333333]">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setMemPodId(pod.id);
                          setAddMemberOpen(true);
                        }}
                        className="text-[#FBD227] hover:underline font-bold"
                      >
                        + Add to Pod
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full Studio Personnel & Roles Table */}
          <Panel className="!p-0 overflow-hidden mt-8">
            <div className="border-b border-[#262626] p-4 bg-[#141414] flex items-center justify-between">
              <div>
                <h3 className="font-monument text-sm font-bold uppercase text-white">
                  Studio Personnel & Specialized Roles
                </h3>
                <p className="text-xs text-[#888888] mt-0.5">
                  Direct mapping of team roles, leader accountability, and pod membership across the agency.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[56rem] border-collapse text-left font-sans text-sm">
                <thead>
                  <tr className="border-b border-[#262626] bg-[#111111] text-xs uppercase tracking-[0.12em] text-gray-400 font-monument">
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Specialized Role</th>
                    <th className="px-4 py-3">Assigned Pod</th>
                    <th className="px-4 py-3">Leader Status</th>
                    <th className="px-4 py-3">Permission Tier</th>
                    <th className="px-4 py-3">Active Projects</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F1F]">
                  {teamMembers.map((m) => {
                    const pod = pods.find((p) => p.id === m.teamId);
                    return (
                      <tr key={m.id} className="hover:bg-[#161616] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded bg-[#262626] font-monument font-bold text-xs text-[#FBD227]">
                              {m.avatar}
                            </span>
                            <div>
                              <span className="font-bold text-white block">{m.name}</span>
                              <span className="text-xs text-gray-400 font-mono">{m.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-gray-200">
                          {m.roleTitle}
                        </td>
                        <td className="px-4 py-3">
                          {pod ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-white">
                              <span
                                style={{ backgroundColor: pod.color }}
                                className="h-2 w-2 rounded-full inline-block"
                              />
                              {pod.name}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500 font-mono">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {m.isLeader ? (
                            <span className="inline-flex items-center gap-1 rounded bg-[#FBD227]/20 border border-[#FBD227]/40 px-2 py-0.5 text-[11px] font-mono font-bold text-[#FBD227]">
                              👑 Pod Lead
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500 font-mono">Member</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-300">
                          <Chip tone={m.permission === "Owner / Admin" ? "black" : "plain"}>
                            {m.permission}
                          </Chip>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">
                          {m.activeProjects.length > 0 ? m.activeProjects.join(", ") : "Available for assignment"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUBTAB 2: STAFF ACCOUNTS & CREDENTIALS (ORIGINAL VIEW) */}
      {/* ============================================================== */}
      {subTab === "accounts" && (
        <div className="space-y-6">
          <Panel className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[56rem] border-collapse text-left font-sans text-sm">
                <thead>
                  <tr className="border-b border-[#262626] bg-[#141414] text-xs uppercase tracking-[0.12em] text-gray-400 font-monument">
                    <th className="px-4 py-3">Person</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Task board profile</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last login</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F1F]">
                  {loading && <SkeletonRows rows={4} cols={6} />}
                  {!loading && users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center font-semibold text-gray-400">{error ? "Staff could not be loaded." : "No staff accounts yet."}</td>
                    </tr>
                  )}
                  {users.map((u) => {
                    const isSelf = u.id === currentId;
                    const busy = busyId === u.id;
                    return (
                      <tr key={u.id} className={u.status === "disabled" ? "bg-[#141414]/50 text-gray-500" : "hover:bg-[#161616] transition-colors"}>
                        <td className="px-4 py-3">
                          <div className="font-bold text-white">
                            {u.name}
                            {isSelf && <span className="ml-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#FBD227]">You</span>}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <label className="sr-only" htmlFor={`role-${u.id}`}>Role for {u.name}</label>
                          <select
                            id={`role-${u.id}`}
                            value={u.role}
                            disabled={busy || isSelf}
                            onChange={(e) => {
                              if (e.target.value === "admin" && !window.confirm(`Make ${u.name} an admin? Admins can see financials, clients and staff.`)) return;
                              void act(u.id, { action: "set_role", role: e.target.value }, `${u.name} is now ${e.target.value === "admin" ? "an admin" : "a team member"}.`);
                            }}
                            className={`${fieldClass} !w-auto`}
                          >
                            <option value="team">Team</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <label className="sr-only" htmlFor={`label-${u.id}`}>Task board profile for {u.name}</label>
                          <select
                            id={`label-${u.id}`}
                            value={u.memberLabel ?? ""}
                            disabled={busy}
                            onChange={(e) => act(u.id, { action: "set_label", memberLabel: e.target.value }, `Task board profile updated for ${u.name}.`)}
                            className={`${fieldClass} !w-auto`}
                          >
                            <option value="">Not linked</option>
                            {dynamicProfiles.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <Chip tone={u.status === "active" ? "black" : "orange"}>{u.status === "active" ? "Active" : "Disabled"}</Chip>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-gray-400 font-mono">{when(u.lastLoginAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button type="button" disabled={busy} onClick={() => act(u.id, { action: "reset_link" }, "")} className={btnGhost}>
                              <Icon name="key" />
                              Reset link
                            </button>
                            {!isSelf && (
                              <>
                                <button type="button" disabled={busy} onClick={() => act(u.id, { action: "sign_out" }, `${u.name} was signed out everywhere.`)} className={btnGhost}>
                                  <Icon name="logout" />
                                  Sign out
                                </button>
                                {u.status === "active" ? (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => window.confirm(`Disable ${u.name}? They lose access immediately.`) && act(u.id, { action: "disable" }, `${u.name} was disabled.`)}
                                    className={btnDark}
                                  >
                                    <Icon name="lock" />
                                    Disable
                                  </button>
                                ) : (
                                  <button type="button" disabled={busy} onClick={() => act(u.id, { action: "enable" }, `${u.name} was re-enabled.`)} className={btnPrimary}>
                                    <Icon name="check" />
                                    Enable
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel>
              <h3 className="font-monument text-base font-bold uppercase text-white">Pending invites</h3>
              {inviteLoadError && <p role="alert" className="mt-3 font-sans text-sm font-semibold text-rose-400">{inviteLoadError}</p>}
              {invites.length === 0 ? (
                <p className="mt-3 font-sans text-sm text-gray-400">No open invites. Create one to bring someone in.</p>
              ) : (
                <ul className="mt-3 divide-y divide-[#262626] border-y border-[#262626]">
                  {invites.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-3 font-sans text-sm">
                      <span className="font-bold text-white font-mono">{i.email ?? "Any email address"}</span>
                      <span className="flex items-center gap-2">
                        <Chip tone={i.role === "admin" ? "black" : "plain"}>{i.role}</Chip>
                        <span className="text-xs font-semibold text-gray-400 font-mono">Expires {when(i.expiresAt)}</span>
                        <button
                          type="button"
                          disabled={Boolean(busyId)}
                          onClick={() => revokeInvite(i.id, i.email)}
                          className="text-xs font-bold uppercase text-rose-400 hover:text-rose-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400"
                        >
                          Revoke
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 font-sans text-sm leading-relaxed text-gray-400">
                Shared codes: send <span className="font-bold text-white font-mono">/staff/register#code=YOUR_CODE</span> using the value of
                STAFF_INVITE_CODE (team) or ADMIN_INVITE_CODE (admin). The code stays in the address fragment. Personal invites above are locked to one email address and single use.
              </p>
            </Panel>

            <Panel>
              <h3 className="font-monument text-base font-bold uppercase text-white">What each role can do</h3>
              <table className="mt-3 w-full border-collapse text-left font-sans text-sm">
                <thead>
                  <tr className="border-b border-[#262626] text-xs uppercase tracking-[0.12em] text-gray-400 font-monument">
                    <th className="py-2 pr-3">Capability</th>
                    <th className="px-3 py-2 text-center">Admin</th>
                    <th className="px-3 py-2 text-center">Team</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {matrix.map((row) => (
                    <tr key={row.capability}>
                      <td className="py-2.5 pr-3 font-semibold text-gray-300">{row.capability}</td>
                      {[row.admin, row.team].map((allowed, idx) => (
                        <td key={idx} className="px-3 py-2.5 text-center">
                          {allowed ? <Icon name="check" title="Allowed" className="mx-auto h-4 w-4 text-[#FBD227]" /> : <span className="text-gray-600" aria-label="Not allowed">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>
        </div>
      )}

      {/* --- MODAL 1: CREATE NEW POD --- */}
      <Modal open={createPodOpen} onClose={() => setCreatePodOpen(false)} title="Create New Pod">
        <form onSubmit={handleCreatePod} className="space-y-4 text-white">
          <div>
            <label className={labelClass}>Pod Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. AI Automation & Growth Pod"
              value={podName}
              onChange={(e) => setPodName(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Focus Area / Deliverable Mission</label>
            <textarea
              rows={2}
              placeholder="e.g. LLM Agents, Next.js Fullstack, CRM automation"
              value={podFocus}
              onChange={(e) => setPodFocus(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Assign Initial Pod Leader</label>
            <select
              value={podLeaderId}
              onChange={(e) => setPodLeaderId(e.target.value)}
              className={fieldClass}
            >
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.roleTitle}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Pod Accent Color</label>
            <div className="flex items-center gap-3">
              {[
                { color: "#FBD227", name: "Amber" },
                { color: "#38BDF8", name: "Sky" },
                { color: "#818CF8", name: "Indigo" },
                { color: "#34D399", name: "Emerald" },
                { color: "#F472B6", name: "Rose" },
              ].map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => setPodColor(c.color)}
                  style={{ backgroundColor: c.color }}
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${
                    podColor === c.color ? "border-white scale-110 shadow-lg" : "border-transparent opacity-70"
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-[#262626] pt-4">
            <button type="button" onClick={() => setCreatePodOpen(false)} className={btnGhost}>
              Cancel
            </button>
            <button type="submit" disabled={podSubmitting} className={btnPrimary}>
              {podSubmitting ? "Creating…" : "Assemble Pod"}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 2: ADD TEAM MEMBER --- */}
      <Modal open={addMemberOpen} onClose={() => setAddMemberOpen(false)} title="Add Team Member">
        <form onSubmit={handleAddMember} className="space-y-4 text-white">
          <div>
            <label className={labelClass}>Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Tyler Reed"
              value={memName}
              onChange={(e) => setMemName(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Specialized Role Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Senior 3D Motion Designer"
              value={memRole}
              onChange={(e) => setMemRole(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Work Email *</label>
            <input
              type="email"
              required
              placeholder="tyler@thevirtuslabs.com"
              value={memEmail}
              onChange={(e) => setMemEmail(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Assign to Pod (Optional)</label>
            <select
              value={memPodId}
              onChange={(e) => setMemPodId(e.target.value)}
              className={fieldClass}
            >
              <option value="">No Pod (General Roster)</option>
              {pods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Permission Tier</label>
            <select
              value={memPermission}
              onChange={(e) => setMemPermission(e.target.value as TeamMemberUser["permission"])}
              className={fieldClass}
            >
              <option value="Specialist">Specialist (Delivery focused)</option>
              <option value="Pod Lead">Pod Lead (Project leader)</option>
              <option value="Owner / Admin">Owner / Admin (Studio management)</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 border-t border-[#262626] pt-4">
            <button type="button" onClick={() => setAddMemberOpen(false)} className={btnGhost}>
              Cancel
            </button>
            <button type="submit" disabled={memSubmitting} className={btnPrimary}>
              {memSubmitting ? "Adding…" : "Add to Roster"}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 3: REASSIGN POD LEADER --- */}
      <Modal open={reassignPod !== null} onClose={() => setReassignPod(null)} title={`Reassign Leader: ${reassignPod?.name || ""}`}>
        {reassignPod && (
          <form onSubmit={handleAssignLeader} className="space-y-4 text-white">
            <p className="text-xs text-gray-300">
              The assigned Pod Leader is accountable for lead qualification, kickoffs, and sprint delivery for this pod.
            </p>
            <div>
              <label className={labelClass}>Select New Pod Leader</label>
              <select
                value={newLeaderId}
                onChange={(e) => setNewLeaderId(e.target.value)}
                className={fieldClass}
              >
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.roleTitle})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#262626] pt-4">
              <button type="button" onClick={() => setReassignPod(null)} className={btnGhost}>
                Cancel
              </button>
              <button type="submit" className={btnPrimary}>
                Confirm Leader
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* --- MODAL: EDIT / UPDATE POD --- */}
      <Modal open={editingPod !== null} onClose={() => setEditingPod(null)} title={`Edit Pod: ${editingPod?.name || ""}`}>
        {editingPod && (
          <form onSubmit={handleUpdatePod} className="space-y-4 text-white">
            <div>
              <label className={labelClass}>Pod Name *</label>
              <input
                type="text"
                required
                value={editPodName}
                onChange={(e) => setEditPodName(e.target.value)}
                className={fieldClass}
                placeholder="e.g. Brand & Creative Pod"
              />
            </div>
            <div>
              <label className={labelClass}>Discipline & Focus Area</label>
              <input
                type="text"
                value={editPodFocus}
                onChange={(e) => setEditPodFocus(e.target.value)}
                className={fieldClass}
                placeholder="e.g. Visual Identity, Art Direction, Motion & Spatial Design"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Assigned Pod Leader</label>
                <select
                  value={editPodLeaderId}
                  onChange={(e) => setEditPodLeaderId(e.target.value)}
                  className={fieldClass}
                >
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.roleTitle}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Active Projects Count</label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={editPodActiveProjects}
                  onChange={(e) => setEditPodActiveProjects(Number(e.target.value))}
                  className={fieldClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Pod Accent Color</label>
              <div className="flex items-center gap-3">
                {[
                  { color: "#FBD227", name: "Amber" },
                  { color: "#38BDF8", name: "Sky" },
                  { color: "#818CF8", name: "Indigo" },
                  { color: "#34D399", name: "Emerald" },
                  { color: "#F472B6", name: "Rose" },
                  { color: "#DD7230", name: "Orange" },
                ].map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => setEditPodColor(c.color)}
                    style={{ backgroundColor: c.color }}
                    className={`h-8 w-8 rounded-full border-2 transition-transform ${
                      editPodColor === c.color ? "border-white scale-110 shadow-lg" : "border-transparent opacity-70"
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[#262626] pt-4">
              <button
                type="button"
                onClick={handleDeletePod}
                disabled={editPodSubmitting}
                className="text-xs font-mono font-bold text-rose-400 hover:text-rose-300 hover:underline"
              >
                Delete Pod
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditingPod(null)} className={btnGhost}>
                  Cancel
                </button>
                <button type="submit" disabled={editPodSubmitting} className={btnPrimary}>
                  {editPodSubmitting ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* --- MODAL 4: INVITE STAFF --- */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite staff">
        <form onSubmit={createInvite} className="space-y-4 text-white">
          <div>
            <label htmlFor="invite-email" className={labelClass}>Email address (optional)</label>
            <input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className={fieldClass} placeholder="name@example.com" />
            <p className="mt-1.5 font-sans text-xs text-gray-400">Leave empty to let anyone with the link register.</p>
          </div>
          <div>
            <label htmlFor="invite-role" className={labelClass}>Role</label>
            <select id="invite-role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "team" | "admin")} className={fieldClass}>
              <option value="team">Team member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {inviteError && (
            <p role="alert" className="flex items-center gap-2 border-l-4 border-rose-500 bg-rose-950/30 px-3 py-2 font-sans text-sm font-semibold text-rose-300">
              <Icon name="alert" />
              {inviteError}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-[#262626] pt-4">
            <button type="button" onClick={() => setInviteOpen(false)} className={btnGhost}>Cancel</button>
            <button type="submit" disabled={inviteSubmitting} className={btnPrimary}>
              {inviteSubmitting ? "Creating…" : "Create invite link"}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 5: LINK READY --- */}
      <Modal open={link !== null} onClose={() => setLink(null)} title={link?.title ?? ""}>
        {link && (
          <div className="space-y-4 text-white">
            <label htmlFor="issued-link" className={labelClass}>Link</label>
            <input id="issued-link" readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} className={fieldClass} />
            <p className="font-sans text-sm text-gray-400">{link.note}</p>
            <div className="flex justify-end gap-2 border-t border-[#262626] pt-4">
              <button type="button" onClick={() => setLink(null)} className={btnGhost}>Done</button>
              <button type="submit" onClick={copy} className={btnPrimary}>
                <Icon name={copied ? "check" : "copy"} />
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
