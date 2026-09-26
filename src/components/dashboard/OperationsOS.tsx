"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/db";
import { PageSkeleton } from "./Skeleton";
import { Logo } from "@/components/public/Logo";
import { Icon, type IconName } from "@/components/icons/Icon";
import { CommandCenterOverview } from "./CommandCenterOverview";
import { PipelineView } from "./PipelineView";
import { MediaLibraryView } from "./MediaLibraryView";
import { ProjectsTasksView } from "./ProjectsTasksView";
import { BookingsView } from "./BookingsView";
import { ClientsView } from "./ClientsView";
import { ProposalsView } from "./ProposalsView";
import { ContractsView } from "./ContractsView";
import { AccountingView } from "./AccountingView";
import { BusinessEmailView } from "./BusinessEmailView";
import { ReportsView } from "./ReportsView";
import { UsersRolesView } from "./UsersRolesView";
import { SecurityAuditView } from "./SecurityAuditView";
import { WorkspaceSettingsView } from "./WorkspaceSettingsView";

// Internal workspace roles. Clients never load this component; they use /client.
type PortalRole = "admin" | "team";

export interface StaffIdentity {
  name: string;
  email: string;
  role: PortalRole;
  memberLabel: string | null;
}

interface OperationsOSProps {
  staff: StaffIdentity;
  onLogout: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: IconName;
}

const adminWorkspaceItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: "dashboard" },
  { id: "leads", label: "Leads", icon: "bolt" },
  { id: "clients", label: "Clients", icon: "users" },
  { id: "bookings", label: "Bookings", icon: "calendar" },
  { id: "proposals", label: "Proposals", icon: "file" },
  { id: "contracts", label: "Contracts", icon: "signature" },
  { id: "projects", label: "Projects", icon: "folder" },
  { id: "tasks", label: "Team tasks", icon: "check-circle" },
  { id: "accounting", label: "Accounting", icon: "chart" },
  { id: "library", label: "Library", icon: "library" },
  { id: "email", label: "Business email", icon: "mail" },
];

const adminManageItems: NavItem[] = [
  { id: "reports", label: "Reports", icon: "trend" },
  { id: "users", label: "Staff & access", icon: "user" },
  { id: "security", label: "Security", icon: "shield" },
  { id: "settings", label: "Settings", icon: "settings" },
];

// Team members see the scoped delivery floor only.
const teamWorkspaceItems: NavItem[] = [
  { id: "tasks", label: "My sprint tasks", icon: "check-circle" },
  { id: "projects", label: "My projects", icon: "folder" },
  { id: "bookings", label: "My schedule", icon: "calendar" },
  { id: "library", label: "Studio assets", icon: "library" },
];

