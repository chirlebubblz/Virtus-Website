"use client";

import React, { useEffect, useState } from "react";
import type { ClientSummary } from "@/db";
import { Modal, fieldClass } from "./ui";
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
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-[#000000]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-500">
              Operations OS · Clients
            </span>
          </div>
          <h1 className="font-monument text-2xl sm:text-3xl font-black text-[#000000] tracking-tight mt-1 uppercase">
            Clients & Accounts
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Client accounts, revenue and portal links.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="border-2 border-black bg-black text-[#FBD227] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider shadow-xs hover:bg-[#FBD227] hover:text-black transition-colors"
        >
          + Add client
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-300 p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-500 block mb-1">Total Client Accounts</span>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black text-black">{clients.length}</span>
          </div>
        </div>
        <div className="bg-white border border-gray-300 p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-500 block mb-1">Lifetime Value (LTV)</span>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black text-black">${totalRevenue.toLocaleString()}</span>
          </div>
        </div>
        <div className="bg-white border border-gray-300 p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-500 block mb-1">Active Deliveries</span>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black text-black">
              {clients.filter((c) => c.status === "Active").length}
            </span>
          </div>
        </div>
        <div className="bg-white border border-gray-300 p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-500 block mb-1">Onboarding</span>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black text-black">
              {clients.filter((c) => c.status === "Onboarding").length}
            </span>
          </div>
        </div>
      </div>

      {pageError && (
        <p role="alert" className="border-l-4 border-[#DD7230] bg-[#F8E3D6] px-4 py-3 font-mono text-xs font-bold text-black">
          {pageError}
        </p>
      )}
      {load === "error" && (
        <p role="alert" className="border-l-4 border-[#DD7230] bg-[#F8E3D6] px-4 py-3 font-mono text-xs font-bold text-black">
          Could not load clients. Reload the page to try again.
        </p>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 border border-gray-300 rounded-lg shadow-2xs">
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
          <span className="text-xs text-gray-500 uppercase font-bold mr-1">Status:</span>
          {["all", "Active", "Onboarding", "Completed"].map((st) => (
            <button
              key={st}
              type="button"
              aria-pressed={statusFilter === st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded font-bold uppercase text-xs transition-colors ${
                statusFilter === st
                  ? "bg-black text-[#FBD227]"
                  : "bg-gray-100 text-gray-600 hover:text-black hover:bg-gray-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white border border-gray-300 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 font-mono text-xs uppercase text-gray-500 bg-gray-50">
                <th className="py-3 px-4">Company & Client</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Projects</th>
                <th className="py-3 px-4">Total Revenue</th>
                <th className="py-3 px-4">Contact Email</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {load === "loading" && <SkeletonRows rows={5} cols={6} />}
              {load !== "loading" && filteredClients.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center font-mono text-xs font-bold text-gray-700">
                    {clients.length === 0
                      ? "No clients yet. Add your first client."
                      : "No clients match your search or filter."}
                  </td>
                </tr>
              )}
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[#1C1C1C] text-[#FBD227] flex items-center justify-center font-bold font-mono text-xs border border-black">
                        {client.company.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-gray-900 block">{client.company}</span>
                        <span className="text-xs text-gray-500 font-mono">{client.name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold ${
                        client.status === "Active"
                          ? "bg-emerald-100 text-emerald-800"
                          : client.status === "Onboarding"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {client.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-gray-800 font-bold">
                    {client.activeProjectsCount} active
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-black">
                    ${client.totalRevenue.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-gray-500 text-xs">
                    {client.email}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 font-mono text-xs">
                      <span className="text-gray-600">
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
                        className="px-2.5 py-1 rounded border border-black text-black font-bold hover:bg-gray-100 transition-colors disabled:opacity-40"
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
              <div className="space-y-4 font-mono text-xs">
                <p className="text-gray-700">
                  Payment received? Send this link to <strong>{issuedLink.company}</strong>. It opens their welcome
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
                <p className="text-gray-600">
                  Copy it now. For security this link is shown once. Use &quot;New Link&quot; to replace it later
                  {issuedLink.expiresAt
                    ? `. Expires ${new Date(issuedLink.expiresAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}.`
                    : "."}
                </p>
                <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded font-bold text-gray-700 hover:bg-gray-100"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(issuedLink.clientId, issuedLink.url)}
                    className="px-4 py-2 bg-black text-[#FBD227] border-2 border-black font-bold uppercase tracking-wider hover:bg-[#FBD227] hover:text-black transition-colors"
                  >
                    {copiedId === issuedLink.clientId ? "Copied" : "Copy Link"}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddClient} className="space-y-4 font-mono text-xs">
                <div>
                  <label htmlFor="client-field-1" className="block text-xs font-bold uppercase text-gray-700 mb-1">
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
                  <label htmlFor="client-field-2" className="block text-xs font-bold uppercase text-gray-700 mb-1">
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
                  <label htmlFor="client-field-3" className="block text-xs font-bold uppercase text-gray-700 mb-1">
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
                  <label htmlFor="client-field-4" className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Lifecycle Status
                  </label>
                  <select id="client-field-4"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Client["status"])}
                    className={fieldClass}
                  >
                    <option value="Onboarding">Onboarding</option>
                    <option value="Active">Active Production</option>
                    <option value="Completed">Completed / Retainer</option>
                  </select>
                </div>

                {formError && (
                  <p role="alert" className="text-red-700 font-bold">
                    {formError}
                  </p>
                )}

                <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded font-bold text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-black text-[#FBD227] border-2 border-black font-bold uppercase tracking-wider hover:bg-[#FBD227] hover:text-black transition-colors disabled:opacity-60"
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
