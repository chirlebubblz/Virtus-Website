"use client";

import React, { useEffect, useState } from "react";
import { db, Invoice } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { useClients } from "./useClients";
import { Modal, fieldClass, labelClass, btnPrimary, btnDark } from "./ui";

const inDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

/** Next INV-YYYY-NNN in sequence, so numbers never collide. */
function nextInvoiceNumber(existing: Invoice[]): string {
  const year = new Date().getFullYear();
  const used = existing
    .map((i) => new RegExp(`^INV-${year}-(\\d+)$`).exec(i.invoiceNumber)?.[1])
    .filter((n): n is string => Boolean(n))
    .map(Number);
  return `INV-${year}-${String(Math.max(0, ...used) + 1).padStart(3, "0")}`;
}

export const AccountingView: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>(() => db.getInvoices());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // New Invoice Form
  const [clientCompany, setClientCompany] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [dueDate, setDueDate] = useState(() => inDays(14));

  const { clients, loading: loadingClients } = useClients();
  // Preselect the first client once the list arrives.
  useEffect(() => {
    if (!clientCompany && clients[0]) setClientCompany(clients[0].company);
  }, [clients, clientCompany]);

  const handleIssueInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClient = clients.find((c) => c.company === clientCompany);
    const value = Number(amount);
    if (!selectedClient || !Number.isFinite(value) || value <= 0) return;

    db.addInvoice({
      clientId: selectedClient.id,
      clientName: selectedClient.company,
      invoiceNumber: nextInvoiceNumber(db.getInvoices()),
      amount: value,
      status: "Pending",
      dueDate,
    });

    setInvoices(db.getInvoices());
    setAmount("");
    setIsInvoiceModalOpen(false);
  };

  const handleMarkPaid = (id: string) => {
    db.markInvoicePaid(id);
    setInvoices(db.getInvoices());
  };

  const paidTotal = invoices.filter((i) => i.status === "Paid").reduce((acc, i) => acc + i.amount, 0);
  const pendingTotal = invoices.filter((i) => i.status === "Pending").reduce((acc, i) => acc + i.amount, 0);
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
              Operations OS · Invoicing
            </span>
          </div>
          <h1 className="font-monument text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 uppercase">
            Accounting & Billing
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Invoices, collected revenue and accounts receivable ledger.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsInvoiceModalOpen(true)}
          className={btnPrimary}
        >
          + Issue New Invoice
        </button>
      </div>

      {/* 3 Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#111111] border border-[#262626] p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-400 block mb-1">Revenue Collected</span>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black text-emerald-400">
              ${paidTotal.toLocaleString()}
            </span>
            <span className="font-mono text-xs text-gray-400 font-bold"><Icon name="check" className="mr-1.5 inline h-4 w-4 align-[-0.2em] text-emerald-400" />Settled</span>
          </div>
        </div>

        <div className="bg-[#111111] border border-[#262626] p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-400 block mb-1">Accounts Receivable</span>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black text-[#FBD227]">
              ${pendingTotal.toLocaleString()}
            </span>
            <span className="font-mono text-xs text-gray-400 font-bold"><Icon name="clock" className="mr-1.5 inline h-4 w-4 align-[-0.2em] text-[#FBD227]" />Pending</span>
          </div>
        </div>

        <div className="bg-[#111111] border border-[#262626] p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-400 block mb-1">Total Studio Billed</span>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black text-white">
              ${totalBilled.toLocaleString()}
            </span>
            <span className="font-mono text-xs text-gray-400 font-bold">Total Invoiced</span>
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
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Client / Counterparty</th>
                <th className="py-3 px-4">Invoice Amount</th>
                <th className="py-3 px-4">Payment Due</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F1F] text-xs">
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center font-mono text-xs font-bold text-gray-400">
                    {invoices.length === 0 ? "No invoices yet. Issue your first invoice." : "No invoices match this filter."}
                  </td>
                </tr>
              )}
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-[#161616] transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#FBD227]">{inv.invoiceNumber}</td>
                  <td className="py-3.5 px-4 font-medium text-white">{inv.clientName}</td>
                  <td className="py-3.5 px-4 font-mono font-black text-white">
                    ${inv.amount.toLocaleString()}
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
                    <div className="flex items-center justify-end gap-2 font-mono text-xs">
                      {inv.status === "Pending" && (
                        <button
                          type="button"
                          onClick={() => handleMarkPaid(inv.id)}
                          className="px-2.5 py-1 bg-[#FBD227] text-black font-bold rounded hover:bg-white transition-colors"
                        >
                          Mark Paid <Icon name="check" className="ml-1 inline h-4 w-4 align-[-0.2em]" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Invoice Modal */}
      <Modal open={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} title="Issue client invoice">
        <div>
          <form onSubmit={handleIssueInvoice} className="space-y-4 font-mono text-xs">
            <div>
              <label htmlFor="invoice-field-1" className={labelClass}>
                Client Account
              </label>
              <select id="invoice-field-1"
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
              {clients.length === 0 && (
                <p className="mt-1.5 font-sans text-xs text-gray-400">
                  {loadingClients ? "Loading clients…" : "No clients yet. Add one in Clients first."}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="invoice-field-2" className={labelClass}>
                Invoice Amount ($ USD) *
              </label>
              <input id="invoice-field-2"
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
              <label htmlFor="invoice-field-3" className={labelClass}>
                Payment Due Date *
              </label>
              <input id="invoice-field-3"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="pt-3 border-t border-[#262626] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className={btnDark}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={clients.length === 0}
                className={btnPrimary}
              >
                Issue invoice
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
