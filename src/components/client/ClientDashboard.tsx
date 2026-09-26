"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { RevisionDialog } from "./RevisionDialog";
import type { ClientPortalData } from "@/lib/clientPortal";
import type { ApprovalStatus, RevisionTicket } from "@/db";
import { CallsTab } from "./dashboard/CallsTab";
import { Container } from "./dashboard/Container";
import { DeliverablesTab } from "./dashboard/DeliverablesTab";
import { Hero, type TabId } from "./dashboard/Hero";
import { InvoicesTab } from "./dashboard/InvoicesTab";
import { MilestoneReview } from "./dashboard/MilestoneReview";
import { Roadmap } from "./dashboard/Roadmap";
import { StatStrip } from "./dashboard/StatStrip";
import { Tabs, type TabItem } from "./dashboard/Tabs";
import { TopBar } from "./dashboard/TopBar";
import { Requests, UpNext } from "./dashboard/UpNext";
import { enter, stagger } from "./dashboard/styles";
import { ClockProvider, useClock } from "./dashboard/clock";
import { greetingName } from "./dashboard/format";

/**
 * `serverToday` is the date the server rendered with. Time-dependent text starts from it, then switches to the
 * viewer's own clock after mount, so the server and browser HTML always match.
 */
export function ClientDashboard({ initialData, serverToday }: { initialData: ClientPortalData; serverToday: string }) {
  return (
    <ClockProvider serverToday={serverToday}>
      <Dashboard initialData={initialData} />
    </ClockProvider>
  );
}

function Dashboard({ initialData }: { initialData: ClientPortalData }) {
  const router = useRouter();
  const { updatedAt, markUpdated } = useClock();
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState<TabId>("overview");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingApproval, setConfirmingApproval] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { client, project, invoices, deliverables, bookings, revisions, approval } = data;
  const name = greetingName(client.contactName, client.name);

  const redirectToLogin = useCallback(() => {
    router.replace("/client/login?reason=expired");
    router.refresh();
  }, [router]);

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setNotice(null);
    try {
      const res = await fetch("/api/client/me", { cache: "no-store" });
      if (res.status === 401) return redirectToLogin();
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        setNotice(body?.error ?? "Could not refresh. Try again.");
        return;
      }
      setData(body.data as ClientPortalData);
      markUpdated();
      setNotice("Up to date.");
    } catch {
      setNotice("Network error. Check your connection and try again.");
    } finally {
      setRefreshing(false);
    }
  };

  const logout = async () => {
    await fetch("/api/client/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/client/login");
    router.refresh();
  };

  const setApproval = async (status: ApprovalStatus) => {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    setConfirmingApproval(false);
    try {
      const res = await fetch("/api/client/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.status === 401) return redirectToLogin();
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        setNotice(body?.error ?? "Could not save your decision. Try again.");
        return;
      }
      setData((current) => ({ ...current, approval: body.data.approval as ApprovalStatus }));
    } catch {
      setNotice("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const onRevisionSubmitted = (ticket: RevisionTicket) => {
    setData((current) => ({ ...current, revisions: [ticket, ...current.revisions], approval: "changes_requested" }));
    setDialogOpen(false);
    setNotice(`Request ${ticket.id} sent. Your team will reply within one business day.`);
  };

  const tabs: TabItem<TabId>[] = [
    { id: "overview", label: "Overview", icon: "dashboard" },
    { id: "deliverables", label: "Files", icon: "folder", count: deliverables.length },
    { id: "invoices", label: "Invoices", icon: "file", count: invoices.length },
    { id: "calls", label: "Calls", icon: "calendar", count: bookings.length },
  ];

  const go = (next: TabId) => {
    setTab(next);
    setNotice(null);
    // Bring the content into view. On phones the hero is taller than the screen, so the new tab would be off screen.
    requestAnimationFrame(() =>
      document.getElementById("dashboard-panel")?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      })
    );
  };

  return (
    <div
      className="min-h-dvh text-white [color-scheme:dark] selection:bg-[#FBD227] selection:text-black"
      style={{
        backgroundColor: "#0A0A0A",
        backgroundImage: "radial-gradient(60rem 28rem at 88% -8%, rgba(251,210,39,0.10), transparent 62%)",
        backgroundRepeat: "no-repeat",
      }}
    >
      <TopBar company={client.company} updatedAt={updatedAt} refreshing={refreshing} onRefresh={refresh} onLogout={logout} />

      <Hero name={name} project={project} approval={approval} deliverableCount={deliverables.length} onNavigate={go} />
      <StatStrip data={data} />

      <div className="mt-8 sm:mt-10">
        <Tabs tabs={tabs} value={tab} onChange={go} />
      </div>

      <main>
        <Container className="space-y-6 pb-28 pt-8 sm:pb-16">
          <div role="status" aria-live="polite">
            {notice && (
              <p className="flex items-start justify-between gap-4 border-l-4 border-[#FBD227] bg-white/[0.06] px-4 py-3 font-sans text-base font-semibold text-white">
                <span>{notice}</span>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  className="shrink-0 font-sans text-eyebrow font-bold uppercase text-[#FBD227] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#FBD227]"
                >
                  Dismiss
                </button>
              </p>
            )}
          </div>

          <div id="dashboard-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0} className="scroll-mt-4 outline-none sm:scroll-mt-32">
            {tab === "overview" && (
              <div className={`grid gap-6 ${project ? "lg:grid-cols-[1.5fr_1fr]" : ""}`}>
                <div className="space-y-6">
                  {project && (
                    <>
                      <div className={enter} style={stagger(0)}>
                        <Roadmap project={project} />
                      </div>
                      <div className={enter} style={stagger(1)}>
                        <MilestoneReview
                          phase={project.phase}
                          approval={approval}
                          name={name}
                          deliverableCount={deliverables.length}
                          busy={busy}
                          confirming={confirmingApproval}
                          onAsk={() => setConfirmingApproval(true)}
                          onConfirm={() => setApproval("approved")}
                          onCancel={() => setConfirmingApproval(false)}
                          onRequestChanges={() => setDialogOpen(true)}
                          onUndo={() => setApproval("pending")}
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="space-y-6">
                  <div className={enter} style={stagger(2)}>
                    <UpNext data={data} onNavigate={go} />
                  </div>
                  <div className={enter} style={stagger(3)}>
                    <Requests revisions={revisions} />
                  </div>
                </div>
              </div>
            )}
            {tab === "deliverables" && <DeliverablesTab items={deliverables} />}
            {tab === "invoices" && <InvoicesTab invoices={invoices} />}
            {tab === "calls" && <CallsTab bookings={bookings} />}
          </div>
        </Container>
      </main>

      <footer className="border-t border-white/10 pb-24 sm:pb-0">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-6 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-[#A3A3A3]">
          <span>The Virtus Labs · Client dashboard</span>
          <span>One team. Limitless possibilities.</span>
        </Container>
      </footer>

      <RevisionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSubmitted={onRevisionSubmitted} />
    </div>
  );
}
