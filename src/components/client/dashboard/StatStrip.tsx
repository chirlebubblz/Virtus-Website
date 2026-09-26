import React from "react";
import type { ClientPortalData } from "@/lib/clientPortal";
import { Container } from "./Container";
import { card, enter, eyebrow, stagger } from "./styles";
import { useClock } from "./clock";
import { dateLabel, dateParts, money } from "./format";

export function StatStrip({ data }: { data: ClientPortalData }) {
  const { project, invoices, bookings } = data;
  const unpaid = invoices.filter((i) => i.status !== "Paid");
  const outstanding = unpaid.reduce((sum, i) => sum + i.amount, 0);
  const { today } = useClock();
  const nextCall = [...bookings]
    .filter((b) => b.date >= today && b.status !== "Cancelled" && b.status !== "Canceled")
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const tiles = [
    { label: "Progress", value: project ? `${project.progress}%` : "—", note: project ? project.phase : "Not started" },
    { label: "Budget", value: project ? money(project.budget) : "—", note: project ? `Target ${dateLabel(project.targetDate)}` : "To be scoped" },
    {
      label: "Outstanding",
      value: money(outstanding),
      note: unpaid.length ? `${unpaid.length} open invoice${unpaid.length === 1 ? "" : "s"}` : "All settled",
    },
    {
      label: "Next call",
      value: nextCall ? `${dateParts(nextCall.date).month} ${dateParts(nextCall.date).day}` : "None",
      note: nextCall ? nextCall.time : "Nothing scheduled",
    },
  ];

  return (
    <Container>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <div key={t.label} className={`${card} p-4 transition-colors hover:border-white/25 sm:p-5 ${enter}`} style={stagger(i + 2)}>
            <dt className={eyebrow}>{t.label}</dt>
            <dd className="mt-2 font-monument text-2xl font-bold text-white sm:text-3xl">{t.value}</dd>
            <dd className="mt-1 truncate font-sans text-sm text-[#A3A3A3]">{t.note}</dd>
          </div>
        ))}
      </dl>
    </Container>
  );
}
