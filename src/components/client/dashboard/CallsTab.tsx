import React from "react";
import type { ClientPortalData } from "@/lib/clientPortal";
import { Icon } from "@/components/icons/Icon";
import { EmptyState } from "./EmptyState";
import { btnYellow, card, enter, eyebrow, stagger } from "./styles";
import { useClock } from "./clock";
import { dateParts, isHttps } from "./format";

type Booking = ClientPortalData["bookings"][number];

function CallRow({ b, past, index }: { b: Booking; past: boolean; index: number }) {
  const { month, day } = dateParts(b.date);
  return (
    <li className={`${card} flex items-center gap-4 p-4 sm:p-5 ${past ? "opacity-70" : ""} ${enter}`} style={stagger(index)}>
      <div className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center border ${past ? "border-white/20" : "border-[#FBD227]"}`}>
        <span className={`font-sans text-xs font-bold uppercase tracking-[0.14em] ${past ? "text-[#A3A3A3]" : "text-[#FBD227]"}`}>{month}</span>
        <span className="font-monument text-2xl font-bold leading-none text-white">{day}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-sans text-base font-bold text-white">{b.bookingType}</h3>
        <p className="font-sans text-sm text-[#A3A3A3]">
          {b.time} · Host: {b.host}
        </p>
        {b.notes && <p className="mt-1 line-clamp-2 font-sans text-sm text-[#D4D4D4]">{b.notes}</p>}
      </div>
      {!past && isHttps(b.meetingUrl) && (
        <a href={b.meetingUrl} target="_blank" rel="noopener noreferrer" className={`${btnYellow} shrink-0 !min-h-10 !px-4 !py-2`}>
          <Icon name="video" className="h-4 w-4" />
          <span className="hidden sm:inline">Join call</span>
          <span className="sr-only sm:hidden">Join call</span>
        </a>
      )}
    </li>
  );
}

export function CallsTab({ bookings }: { bookings: Booking[] }) {
  const { today } = useClock();
  if (bookings.length === 0) {
    return (
      <EmptyState icon="calendar" title="No calls scheduled">
        Your account lead will send an invite. Confirmed calls show up here with a join link.
      </EmptyState>
    );
  }
  const upcoming = bookings.filter((b) => b.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = bookings.filter((b) => b.date < today).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-8">
      <section aria-label="Upcoming calls">
        <h2 className={`${eyebrow} mb-3`}>Upcoming ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <p className="font-sans text-base text-[#A3A3A3]">No upcoming calls.</p>
        ) : (
          <ul className="space-y-3">{upcoming.map((b, i) => <CallRow key={b.id} b={b} past={false} index={i} />)}</ul>
        )}
      </section>
      {past.length > 0 && (
        <section aria-label="Past calls">
          <h2 className={`${eyebrow} mb-3`}>Past ({past.length})</h2>
          <ul className="space-y-3">{past.map((b, i) => <CallRow key={b.id} b={b} past index={i} />)}</ul>
        </section>
      )}
    </div>
  );
}
