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
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [issuedLink, setIssuedLink] = useState<IssuedLink | null>(null);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Stays set once the current link has been copied, unlike copiedId which clears after two seconds.
  const [copiedOnce, setCopiedOnce] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Edit Client Modal state
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editCompany, setEditCompany] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editStatus, setEditStatus] = useState<Client["status"]>("Active");
  const [editRevenue, setEditRevenue] = useState<number>(0);
  const [editActiveProjects, setEditActiveProjects] = useState<number>(1);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

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

  // Open Edit Modal
  const openEditModal = (c: Client) => {
    setEditingClient(c);
    setEditCompany(c.company);
    setEditName(c.contactName || c.name);
    setEditEmail(c.email);
    setEditStatus(c.status);
    setEditRevenue(c.totalRevenue);
    setEditActiveProjects(c.activeProjectsCount);
    setEditError("");
  };

  const closeEditModal = () => {
    setEditingClient(null);
    setEditError("");
  };

  // Save updates to client card
  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || editSubmitting) return;

    if (!editCompany.trim() || !editName.trim() || !editEmail.trim()) {
      setEditError("Company, contact name, and email are required.");
      return;
    }

    setEditSubmitting(true);
    setEditError("");

    try {
      const res = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingClient.id,
          company: editCompany.trim(),
          name: editName.trim(),
          contactName: editName.trim(),
          email: editEmail.trim(),
          status: editStatus,
          totalRevenue: Number(editRevenue) || 0,
          activeProjectsCount: Number(editActiveProjects) || 0,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error || "Could not update client card");
      }

      setClients((prev) =>
        prev.map((c) =>
          c.id === editingClient.id
            ? {
                ...c,
                company: editCompany.trim(),
                name: editName.trim(),
                contactName: editName.trim(),
                email: editEmail.trim(),
                status: editStatus,
                totalRevenue: Number(editRevenue) || 0,
                activeProjectsCount: Number(editActiveProjects) || 0,
              }
            : c
        )
      );

      closeEditModal();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update client card.");
    } finally {
      setEditSubmitting(false);
    }
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
            Active and draft client cards, revenue metrics, deliverables, and private magic portal access keys.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="border-2 border-[#FBD227] bg-[#FBD227] text-black px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.14em] shadow-xs hover:bg-transparent hover:text-[#FBD227] transition-colors"
          >
            + Add client
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111111] border border-[#262626] p-4 text-white">
          <span className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-[#888888] block mb-1">
            Total Client Accounts
          </span>
          <div className="flex items-baseline justify-between">
            <span className="font-monument text-2xl font-bold text-white">{clients.length}</span>
            <span className="font-mono text-xs text-[#888888]">Draft & Active</span>
          </div>
        </div>
        <div className="bg-[#111111] border border-[#262626] p-4 text-white">
          <span className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-[#888888] block mb-1">
            Lifetime Value (LTV)
          </span>
          <div className="flex items-baseline justify-between">
            <span className="font-monument text-2xl font-bold text-[#FBD227]">
              ${totalRevenue.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="bg-[#111111] border border-[#262626] p-4 text-white">
          <span className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-[#888888] block mb-1">
            Active Deliveries
          </span>
          <div className="flex items-baseline justify-between">
            <span className="font-monument text-2xl font-bold text-white">
              {clients.filter((c) => c.status === "Active").length}
            </span>
            <span className="font-mono text-xs text-emerald-400">In Production</span>
          </div>
        </div>
        <div className="bg-[#111111] border border-[#262626] p-4 text-white">
          <span className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-[#888888] block mb-1">
            Onboarding & Kickoff
          </span>
          <div className="flex items-baseline justify-between">
            <span className="font-monument text-2xl font-bold text-white">
              {clients.filter((c) => c.status === "Onboarding").length}
            </span>
            <span className="font-mono text-xs text-[#FBD227]">Awaiting SOW</span>
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

      {/* Filter, Search, and View Mode Toggle Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#111111] p-4 border border-[#262626]">
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

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
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

          {/* View Toggle: Cards vs Table */}
          <div className="flex items-center border border-[#333333] bg-black p-0.5 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1 text-xs font-mono font-bold uppercase transition-colors flex items-center gap-1.5 ${
                viewMode === "cards" ? "bg-[#FBD227] text-black" : "text-[#888888] hover:text-white"
              }`}
            >
              ▦ Cards View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 text-xs font-mono font-bold uppercase transition-colors flex items-center gap-1.5 ${
                viewMode === "table" ? "bg-[#FBD227] text-black" : "text-[#888888] hover:text-white"
              }`}
            >
              ☰ Table View
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Cards View or Table View */}
      {viewMode === "cards" ? (
        /* --- CARDS VIEW --- */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {load === "loading" && (
            <div className="col-span-full py-12 text-center font-mono text-sm text-[#888888]">
              Loading client cards…
            </div>
          )}
          {load !== "loading" && filteredClients.length === 0 && (
            <div className="col-span-full bg-[#111111] border border-[#262626] p-12 text-center">
              <p className="font-monument text-lg text-white mb-2">No client cards found</p>
              <p className="text-xs text-[#888888] mb-4">
                {clients.length === 0 ? "Create your first client card to get started." : "No client cards match your current search."}
              </p>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-[#FBD227] text-black font-sans text-xs font-bold uppercase tracking-wider"
              >
                + Add Client
              </button>
            </div>
          )}
          {filteredClients.map((client) => {
            const hasLink = Boolean(client.portalTokenLast4);
            const isRevoked = Boolean(client.portalTokenRevokedAt);
            const isExpired =
              hasLink && !isRevoked && client.portalTokenExpiresAt && new Date(client.portalTokenExpiresAt).getTime() < Date.now();

            return (
              <div
                key={client.id}
                className="bg-[#111111] border border-[#262626] hover:border-[#FBD227] transition-all duration-200 p-5 flex flex-col justify-between group shadow-sm"
              >
                {/* Card Top: Monogram Avatar, Company, Status */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-black text-[#FBD227] flex items-center justify-center font-bold font-monument text-sm border border-[#333333] group-hover:border-[#FBD227] transition-colors">
                        {client.company.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base leading-snug group-hover:text-[#FBD227] transition-colors">
                          {client.company}
                        </h3>
                        <p className="text-xs text-[#AAAAAA] font-mono">{client.contactName || client.name}</p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-sans font-bold uppercase tracking-wider border ${
                        client.status === "Active"
                          ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/60"
                          : client.status === "Onboarding"
                          ? "bg-amber-950/60 text-[#FBD227] border-amber-800/60"
                          : "bg-blue-950/60 text-blue-400 border-blue-800/60"
                      }`}
                    >
                      {client.status}
                    </span>
                  </div>

                  {/* Contact Email & Details */}
                  <div className="space-y-1.5 py-3 border-y border-[#1F1F1F] my-3 text-xs font-mono">
                    <div className="flex items-center justify-between text-[#888888]">
                      <span>Email:</span>
                      <span className="text-white truncate max-w-[200px]" title={client.email}>
                        {client.email}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[#888888]">
                      <span>Total Revenue (LTV):</span>
                      <span className="text-[#FBD227] font-bold">${client.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-[#888888]">
                      <span>Active Projects:</span>
                      <span className="text-white font-bold">{client.activeProjectsCount} in flight</span>
                    </div>
                    <div className="flex items-center justify-between text-[#888888]">
                      <span>Portal Magic Link:</span>
                      <span className="text-[#AAAAAA]">
                        {hasLink ? (
                          <span className={isRevoked ? "text-red-400" : isExpired ? "text-amber-400" : "text-emerald-400"}>
                            Key …{client.portalTokenLast4} {isRevoked ? "(Revoked)" : isExpired ? "(Expired)" : "(Active)"}
                          </span>
                        ) : (
                          <span className="text-[#666666]">Not generated</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(client)}
                    className="flex-1 py-1.5 px-3 bg-[#181818] border border-[#333333] hover:border-[#FBD227] hover:text-[#FBD227] text-white font-sans text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                  >
                    ✏️ Edit Card
                  </button>

                  <button
                    type="button"
                    onClick={() => issueLink(client)}
                    disabled={issuingId === client.id}
                    className="flex-1 py-1.5 px-3 bg-[#141414] border border-[#333333] hover:border-white text-[#CCCCCC] hover:text-white font-sans text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    {issuingId === client.id ? "Creating…" : hasLink ? "🔗 New Link" : "+ Create Link"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* --- TABLE VIEW --- */
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
                          <span className="text-xs text-[#888888] font-mono">{client.contactName || client.name}</span>
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
                        <button
                          type="button"
                          onClick={() => openEditModal(client)}
                          className="px-2.5 py-1 border border-[#333333] bg-[#181818] text-[#FBD227] font-sans text-xs font-bold uppercase tracking-wider hover:border-[#FBD227] hover:bg-[#FBD227] hover:text-black transition-colors"
                        >
                          ✏️ Edit
                        </button>
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
      )}

      {/* Edit Client Card Modal */}
      <Modal
        open={Boolean(editingClient)}
        onClose={closeEditModal}
        title={editingClient ? `Edit Client Card · ${editingClient.company}` : "Edit Client Card"}
      >
        {editingClient && (
          <form onSubmit={handleUpdateClient} className="space-y-4 font-sans text-xs">
            <p className="text-[#AAAAAA] text-xs -mt-2 mb-3">
              Update organization info, primary contact, production status, and project financial metrics.
            </p>

            <div>
              <label htmlFor="edit-client-company" className={labelClass}>
                Company / Organization Name *
              </label>
              <input
                id="edit-client-company"
                type="text"
                required
                value={editCompany}
                onChange={(e) => setEditCompany(e.target.value)}
                placeholder="e.g. Tidewater Coffee"
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="edit-client-name" className={labelClass}>
                Primary Contact Person Name *
              </label>
              <input
                id="edit-client-name"
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Arthur Pendelton"
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="edit-client-email" className={labelClass}>
                Billing & Primary Email *
              </label>
              <input
                id="edit-client-email"
                type="email"
                required
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="arthur@company.com"
                className={fieldClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="edit-client-status" className={labelClass}>
                  Lifecycle Status
                </label>
                <select
                  id="edit-client-status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as Client["status"])}
                  className={fieldClass}
                >
                  <option value="Active" className="bg-black text-white">Active</option>
                  <option value="Onboarding" className="bg-black text-white">Onboarding</option>
                  <option value="Completed" className="bg-black text-white">Completed</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-client-revenue" className={labelClass}>
                  Lifetime Revenue ($)
                </label>
                <input
                  id="edit-client-revenue"
                  type="number"
                  min="0"
                  step="100"
                  value={editRevenue}
                  onChange={(e) => setEditRevenue(Number(e.target.value))}
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="edit-client-projects" className={labelClass}>
                  Active Projects Count
                </label>
                <input
                  id="edit-client-projects"
                  type="number"
                  min="0"
                  max="50"
                  value={editActiveProjects}
                  onChange={(e) => setEditActiveProjects(Number(e.target.value))}
                  className={fieldClass}
                />
              </div>
            </div>

            {editError && (
              <p role="alert" className="text-[#DD7230] font-bold">
                {editError}
              </p>
            )}

            <div className="pt-4 border-t border-[#262626] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={closeEditModal}
                className="px-4 py-2 border border-[#333333] bg-[#141414] font-sans text-xs font-bold uppercase tracking-wider text-white hover:border-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editSubmitting}
                className="px-4 py-2 bg-[#FBD227] text-black border-2 border-[#FBD227] font-sans text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black hover:border-white transition-colors disabled:opacity-60"
              >
                {editSubmitting ? "Saving Changes…" : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </Modal>

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
                <input
                  id="client-field-1"
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
                <input
                  id="client-field-2"
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
                <input
                  id="client-field-3"
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
                <select
                  id="client-field-4"
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
