"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Invoice, InvoiceLineItem } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { useClients } from "./useClients";
import { errorText, workspaceApi } from "./api";
import { Modal, fieldClass, labelClass, btnPrimary, btnDark } from "./ui";

const inDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

const SERVICE_PRESETS: { label: string; description: string; unitPrice: number }[] = [
  { label: "+ Brand Identity ($3,500)", description: "Brand Identity System & Visual Direction", unitPrice: 3500 },
  { label: "+ Web Architecture ($6,500)", description: "Custom Web Architecture & Full-Stack Build", unitPrice: 6500 },
  { label: "+ AI / CRM Automation ($2,800)", description: "AI Workflow & CRM Pipeline Automation Setup", unitPrice: 2800 },
  { label: "+ Monthly Retainer ($3,000)", description: "Dedicated Studio Growth & Engineering Retainer", unitPrice: 3000 },
  { label: "+ 50% Kickoff Deposit ($2,500)", description: "50% Project Kickoff & Sprint Mobilization Deposit", unitPrice: 2500 },
];

interface DraftLineItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

export const AccountingView: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [load, setLoad] = useState<"loading" | "ready" | "error">("loading");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Creator / Editor Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  const [clientCompany, setClientCompany] = useState("");
  const [title, setTitle] = useState("Studio Engagement Invoice");
  const [dueDate, setDueDate] = useState(() => inDays(14));
  const [paymentTerms, setPaymentTerms] = useState("Net 14");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [notes, setNotes] = useState(
    "Please remit payment by the due date via ACH, wire transfer, or the secure payment link. Reference your invoice number on all transfers."
  );
  const [sendEmailOnCreate, setSendEmailOnCreate] = useState(true);
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([
    { description: "50% Project Kickoff & Discovery Sprint", quantity: "1", unitPrice: "2500" },
  ]);

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { clients, loading: loadingClients } = useClients();
  useEffect(() => {
    if (!clientCompany && clients[0]) setClientCompany(clients[0].company);
  }, [clients, clientCompany]);

  const loadInvoices = useCallback(() => {
    setLoad("loading");
    workspaceApi<Invoice[]>("/api/invoices")
      .then((data) => {
        setInvoices(data);
        setLoad("ready");
      })
      .catch(() => setLoad("error"));
  }, []);

  useEffect(loadInvoices, [loadInvoices]);

  // Live totals calculation inside the Invoice Creator
  const computedTotals = useMemo(() => {
    const validItems: InvoiceLineItem[] = lineItems
      .map((item) => {
        const q = Number(item.quantity) || 0;
        const p = Number(item.unitPrice) || 0;
        return {
          description: item.description.trim(),
          quantity: q,
          unitPrice: p,
          total: Math.round(q * p * 100) / 100,
        };
      })
      .filter((i) => i.description && i.quantity > 0 && i.unitPrice >= 0);

    const subtotal = Math.round(validItems.reduce((sum, i) => sum + i.total, 0) * 100) / 100;
    const discount = Math.max(0, Number(discountAmount) || 0);
    const rate = Math.max(0, Math.min(100, Number(taxRate) || 0));
    const taxable = Math.max(0, subtotal - discount);
    const tax = Math.round(taxable * (rate / 100) * 100) / 100;
    const total = Math.round((taxable + tax) * 100) / 100;

    return { validItems, subtotal, discount, rate, tax, total };
  }, [lineItems, discountAmount, taxRate]);

  const openCreateModal = () => {
    setEditingInvoice(null);
    setFormError(null);
    if (clients[0]) setClientCompany(clients[0].company);
    setTitle("Studio Engagement Invoice");
    setDueDate(inDays(14));
    setPaymentTerms("Net 14");
    setPaymentUrl("");
    setTaxRate("0");
    setDiscountAmount("0");
    setNotes(
      "Please remit payment by the due date via ACH, wire transfer, or the secure payment link. Reference your invoice number on all transfers."
    );
    setSendEmailOnCreate(true);
    setLineItems([{ description: "50% Project Kickoff & Discovery Sprint", quantity: "1", unitPrice: "2500" }]);
    setIsInvoiceModalOpen(true);
  };

  const openEditModal = (inv: Invoice) => {
    setEditingInvoice(inv);
    setFormError(null);
    setClientCompany(inv.clientName);
    setTitle(inv.title || "Studio Engagement Invoice");
    setDueDate(inv.dueDate);
    setPaymentTerms(inv.paymentTerms || "Net 14");
    setPaymentUrl(inv.paymentUrl || "");
    setTaxRate(String(inv.taxRate ?? 0));
    setDiscountAmount(String(inv.discountAmount ?? 0));
    setNotes(
      inv.notes ||
        "Please remit payment by the due date via ACH, wire transfer, or the secure payment link. Reference your invoice number on all transfers."
    );
    if (inv.lineItems && inv.lineItems.length > 0) {
      setLineItems(
        inv.lineItems.map((li) => ({
          description: li.description,
          quantity: String(li.quantity),
          unitPrice: String(li.unitPrice),
        }))
      );
    } else {
      setLineItems([
        {
          description: inv.title || "Studio Engagement Invoice",
          quantity: "1",
          unitPrice: String(inv.subtotal ?? inv.amount),
        },
      ]);
    }
    setIsInvoiceModalOpen(true);
  };

  const addLineItem = (preset?: { description: string; unitPrice: number }) => {
    setLineItems((prev) => [
      ...prev,
      preset
        ? { description: preset.description, quantity: "1", unitPrice: String(preset.unitPrice) }
        : { description: "", quantity: "1", unitPrice: "0" },
    ]);
  };

  const updateLineItem = (index: number, field: keyof DraftLineItem, value: string) => {
    setLineItems((prev) => prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)));
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== index)));
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (computedTotals.validItems.length === 0) {
      return setFormError("Add at least one line item with a description and amount.");
    }
    if (computedTotals.total <= 0) {
      return setFormError("Total invoice amount must be greater than zero.");
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (editingInvoice) {
        const updated = await workspaceApi<Invoice>("/api/invoices", "PATCH", {
          id: editingInvoice.id,
          title: title.trim() || "Studio Engagement Invoice",
          dueDate,
          paymentTerms,
          paymentUrl: paymentUrl.trim() || undefined,
          taxRate: computedTotals.rate,
          discountAmount: computedTotals.discount,
          notes: notes.trim() || undefined,
          lineItems: computedTotals.validItems,
          amount: computedTotals.total,
        });
        setInvoices((list) => list.map((i) => (i.id === updated.id ? updated : i)));
        setActionBanner(`Updated invoice ${updated.invoiceNumber}.`);
      } else {
        const selectedClient = clients.find((c) => c.company === clientCompany);
        if (!selectedClient) {
          setSubmitting(false);
          return setFormError("Choose a client account.");
        }
        const created = await workspaceApi<Invoice>("/api/invoices", "POST", {
          clientId: selectedClient.id,
          title: title.trim() || "Studio Engagement Invoice",
          dueDate,
          paymentTerms,
          paymentUrl: paymentUrl.trim() || undefined,
          taxRate: computedTotals.rate,
          discountAmount: computedTotals.discount,
          notes: notes.trim() || undefined,
          lineItems: computedTotals.validItems,
          amount: computedTotals.total,
          sendEmail: sendEmailOnCreate,
        });
        setInvoices((list) => [created, ...list]);
        setActionBanner(
          sendEmailOnCreate
            ? `Issued ${created.invoiceNumber} ($${created.amount.toLocaleString()}) and dispatched invoice email to ${selectedClient.email}.`
            : `Issued ${created.invoiceNumber} ($${created.amount.toLocaleString()}).`
        );
      }
      setIsInvoiceModalOpen(false);
    } catch (err) {
      setFormError(errorText(err, "Could not save the invoice."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    setPayingId(id);
    setActionError(null);
    try {
      const saved = await workspaceApi<Invoice>("/api/invoices", "PATCH", { id, status: "Paid" });
      setInvoices((list) => list.map((i) => (i.id === id ? saved : i)));
      setActionBanner(`Marked ${saved.invoiceNumber} as Paid.`);
    } catch (err) {
      setActionError(errorText(err, "Could not mark the invoice paid."));
    } finally {
      setPayingId(null);
    }
  };

  const handleSendInvoiceEmail = async (inv: Invoice) => {
    setSendingId(inv.id);
    setActionError(null);
    try {
      await workspaceApi<Invoice>("/api/invoices", "PATCH", { id: inv.id, sendInvoiceEmail: true });
      setActionBanner(`Dispatched invoice ${inv.invoiceNumber} email to ${inv.clientName}.`);
    } catch (err) {
      setActionError(errorText(err, "Could not email the invoice."));
    } finally {
      setSendingId(null);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    setActionError(null);
    try {
      await workspaceApi<{ deletedId: string }>(`/api/invoices?id=${encodeURIComponent(id)}`, "DELETE");
      setInvoices((list) => list.filter((i) => i.id !== id));
      setConfirmDeleteId(null);
      if (viewingInvoice?.id === id) setViewingInvoice(null);
      setActionBanner("Invoice deleted.");
    } catch (err) {
      setActionError(errorText(err, "Could not delete the invoice."));
    }
  };

  const copyInvoiceLink = (id: string) => {
    const url = `${window.location.origin}/invoices/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  const paidTotal = invoices.filter((i) => i.status === "Paid").reduce((acc, i) => acc + i.amount, 0);
  const pendingTotal = invoices.filter((i) => i.status !== "Paid").reduce((acc, i) => acc + i.amount, 0);
  const totalBilled = paidTotal + pendingTotal;

  const filteredInvoices = invoices.filter((i) => {
    if (statusFilter === "all") return true;
    return i.status === statusFilter;
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-white font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#262626] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-400">
              Operations OS · Commercial Billing & Invoice Creator
            </span>
          </div>
          <h1 className="font-monument text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 uppercase">
            Accounting & Billing
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Build itemized studio invoices, share printable client statements, and track accounts receivable.
          </p>
        </div>

        <button type="button" onClick={openCreateModal} className={btnPrimary}>
          + Create Itemized Invoice
        </button>
      </div>

      {actionBanner && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/50 rounded-lg flex items-center justify-between text-xs font-mono text-emerald-200">
          <span>{actionBanner}</span>
          <button
            type="button"
            onClick={() => setActionBanner(null)}
            className="text-white hover:underline uppercase font-bold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {load === "error" && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-[#DD7230] bg-[#DD7230]/10 px-4 py-3 text-xs">
          <span>Invoices could not be loaded. Check your connection and try again.</span>
          <button type="button" onClick={loadInvoices} className={btnDark}>
            Retry
          </button>
        </div>
      )}
      {actionError && (
        <p role="alert" className="border border-[#DD7230] bg-[#DD7230]/10 px-4 py-3 text-xs">
          {actionError}
        </p>
      )}

      {/* 3 Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#111111] border border-[#262626] p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-400 block mb-1">Revenue Collected</span>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black text-emerald-400">
              ${paidTotal.toLocaleString()}
            </span>
            <span className="font-mono text-xs text-gray-400 font-bold">
              <Icon name="check" className="mr-1.5 inline h-4 w-4 align-[-0.2em] text-emerald-400" />
              Settled
            </span>
          </div>
        </div>

        <div className="bg-[#111111] border border-[#262626] p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-400 block mb-1">Accounts Receivable</span>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black text-[#FBD227]">
              ${pendingTotal.toLocaleString()}
            </span>
            <span className="font-mono text-xs text-gray-400 font-bold">
              <Icon name="clock" className="mr-1.5 inline h-4 w-4 align-[-0.2em] text-[#FBD227]" />
              Pending
            </span>
          </div>
        </div>

        <div className="bg-[#111111] border border-[#262626] p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-400 block mb-1">Total Studio Billed</span>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black text-white">
              ${totalBilled.toLocaleString()}
            </span>
            <span className="font-mono text-xs text-gray-400 font-bold">{invoices.length} Invoices</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <h3 className="font-monument font-bold text-sm uppercase tracking-wider text-white">
          Master Invoice Ledger
        </h3>
        <div className="flex items-center gap-1.5 font-mono text-xs">
          {["all", "Paid", "Pending", "Overdue"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded font-bold uppercase text-xs transition-colors border ${
                statusFilter === st
                  ? "bg-[#FBD227] text-black border-[#FBD227]"
                  : "bg-[#141414] text-gray-400 border-[#262626] hover:text-white hover:border-[#383838]"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-[#111111] border border-[#262626] rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#262626] font-mono text-xs uppercase text-gray-400 bg-[#161616]">
                <th className="py-3 px-4">Invoice # & Title</th>
                <th className="py-3 px-4">Client / Counterparty</th>
                <th className="py-3 px-4">Amount & Items</th>
                <th className="py-3 px-4">Payment Due</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F1F] text-xs">
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center font-mono text-xs font-bold text-gray-400">
                    {load === "loading"
                      ? "Loading invoices…"
                      : invoices.length === 0
                      ? "No invoices yet. Click '+ Create Itemized Invoice' to build your first one."
                      : "No invoices match this filter."}
                  </td>
                </tr>
              )}
              {filteredInvoices.map((inv) => {
                const count = inv.lineItems?.length || 1;
                return (
                  <tr key={inv.id} className="hover:bg-[#161616] transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-[#FBD227] block">{inv.invoiceNumber}</span>
                      <span className="text-gray-300 text-xs block mt-0.5">
                        {inv.title || "Studio Engagement Invoice"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-white block">{inv.clientName}</span>
                      {inv.clientEmail && (
                        <span className="font-mono text-[11px] text-gray-400 block">{inv.clientEmail}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="font-black text-white block text-sm">
                        ${inv.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {count} {count === 1 ? "line item" : "line items"} · {inv.paymentTerms || "Net 14"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-400 text-[0.75rem]">{inv.dueDate}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[0.65rem] font-mono font-bold border ${
                          inv.status === "Paid"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : inv.status === "Pending"
                            ? "bg-amber-500/20 text-[#FBD227] border-amber-500/30"
                            : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                        }`}
                      >
                        {inv.status}
                      </span>
                      {inv.paidAt && (
                        <span className="text-[0.65rem] font-mono text-emerald-400 block mt-0.5">
                          Paid on {inv.paidAt}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1.5 font-mono text-xs">
                        <button
                          type="button"
                          onClick={() => setViewingInvoice(inv)}
                          className="px-2.5 py-1 bg-[#1A1A1A] border border-[#333333] hover:border-[#FBD227] text-gray-200 rounded transition-colors"
                          title="Preview itemized invoice"
                        >
                          👁 View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(inv)}
                          className="px-2.5 py-1 bg-[#1A1A1A] border border-[#333333] hover:border-white text-gray-300 rounded transition-colors"
                          title="Edit invoice items & terms"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => copyInvoiceLink(inv.id)}
                          className="px-2.5 py-1 bg-black border border-[#333333] hover:border-white text-gray-300 rounded transition-colors"
                          title="Copy client invoice link (/invoices/...)"
                        >
                          {copiedId === inv.id ? "Copied!" : "🔗 Link"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendInvoiceEmail(inv)}
                          disabled={sendingId === inv.id}
                          className="px-2.5 py-1 bg-black border border-[#333333] hover:border-[#FBD227] hover:text-[#FBD227] text-gray-300 rounded transition-colors disabled:opacity-50"
                          title="Email invoice link to client"
                        >
                          {sendingId === inv.id ? "Sending…" : "✉️ Email"}
                        </button>
                        {inv.status !== "Paid" && (
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(inv.id)}
                            disabled={payingId === inv.id}
                            className="px-2.5 py-1 bg-[#FBD227] text-black font-bold rounded hover:bg-white transition-colors disabled:opacity-60"
                          >
                            {payingId === inv.id ? "Saving…" : "✓ Paid"}
                          </button>
                        )}
                        {confirmDeleteId === inv.id ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteInvoice(inv.id)}
                            className="px-2.5 py-1 bg-rose-600 text-white font-bold rounded hover:bg-rose-500 transition-colors"
                          >
                            Confirm
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(inv.id)}
                            className="px-2 py-1 bg-black border border-[#262626] hover:border-rose-500 text-gray-400 hover:text-rose-400 rounded transition-colors"
                            title="Delete invoice"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Itemized Invoice Creator & Editor Modal */}
      <Modal
        open={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title={editingInvoice ? `Edit Invoice · ${editingInvoice.invoiceNumber}` : "Studio Invoice Creator"}
      >
        <form onSubmit={handleSaveInvoice} className="space-y-5 font-mono text-xs text-white max-h-[80vh] overflow-y-auto pr-1">
          {/* Row 1: Client & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="inv-client" className={labelClass}>
                Client Account *
              </label>
              <select
                id="inv-client"
                disabled={Boolean(editingInvoice)}
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                className={fieldClass}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.company}>
                    {c.company} ({c.name})
                  </option>
                ))}
              </select>
              {clients.length === 0 && !editingInvoice && (
                <p className="mt-1 font-sans text-[11px] text-amber-400">
                  {loadingClients ? "Loading clients…" : "No clients yet. Add a client in Clients first."}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="inv-title" className={labelClass}>
                Invoice Title / Project Reference *
              </label>
              <input
                id="inv-title"
                type="text"
                required
                placeholder="e.g., Phase 1 Architecture & Brand System"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          {/* Row 2: Due Date, Payment Terms, Payment Link */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="inv-due" className={labelClass}>
                Payment Due Date *
              </label>
              <input
                id="inv-due"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="inv-terms" className={labelClass}>
                Payment Terms
              </label>
              <select
                id="inv-terms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className={fieldClass}
              >
                <option value="Due on Receipt">Due on Receipt</option>
                <option value="50% Upfront Deposit">50% Upfront Deposit</option>
                <option value="Net 7">Net 7</option>
                <option value="Net 14">Net 14</option>
                <option value="Net 30">Net 30</option>
              </select>
            </div>

            <div>
              <label htmlFor="inv-pay-url" className={labelClass}>
                Stripe / Payment Link (Optional)
              </label>
              <input
                id="inv-pay-url"
                type="url"
                placeholder="https://buy.stripe.com/..."
                value={paymentUrl}
                onChange={(e) => setPaymentUrl(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          {/* Quick-Add Service Presets */}
          <div className="border border-[#262626] bg-[#141414] p-3 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-[#FBD227] font-bold">
                ⚡ Quick-Add Studio Deliverables
              </span>
              <button
                type="button"
                onClick={() => addLineItem()}
                className="px-2.5 py-1 bg-[#222222] hover:bg-[#FBD227] hover:text-black text-white rounded font-bold text-[11px] transition-colors"
              >
                + Blank Item
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SERVICE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => addLineItem(preset)}
                  className="px-2 py-1 bg-black border border-[#2E2E2E] hover:border-[#FBD227] text-gray-300 hover:text-[#FBD227] rounded text-[11px] transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Line Items Builder */}
          <div className="space-y-2">
            <span className={labelClass}>Itemized Deliverables & Charges *</span>
            <div className="space-y-2">
              {lineItems.map((item, idx) => {
                const rowTotal = Math.round((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * 100) / 100;
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center bg-[#0D0D0D] border border-[#262626] p-2.5 rounded-lg"
                  >
                    <div className="col-span-12 sm:col-span-6">
                      <input
                        type="text"
                        required
                        placeholder="Deliverable or milestone description"
                        value={item.description}
                        onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(idx, "quantity", e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                    <div className="col-span-5 sm:col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="Rate ($)"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(idx, "unitPrice", e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1 text-right font-bold text-[#FBD227] truncate">
                      ${rowTotal.toLocaleString()}
                    </div>
                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        disabled={lineItems.length <= 1}
                        className="text-gray-500 hover:text-rose-400 disabled:opacity-30 font-bold px-1"
                        title="Remove line item"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Discount, Tax, and Live Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#262626]">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="inv-discount" className={labelClass}>
                    Discount ($ USD)
                  </label>
                  <input
                    id="inv-discount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="inv-tax" className={labelClass}>
                    Tax Rate (%)
                  </label>
                  <input
                    id="inv-tax"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="inv-notes" className={labelClass}>
                  Payment Instructions / Client Notes
                </label>
                <textarea
                  id="inv-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg p-4 flex flex-col justify-between space-y-2">
              <div className="space-y-1.5">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span className="text-white font-bold">${computedTotals.subtotal.toLocaleString()}</span>
                </div>
                {computedTotals.discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount</span>
                    <span>-${computedTotals.discount.toLocaleString()}</span>
                  </div>
                )}
                {computedTotals.rate > 0 && (
                  <div className="flex justify-between text-gray-400">
                    <span>Tax ({computedTotals.rate}%)</span>
                    <span className="text-white">${computedTotals.tax.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#262626] flex justify-between items-baseline">
                <span className="uppercase font-bold text-gray-300">Total Invoice</span>
                <span className="text-2xl font-black text-[#FBD227]">
                  ${computedTotals.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {!editingInvoice && (
                <label className="pt-2 flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendEmailOnCreate}
                    onChange={(e) => setSendEmailOnCreate(e.target.checked)}
                    className="accent-[#FBD227]"
                  />
                  <span>✉️ Email invoice to client immediately</span>
                </label>
              )}
            </div>
          </div>

          {formError && (
            <p role="alert" className="border border-[#DD7230] bg-[#DD7230]/10 px-3 py-2 font-sans text-xs text-white">
              {formError}
            </p>
          )}

          <div className="pt-3 border-t border-[#262626] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsInvoiceModalOpen(false)}
              disabled={submitting}
              className={btnDark}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={(clients.length === 0 && !editingInvoice) || submitting}
              className={btnPrimary}
            >
              {submitting
                ? "Saving…"
                : editingInvoice
                ? "Save Invoice Changes"
                : `Issue Invoice ($${computedTotals.total.toLocaleString()})`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Itemized Invoice Preview Modal */}
      <Modal
        open={Boolean(viewingInvoice)}
        onClose={() => setViewingInvoice(null)}
        title={viewingInvoice ? `Invoice ${viewingInvoice.invoiceNumber}` : "Invoice Preview"}
      >
        {viewingInvoice && (
          <div className="space-y-5 font-mono text-xs text-white">
            <div className="border border-[#262626] bg-black p-5 rounded-lg space-y-4">
              <div className="flex justify-between items-start border-b border-[#262626] pb-4">
                <div>
                  <span className="text-[#FBD227] font-bold block">{viewingInvoice.invoiceNumber}</span>
                  <h3 className="font-monument text-base font-black uppercase text-white mt-0.5">
                    {viewingInvoice.title || "Studio Engagement Invoice"}
                  </h3>
                  <p className="text-gray-400 mt-1">
                    Billed to: <strong className="text-white">{viewingInvoice.clientName}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-[#FBD227] block">
                    ${viewingInvoice.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Due {viewingInvoice.dueDate} ({viewingInvoice.paymentTerms || "Net 14"})
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] uppercase text-gray-400 font-bold block">Line Items</span>
                {(viewingInvoice.lineItems && viewingInvoice.lineItems.length > 0
                  ? viewingInvoice.lineItems
                  : [
                      {
                        description: viewingInvoice.title || "Studio Engagement Invoice",
                        quantity: 1,
                        unitPrice: viewingInvoice.amount,
                        total: viewingInvoice.amount,
                      },
                    ]
                ).map((li, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1.5 border-b border-[#1A1A1A]">
                    <div>
                      <span className="text-white font-sans font-medium">{li.description}</span>
                      <span className="text-gray-500 ml-2">
                        ({li.quantity} × ${Number(li.unitPrice).toLocaleString()})
                      </span>
                    </div>
                    <span className="font-bold text-white">${Number(li.total).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {viewingInvoice.notes && (
                <div className="pt-2 text-[11px] text-gray-400 whitespace-pre-line">
                  <strong className="text-gray-300 uppercase block mb-0.5">Notes / Payment Terms:</strong>
                  {viewingInvoice.notes}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#262626]">
              <a
                href={`/invoices/${viewingInvoice.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-[#181818] border border-[#333333] hover:border-[#FBD227] text-[#FBD227] font-bold rounded transition-colors"
              >
                ↗ Open Client Printable Page
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyInvoiceLink(viewingInvoice.id)}
                  className={btnDark}
                >
                  {copiedId === viewingInvoice.id ? "Copied!" : "🔗 Copy Link"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const inv = viewingInvoice;
                    setViewingInvoice(null);
                    openEditModal(inv);
                  }}
                  className={btnPrimary}
                >
                  ✏️ Edit Invoice
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
