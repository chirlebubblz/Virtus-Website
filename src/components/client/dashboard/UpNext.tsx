import React from "react";
import type { ClientPortalData } from "@/lib/clientPortal";
import type { RevisionTicket } from "@/db";
import { Icon, type IconName } from "@/components/icons/Icon";
import { card, eyebrow, focusRing } from "./styles";
import { useClock } from "./clock";
import { dateLabel, invoiceState, money } from "./format";
import type { TabId } from "./Hero";

/** What is coming up: the next call and the next unpaid invoice. Each row jumps to its tab. */
export function UpNext({ data, onNavigate }: { data: ClientPortalData; onNavigate: (tab: TabId) => void }) {
  const { today } = useClock();
  const nextCall = [...data.bookings]
    .filter((b) => b.date >= today && b.status !== "Cancelled" && b.status !== "Canceled")
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const nextInvoice = [...data.invoices]
    .filter((i) => i.status !== "Paid")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

  const rows: { icon: IconName; label: string; title: string; note: string; tab: TabId; tone?: "warn" }[] = [];
  if (nextCall) {
    rows.push({ icon: "calendar", label: "Next call", title: nextCall.bookingType, note: `${dateLabel(nextCall.date)} · ${nextCall.time}`, tab: "calls" });
  }
  if (nextInvoice) {
    const state = invoiceState(nextInvoice.status, nextInvoice.dueDate, today);
    rows.push({
      icon: "file",
      label: state === "overdue" ? "Overdue invoice" : "Next invoice",
      title: `${nextInvoice.invoiceNumber} · ${money(nextInvoice.amount)}`,
      note: `Due ${dateLabel(nextInvoice.dueDate)}`,
      tab: "invoices",
      tone: state === "overdue" ? "warn" : undefined,
    });
  }

  return (
    <section aria-labelledby="upnext-title" className={`${card} p-5 sm:p-6`}>
      <h2 id="upnext-title" className={eyebrow}>
        Up next
      </h2>
      {rows.length === 0 ? (
        <p className="mt-4 font-sans text-base text-[#A3A3A3]">Nothing scheduled or due. We will show it here first.</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/10">
          {rows.map((r) => (
            <li key={r.label}>
              <button
                type="button"
                onClick={() => onNavigate(r.tab)}
                className={`group flex w-full items-center gap-4 py-3 text-left ${focusRing}`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center border ${
                    r.tone === "warn" ? "border-[#DD7230] text-[#DD7230]" : "border-white/20 text-[#FBD227]"
                  }`}
                >
                  <Icon name={r.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block font-sans text-xs font-bold uppercase tracking-[0.14em] ${r.tone === "warn" ? "text-[#DD7230]" : "text-[#A3A3A3]"}`}>
                    {r.label}
                  </span>
                  <span className="block truncate font-sans text-base font-bold text-white">{r.title}</span>
                  <span className="block font-sans text-sm text-[#A3A3A3]">{r.note}</span>
                </span>
                <Icon name="chevron-right" className="h-5 w-5 shrink-0 text-[#A3A3A3] transition-transform group-hover:translate-x-1 group-hover:text-[#FBD227]" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Timeline of the client's change requests, newest first. */
export function Requests({ revisions }: { revisions: RevisionTicket[] }) {
  if (revisions.length === 0) return null;
  return (
    <section aria-labelledby="requests-title" className={`${card} p-5 sm:p-6`}>
      <h2 id="requests-title" className={eyebrow}>
        Your requests
      </h2>
      <ol className="mt-4 space-y-5 border-l border-white/15 pl-5">
        {revisions.map((r) => (
          <li key={r.id} className="relative">
            <span aria-hidden="true" className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 bg-[#FBD227]" />
            <p className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-[#A3A3A3]">
              Round {r.round} · {r.priority} · {dateLabel(r.submittedAt)}
            </p>
            <p className="mt-1 font-sans text-base font-semibold text-white">
              {r.targetArea} · {r.categories.join(", ")}
            </p>
            <p className="mt-1 whitespace-pre-line font-sans text-sm leading-relaxed text-[#D4D4D4]">{r.details}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