export const OperationsOS: React.FC<OperationsOSProps> = ({ staff, onLogout }) => {
  // The workspace is fixed by the signed-in role. There is no switching between admin and team views.
  const isAdmin = staff.role === "admin";
  const role: PortalRole = staff.role;
  const [activeTab, setActiveTab] = useState<string>(role === "team" ? "tasks" : "overview");
  const [navOpen, setNavOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ configured?: boolean; latencyMs?: number; unknown?: boolean } | null>(null);
  const [isDesktop, setIsDesktop] = useState(true);
  // The views read a per-browser store that starts empty. Sample data is added only when the server has it loaded.
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    fetch("/api/demo/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.ok && body.data?.loaded) db.loadDemoData();
      })
      .catch(() => undefined)
      .finally(() => setDataReady(true));
  }, []);
  // Team floor identity: the profile an admin assigned, otherwise the person's own name.
  const [activeTeamMember, setActiveTeamMember] = useState<string>(
    staff.memberLabel ?? (isAdmin ? "Kai (Brand Lead)" : staff.name)
  );

  useEffect(() => {
    if (!isAdmin) return; // /api/db/init is admin only
    fetch("/api/db/init")
      .then(async (res) => {
        // A 401 or 500 is not a config state. Do not report it as "Local store".
        const data = await res.json().catch(() => null);
        setDbStatus(res.ok && data ? data : { unknown: true });
      })
      .catch(() => setDbStatus({ unknown: true }));
  }, [isAdmin]);

  // Deep links: the open tab lives in the URL hash so reload and the back button keep it.
  useEffect(() => {
    const fromHash = window.location.hash.replace(/^#/, "");
    const valid = (role === "admin" ? [...adminWorkspaceItems, ...adminManageItems] : teamWorkspaceItems).some(
      (i) => i.id === fromHash
    );
    if (valid) setActiveTab(fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.history.replaceState(null, "", `${window.location.pathname}#${activeTab}`);
  }, [activeTab]);

  // The sidebar is always visible from md up. Below that it is an off-canvas drawer.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  const activeSidebarItems = role === "admin" ? adminWorkspaceItems : teamWorkspaceItems;
  const activeLabel =
    [...adminWorkspaceItems, ...adminManageItems, ...teamWorkspaceItems].find((i) => i.id === activeTab)?.label ??
    "Overview";

  const selectTab = (id: string) => {
    setActiveTab(id);
    setNavOpen(false);
  };

  const logout = () => {
    if (loggingOut) return;
    setLoggingOut(true);
    onLogout();
  };

  const navButton = (item: NavItem) => {
    const active = activeTab === item.id;
    return (
      <li key={item.id}>
        <button
          type="button"
          onClick={() => selectTab(item.id)}
          aria-current={active ? "page" : undefined}
          className={`flex w-full items-center gap-3 px-3 py-2.5 text-left font-sans text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-[#FBD227] ${
            active ? "bg-[#FBD227] text-black" : "text-[#999999] hover:bg-white/10 hover:text-white"
          }`}
        >
          <Icon name={item.icon} className="h-[1.125rem] w-[1.125rem]" />
          {item.label}
        </button>
      </li>
    );
  };

  const initial = staff.name.trim().charAt(0).toUpperCase() || "V";

  return (
    <div className="flex h-dvh flex-col bg-white font-sans text-black [color-scheme:light]">
      {/* Top bar */}
      <header className="z-30 flex h-16 w-full shrink-0 items-center justify-between gap-3 border-b-2 border-black bg-white px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            aria-label={navOpen ? "Close menu" : "Open menu"}
            aria-expanded={navOpen}
            className="flex h-10 w-10 items-center justify-center border-2 border-black md:hidden focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            <Icon name={navOpen ? "close" : "dashboard"} className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate font-sans text-xs font-bold uppercase tracking-[0.16em] text-[#666666]">
              {role === "admin" ? "Operations" : "Delivery floor"}
            </p>
            <p className="truncate font-monument text-base font-bold uppercase leading-tight sm:text-lg">{activeLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {isAdmin && (
            <span
              className="hidden items-center gap-2 border-2 border-black px-2.5 py-1.5 font-sans text-xs font-bold uppercase tracking-[0.12em] lg:inline-flex"
              title={
                dbStatus?.unknown
                  ? "Could not read database status"
                  : dbStatus?.configured
                  ? "Neon PostgreSQL connected"
                  : "Set DATABASE_URL to use Neon"
              }
            >
              <Icon name="database" className="h-4 w-4" />
              {!dbStatus
                ? "Checking…"
                : dbStatus.unknown
                ? "Status unknown"
                : dbStatus.configured
                ? `Neon ${dbStatus.latencyMs ?? 0}ms`
                : "Local store"}
            </span>
          )}

          <div className="flex items-center gap-2 border-l-2 border-black pl-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center bg-[#FBD227] font-monument text-sm font-bold text-black"
            >
              {initial}
            </span>
            <div className="hidden leading-tight sm:block">
              <p className="max-w-[10rem] truncate font-sans text-sm font-bold">{staff.name}</p>
              <p className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-[#666666]">
                {staff.role === "admin" ? "Admin" : "Team"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="inline-flex items-center gap-2 border-2 border-black bg-black px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#FBD227] hover:text-black disabled:opacity-60 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            <Icon name="logout" />
            <span className="hidden sm:inline">{loggingOut ? "Signing out…" : "Log out"}</span>
            <span className="sr-only sm:hidden">Log out</span>
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {navOpen && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setNavOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          inert={!navOpen && !isDesktop}
          className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col justify-between overflow-y-auto border-r-2 border-black bg-black pt-16 text-[#999999] transition-transform md:static md:z-auto md:w-60 md:translate-x-0 md:pt-0 ${
            navOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <nav aria-label="Workspace" className="p-3">
            <div className="mb-4 hidden border-b border-[#333333] px-3 pb-4 pt-2 md:block">
              <Logo size="sm" />
            </div>

            <p className="mb-2 px-3 font-sans text-xs font-bold uppercase tracking-[0.16em] text-[#999999]">
              {role === "admin" ? "Workspace" : "Sprint scope"}
            </p>
            <ul className="space-y-0.5">{activeSidebarItems.map(navButton)}</ul>

            {role === "admin" && (
              <>
                <p className="mb-2 mt-6 px-3 font-sans text-xs font-bold uppercase tracking-[0.16em] text-[#999999]">
                  Manage
                </p>
                <ul className="space-y-0.5">{adminManageItems.map(navButton)}</ul>
              </>
            )}
          </nav>

          <div className="m-3 border-2 border-[#333333] p-3">
            <p className="font-sans text-xs leading-snug text-[#999999]">
              {role === "admin"
                ? "Full studio access across clients, billing and staff."
                : `Showing assigned work for ${activeTeamMember.split(" ")[0]}.`}
            </p>
          </div>
        </aside>

        <main id="workspace" className="min-w-0 flex-1 overflow-y-auto bg-white">
            {!dataReady ? (
              <PageSkeleton />
            ) : role === "team" ? (
              activeTab === "projects" ? (
                <ProjectsTasksView
                  role="team"
                  section="projects"
                  activeMember={activeTeamMember}
                  onMemberChange={setActiveTeamMember}
                  lockMember
                />
              ) : activeTab === "bookings" ? (
                <BookingsView role="team" activeMember={activeTeamMember} />
              ) : activeTab === "library" ? (
                <MediaLibraryView role={role} />
              ) : (
                <ProjectsTasksView
                  role="team"
                  section="tasks"
                  activeMember={activeTeamMember}
                  onMemberChange={setActiveTeamMember}
                  lockMember
                />
              )
            ) : (
              /* Admin Views */
              activeTab === "leads" ? (
                <PipelineView />
              ) : activeTab === "clients" ? (
                <ClientsView />
              ) : activeTab === "proposals" ? (
                <ProposalsView />
              ) : activeTab === "contracts" ? (
                <ContractsView />
              ) : activeTab === "accounting" ? (
                <AccountingView />
              ) : activeTab === "email" ? (
                <BusinessEmailView />
              ) : activeTab === "library" ? (
                <MediaLibraryView role={role} />
              ) : activeTab === "projects" ? (
                <ProjectsTasksView
                  role="admin"
                  section="projects"
                  activeMember={activeTeamMember}
                  onMemberChange={setActiveTeamMember}
                />
              ) : activeTab === "tasks" ? (
                <ProjectsTasksView
                  role="admin"
                  section="tasks"
                  activeMember={activeTeamMember}
                  onMemberChange={setActiveTeamMember}
                />
              ) : activeTab === "bookings" ? (
                <BookingsView role="admin" />
              ) : activeTab === "reports" ? (
                <ReportsView />
              ) : activeTab === "users" ? (
                <UsersRolesView />
              ) : activeTab === "security" ? (
                <SecurityAuditView />
              ) : activeTab === "settings" ? (
                <WorkspaceSettingsView />
              ) : (
                <CommandCenterOverview onNavigate={(view) => setActiveTab(view)} />
              )
            )}
          </main>
      </div>
    </div>
  );
};
