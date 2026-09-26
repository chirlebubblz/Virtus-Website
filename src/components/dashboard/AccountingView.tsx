"use client";

import React, { useEffect, useState } from "react";
import { db, Invoice } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { useClients } from "./useClients";
import { Modal, fieldClass } from "./ui";

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
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-[#000000]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-500">
              Operations OS · Invoicing
            </span>
          </div>
          <h1 className="font-monument text-2xl sm:text-3xl font-black text-[#000000] tracking-tight mt-1 uppercase">
            Accounting & Billing
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Invoices, collected revenue and accounts receivable. Changes here are not saved yet.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsInvoiceModalOpen(true)}
          className="border-2 border-black bg-black text-[#FBD227] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider shadow-xs hover:bg-[#FBD227] hover:text-black transition-colors"
        >
          + Issue New Invoice
        </button>
      </div>

      {/* 4 Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-300 p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-500 block mb-1">Revenue Collected</span>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black text-emerald-600">
              ${paidTotal.toLocaleString()}
            </span>
            <span className="font-mono text-xs text-black font-bold"><Icon name="check" className="mr-1.5 inline h-4 w-4 align-[-0.2em]" />Settled</span>
          </div>
        </div>

        <div className="bg-white border border-gray-300 p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-500 block mb-1">Accounts Receivable</span>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black text-amber-700">
              ${pendingTotal.toLocaleString()}
            </span>
            <span className="font-mono text-xs text-black font-bold"><Icon name="clock" className="mr-1.5 inline h-4 w-4 align-[-0.2em]" />Pending</span>
          </div>
        </div>

        <div className="bg-white border border-gray-300 p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-500 block mb-1">Total Studio Billed</span>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black text-black">
              ${totalBilled.toLocaleString()}
            </span>
          </div>
        </div>

      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <h3 className="font-mono font-bold text-sm uppercase tracking-wider text-black">
          Master Invoice Ledger
        </h3>
        <div className="flex items-center gap-1 font-mono text-xs">
          {["all", "Paid", "Pending", "Overdue"].map((st) => (
            <button
              key={st}
              type="button"
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

      {/* Invoices Table */}
      <div className="bg-white border border-gray-300 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 font-mono text-xs uppercase text-gray-500 bg-gray-50">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Client / Counterparty</th>
                <th className="py-3 px-4">Invoice Amount</th>
                <th className="py-3 px-4">Payment Due</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 px-4 text-center font-mono text-xs font-bold text-gray-700">
                    {invoices.length === 0 ? "No invoices yet. Issue your first invoice." : "No invoices match this filter."}
                  </td>
                </tr>
              )}
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-black">{inv.invoiceNumber}</td>
                  <td className="py-3.5 px-4 font-medium text-gray-800">{inv.clientName}</td>
                  <td className="py-3.5 px-4 font-mono font-black text-black">
                    ${inv.amount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-gray-500 text-[0.75rem]">{inv.dueDate}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[0.65rem] font-mono font-bold ${
                        inv.status === "Paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : inv.status === "Pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {inv.status}
                    </span>
                    {inv.paidAt && (
                      <span className="text-[0.65rem] font-mono text-emerald-700 block mt-0.5">
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
                          className="px-2.5 py-1 bg-[#FBD227] text-black border border-black font-bold rounded hover:bg-black hover:text-[#FBD227] transition-colors"
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
                <label htmlFor="invoice-field-1" className="block text-xs font-bold uppercase text-gray-700 mb-1">
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
                  <p className="mt-1.5 font-sans text-xs text-gray-700">
                    {loadingClients ? "Loading clients…" : "No clients yet. Add one in Clients first."}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="invoice-field-2" className="block text-xs font-bold uppercase text-gray-700 mb-1">
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
                <label htmlFor="invoice-field-3" className="block text-xs font-bold uppercase text-gray-700 mb-1">
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

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded font-bold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={clients.length === 0}
                  className="px-4 py-2 bg-black text-[#FBD227] border-2 border-black font-bold uppercase tracking-wider hover:bg-[#FBD227] hover:text-black transition-colors"
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
