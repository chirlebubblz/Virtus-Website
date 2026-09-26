"use client";

import React, { useEffect, useState } from "react";
import { db, Proposal } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { useClients } from "./useClients";
import { Modal, fieldClass, fieldCompact, labelClass, btnPrimary, btnDark } from "./ui";

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

  // Form State
  const [clientCompany, setClientCompany] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [timeline, setTimeline] = useState("4 Weeks Delivery");
  const [scopeText, setScopeText] = useState("Brand Strategy, Next.js Web Flagship, Content Engine");

  const { clients, loading: loadingClients } = useClients();
  useEffect(() => {
    if (!clientCompany && clients[0]) {
      setClientCompany(clients[0].company);
      setClientContact(clients[0].contactName ?? clients[0].name);
    }
  }, [clients, clientCompany]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClient = clients.find((c) => c.company === clientCompany);
    const value = Number(amount);
    if (!title.trim() || !selectedClient || !Number.isFinite(value) || value <= 0) return;

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
  };

  const handleStatusChange = (id: string, status: Proposal["status"]) => {
    db.updateProposalStatus(id, status);
    setProposals(db.getProposals());
    if (viewingProposal && viewingProposal.id === id) {
      setViewingProposal({ ...viewingProposal, status });
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-white font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#262626] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-400">
              Operations OS · Proposals
            </span>
          </div>
          <h1 className="font-monument text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 uppercase">
            Proposals & Quotes
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Draft statement-of-work proposals and track client review and acceptance.
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
          <span className="font-mono text-2xl font-black text-emerald-400">67%</span>
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
              </div>

              <div className="mt-3">
                <span className="text-xs font-mono uppercase text-gray-400 font-bold block mb-1">
                  Deliverable Scope:
                </span>
                <div className="flex flex-wrap gap-1">
                  {prop.scopeSummary.map((item, idx) => (
                    <span
                      key={idx}
                      className="text-[0.62rem] font-mono px-1.5 py-0.5 rounded bg-[#181818] border border-[#262626] text-gray-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#262626] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setViewingProposal(prop)}
                className="flex-1 py-1.5 rounded bg-[#161616] border border-[#262626] hover:bg-[#FBD227] hover:text-black hover:border-[#FBD227] font-mono text-xs font-bold text-gray-300 transition-colors text-center"
              >
                Inspect Proposal →
              </button>

              <select
                value={prop.status}
                onChange={(e) => handleStatusChange(prop.id, e.target.value as Proposal["status"])}
                className={fieldCompact}
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Accepted">Accepted</option>
                <option value="Declined">Declined</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* Inspect Proposal Modal */}
      <Modal
        open={viewingProposal !== null}
        onClose={() => setViewingProposal(null)}
        title={viewingProposal ? `${viewingProposal.proposalNumber} · Proposal preview` : "Proposal preview"}
      >
        {viewingProposal && (
          <div className="space-y-4 font-mono text-xs text-white">
            <div className="p-4 bg-[#161616] rounded border border-[#262626]">
              <span className="text-xs text-gray-400 uppercase font-bold block mb-1">Prepared For</span>
              <h4 className="font-bold text-base text-white font-monument">{viewingProposal.company}</h4>
              <p className="text-gray-300 mt-1">Contact: {viewingProposal.clientName}</p>
              <p className="text-gray-400">Valid Until: {viewingProposal.validUntil}</p>
            </div>

            <div>
              <h4 className="font-bold text-sm text-white mb-2 font-monument">Scope of Engagement: {viewingProposal.title}</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-300">
                {viewingProposal.scopeSummary.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#FBD227] border border-[#FBD227] rounded text-black">
              <div>
                <span className="text-xs text-neutral-800 uppercase font-bold block">Fixed Studio Investment</span>
                <span className="font-black text-xl text-black font-monument">${viewingProposal.amount.toLocaleString()} USD</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-neutral-800 uppercase font-bold block">Delivery Window</span>
                <span className="font-bold text-black">{viewingProposal.timeline}</span>
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
                    className="px-4 py-2 bg-emerald-600 text-white font-bold rounded uppercase tracking-wider hover:bg-emerald-500 transition-colors"
                  >
                    <Icon name="check" className="mr-1.5 inline h-4 w-4 align-[-0.2em]" />Simulate client acceptance
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
                className={btnPrimary}
              >
                Create proposal
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
