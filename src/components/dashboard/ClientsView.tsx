"use client";

import React, { useEffect, useState } from "react";
import type { ClientSummary } from "@/db";
import { Modal, fieldClass, labelClass } from "./ui";
import { SkeletonRows } from "./Skeleton";

type Client = ClientSummary;

/** A link that was just issued. The plaintext key exists only here, never on the server after this response. */
interface IssuedLink {
  clientId: string;
  company: string;
  url: string;
  expiresAt?: string;
}

export const ClientsView: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [load, setLoad] = useState<"loading" | "ready" | "error">("loading");
  const [pageError, setPageError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [issuedLink, setIssuedLink] = useState<IssuedLink | null>(null);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Stays set once the current link has been copied, unlike copiedId which clears after two seconds.
  const [copiedOnce, setCopiedOnce] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Server store is the source of truth for portal tokens
  useEffect(() => {
    let cancelled = false;
    fetch("/api/clients")
      .then(async (r) => ({ ok: r.ok, json: await r.json().catch(() => null) }))
      .then(({ ok, json }) => {
        if (cancelled) return;
        if (ok && json?.ok && Array.isArray(json.data)) {
          setClients(json.data);
          setLoad("ready");
        } else {
          setLoad("error");
        }
      })
      .catch(() => !cancelled && setLoad("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  const buildLink = (token: string) => `${window.location.origin}/track?token=${token}`;

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setCopiedOnce(true);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2000);
    } catch {
      window.prompt("Copy this link:", text);
    }
  };

  // Issues a new key. The previous key stops working immediately.
  const issueLink = async (c: Client) => {
    if (issuingId) return;
    if (
      c.portalTokenLast4 &&
      !window.confirm(`Create a new link for ${c.company}? Their current link and any open session stop working.`)
    ) {
      return;
    }
    setIssuingId(c.id);
    setPageError(null);
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(c.id)}/token`, { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Could not create link");
      setClients((prev) =>
        prev.map((x) =>
          x.id === c.id
            ? { ...x, portalTokenLast4: json.data.last4, portalTokenExpiresAt: json.data.expiresAt, portalTokenRevokedAt: null }
            : x
        )
      );
      setCopiedOnce(false);
      setIssuedLink({ clientId: c.id, company: c.company, url: buildLink(json.data.token), expiresAt: json.data.expiresAt });
      setIsAddModalOpen(true);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Could not create link");
    } finally {
      setIssuingId(null);
    }
  };

  const closeModal = () => {
    // The plaintext link is never shown again, so make sure it was copied before it disappears.
    if (issuedLink && !copiedOnce) {
      if (!window.confirm("This link is shown only once and you have not copied it. Close anyway?")) return;
    }
    setIsAddModalOpen(false);
    setIssuedLink(null);
    setFormError("");
  };

  // New Client Form
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Client["status"]>("Onboarding");

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" ? true : c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = clients.reduce((acc, c) => acc + c.totalRevenue, 0);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || submitting) {
      setFormError("Enter the contact name and email.");
      return;
    }
    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contactName: name, company: company || name, email, status }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Could not create client");

      const { portalToken, ...created } = json.data as Client & { portalToken: string };
      setClients((prev) => [created, ...prev]);
      setCopiedOnce(false);
      setIssuedLink({
        clientId: created.id,
        company: created.company,
        url: buildLink(portalToken),
        expiresAt: created.portalTokenExpiresAt ?? undefined,
      });
      setName("");
      setCompany("");
      setEmail("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create client");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-white font-sans">
      {/* Top Header */}
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#262626] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="block h-1 w-10 bg-[#FBD227]" />
            <span className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-[#FBD227]">
              OPERATIONS OS · CLIENTS
            </span>
          </div>
          <h1 className="font-monument text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 uppercase">
            Clients & Accounts
          </h1>
          <p className="text-xs sm:text-sm text-[#999999] mt-1">
            Client accounts, revenue figures, and private magic portal access keys.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="border-2 border-[#FBD227] bg-[#FBD227] text-black px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.14em] shadow-xs hover:bg-transparent hover:text-[#FBD227] transition-colors"
        >
          + Add client
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111111] border border-[#262626] p-4 text-white">
          <span className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-[#888888] block mb-1">Total Client Accounts</span>
          <div className="flex items-baseline justify-between">
            <span className="font-monument text-2xl font-bold text-white">{clients.length}</span>
          </div>
        </div>
        <div className="bg-[#111111] border border-[#262626] p-4 text-white">
          <span className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-[#888888] block mb-1">Lifetime Value (LTV)</span>
          <div className="flex items-baseline justify-between">
            <span className="font-monument text-2xl font-bold text-[#FBD227]">${totalRevenue.toLocaleString()}</span>
          </div>
        </div>
        <div className="bg-[#111111] border border-[#262626] p-4 text-white">
          <span className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-[#888888] block mb-1">Active Deliveries</span>
          <div className="flex items-baseline justify-between">
            <span className="font-monument text-2xl font-bold text-white">
              {clients.filter((c) => c.status === "Active").length}
            </span>
          </div>
        </div>
        <div className="bg-[#111111] border border-[#262626] p-4 text-white">
          <span className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-[#888888] block mb-1">Onboarding</span>
          <div className="flex items-baseline justify-between">
            <span className="font-monument text-2xl font-bold text-white">
              {clients.filter((c) => c.status === "Onboarding").length}
            </span>
          </div>
        </div>
      </div>

      {pageError && (
        <p role="alert" className="border-l-4 border-[#DD7230] bg-[#DD7230]/10 px-4 py-3 font-mono text-xs font-bold text-white">
          {pageError}
        </p>
      )}
      {load === "error" && (
        <p role="alert" className="border-l-4 border-[#DD7230] bg-[#DD7230]/10 px-4 py-3 font-mono text-xs font-bold text-white">
          Could not load clients. Reload the page to try again.
        </p>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111111] p-4 border border-[#262626]">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search clients"
            placeholder="Search by company, contact, or email..."
            className={fieldClass}
          />
        </div>

        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-xs text-[#888888] uppercase font-bold mr-1">Status:</span>
          {["all", "Active", "Onboarding", "Completed"].map((st) => (
            <button
              key={st}
              type="button"
              aria-pressed={statusFilter === st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 font-sans text-xs font-bold uppercase tracking-wider transition-colors ${
                statusFilter === st
                  ? "bg-[#FBD227] text-black"
                  : "bg-black text-[#888888] border border-[#333333] hover:text-white hover:border-[#FBD227]"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-[#111111] border border-[#262626] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#262626] font-sans text-xs font-bold uppercase tracking-wider text-[#888888] bg-[#141414]">
                <th className="py-3 px-4">Company & Client</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Projects</th>
                <th className="py-3 px-4">Total Revenue</th>
                <th className="py-3 px-4">Contact Email</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F1F] text-xs">
              {load === "loading" && <SkeletonRows rows={5} cols={6} />}
              {load !== "loading" && filteredClients.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center font-sans text-xs font-bold text-[#888888]">
                    {clients.length === 0
                      ? "No clients yet. Add your first client."
                      : "No clients match your search or filter."}
                  </td>
                </tr>
              )}
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-black text-[#FBD227] flex items-center justify-center font-bold font-monument text-xs border border-[#333333]">
                        {client.company.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-white block">{client.company}</span>
                        <span className="text-xs text-[#888888] font-mono">{client.name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-sans font-bold uppercase tracking-wider border ${
                        client.status === "Active"
                          ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/60"
                          : client.status === "Onboarding"
                          ? "bg-amber-950/60 text-[#FBD227] border-amber-800/60"
                          : "bg-blue-950/60 text-blue-400 border-blue-800/60"
                      }`}
                    >
                      {client.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#CCCCCC] font-bold">
                    {client.activeProjectsCount} active
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-[#FBD227]">
                    ${client.totalRevenue.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#888888] text-xs">
                    {client.email}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2 font-mono text-xs">
                      <span className="text-[#777777]">
                        {client.portalTokenLast4 ? `Key …${client.portalTokenLast4}` : "No link yet"}
                        {client.portalTokenLast4 && client.portalTokenRevokedAt ? " (revoked)" : ""}
                        {client.portalTokenLast4 &&
                        !client.portalTokenRevokedAt &&
                        client.portalTokenExpiresAt &&
                        new Date(client.portalTokenExpiresAt).getTime() < Date.now()
                          ? " (expired)"
                          : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => issueLink(client)}
                        disabled={issuingId === client.id}
                        className="px-2.5 py-1 border border-[#333333] bg-[#141414] text-white font-sans text-xs font-bold uppercase tracking-wider hover:border-[#FBD227] hover:text-[#FBD227] transition-colors disabled:opacity-40"
                      >
                        {issuingId === client.id ? "Creating…" : client.portalTokenLast4 ? "New Link" : "Create Link"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Client / Issued Link Modal */}
      <Modal
        open={isAddModalOpen}
        onClose={closeModal}
        dismissible={!issuedLink}
        title={issuedLink ? "Client link ready" : "Add new client account"}
      >
        <div>
            {issuedLink ? (
              <div className="space-y-4 font-sans text-xs">
                <p className="text-[#CCCCCC]">
                  Payment received? Send this link to <strong className="text-white">{issuedLink.company}</strong>. It opens their welcome
                  page, then their private dashboard.
                </p>
                <input
                  type="text"
                  readOnly
                  value={issuedLink.url}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Client link"
                  className={fieldClass}
                />
                <p className="text-[#888888]">
                  Copy it now. For security this link is shown once. Use &quot;New Link&quot; to replace it later
                  {issuedLink.expiresAt
                    ? `. Expires ${new Date(issuedLink.expiresAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}.`
                    : "."}
                </p>
                <div className="pt-4 border-t border-[#262626] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-[#333333] bg-[#141414] font-sans text-xs font-bold uppercase tracking-wider text-white hover:border-white transition-colors"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(issuedLink.clientId, issuedLink.url)}
                    className="px-4 py-2 bg-[#FBD227] text-black border-2 border-[#FBD227] font-sans text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black hover:border-white transition-colors"
                  >
                    {copiedId === issuedLink.clientId ? "Copied" : "Copy Link"}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddClient} className="space-y-4 font-sans text-xs">
                <div>
                  <label htmlFor="client-field-1" className={labelClass}>
                    Company / Organization Name *
                  </label>
                  <input id="client-field-1"
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Tidewater Coffee"
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label htmlFor="client-field-2" className={labelClass}>
                    Primary Contact Name *
                  </label>
                  <input id="client-field-2"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Arthur Pendelton"
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label htmlFor="client-field-3" className={labelClass}>
                    Billing & Primary Email *
                  </label>
                  <input id="client-field-3"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="arthur@company.com"
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label htmlFor="client-field-4" className={labelClass}>
                    Lifecycle Status
                  </label>
                  <select id="client-field-4"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Client["status"])}
                    className={fieldClass}
                  >
                    <option value="Onboarding" className="bg-black text-white">Onboarding</option>
                    <option value="Active" className="bg-black text-white">Active Production</option>
                    <option value="Completed" className="bg-black text-white">Completed / Retainer</option>
                  </select>
                </div>

                {formError && (
                  <p role="alert" className="text-[#DD7230] font-bold">
                    {formError}
                  </p>
                )}

                <div className="pt-4 border-t border-[#262626] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-[#333333] bg-[#141414] font-sans text-xs font-bold uppercase tracking-wider text-white hover:border-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-[#FBD227] text-black border-2 border-[#FBD227] font-sans text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black hover:border-white transition-colors disabled:opacity-60"
                  >
                    {submitting ? "Creating…" : "Create Client"}
                  </button>
                </div>
              </form>
            )}
        </div>
      </Modal>
    </div>
  );
};
