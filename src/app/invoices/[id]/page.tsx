"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Invoice } from "@/db";
import { Logo } from "@/components/public/Logo";

export default function PublicInvoicePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "";

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/invoices/public?id=${encodeURIComponent(id)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok && json.data) {
          setInvoice(json.data);
        } else {
          setError(json.error || "Invoice not found.");
        }
      })
      .catch(() => setError("Unable to load invoice details."))
      .finally(() => setLoading(false));
  }, [id]);

  const lineItems =
    invoice?.lineItems && invoice.lineItems.length > 0
      ? invoice.lineItems
      : invoice
      ? [
          {
            description: invoice.title || "Studio Architecture & Creative Engineering Engagement",
            quantity: 1,
            unitPrice: invoice.subtotal ?? invoice.amount,
            total: invoice.subtotal ?? invoice.amount,
          },
        ]
      : [];

  const subtotal = invoice?.subtotal ?? invoice?.amount ?? 0;
  const discountAmount = invoice?.discountAmount ?? 0;
  const taxRate = invoice?.taxRate ?? 0;
  const taxAmount = invoice?.taxAmount ?? 0;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans flex flex-col print:bg-white print:text-black">
      {/* Top Bar (Hidden on print) */}
      <header className="border-b border-[#222222] bg-[#0D0D0D] px-6 py-4 flex items-center justify-between print:hidden">
        <Link href="/" className="inline-flex items-center gap-3">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-[#161616] border border-[#333333] hover:border-[#FBD227] text-white font-mono text-xs font-bold uppercase rounded transition-colors cursor-pointer"
          >
            🖨 Print / Save PDF
          </button>
          {invoice?.paymentUrl && invoice.status !== "Paid" && (
            <a
              href={invoice.paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#FBD227] text-black hover:bg-white font-mono text-xs font-bold uppercase rounded transition-colors"
            >
              Pay Invoice Now ↗
            </a>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-10 print:py-0 print:px-0">
        {loading && (
          <div className="border border-[#262626] bg-[#111111] rounded-xl p-12 text-center font-mono text-xs text-gray-400">
            Loading invoice statement…
          </div>
        )}

        {!loading && error && (
          <div className="border border-[#DD7230] bg-[#DD7230]/10 rounded-xl p-8 text-center space-y-4">
            <p className="font-mono text-sm font-bold text-white">{error}</p>
            <Link
              href="/"
              className="inline-block px-4 py-2 bg-[#FBD227] text-black font-mono text-xs font-bold uppercase rounded"
            >
              Return Home
            </Link>
          </div>
        )}

        {!loading && invoice && (
          <div className="border border-[#262626] bg-[#111111] rounded-xl overflow-hidden shadow-2xl print:border-gray-300 print:bg-white print:shadow-none">
            {/* Banner Header */}
            <div className="border-b-2 border-[#FBD227] bg-[#141414] p-6 sm:p-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6 print:bg-gray-50 print:border-black">
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-[#FBD227] font-bold block print:text-black">
                  THE VIRTUS LABS · COMMERCIAL BILLING
                </span>
                <h1 className="font-monument text-2xl sm:text-3xl font-black uppercase tracking-tight mt-1 text-white print:text-black">
                  {invoice.title || "Commercial Invoice"}
                </h1>
                <p className="font-mono text-xs text-gray-400 mt-1 print:text-gray-600">
                  Reference: <strong className="text-white print:text-black">{invoice.invoiceNumber}</strong>
                </p>
              </div>

              <div className="sm:text-right flex flex-col sm:items-end gap-2">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded text-xs font-mono font-bold uppercase border ${
                    invoice.status === "Paid"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 print:border-emerald-700 print:text-emerald-800"
                      : invoice.status === "Pending"
                      ? "bg-amber-500/20 text-[#FBD227] border-amber-500/30 print:border-amber-700 print:text-amber-800"
                      : "bg-rose-500/20 text-rose-400 border-rose-500/30 print:border-rose-700 print:text-rose-800"
                  }`}
                >
                  {invoice.status === "Paid" ? "✓ Paid in Full" : invoice.status}
                </span>
                <div className="font-mono text-2xl sm:text-3xl font-black text-[#FBD227] print:text-black">
                  ${invoice.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className="font-mono text-[11px] text-gray-400 print:text-gray-600">
                  {invoice.status === "Paid" && invoice.paidAt
                    ? `Settled on ${invoice.paidAt}`
                    : `Payment Due: ${invoice.dueDate}`}
                </span>
              </div>
            </div>

            {/* Counterparty & Metadata Grid */}
            <div className="p-6 sm:p-10 grid grid-cols-1 sm:grid-cols-3 gap-6 border-b border-[#222222] text-xs font-mono print:border-gray-200">
              <div>
                <span className="text-gray-500 uppercase block mb-1">Issued By</span>
                <strong className="text-white text-sm block print:text-black">The Virtus Labs</strong>
                <span className="text-gray-400 block mt-0.5 print:text-gray-600">hello@thevirtuslabs.com</span>
                <span className="text-gray-400 block print:text-gray-600">thevirtuslabs.com</span>
              </div>

              <div>
                <span className="text-gray-500 uppercase block mb-1">Billed To</span>
                <strong className="text-white text-sm block print:text-black">{invoice.clientName}</strong>
                {invoice.clientEmail && (
                  <span className="text-gray-400 block mt-0.5 print:text-gray-600">{invoice.clientEmail}</span>
                )}
              </div>

              <div className="space-y-1.5 sm:text-right">
                <div>
                  <span className="text-gray-500 uppercase">Issue Date: </span>
                  <strong className="text-white print:text-black">{invoice.createdAt || "Current"}</strong>
                </div>
                <div>
                  <span className="text-gray-500 uppercase">Due Date: </span>
                  <strong className="text-white print:text-black">{invoice.dueDate}</strong>
                </div>
                <div>
                  <span className="text-gray-500 uppercase">Terms: </span>
                  <strong className="text-[#FBD227] print:text-black">{invoice.paymentTerms || "Net 14"}</strong>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="p-6 sm:p-10">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="border-b border-[#262626] text-gray-400 uppercase bg-[#161616] print:bg-gray-100 print:text-black print:border-gray-300">
                      <th className="py-3 px-4">Deliverable / Service Description</th>
                      <th className="py-3 px-4 text-center w-24">Qty</th>
                      <th className="py-3 px-4 text-right w-36">Unit Rate</th>
                      <th className="py-3 px-4 text-right w-36">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F1F1F] print:divide-gray-200">
                    {lineItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-4 px-4 text-white font-sans text-sm font-medium print:text-black">
                          {item.description}
                        </td>
                        <td className="py-4 px-4 text-center text-gray-300 print:text-black">{item.quantity}</td>
                        <td className="py-4 px-4 text-right text-gray-300 print:text-black">
                          ${Number(item.unitPrice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-white print:text-black">
                          ${Number(item.total).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Breakdown */}
              <div className="mt-6 pt-6 border-t border-[#262626] flex flex-col sm:flex-row justify-between gap-6 print:border-gray-300">
                <div className="max-w-md space-y-2 text-xs">
                  <span className="font-mono uppercase text-gray-400 font-bold block print:text-black">
                    Payment Instructions & Notes
                  </span>
                  <p className="text-gray-300 whitespace-pre-line leading-relaxed print:text-gray-700">
                    {invoice.notes ||
                      "Please remit payment by the due date listed above via ACH, wire transfer, or the secure payment link. Include your invoice number as the payment reference."}
                  </p>
                </div>

                <div className="w-full sm:w-72 space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-gray-400 print:text-gray-700">
                    <span>Subtotal</span>
                    <span className="text-white font-bold print:text-black">
                      ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400 print:text-emerald-700">
                      <span>Discount</span>
                      <span>
                        -${discountAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {taxRate > 0 && (
                    <div className="flex justify-between text-gray-400 print:text-gray-700">
                      <span>Tax ({taxRate}%)</span>
                      <span className="text-white print:text-black">
                        ${taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-[#262626] flex justify-between items-baseline text-sm print:border-gray-300">
                    <span className="font-bold uppercase text-white print:text-black">Total Due</span>
                    <span className="text-xl font-black text-[#FBD227] print:text-black">
                      ${invoice.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action CTA for online payment */}
              {invoice.paymentUrl && invoice.status !== "Paid" && (
                <div className="mt-8 pt-6 border-t border-[#222222] flex flex-wrap items-center justify-between gap-4 print:hidden">
                  <span className="text-xs text-gray-400 font-mono">
                    Settle securely online via card or bank transfer:
                  </span>
                  <a
                    href={invoice.paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-[#FBD227] text-black font-mono text-xs font-black uppercase rounded hover:bg-white transition-colors"
                  >
                    Pay ${invoice.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Now ↗
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[#222222] bg-[#0D0D0D] px-6 sm:px-10 py-4 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-gray-500 print:bg-gray-50 print:border-gray-200">
              <span>The Virtus Labs · Architectural Digital Systems & Brand Engineering</span>
              <span>Questions? Contact hello@thevirtuslabs.com</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
