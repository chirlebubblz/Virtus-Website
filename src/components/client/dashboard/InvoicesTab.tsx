import React from "react";
import type { ClientPortalData } from "@/lib/clientPortal";
import { EmptyState } from "./EmptyState";
import { card, enter, eyebrow, stagger } from "./styles";
import { useClock } from "./clock";
import { dateLabel, invoiceState, money, type InvoiceState } from "./format";

const CHIP: Record<InvoiceState, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-white text-black" },
  overdue: { label: "Overdue", cls: "bg-[#DD7230] text-black" },
  soon: { label: "Due soon", cls: "bg-[#FBD227] text-black" },
  pending: { label: "Pending", cls: "border border-white/30 text-white" },
};

export function InvoicesTab({ invoices }: { invoices: ClientPortalData["invoices"] }) {
  const { today } = useClock();
  if (invoices.length === 0) {
    return (
      <EmptyState icon="file" title="No invoices yet">
        Invoices from your account lead will show up here with their status and due date.
      </EmptyState>
    );
  }

  const paid = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
  const open = invoices.filter((i) => i.status !== "Paid").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3">
        {[
          { label: "Paid", value: money(paid) },
          { label: "Outstanding", value: money(open) },
        ].map((t, i) => (
          <div key={t.label} className={`${card} p-4 sm:p-5 ${enter}`} style={stagger(i)}>
            <dt className={eyebrow}>{t.label}</dt>
            <dd className="mt-2 font-monument text-2xl font-bold text-white sm:text-3xl">{t.value}</dd>
          </div>
        ))}
      </dl>

      <ul className="space-y-3">
        {invoices.map((inv, i) => {
          const state = invoiceState(inv.status, inv.dueDate, today);
          return (
            <li
              key={inv.id}
              className={`${card} grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 p-4 transition-colors hover:border-white/25 sm:grid-cols-[1.2fr_1fr_auto_auto] sm:p-5 ${enter}`}
              style={stagger(i + 2)}
            >
              <div>
                <p className="font-sans text-base font-bold text-white">{inv.invoiceNumber}</p>
                <p className="font-sans text-sm text-[#A3A3A3] sm:hidden">
                  {state === "paid" && inv.paidAt ? `Paid ${dateLabel(inv.paidAt)}` : `Due ${dateLabel(inv.dueDate)}`}
                </p>
              </div>
              <p className="hidden font-sans text-sm text-[#A3A3A3] sm:block">
                {state === "paid" && inv.paidAt ? `Paid ${dateLabel(inv.paidAt)}` : `Due ${dateLabel(inv.dueDate)}`}
              </p>
              <span className={`justify-self-end px-2.5 py-1 font-sans text-xs font-bold uppercase tracking-[0.12em] sm:order-none ${CHIP[state].cls}`}>
                {CHIP[state].label}
              </span>
              <p className="col-span-2 font-monument text-xl font-bold text-white sm:col-span-1 sm:text-right sm:text-2xl">{money(inv.amount)}</p>
            </li>
          );
        })}
      </ul>
      {open > 0 && (
        <p className="font-sans text-sm text-[#A3A3A3]">Payment details come from your account lead.</p>
      )}
    </div>
  );
}
