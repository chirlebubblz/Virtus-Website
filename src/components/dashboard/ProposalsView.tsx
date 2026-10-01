"use client";
import React, { useEffect, useState } from "react";
import { db, Proposal } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { useClients } from "./useClients";
import { Modal, fieldClass, labelClass, btnPrimary, btnDark } from "./ui";

/** Next PROP-YYYY-NNN in sequence, so numbers never collide. */
function nextProposalNumber(existing: Proposal[]): string {
  const year = new Date().getFullYear();
  const used = existing
    .map((p) => new RegExp(`^PROP-${year}-(\\d+)$`).exec(p.proposalNumber)?.[1])
    .filter((n): n is string => Boolean(n))
    .map(Number);
  return `PROP-${year}-${String(Math.max(0, ...used) + 1).padStart(3, "0")}`;
}

export const ProposalsView: React.FC = () => {
  const [proposals, setProposals] = useState<Proposal[]>(() => db.getProposals());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingProposal, setViewingProposal] = useState<Proposal | null>(null);
  const [acceptanceNotice, setAcceptanceNotice] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [clientCompany, setClientCompany] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [timeline, setTimeline] = useState("4 Weeks Delivery");
  const [scopeText, setScopeText] = useState("Brand Strategy, Next.js Web Flagship, Content Engine");

  const { clients, loading: loadingClients } = useClients();

  // Load proposals from server
  useEffect(() => {
    fetch("/api/proposals")
      .then((r) => r.json())
      .then((json) => {
        if (json?.ok && Array.isArray(json.data)) {
          setProposals(json.data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!clientCompany && clients[0]) {
      setClientCompany(clients[0].company);
      setClientContact(clients[0].contactName ?? clients[0].name);
    }
  }, [clients, clientCompany]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClient = clients.find((c) => c.company === clientCompany);
    const value = Number(amount);
    if (!title.trim() || !selectedClient || !Number.isFinite(value) || value <= 0 || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient.id,
          clientName: clientContact.trim() || selectedClient.name,
          company: selectedClient.company,
          title: title.trim(),
          amount: value,
          timeline,
          scopeSummary: scopeText.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const json = await res.json();
      if (json?.ok && json.data) {
        setProposals((prev) => [json.data, ...prev]);
        setIsCreateModalOpen(false);
        setTitle("");
        setAmount("");
      } else {
        throw new Error(json?.error || "Failed to create proposal");
      }
    } catch {
      // Local fallback
      db.addProposal({
        proposalNumber: nextProposalNumber(db.getProposals()),
        clientId: selectedClient.id,
        clientName: clientContact.trim() || selectedClient.name,
        company: selectedClient.company,
        title: title.trim(),
        amount: value,
        status: "Sent",
        validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        scopeSummary: scopeText.split(",").map((s) => s.trim()).filter(Boolean),
        timeline,
      });
      setProposals(db.getProposals());
      setIsCreateModalOpen(false);
      setTitle("");
      setAmount("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: Proposal["status"]) => {
    try {
      const res = await fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (json?.ok && json.data) {
        setProposals((prev) => prev.map((p) => (p.id === id ? json.data : p)));
        if (viewingProposal && viewingProposal.id === id) {
          setViewingProposal(json.data);
        }
        if (status === "Accepted") {
          setAcceptanceNotice(
            `🎉 Proposal accepted! Active Project initiated in Discover phase and 50% Kickoff Deposit Invoice generated.`
          );
        }
      }
    } catch {
      db.updateProposalStatus(id, status);
      setProposals(db.getProposals());
    }
  };

  const copyProposalLink = (id: string) => {
    const url = `${window.location.origin}/track?proposal=${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(id);
      setTimeout(() => setCopiedLink(null), 2500);
    });
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-white font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#262626] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="block h-1 w-10 bg-[#FBD227]" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FBD227]">
              OPERATIONS OS · PROPOSALS & SOW
            </span>
          </div>
          <h1 className="font-monument text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 uppercase">
            Proposals & Quotes
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Draft statement-of-work proposals, send digital scopes, and auto-convert accepted bids into active client projects.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className={btnPrimary}
        >
          + Create proposal
        </button>
      </div>

      {/* Acceptance Notification Banner */}
      {acceptanceNotice && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-lg flex items-center justify-between text-xs font-mono text-emerald-200">
          <span>{acceptanceNotice}</span>
          <button
            type="button"
            onClick={() => setAcceptanceNotice(null)}
            className="text-white hover:underline uppercase font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111111] border border-[#262626] p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-400 block mb-1">Active Pipeline Proposals</span>
          <span className="font-mono text-2xl font-black text-white">{proposals.length}</span>
        </div>
        <div className="bg-[#111111] border border-[#262626] p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-400 block mb-1">Total Proposed Value</span>
          <span className="font-mono text-2xl font-black text-[#FBD227]">
            ${proposals.reduce((a, b) => a + b.amount, 0).toLocaleString()}
          </span>
        </div>
        <div className="bg-[#111111] border border-[#262626] p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-400 block mb-1">Proposal Acceptance Rate</span>
          <span className="font-mono text-2xl font-black text-emerald-400">
            {proposals.length > 0
              ? Math.round((proposals.filter((p) => p.status === "Accepted").length / proposals.length) * 100)
              : 0}
            %
          </span>
        </div>
      </div>

      {/* Proposal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {proposals.length === 0 && (
          <p className="col-span-full border border-dashed border-[#262626] p-8 text-center font-mono text-xs font-bold text-gray-400 rounded-lg">
            No proposals yet. Create your first one.
          </p>
        )}
        {proposals.map((prop) => (
          <div
            key={prop.id}
            className="border border-[#262626] bg-[#111111] rounded-lg p-5 shadow-2xs flex flex-col justify-between hover:border-[#383838] transition-colors"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-[#FBD227]">{prop.proposalNumber}</span>
                <span
                  className={`font-mono text-xs font-bold px-2 py-0.5 rounded uppercase border ${
                    prop.status === "Accepted"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : prop.status === "Sent"
                      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      : prop.status === "Draft"
                      ? "bg-white/5 text-gray-400 border-[#262626]"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  }`}
                >
                  {prop.status}
                </span>
              </div>

              <h3 className="font-bold text-base text-white mt-1 leading-snug font-monument">{prop.title}</h3>
              <p className="text-xs text-gray-400 font-mono mt-1">
                {prop.company} • {prop.clientName}
              </p>

              <div className="mt-4 pt-3 border-t border-[#262626] space-y-2">
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-gray-400">Proposed Fee:</span>
                  <span className="font-black text-[#FBD227]">${prop.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-gray-400">Estimated Timeline:</span>
                  <span className="font-bold text-white">{prop.timeline}</span>
                </div>
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-gray-400">Valid Until:</span>
                  <span className="text-gray-300">{prop.validUntil}</span>
                </div>
              </div>

              {/* Deliverable pills */}
              <div className="mt-3 flex flex-wrap gap-1">
                {prop.scopeSummary.map((item, idx) => (
                  <span key={idx} className="font-mono text-[10px] bg-white/5 border border-[#262626] px-1.5 py-0.5 rounded text-gray-300">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#262626] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setViewingProposal(prop)}
                className="flex-1 py-1.5 px-3 bg-[#181818] border border-[#333333] hover:border-[#FBD227] hover:text-[#FBD227] text-white font-mono text-xs font-bold uppercase transition-colors"
              >
                Preview SOW
              </button>
              <button
                type="button"
                onClick={() => copyProposalLink(prop.id)}
                className="py-1.5 px-3 bg-black border border-[#333333] hover:border-white text-gray-300 font-mono text-xs transition-colors"
                title="Copy share link"
              >
                {copiedLink === prop.id ? "Copied!" : "🔗 Share"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* SOW Preview Modal */}
      <Modal open={Boolean(viewingProposal)} onClose={() => setViewingProposal(null)} title="Statement of Work Proposal">
        {viewingProposal && (
          <div className="space-y-6 text-white font-sans">
            <div className="border border-[#262626] bg-black p-5 rounded-lg space-y-4">
              <div className="flex justify-between items-start border-b border-[#262626] pb-4">
                <div>
                  <span className="font-mono text-xs text-[#FBD227] font-bold block">{viewingProposal.proposalNumber}</span>
                  <h2 className="font-monument text-lg font-black text-white uppercase">{viewingProposal.title}</h2>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">Prepared for: {viewingProposal.company} ({viewingProposal.clientName})</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xl font-black text-[#FBD227] block">
                    ${viewingProposal.amount.toLocaleString()}
                  </span>
                  <span className="font-mono text-[10px] text-gray-400">Fixed Milestone Pricing</span>
                </div>
              </div>

              <div>
                <h4 className="font-mono text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">Scope of Deliverables</h4>
                <ul className="space-y-1.5 font-mono text-xs">
                  {viewingProposal.scopeSummary.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-gray-200">
                      <span className="text-[#FBD227]">✓</span> {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-[#262626] pt-3 text-xs font-mono">
                <div>
                  <span className="text-gray-400 block">Target Timeline</span>
                  <strong className="text-white">{viewingProposal.timeline}</strong>
                </div>
                <div>
                  <span className="text-gray-400 block">Proposal Expiration</span>
                  <strong className="text-white">{viewingProposal.validUntil}</strong>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#262626] flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Current Status: <strong className="text-white">{viewingProposal.status}</strong>
              </span>

              <div className="flex items-center gap-2">
                {viewingProposal.status !== "Accepted" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(viewingProposal.id, "Accepted")}
                    className="px-4 py-2 bg-emerald-600 text-white font-bold rounded uppercase tracking-wider hover:bg-emerald-500 transition-colors font-mono text-xs flex items-center gap-1.5"
                  >
                    <Icon name="check" className="h-4 w-4" />
                    Accept & Auto-Create Project
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewingProposal(null)}
                  className={btnDark}
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Proposal Modal */}
      <Modal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Generate new proposal">
        <div>
          <form onSubmit={handleCreate} className="space-y-4 font-mono text-xs">
            <div>
              <label htmlFor="proposal-field-1" className={labelClass}>
                Client Account
              </label>
              <select id="proposal-field-1"
                value={clientCompany}
                onChange={(e) => {
                  setClientCompany(e.target.value);
                  const c = clients.find((item) => item.company === e.target.value);
                  if (c) setClientContact(c.name);
                }}
                className={fieldClass}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.company}>
                    {c.company} ({c.name})
                  </option>
                ))}
              </select>
              {clients.length === 0 && (
                <p className="mt-1.5 font-sans text-xs text-gray-400">
                  {loadingClients ? "Loading clients…" : "No clients yet. Add one in Clients first."}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="proposal-field-2" className={labelClass}>
                Proposal Title *
              </label>
              <input id="proposal-field-2"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Full-Stack SaaS Prototype & Brand System"
                className={fieldClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="proposal-field-3" className={labelClass}>
                  Fixed Price ($ USD)
                </label>
                <input id="proposal-field-3"
                  type="number"
                  required
                  min={1}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="proposal-field-4" className={labelClass}>
                  Delivery Timeline
                </label>
                <input id="proposal-field-4"
                  type="text"
                  required
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  placeholder="4 Weeks Delivery"
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="proposal-field-5" className={labelClass}>
                Scope Deliverables (comma separated)
              </label>
              <textarea id="proposal-field-5"
                rows={2}
                value={scopeText}
                onChange={(e) => setScopeText(e.target.value)}
                placeholder="Design System, Custom Shopify Build, Klaviyo Setup..."
                className={fieldClass}
              />
            </div>

            <div className="pt-3 border-t border-[#262626] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className={btnDark}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={btnPrimary}
              >
                {submitting ? "Generating…" : "Generate Proposal"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
