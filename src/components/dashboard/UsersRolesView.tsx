"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { SkeletonRows } from "./Skeleton";
import { Chip, Modal, PageHeader, Panel, btnDark, btnGhost, btnPrimary, fieldClass, labelClass } from "./ui";
import type { TeamPod, TeamMemberUser, MemberPortfolioItem } from "@/db";
import { ArchitecturalPreview } from "@/components/public/TeamShowcase";
import { isImageUrl } from "./MyProfileCardView";
import { setCachedTeamsData } from "@/lib/teamsClientCache";

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

interface MassRegistryState {
  token: string;
  enabled: boolean;
  updatedAt: string;
  updatedBy: string;
}

interface PendingInvite {
  id: string;
  email: string | null;
  role: "team" | "admin";
  expiresAt: string;
}

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never";

function extractDomain(urlStr: string): string {
  try {
    const url = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return urlStr;
  }
}

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

function DashboardTeamMemberCard({
  member,
  pod,
  onManagePortfolio,
  onDeleteMember,
}: {
  member: TeamMemberUser;
  pod?: TeamPod;
  onManagePortfolio: (m: TeamMemberUser) => void;
  onDeleteMember: (m: TeamMemberUser) => void;
}) {
  const [deckIndex, setDeckIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"stacked" | "grid">("stacked");

  const podColor = pod?.color || "#FBD227";
  const portfolioItems: MemberPortfolioItem[] =
    member.portfolioCollection && member.portfolioCollection.length > 0
      ? member.portfolioCollection
      : member.portfolioUrl
      ? [
          {
            id: `dash-fallback-${member.id}`,
            title: `${member.name}'s Primary Portfolio`,
            url: member.portfolioUrl,
            tag: "PRIMARY PORTFOLIO",
            description: `Official digital portfolio and interactive client build archive for ${member.name}.`,
            accentColor: podColor,
          },
        ]
      : [];

  const total = portfolioItems.length;
  const activeIndex = total > 0 ? ((deckIndex % total) + total) % total : 0;
  const currentCard = total > 0 ? portfolioItems[activeIndex] : null;

  return (
    <div className="relative flex flex-col justify-between rounded-xl border border-[#262626] bg-[#111111] p-5 sm:p-6 transition-all hover:border-[#383838] overflow-hidden shadow-lg">
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: podColor }} />

      <div>
        {/* Header: Avatar, Name, Role, Manage Button */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-monument text-sm font-bold text-white border overflow-hidden"
              style={{ backgroundColor: "#181818", borderColor: `${podColor}60` }}
            >
              {isImageUrl(member.avatar || member.avatarUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.avatar || member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
              ) : (
                member.avatar || member.name.charAt(0)
              )}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                {member.teamName && (
                  <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#222222] text-gray-300 border border-[#333333]">
                    {member.teamName}
                  </span>
                )}
                {member.isLeader && (
                  <span className="inline-flex items-center gap-1 rounded bg-[#FBD227]/15 border border-[#FBD227]/30 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-[#FBD227]">
                    <Icon name="bolt" className="h-2.5 w-2.5" />
                    <span>Pod Lead</span>
                  </span>
                )}
              </div>
              <h4 className="font-monument text-base font-bold uppercase text-white">
                {member.name}
              </h4>
              {member.username && (
                <p className="font-mono text-[11px] text-[#FBD227] tracking-wider">
                  @{member.username.replace(/^@/, "")}
                </p>
              )}
              <p className="font-mono text-xs text-[#FBD227] font-semibold">
                {member.roleTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onManagePortfolio(member)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#1C1C1C] hover:bg-[#282828] text-xs font-mono font-bold text-gray-200 hover:text-white border border-[#333333] transition-colors shrink-0"
              title="Edit bio, skills, and portfolio website cards"
            >
              <Icon name="pencil" className="h-3 w-3 text-[#FBD227]" />
              <span>Manage</span>
            </button>
            <button
              type="button"
              onClick={() => onDeleteMember(member)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-rose-500/30 hover:border-rose-500 bg-rose-950/20 text-rose-300 hover:text-rose-200 text-xs font-mono transition-colors shrink-0"
              title={`Delete ${member.name} from roster`}
            >
              <Icon name="close" className="h-3 w-3 text-rose-400" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Bio */}
        {member.bio && (
          <p className="font-sans text-xs text-gray-400 leading-relaxed mb-3">
            {member.bio}
          </p>
        )}

        {/* Skills */}
        {member.skills && member.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {member.skills.map((skill, sIdx) => (
              <span
                key={sIdx}
                className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#181818] text-gray-300 border border-[#2B2B2B]"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* Explicit Personal Website Line */}
        <div className="flex items-center justify-between gap-2 py-2 px-3 rounded bg-[#161616] border border-[#242424] font-mono text-xs mb-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold flex items-center gap-1">
              <Icon name="link" className="h-2.5 w-2.5 text-[#FBD227]" />
              <span>Personal Website:</span>
            </span>
            {member.portfolioUrl ? (
              <a
                href={member.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#FBD227] hover:underline font-semibold"
              >
                <span>{extractDomain(member.portfolioUrl)}</span>
                <Icon name="arrow-up-right" className="h-2.5 w-2.5" />
              </a>
            ) : (
              <span className="text-gray-500 italic text-[11px]">Not configured</span>
            )}
          </div>
          {!member.portfolioUrl && (
            <button
              type="button"
              onClick={() => onManagePortfolio(member)}
              className="text-[10px] font-mono font-bold text-[#FBD227] hover:underline"
            >
              + Add personal website
            </button>
          )}
        </div>
      </div>

      {/* Portfolio Card Deck */}
      {total > 0 ? (
        <div className="mt-2 border-t border-[#222222] pt-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Icon name="folder" className="h-3 w-3 text-[#FBD227]" />
              <span className="font-monument text-[11px] uppercase tracking-wider text-gray-300">
                Portfolio Deck
              </span>
              <span className="font-mono text-[10px] font-bold text-[#FBD227] bg-[#FBD227]/10 px-1.5 py-0.5 rounded border border-[#FBD227]/20">
                {String(activeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === "stacked" ? "grid" : "stacked")}
                className="px-2 py-0.5 rounded bg-[#1C1C1C] text-gray-400 hover:text-white font-mono text-[10px] border border-[#2C2C2C] transition-colors"
              >
                {viewMode === "stacked" ? "Fan" : "Deck"}
              </button>
              {viewMode === "stacked" && total > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setDeckIndex((prev) => (prev === 0 ? total - 1 : prev - 1))}
                    className="h-6 w-6 flex items-center justify-center rounded bg-[#1C1C1C] hover:bg-[#FBD227] hover:text-black text-gray-300 border border-[#2C2C2C] transition-colors"
                  >
                    <Icon name="chevron-left" className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeckIndex((prev) => (prev + 1) % total)}
                    className="h-6 w-6 flex items-center justify-center rounded bg-[#1C1C1C] hover:bg-[#FBD227] hover:text-black text-gray-300 border border-[#2C2C2C] transition-colors"
                  >
                    <Icon name="chevron-right" className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          </div>

          {viewMode === "stacked" && currentCard ? (
            <div className="rounded-lg border border-[#2C2C2C] bg-[#161616] p-3.5 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-[#242424]">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-[11px] text-gray-300 truncate max-w-[12rem]">
                    {extractDomain(currentCard.url)}
                  </span>
                </div>
                {currentCard.tag && (
                  <span
                    className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border"
                    style={{
                      backgroundColor: `${currentCard.accentColor || podColor}15`,
                      color: currentCard.accentColor || podColor,
                      borderColor: `${currentCard.accentColor || podColor}30`,
                    }}
                  >
                    {currentCard.tag}
                  </span>
                )}
              </div>

              {/* Visual Preview */}
              <div className="my-2">
                {currentCard.previewImage ? (
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-[#262626]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentCard.previewImage}
                      alt={currentCard.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <ArchitecturalPreview
                    item={currentCard}
                    accentColor={currentCard.accentColor || podColor}
                  />
                )}
              </div>

              <div>
                <h5 className="font-monument text-xs font-bold uppercase text-white truncate">
                  {currentCard.title}
                </h5>
                {currentCard.description && (
                  <p className="font-sans text-[11px] text-gray-400 line-clamp-2 mt-0.5">
                    {currentCard.description}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#222222]">
                <span className="font-mono text-[10px] text-gray-500">
                  Card {activeIndex + 1} of {total}
                </span>
                <a
                  href={currentCard.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded bg-[#202020] hover:bg-[#FBD227] hover:text-black text-[#FBD227] px-2.5 py-1 font-mono text-[10px] font-bold uppercase border border-[#333333] transition-colors"
                >
                  <span>Visit Site</span>
                  <Icon name="arrow-up-right" className="h-3 w-3" />
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {portfolioItems.map((item, idx) => (
                <div key={item.id || idx} className="rounded-lg border border-[#242424] bg-[#141414] p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-monument text-[11px] font-bold uppercase text-white truncate max-w-[14rem]">
                      {item.title}
                    </span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#FBD227] hover:underline"
                    >
                      <span>Visit</span>
                      <Icon name="arrow-up-right" className="h-2.5 w-2.5" />
                    </a>
                  </div>
                  {/* Visual Preview */}
                  <div className="my-2">
                    {item.previewImage ? (
                      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-[#262626]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.previewImage}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <ArchitecturalPreview
                        item={item}
                        accentColor={item.accentColor || podColor}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-[10px] text-gray-400">{extractDomain(item.url)}</span>
                    {item.tag && (
                      <span className="font-mono text-[8px] uppercase px-1 py-0.2 rounded bg-[#222222] text-gray-400">
                        {item.tag}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 border-t border-[#222222] pt-3 flex items-center justify-between text-xs text-gray-500 font-mono">
          <span>No portfolio websites configured yet.</span>
          <button
            type="button"
            onClick={() => onManagePortfolio(member)}
            className="text-[#FBD227] hover:underline font-bold text-[11px]"
          >
            + Add First Site
          </button>
        </div>
      )}
    </div>
  );
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

  // Mass Team Registry state
  const [massRegistry, setMassRegistry] = useState<MassRegistryState | null>(null);
  const [massCopied, setMassCopied] = useState(false);
  const [massUpdating, setMassUpdating] = useState(false);

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
  const [memBio, setMemBio] = useState("");
  const [memSkills, setMemSkills] = useState("");
  const [memPortfolioUrl, setMemPortfolioUrl] = useState("");
  const [memCardTitle, setMemCardTitle] = useState("");
  const [memCardUrl, setMemCardUrl] = useState("");
  const [memCardTag, setMemCardTag] = useState("PRODUCTION BUILD");
  const [memCardDesc, setMemCardDesc] = useState("");
  const [memCardPreviewImage, setMemCardPreviewImage] = useState("");
  const [memSubmitting, setMemSubmitting] = useState(false);
  const [movingMemberId, setMovingMemberId] = useState<string | null>(null);
  const [addMemberMode, setAddMemberMode] = useState<"existing" | "new">("existing");
  const [selectedExistingMemberId, setSelectedExistingMemberId] = useState("");

  // Manage Portfolio Collection Modal State
  const [portfolioModalMember, setPortfolioModalMember] = useState<TeamMemberUser | null>(null);
  const [portfolioName, setPortfolioName] = useState("");
  const [portfolioRoleTitle, setPortfolioRoleTitle] = useState("");
  const [portfolioTeamId, setPortfolioTeamId] = useState("");
  const [portfolioBio, setPortfolioBio] = useState("");
  const [portfolioSkills, setPortfolioSkills] = useState("");
  const [portfolioMainUrl, setPortfolioMainUrl] = useState("");
  const [portfolioItems, setPortfolioItems] = useState<MemberPortfolioItem[]>([]);
  const [portfolioSaving, setPortfolioSaving] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);

  // Leader Reassignment Modal
  const [reassignPod, setReassignPod] = useState<TeamPod | null>(null);
  const [newLeaderId, setNewLeaderId] = useState("");
  const [reassignSubmitting, setReassignSubmitting] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);

  // Edit Member Title State
  const [editingTitleMemberId, setEditingTitleMemberId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

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
      setCachedTeamsData(res.data.teams || [], res.data.members || []);
      if (res.data.members && res.data.members.length > 0 && !podLeaderId) {
        setPodLeaderId(res.data.members[0].id);
      }
    }
    setPodLoading(false);
  }, [podLeaderId]);

  const load = useCallback(async () => {
    const [u, i, m] = await Promise.all([
      api<{ users: StaffRow[]; currentId: string }>("/api/staff/users"),
      api<PendingInvite[]>("/api/staff/invites"),
      api<MassRegistryState>("/api/staff/mass-register"),
    ]);
    if (!u.ok) setError(u.error ?? "Could not load staff.");
    else {
      setError(null);
      setUsers(u.data!.users);
      setCurrentId(u.data!.currentId);
    }
    if (i.ok) setInvites(i.data!);
    else setInviteLoadError(i.error ?? "Could not load pending invites.");
    if (m.ok && m.data) setMassRegistry(m.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    void loadTeams();
  }, [load, loadTeams]);

  const handleCopyMassLink = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/join`;
    try {
      await navigator.clipboard.writeText(url);
      setMassCopied(true);
      setTimeout(() => setMassCopied(false), 3000);
    } catch {
      window.prompt("Copy team mass registration link:", url);
    }
  };

  const handleRotateMassToken = async () => {
    if (!window.confirm("Rotate mass registration link? The previous link will immediately stop working.")) return;
    setMassUpdating(true);
    const res = await api<MassRegistryState>("/api/staff/mass-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rotate" }),
    });
    setMassUpdating(false);
    if (res.ok && res.data) {
      setMassRegistry(res.data);
      setNotice("Mass registration token rotated. A new link has been issued.");
    } else {
      setError(res.error ?? "Could not rotate mass registry token.");
    }
  };

  const handleToggleMassRegistry = async () => {
    if (!massRegistry) return;
    const nextState = !massRegistry.enabled;
    setMassUpdating(true);
    const res = await api<MassRegistryState>("/api/staff/mass-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", enabled: nextState }),
    });
    setMassUpdating(false);
    if (res.ok && res.data) {
      setMassRegistry(res.data);
      setNotice(`Mass team registration is now ${nextState ? "active" : "paused"}.`);
    } else {
      setError(res.error ?? "Could not update mass registry status.");
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (busyId || !window.confirm(`Permanently delete ${name}? This will remove their credentials and prune them from all pods and showcases.`)) return;
    setBusyId(id);
    setNotice(null);
    const res = await api<{ id: string }>(`/api/staff/users/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    setBusyId(null);
    if (res.ok) {
      setNotice(`Staff account for ${name} deleted successfully.`);
      await Promise.all([load(), loadTeams()]);
    } else {
      setError(res.error ?? "Failed to delete staff account.");
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!window.confirm(`Permanently delete ${name} from team roster and all active showcases?`)) return;
    const res = await api<unknown>(`/api/teams?type=member&id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setNotice(`Team member ${name} removed successfully.`);
      await Promise.all([load(), loadTeams()]);
    } else {
      setError(res.error ?? "Failed to remove member.");
    }
  };

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

  const handleMoveMemberPod = async (memberId: string, newTeamId: string) => {
    const member = teamMembers.find((m) => m.id === memberId);
    if (!member) return;
    const targetPod = pods.find((p) => p.id === newTeamId);

    setMovingMemberId(memberId);
    const res = await api<{ member: TeamMemberUser }>("/api/teams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_member",
        id: memberId,
        teamId: targetPod ? targetPod.id : "",
        teamName: targetPod ? targetPod.name : "",
      }),
    });
    setMovingMemberId(null);
    if (res.ok) {
      setNotice(
        targetPod
          ? `Moved ${member.name} into ${targetPod.name}!`
          : `Unassigned ${member.name} from pod (now in General Roster).`
      );
      await loadTeams();
    } else {
      setError(res.error || "Failed to update pod assignment.");
    }
  };

  const handleAssignExistingToPod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExistingMemberId || !memPodId) return;
    await handleMoveMemberPod(selectedExistingMemberId, memPodId);
    setAddMemberOpen(false);
    setSelectedExistingMemberId("");
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memName.trim() || !memRole.trim() || !memEmail.trim()) return;
    setMemSubmitting(true);

    const parsedSkills = memSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const initialCollection: MemberPortfolioItem[] = [];
    if (memCardTitle.trim() && memCardUrl.trim()) {
      initialCollection.push({
        id: `port-${Date.now()}`,
        title: memCardTitle.trim(),
        url: memCardUrl.trim(),
        tag: memCardTag.trim() || "PRODUCTION BUILD",
        description: memCardDesc.trim() || undefined,
        previewImage: memCardPreviewImage.trim() || undefined,
        accentColor: "#FBD227",
      });
    }

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
        bio: memBio.trim() || undefined,
        skills: parsedSkills.length > 0 ? parsedSkills : undefined,
        portfolioUrl: memPortfolioUrl.trim() || undefined,
        portfolioCollection: initialCollection.length > 0 ? initialCollection : undefined,
      }),
    });
    setMemSubmitting(false);
    if (res.ok) {
      setAddMemberOpen(false);
      setMemName("");
      setMemRole("");
      setMemEmail("");
      setMemBio("");
      setMemSkills("");
      setMemPortfolioUrl("");
      setMemCardTitle("");
      setMemCardUrl("");
      setMemCardTag("PRODUCTION BUILD");
      setMemCardDesc("");
      setMemCardPreviewImage("");
      setNotice(`Team member ${memName} added to roster!`);
      await loadTeams();
    } else {
      setNotice(res.error || "Failed to add member.");
    }
  };

  const openManagePortfolioModal = (m: TeamMemberUser) => {
    setPortfolioModalMember(m);
    setPortfolioName(m.name || "");
    setPortfolioRoleTitle(m.roleTitle || "");
    setPortfolioTeamId(m.teamId || "");
    setPortfolioBio(m.bio || "");
    setPortfolioSkills(m.skills ? m.skills.join(", ") : "");
    setPortfolioMainUrl(m.portfolioUrl || "");
    setPortfolioItems(m.portfolioCollection ? structuredClone(m.portfolioCollection) : []);
    setPortfolioError(null);
  };

  const handleSavePortfolioCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolioModalMember) return;
    setPortfolioSaving(true);
    setPortfolioError(null);

    const parsedSkills = portfolioSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const cleanedCards = portfolioItems
      .filter((card) => card.title.trim() && card.url.trim())
      .map((card) => ({
        ...card,
        id: card.id || `port-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: card.title.trim(),
        url: card.url.trim(),
        tag: card.tag?.trim() || "PRODUCTION BUILD",
        description: card.description?.trim() || "",
        accentColor: card.accentColor || "#FBD227",
        previewImage: card.previewImage?.trim() || undefined,
      }));

    const res = await api<{ member: TeamMemberUser }>("/api/teams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_member",
        id: portfolioModalMember.id,
        name: portfolioName.trim() || portfolioModalMember.name,
        roleTitle: portfolioRoleTitle.trim() || portfolioModalMember.roleTitle,
        teamId: portfolioTeamId || null,
        bio: portfolioBio.trim(),
        skills: parsedSkills,
        portfolioUrl: portfolioMainUrl.trim(),
        portfolioCollection: cleanedCards,
      }),
    });

    setPortfolioSaving(false);
    if (res.ok && res.data?.member) {
      setTeamMembers((prev) =>
        prev.map((m) => (m.id === portfolioModalMember.id ? res.data!.member : m))
      );
      setPortfolioModalMember(null);
      setNotice(`Updated profile & portfolio collection for ${res.data.member.name}!`);
      await loadTeams();
    } else {
      setPortfolioError(res.error || "Failed to update profile & portfolio collection.");
    }
  };

  const handleAssignLeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignPod || !newLeaderId) return;
    setReassignSubmitting(true);
    setReassignError(null);
    try {
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
        setReassignError(res.error || "Failed to reassign leader. Try again.");
      }
    } catch {
      setReassignError("Network error. Please try again.");
    } finally {
      setReassignSubmitting(false);
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

  const handleSaveMemberTitle = async (memberId: string) => {
    if (!editingTitleText.trim()) {
      setEditingTitleMemberId(null);
      return;
    }
    setSavingTitle(true);
    const newTitle = editingTitleText.trim();
    const res = await api<{ member: TeamMemberUser }>("/api/teams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_member",
        id: memberId,
        roleTitle: newTitle,
      }),
    });
    setSavingTitle(false);
    if (res.ok) {
      setEditingTitleMemberId(null);
      setNotice(`Updated specialized role to "${newTitle}"!`);
      await loadTeams();
    } else {
      setError(res.error || "Failed to update role title.");
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
                <button
                  type="button"
                  onClick={handleCopyMassLink}
                  className={btnDark}
                  title="Copy direct /join link to share in Discord or group chats"
                >
                  <Icon name={massCopied ? "check" : "link"} />
                  {massCopied ? "Link Copied!" : "Copy Team Join Link"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCopyMassLink}
                  className={btnDark}
                  title="Copy direct /join link to share in Discord or group chats"
                >
                  <Icon name={massCopied ? "check" : "link"} />
                  {massCopied ? "Link Copied!" : "Copy Team Join Link"}
                </button>
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
              </>
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
                          setReassignError(null);
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
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#262626] font-mono font-bold text-[11px] text-gray-300 overflow-hidden">
                                  {isImageUrl(m.avatar || m.avatarUrl) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={m.avatar || m.avatarUrl} alt={m.name} className="h-full w-full object-cover" />
                                  ) : (
                                    m.avatar || m.name.charAt(0)
                                  )}
                                </span>
                                <div>
                                  <span className="font-bold text-white block">{m.name}</span>
                                  <span className="text-[10px] font-mono text-[#888888]">{m.roleTitle}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                                    m.status === "Active"
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                      : "bg-gray-700/20 text-gray-400"
                                  }`}
                                >
                                  {m.status}
                                </span>
                                <button
                                  type="button"
                                  disabled={movingMemberId === m.id}
                                  onClick={() => {
                                    if (window.confirm(`Remove ${m.name} from ${pod.name}? They will stay in the general studio roster.`)) {
                                      void handleMoveMemberPod(m.id, "");
                                    }
                                  }}
                                  className="text-gray-500 hover:text-rose-400 p-1 rounded hover:bg-[#222222] transition-colors"
                                  title={`Remove ${m.name} from this pod`}
                                >
                                  <Icon name="close" className="h-3.5 w-3.5" />
                                </button>
                              </div>
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
                    <th className="px-4 py-3">Portfolio Collection</th>
                    <th className="px-4 py-3">Permission Tier</th>
                    <th className="px-4 py-3">Active Projects</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F1F]">
                  {teamMembers.map((m) => {
                                        return (
                      <tr key={m.id} className="hover:bg-[#161616] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#262626] font-monument font-bold text-xs text-[#FBD227] overflow-hidden">
                              {isImageUrl(m.avatar || m.avatarUrl) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={m.avatar || m.avatarUrl} alt={m.name} className="h-full w-full object-cover" />
                              ) : (
                                m.avatar || m.name.charAt(0)
                              )}
                            </span>
                            <div>
                              <span className="font-bold text-white block">{m.name}</span>
                              <span className="text-xs text-gray-400 font-mono">{m.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-gray-200">
                          {editingTitleMemberId === m.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editingTitleText}
                                autoFocus
                                disabled={savingTitle}
                                onChange={(e) => setEditingTitleText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void handleSaveMemberTitle(m.id);
                                  } else if (e.key === "Escape") {
                                    setEditingTitleMemberId(null);
                                  }
                                }}
                                className="bg-[#181818] border border-[#FBD227] text-white text-xs px-2 py-1 rounded focus:outline-none w-44"
                              />
                              <button
                                type="button"
                                disabled={savingTitle}
                                onClick={() => void handleSaveMemberTitle(m.id)}
                                className="text-xs text-[#FBD227] hover:underline font-bold px-1"
                              >
                                {savingTitle ? "…" : "Save"}
                              </button>
                              <button
                                type="button"
                                disabled={savingTitle}
                                onClick={() => setEditingTitleMemberId(null)}
                                className="text-xs text-gray-400 hover:text-white px-1"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group">
                              <span>{m.roleTitle}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTitleMemberId(m.id);
                                  setEditingTitleText(m.roleTitle);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-[#FBD227] transition-all p-1"
                                title="Edit title"
                              >
                                <Icon name="pencil" className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <select
                              value={m.teamId || ""}
                              disabled={movingMemberId === m.id}
                              onChange={(e) => handleMoveMemberPod(m.id, e.target.value)}
                              className="bg-[#161616] border border-[#333333] hover:border-[#FBD227] text-white text-xs font-mono rounded px-2.5 py-1.5 focus:outline-none focus:border-[#FBD227] cursor-pointer transition-colors max-w-[14rem] truncate"
                              title="Move this member to another pod"
                            >
                              <option value="">Unassigned (General)</option>
                              {pods.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                            {movingMemberId === m.id && (
                              <span className="text-[10px] font-mono text-[#FBD227] animate-pulse">
                                Moving…
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {m.isLeader ? (
                            <span className="inline-flex items-center gap-1.5 rounded bg-[#FBD227]/20 border border-[#FBD227]/40 px-2 py-0.5 text-[11px] font-mono font-bold text-[#FBD227]">
                              <Icon name="bolt" className="h-3 w-3" />
                              <span>Pod Lead</span>
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500 font-mono">Member</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#1C1C1C] border border-[#333333] text-[#FBD227] font-bold">
                              {(m.portfolioCollection?.length || (m.portfolioUrl ? 1 : 0))} Sites
                            </span>
                            <button
                              type="button"
                              onClick={() => openManagePortfolioModal(m)}
                              className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-gray-300 hover:text-white px-2 py-1 rounded bg-[#222222] hover:bg-[#333333] border border-[#3A3A3A] transition-colors"
                              title="Manage portfolio website collection"
                            >
                              <Icon name="pencil" className="h-3 w-3 text-[#FBD227]" />
                              <span>Manage</span>
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-300">
                          <Chip tone={m.permission === "Owner / Admin" ? "black" : "plain"}>
                            {m.permission}
                          </Chip>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">
                          {m.activeProjects.length > 0 ? m.activeProjects.join(", ") : "Available for assignment"}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => void handleDeleteMember(m.id, m.name)}
                            className="inline-flex items-center gap-1 border border-rose-500/30 hover:border-rose-500 bg-rose-950/20 text-rose-300 hover:text-rose-200 px-2.5 py-1 text-xs font-mono rounded transition-colors"
                            title={`Delete ${m.name} from roster`}
                          >
                            <Icon name="close" className="h-3 w-3 text-rose-400" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Team Member Cards & Portfolio Collections Grid */}
          <div className="mt-10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[#262626]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-[#FBD227]/15 text-[#FBD227]">
                    <Icon name="dashboard" className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="font-monument text-sm sm:text-base font-bold uppercase text-white tracking-wide">
                    Team Member Cards & Portfolio Website Collections
                  </h3>
                </div>
                <p className="text-xs text-[#888888] mt-1">
                  Tactile collector card decks showing each specialist&apos;s active platforms, live personal websites, and production archives.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-gray-400 bg-[#141414] px-3 py-1.5 rounded border border-[#262626]">
                  {teamMembers.reduce((sum, m) => sum + (m.portfolioCollection?.length || (m.portfolioUrl ? 1 : 0)), 0)} Total Portfolio Sites
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {teamMembers.map((m) => {
                const pod = pods.find((p) => p.id === m.teamId);
                return (
                  <DashboardTeamMemberCard
                    key={m.id}
                    member={m}
                    pod={pod}
                    onManagePortfolio={openManagePortfolioModal}
                    onDeleteMember={(mem) => void handleDeleteMember(mem.id, mem.name)}
                  />
                );
              })}
            </div>
          </div>
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
                    <th className="px-4 py-3">Assigned Pod</th>
                    <th className="px-4 py-3">Task board profile</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last login</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F1F]">
                  {loading && <SkeletonRows rows={4} cols={7} />}
                  {!loading && users.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center font-semibold text-gray-400">{error ? "Staff could not be loaded." : "No staff accounts yet."}</td>
                    </tr>
                  )}
                  {users.map((u) => {
                    const isSelf = u.id === currentId;
                    const busy = busyId === u.id;
                    const memberRecord = teamMembers.find(
                      (m) => m.id === u.id || m.email.toLowerCase() === u.email.toLowerCase()
                    );
                    return (
                      <tr key={u.id} className={u.status === "disabled" ? "bg-[#141414]/50 text-gray-500" : "hover:bg-[#161616] transition-colors"}>
                        <td className="px-4 py-3 min-w-[12rem]">
                          <div className="font-bold text-white text-xs sm:text-sm">
                            {u.name}
                            {isSelf && <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#FBD227]">You</span>}
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono truncate max-w-[14rem]">{u.email}</div>
                        </td>
                        <td className="px-3 py-3 w-28">
                          <label className="sr-only" htmlFor={`role-${u.id}`}>Role for {u.name}</label>
                          <select
                            id={`role-${u.id}`}
                            value={u.role}
                            disabled={busy || isSelf}
                            onChange={(e) => {
                              if (e.target.value === "admin" && !window.confirm(`Make ${u.name} an admin? Admins can see financials, clients and staff.`)) return;
                              void act(u.id, { action: "set_role", role: e.target.value }, `${u.name} is now ${e.target.value === "admin" ? "an admin" : "a team member"}.`);
                            }}
                            className="w-full bg-[#161616] border border-[#333333] hover:border-[#FBD227] text-white text-xs font-mono rounded px-2 py-1.5 focus:outline-none focus:border-[#FBD227] cursor-pointer"
                          >
                            <option value="team">Team</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-3 py-3 w-48">
                          {memberRecord ? (
                            <select
                              value={memberRecord.teamId || ""}
                              disabled={movingMemberId === memberRecord.id || busy}
                              onChange={(e) => handleMoveMemberPod(memberRecord.id, e.target.value)}
                              className="w-full bg-[#161616] border border-[#333333] hover:border-[#FBD227] text-white text-xs font-mono rounded px-2 py-1.5 focus:outline-none focus:border-[#FBD227] cursor-pointer truncate"
                              title="Assign or move pod"
                            >
                              <option value="">Unassigned (General)</option>
                              {pods.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-[#666666] font-mono">Not in roster</span>
                          )}
                        </td>
                        <td className="px-3 py-3 w-56">
                          <label className="sr-only" htmlFor={`label-${u.id}`}>Task board profile for {u.name}</label>
                          <select
                            id={`label-${u.id}`}
                            value={u.memberLabel ?? ""}
                            disabled={busy}
                            onChange={(e) => act(u.id, { action: "set_label", memberLabel: e.target.value }, `Task board profile updated for ${u.name}.`)}
                            className="w-full bg-[#161616] border border-[#333333] hover:border-[#FBD227] text-white text-xs font-mono rounded px-2 py-1.5 focus:outline-none focus:border-[#FBD227] cursor-pointer truncate"
                          >
                            <option value="">Not linked</option>
                            {dynamicProfiles.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3 w-20">
                          <Chip tone={u.status === "active" ? "black" : "orange"}>{u.status === "active" ? "Active" : "Disabled"}</Chip>
                        </td>
                        <td className="px-3 py-3 text-xs font-semibold text-gray-400 font-mono whitespace-nowrap">{when(u.lastLoginAt)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => act(u.id, { action: "reset_link" }, "")}
                              className="inline-flex items-center gap-1 border border-white/10 hover:border-white px-2 py-1 text-xs font-mono text-gray-300 hover:text-white rounded transition-colors"
                            >
                              <Icon name="key" className="h-3 w-3" />
                              Reset
                            </button>
                            {!isSelf && (
                              <>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => act(u.id, { action: "sign_out" }, `${u.name} was signed out everywhere.`)}
                                  className="inline-flex items-center gap-1 border border-white/10 hover:border-white px-2 py-1 text-xs font-mono text-gray-300 hover:text-white rounded transition-colors"
                                >
                                  <Icon name="logout" className="h-3 w-3" />
                                  Sign out
                                </button>
                                {u.status === "active" ? (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => window.confirm(`Disable ${u.name}? They lose access immediately.`) && act(u.id, { action: "disable" }, `${u.name} was disabled.`)}
                                    className="inline-flex items-center gap-1 border border-rose-500/30 hover:border-rose-500 bg-rose-950/20 text-rose-300 hover:text-rose-200 px-2 py-1 text-xs font-mono rounded transition-colors"
                                  >
                                    <Icon name="lock" className="h-3 w-3" />
                                    Disable
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => act(u.id, { action: "enable" }, `${u.name} was re-enabled.`)}
                                    className="inline-flex items-center gap-1 border border-emerald-500/40 hover:border-emerald-500 bg-emerald-950/20 text-emerald-300 hover:text-emerald-200 px-2 py-1 text-xs font-mono rounded transition-colors"
                                  >
                                    <Icon name="check" className="h-3 w-3" />
                                    Enable
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleDeleteStaff(u.id, u.name)}
                                  className="inline-flex items-center gap-1 border border-rose-500/30 hover:border-rose-500 bg-rose-950/20 text-rose-300 hover:text-rose-200 px-2 py-1 text-xs font-mono rounded transition-colors"
                                  title={`Delete ${u.name}'s account`}
                                >
                                  <Icon name="close" className="h-3 w-3 text-rose-400" />
                                  Delete
                                </button>
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

          {/* MASS TEAM REGISTRY PANEL */}
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-monument text-base font-bold uppercase text-white">Mass Team Registry</h3>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-mono font-bold uppercase rounded ${massRegistry?.enabled ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-zinc-800 text-zinc-400 border border-zinc-700"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${massRegistry?.enabled ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
                    {massRegistry?.enabled ? "Active Link" : "Link Paused"}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-bold uppercase bg-[#FBD227]/10 text-[#FBD227] border border-[#FBD227]/30 rounded">
                    <Icon name="shield" className="h-3 w-3" />
                    Restricted: Team Member Only
                  </span>
                </div>
                <p className="mt-1.5 font-sans text-sm text-gray-400 max-w-3xl leading-relaxed">
                  Share this direct link to Discord or group chats so prospective or onboarded team members can sign themselves up. They are automatically added to the team roster and pod directory as <strong className="text-white">Specialists</strong>. Administrative privileges can never be obtained through this link.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={massUpdating}
                  onClick={handleToggleMassRegistry}
                  className={btnGhost}
                  title={massRegistry?.enabled ? "Temporarily pause team registration" : "Re-activate team registration"}
                >
                  <Icon name="bolt" />
                  {massRegistry?.enabled ? "Pause Link" : "Activate Link"}
                </button>
                <button
                  type="button"
                  disabled={massUpdating}
                  onClick={handleRotateMassToken}
                  className={btnDark}
                  title="Invalidate the current link and generate a fresh token"
                >
                  <Icon name="refresh" />
                  Rotate Link
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-[#0d0d0d] border border-[#262626] rounded px-3 py-2 text-sm font-mono text-gray-300 overflow-x-auto select-all">
                <Icon name="link" className="h-4 w-4 text-[#FBD227] shrink-0" />
                <span className="truncate">
                  {typeof window !== "undefined" && massRegistry?.token
                    ? `${window.location.origin}/join`
                    : "/join"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyMassLink}
                className={`${btnPrimary} shrink-0`}
              >
                <Icon name={massCopied ? "check" : "copy"} />
                {massCopied ? "Copied!" : "Copy Link"}
              </button>
              <a
                href="/join"
                target="_blank"
                rel="noopener noreferrer"
                className={`${btnDark} shrink-0 flex items-center gap-1.5`}
              >
                <Icon name="arrow-right" />
                Test Form
              </a>
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
      <Modal
        open={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        title={memPodId ? `Add / Move Member to ${pods.find((p) => p.id === memPodId)?.name || "Pod"}` : "Add Team Member"}
      >
        <div className="flex border-b border-[#262626] mb-4">
          <button
            type="button"
            onClick={() => setAddMemberMode("existing")}
            className={`px-3 py-2 font-mono text-xs font-bold uppercase transition-colors border-b-2 ${
              addMemberMode === "existing"
                ? "border-[#FBD227] text-white"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Move Existing Member
          </button>
          <button
            type="button"
            onClick={() => setAddMemberMode("new")}
            className={`px-3 py-2 font-mono text-xs font-bold uppercase transition-colors border-b-2 ${
              addMemberMode === "new"
                ? "border-[#FBD227] text-white"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Create New Member
          </button>
        </div>

        {addMemberMode === "existing" ? (
          <form onSubmit={handleAssignExistingToPod} className="space-y-4 text-white">
            <div>
              <label className={labelClass}>Select Team Member to Move</label>
              <select
                required
                value={selectedExistingMemberId}
                onChange={(e) => setSelectedExistingMemberId(e.target.value)}
                className={fieldClass}
              >
                <option value="">-- Choose team member --</option>
                {teamMembers.map((m) => {
                  const currentPod = pods.find((p) => p.id === m.teamId);
                  return (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.roleTitle}) — Currently: {currentPod ? currentPod.name : "Unassigned"}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className={labelClass}>Target Pod</label>
              <select
                required
                value={memPodId}
                onChange={(e) => setMemPodId(e.target.value)}
                className={fieldClass}
              >
                <option value="">-- Choose destination pod --</option>
                {pods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.focusArea})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#262626] pt-4">
              <button type="button" onClick={() => setAddMemberOpen(false)} className={btnGhost}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedExistingMemberId || !memPodId}
                className={btnPrimary}
              >
                Move into Pod
              </button>
            </div>
          </form>
        ) : (
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

          <div>
            <label className={labelClass}>Personal Website / Portfolio URL (Optional)</label>
            <input
              type="url"
              placeholder="https://member.thevirtuslabs.com"
              value={memPortfolioUrl}
              onChange={(e) => setMemPortfolioUrl(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Bio / Focus Statement (Optional)</label>
            <textarea
              rows={2}
              placeholder="Crafting high-contrast brand systems and full-stack platforms..."
              value={memBio}
              onChange={(e) => setMemBio(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Skills & Capabilities (Optional, comma-separated)</label>
            <input
              type="text"
              placeholder="Design Systems, Next.js, WebGL, Brand Architecture"
              value={memSkills}
              onChange={(e) => setMemSkills(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div className="rounded-lg border border-[#2B2B2B] bg-[#141414] p-3 space-y-2">
            <span className="font-monument text-xs uppercase font-bold text-gray-300 block">
              Initial Portfolio Website Card (Optional)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Card Title (e.g. Acme Platform)"
                value={memCardTitle}
                onChange={(e) => setMemCardTitle(e.target.value)}
                className={fieldClass}
              />
              <input
                type="url"
                placeholder="Live URL (https://...)"
                value={memCardUrl}
                onChange={(e) => setMemCardUrl(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Tag (e.g. ENTERPRISE PLATFORM)"
                value={memCardTag}
                onChange={(e) => setMemCardTag(e.target.value)}
                className={fieldClass}
              />
              <input
                type="text"
                placeholder="Brief description..."
                value={memCardDesc}
                onChange={(e) => setMemCardDesc(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <input
                type="url"
                placeholder="Card Preview Image URL (Optional - leaves architectural SVG if empty)"
                value={memCardPreviewImage}
                onChange={(e) => setMemCardPreviewImage(e.target.value)}
                className={fieldClass}
              />
            </div>
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
        )}
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
            {reassignError && (
              <p role="alert" className="flex items-center gap-2 font-sans text-xs font-semibold text-rose-400">
                <Icon name="alert" className="h-4 w-4 shrink-0" />
                {reassignError}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t border-[#262626] pt-4">
              <button type="button" onClick={() => setReassignPod(null)} className={btnGhost}>
                Cancel
              </button>
              <button type="submit" disabled={reassignSubmitting} className={btnPrimary}>
                {reassignSubmitting ? "Assigning…" : "Confirm Leader"}
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

      {/* --- MODAL 6: MANAGE PORTFOLIO COLLECTION --- */}
      <Modal
        open={portfolioModalMember !== null}
        onClose={() => setPortfolioModalMember(null)}
        title={`Edit Staff Profile & Portfolio: ${portfolioModalMember?.name || ""}`}
      >
        {portfolioModalMember && (
          <form onSubmit={handleSavePortfolioCollection} className="space-y-4 text-white max-h-[75vh] overflow-y-auto pr-1">
            <div className="p-3 rounded-lg bg-[#141414] border border-[#262626] flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[#222222] font-monument font-bold text-sm text-[#FBD227] overflow-hidden">
                {isImageUrl(portfolioModalMember.avatar || portfolioModalMember.avatarUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={portfolioModalMember.avatar || portfolioModalMember.avatarUrl} alt={portfolioName || portfolioModalMember.name} className="h-full w-full object-cover" />
                ) : (
                  portfolioName ? portfolioName.charAt(0).toUpperCase() : (portfolioModalMember.avatar || portfolioModalMember.name.charAt(0))
                )}
              </span>
              <div>
                <span className="font-bold text-white block text-sm">{portfolioName || portfolioModalMember.name}</span>
                <span className="font-mono text-xs text-gray-400">
                  {portfolioRoleTitle || portfolioModalMember.roleTitle} &bull;{" "}
                  {pods.find((t) => t.id === portfolioTeamId)?.name || "General Studio Roster"}
                </span>
              </div>
            </div>

            {/* Profile Inputs: Name, Role Title, Assigned Pod */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={portfolioName}
                  onChange={(e) => setPortfolioName(e.target.value)}
                  placeholder="e.g. Elena Vance"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>Role Title *</label>
                <input
                  type="text"
                  required
                  value={portfolioRoleTitle}
                  onChange={(e) => setPortfolioRoleTitle(e.target.value)}
                  placeholder="e.g. Lead Brand & System Designer"
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Assigned Pod / Specialty Team</label>
              <select
                value={portfolioTeamId}
                onChange={(e) => setPortfolioTeamId(e.target.value)}
                className={fieldClass}
              >
                <option value="">(Unassigned / General Studio Roster)</option>
                {pods.map((pod) => (
                  <option key={pod.id} value={pod.id}>
                    {pod.name} ({pod.focusArea || "Specialist Pod"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Personal Website / Portfolio URL</label>
              <input
                type="url"
                value={portfolioMainUrl}
                onChange={(e) => setPortfolioMainUrl(e.target.value)}
                placeholder="https://member.thevirtuslabs.com"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Specialist Bio / Directional Statement</label>
              <textarea
                rows={2}
                value={portfolioBio}
                onChange={(e) => setPortfolioBio(e.target.value)}
                placeholder="Senior craftsperson directing brand and architectural systems..."
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Skills & Capabilities (comma-separated)</label>
              <input
                type="text"
                value={portfolioSkills}
                onChange={(e) => setPortfolioSkills(e.target.value)}
                placeholder="Next.js, TypeScript, Design Systems, WebGL"
                className={fieldClass}
              />
            </div>

            {/* Portfolio Website Cards List */}
            <div className="border-t border-[#262626] pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="font-monument text-xs uppercase font-bold text-gray-200">
                  Portfolio Website Cards ({portfolioItems.length})
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setPortfolioItems((prev) => [
                      ...prev,
                      {
                        id: `port-${Date.now()}`,
                        title: "",
                        url: "",
                        tag: "PRODUCTION BUILD",
                        description: "",
                        accentColor: "#FBD227",
                      },
                    ])
                  }
                  className="flex items-center gap-1 text-xs font-mono font-bold text-[#FBD227] hover:underline"
                >
                  <Icon name="plus" className="h-3 w-3" />
                  <span>Add Website Card</span>
                </button>
              </div>

              {portfolioItems.length === 0 ? (
                <p className="text-xs text-gray-500 italic p-3 bg-[#141414] rounded border border-[#222222]">
                  No cards in collection. Click &quot;Add Website Card&quot; to showcase a live site, platform, or interactive archive.
                </p>
              ) : (
                <div className="space-y-3">
                  {portfolioItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3.5 rounded-lg border border-[#2B2B2B] bg-[#141414] space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-[#FBD227]">
                          Card {String(idx + 1).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setPortfolioItems((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-gray-500 hover:text-rose-400 p-1 rounded hover:bg-[#202020] transition-colors"
                          title="Remove card"
                        >
                          <Icon name="close" className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">
                            Card Title *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Tidewater Fleet Telematics"
                            value={item.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPortfolioItems((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, title: val } : c))
                              );
                            }}
                            className={fieldClass}
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">
                            Live Website URL *
                          </label>
                          <input
                            type="url"
                            required
                            placeholder="https://..."
                            value={item.url}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPortfolioItems((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, url: val } : c))
                              );
                            }}
                            className={fieldClass}
                          />
                        </div>
                      </div>

                      {/* Optional Preview Image */}
                      <div>
                        <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">
                          Preview Image URL (Optional - leaves architectural SVG if empty)
                        </label>
                        <input
                          type="url"
                          placeholder="https://... or /images/..."
                          value={item.previewImage || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPortfolioItems((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, previewImage: val } : c))
                            );
                          }}
                          className={fieldClass}
                        />
                        {item.previewImage && (
                          <div className="mt-2 relative aspect-[16/9] w-full max-h-32 overflow-hidden rounded border border-[#2B2B2B]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.previewImage}
                              alt={item.title || "Preview"}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">
                            Category Tag
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. ENTERPRISE PLATFORM"
                            value={item.tag || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPortfolioItems((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, tag: val } : c))
                              );
                            }}
                            className={fieldClass}
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">
                            Accent Color
                          </label>
                          <select
                            value={item.accentColor || "#FBD227"}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPortfolioItems((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, accentColor: val } : c))
                              );
                            }}
                            className={fieldClass}
                          >
                            <option value="#FBD227">Amber Gold (#FBD227)</option>
                            <option value="#60A5FA">Electric Blue (#60A5FA)</option>
                            <option value="#34D399">Emerald (#34D399)</option>
                            <option value="#F472B6">Rose Pink (#F472B6)</option>
                            <option value="#818CF8">Indigo Violet (#818CF8)</option>
                            <option value="#FB923C">Warm Orange (#FB923C)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">
                          Brief Description
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Brief technical or design summary of this website..."
                          value={item.description || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPortfolioItems((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, description: val } : c))
                            );
                          }}
                          className={fieldClass}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {portfolioError && (
              <p role="alert" className="flex items-center gap-2 font-sans text-xs font-semibold text-rose-400 border border-rose-500/30 bg-rose-950/20 p-2.5 rounded">
                <Icon name="alert" className="h-4 w-4 shrink-0" />
                {portfolioError}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-[#262626] pt-4">
              <button
                type="button"
                onClick={() => setPortfolioModalMember(null)}
                className={btnGhost}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={portfolioSaving}
                className={btnPrimary}
              >
                {portfolioSaving ? "Saving…" : "Save Profile & Portfolio"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
