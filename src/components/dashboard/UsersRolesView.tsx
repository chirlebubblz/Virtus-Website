"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { SkeletonRows } from "./Skeleton";
import { Chip, Modal, PageHeader, Panel, btnDark, btnGhost, btnPrimary, fieldClass, labelClass } from "./ui";

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

const TEAM_PROFILES = ["Kai (Brand Lead)", "Ren (Frontend)", "Sora (UX)"];

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
    if (res.ok && body?.ok) return { ok: true, data: body.data as T };
    return { ok: false, error: body?.error ?? "Something went wrong. Try again." };
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again." };
  }
}

export const UsersRolesView: React.FC = () => {
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
  }, [load]);

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

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
    } catch {
      window.prompt("Copy this link:", link.url);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8 text-white font-sans">
      <PageHeader
        eyebrow="Staff and access"
        title="Staff & access"
        description="Everyone signs in with their own account. Invite people by email, set their role, and manage credentials."
        actions={
          <button type="button" onClick={() => {
            setInviteError(null);
            setInviteOpen(true);
          }} className={btnPrimary}>
            <Icon name="user-plus" />
            Invite staff
          </button>
        }
      />

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
                        {TEAM_PROFILES.map((p) => (
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

      <Modal open={link !== null} onClose={() => setLink(null)} title={link?.title ?? ""}>
        {link && (
          <div className="space-y-4 text-white">
            <label htmlFor="issued-link" className={labelClass}>Link</label>
            <input id="issued-link" readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} className={fieldClass} />
            <p className="font-sans text-sm text-gray-400">{link.note}</p>
            <div className="flex justify-end gap-2 border-t border-[#262626] pt-4">
              <button type="button" onClick={() => setLink(null)} className={btnGhost}>Done</button>
              <button type="button" onClick={copy} className={btnPrimary}>
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
