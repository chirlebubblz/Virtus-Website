"use client";

// Virtus Studio Calendar Engine v2.1 - Multi-Timezone & CST Window Support
import React, { useState, useEffect, useMemo } from "react";
import { Icon } from "@/components/icons/Icon";
import { SectionHeader } from "./SectionHeader";
import { useLeadForm } from "./useLeadForm";
import { Field, Honeypot } from "./ui";
import { AcceleratedSprintUpsell, UpsellItem } from "./AcceleratedSprintUpsell";
import { parseWindow, formatWindow } from "@/lib/scheduling";

export interface SlotDef {
  slot: string; // Stored Studio window (Asia/Manila, UTC+8)
  region: "americas" | "apac" | "emea";
  label: string;
}

export const ALL_TIME_SLOTS: SlotDef[] = [
  // Americas / US Day Window (Manila Late Night/Early Morning: UTC+8)
  // Perfectly covers 10:00 AM - 3:00 PM CST/CDT
  { slot: "11:00 PM - 11:30 PM", region: "americas", label: "Americas Morning (10:00 AM CDT)" },
  { slot: "12:00 AM - 12:30 AM", region: "americas", label: "Americas Midday (11:00 AM CDT / 10:00 AM CST)" },
  { slot: "01:00 AM - 01:30 AM", region: "americas", label: "Americas Midday (12:00 PM CDT / 11:00 AM CST)" },
  { slot: "02:00 AM - 02:30 AM", region: "americas", label: "Americas Afternoon (1:00 PM CDT / 12:00 PM CST)" },
  { slot: "03:00 AM - 03:30 AM", region: "americas", label: "Americas Afternoon (2:00 PM CDT / 1:00 PM CST)" },
  { slot: "04:00 AM - 04:30 AM", region: "americas", label: "Americas Afternoon (3:00 PM CDT / 2:00 PM CST)" },

  // Asia-Pacific / Studio Day Window
  { slot: "09:00 AM - 09:30 AM", region: "apac", label: "Asia Morning" },
  { slot: "10:00 AM - 10:30 AM", region: "apac", label: "Asia Morning" },
  { slot: "11:30 AM - 12:00 PM", region: "apac", label: "Asia Midday" },
  { slot: "01:30 PM - 02:00 PM", region: "apac", label: "Asia Afternoon" },
  { slot: "02:30 PM - 03:00 PM", region: "apac", label: "Asia Afternoon" },

  // Europe & Middle East Window
  { slot: "03:30 PM - 04:00 PM", region: "emea", label: "Europe Morning" },
  { slot: "05:00 PM - 05:30 PM", region: "emea", label: "Europe Midday" },
  { slot: "06:30 PM - 07:00 PM", region: "emea", label: "Europe Afternoon" },
  { slot: "08:00 PM - 08:30 PM", region: "emea", label: "Europe Evening" },
  { slot: "09:30 PM - 10:00 PM", region: "emea", label: "Europe Late" },
];

const TIMEZONE_OPTIONS = [
  { id: "America/Chicago", label: "US Central (CST / CDT · Chicago, Dallas)" },
  { id: "America/New_York", label: "US Eastern (EST / EDT · New York, Miami)" },
  { id: "America/Denver", label: "US Mountain (MST / MDT · Denver)" },
  { id: "America/Los_Angeles", label: "US Pacific (PST / PDT · LA, SF)" },
  { id: "Europe/London", label: "United Kingdom (GMT / BST · London)" },
  { id: "Europe/Paris", label: "Central Europe (CET / CEST · Paris, Berlin)" },
  { id: "Asia/Dubai", label: "Gulf Standard (GST · Dubai)" },
  { id: "Asia/Singapore", label: "Singapore / HK (SGT / HKT)" },
  { id: "Asia/Tokyo", label: "Japan (JST · Tokyo)" },
  { id: "Australia/Sydney", label: "Australia (AEST / AEDT · Sydney)" },
  { id: "Asia/Manila", label: "Studio Time (PHT · Manila GMT+8)" },
];

const formatDateKey = (d: Date): string => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Convert a studio slot (Asia/Manila UTC+8) to the visitor's local target timezone. */
function convertSlotToTz(
  dateIso: string,
  studioSlot: string,
  targetTz: string
): { displayTime: string; displayDate: string; isDifferentDay: boolean } {
  try {
    const parsed = parseWindow(studioSlot);
    if (!parsed || !dateIso) return { displayTime: studioSlot, displayDate: dateIso, isDifferentDay: false };

    const [year, month, day] = dateIso.split("-").map(Number);
    const startHour = Math.floor(parsed.start / 60);
    const startMin = parsed.start % 60;
    const endHour = Math.floor(parsed.end / 60);
    const endMin = parsed.end % 60;

    // Manila is UTC+8
    const startUtcMs = Date.UTC(year, month - 1, day, startHour - 8, startMin);
    const endUtcMs = Date.UTC(year, month - 1, day, endHour - 8, endMin);

    const startDate = new Date(startUtcMs);
    const endDate = new Date(endUtcMs);

    const timeFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: targetTz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const dateFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: targetTz,
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    const localStart = timeFmt.format(startDate);
    const localEnd = timeFmt.format(endDate);
    const localDate = dateFmt.format(startDate);

    const studioDateFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const studioDate = studioDateFmt.format(startDate);

    return {
      displayTime: `${localStart} - ${localEnd}`,
      displayDate: localDate,
      isDifferentDay: localDate !== studioDate,
    };
  } catch {
    return { displayTime: studioSlot, displayDate: dateIso, isDifferentDay: false };
  }
}

/** Convert a local time (e.g. 11:00 in America/Chicago) back to Manila Studio Window string and Date */
function localTimeToStudio(
  dateIso: string,
  time24: string,
  localTz: string
): { studioDate: string; studioSlot: string } | null {
  try {
    const [year, month, day] = dateIso.split("-").map(Number);
    const [h, m] = time24.split(":").map(Number);

    const testDate = new Date(Date.UTC(year, month - 1, day, h, m));
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: localTz,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(testDate);

    const getP = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const lY = getP("year");
    const lM = getP("month");
    const lD = getP("day");
    let lH = getP("hour");
    if (lH === 24) lH = 0;
    const lMin = getP("minute");

    const localMs = Date.UTC(lY, lM - 1, lD, lH, lMin);
    const diff = testDate.getTime() - localMs;
    const exactUtc = new Date(testDate.getTime() + diff);

    // Format in Asia/Manila
    const manilaParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(exactUtc);

    const getM = (type: string) => Number(manilaParts.find((p) => p.type === type)?.value);
    const mYear = getM("year");
    const mMonth = String(getM("month")).padStart(2, "0");
    const mDay = String(getM("day")).padStart(2, "0");
    let mHour = getM("hour");
    if (mHour === 24) mHour = 0;
    const mMin = getM("minute");

    const studioDate = `${mYear}-${mMonth}-${mDay}`;
    const studioStartMinutes = mHour * 60 + mMin;
    const studioSlot = formatWindow(studioStartMinutes, 30);

    return { studioDate, studioSlot };
  } catch {
    return null;
  }
}

export interface LeadCaptureProps {
  eyebrow?: string;
  title?: string;
  intro?: string;
  defaultTab?: "calendar" | "message";
}

export const LeadCapture: React.FC<LeadCaptureProps> = ({
  eyebrow = "Direct Studio Access",
  title = "Let’s Build What’s Next",
  intro = "Schedule a 1-on-1 strategy session with a studio director, or leave our team a project note below.",
  defaultTab = "calendar",
}) => {
  // Tab Mode: 'calendar' or 'message'
  const [activeTab, setActiveTab] = useState<"calendar" | "message">(defaultTab);

  // Timezone & Filtering
  const [selectedTz, setSelectedTz] = useState<string>("Asia/Manila");
  const [regionFilter, setRegionFilter] = useState<"americas" | "apac" | "emea" | "all" | "custom">("americas");

  // Custom Time Selection state
  const [customLocalTime, setCustomLocalTime] = useState<string>("11:00");
  const [customTimeConfirmed, setCustomTimeConfirmed] = useState(false);

  // Lead Form (Send a Message)
  const [msgName, setMsgName] = useState("");
  const [msgEmail, setMsgEmail] = useState("");
  const [msgText, setMsgText] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const { status: msgStatus, errors: msgErrors, formError: msgFormError, submit: submitMsg } = useLeadForm();

  // Booking Form State
  const availableDates = useMemo(() => {
    const days: Date[] = [];
    const curr = new Date();
    // Start tomorrow to avoid past-hour bookings today
    curr.setDate(curr.getDate() + 1);
    while (days.length < 14) {
      if (curr.getDay() !== 0) {
        days.push(new Date(curr));
      }
      curr.setDate(curr.getDate() + 1);
    }
    return days;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(
    availableDates[0] ? formatDateKey(availableDates[0]) : ""
  );
  const [selectedTime, setSelectedTime] = useState<string>(ALL_TIME_SLOTS[1].slot); // "12:00 AM - 12:30 AM" (11am CDT)
  const [bookName, setBookName] = useState("");
  const [bookEmail, setBookEmail] = useState("");
  const [bookPhone, setBookPhone] = useState("");
  const [bookCompany, setBookCompany] = useState("");
  const [bookNotes, setBookNotes] = useState("");
  const [reservedSlots, setReservedSlots] = useState<Array<{ date: string; time: string }>>([]);

  const [bookingStatus, setBookingStatus] = useState<"idle" | "submitting" | "upsell" | "confirmed" | "error">("idle");
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<{
    id: string;
    opportunityId: string;
    dealValue: number;
    meetingUrl: string;
    acceptedAddOns?: UpsellItem[];
    localTimeDisplay?: string;
    timezone?: string;
    googleCalendarUrl?: string;
    outlookCalendarUrl?: string;
  } | null>(null);

  // Auto-detect visitor timezone on mount
  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        setSelectedTz(detected);
        if (detected.includes("America") || detected.includes("US")) {
          setRegionFilter("americas");
        } else if (detected.includes("Europe") || detected.includes("London") || detected.includes("Paris")) {
          setRegionFilter("emea");
        } else {
          setRegionFilter("apac");
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  // Fetch reserved slots on mount
  useEffect(() => {
    fetch("/api/bookings")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.reservedSlots)) {
          setReservedSlots(data.reservedSlots);
        }
      })
      .catch(() => {
        // Soft fail
      });
  }, []);

  const isSlotReserved = (date: string, time: string) => {
    return reservedSlots.some((slot) => slot.date === date && slot.time === time);
  };

  // Filter slots by active region
  const filteredSlots = useMemo(() => {
    if (regionFilter === "all") return ALL_TIME_SLOTS;
    if (regionFilter === "custom") return [];
    return ALL_TIME_SLOTS.filter((s) => s.region === regionFilter);
  }, [regionFilter]);

  // Handle custom time application
  const handleApplyCustomTime = () => {
    const converted = localTimeToStudio(selectedDate, customLocalTime, selectedTz);
    if (!converted) {
      setBookingError("Could not convert custom time. Please select a preset slot.");
      return;
    }
    if (isSlotReserved(converted.studioDate, converted.studioSlot)) {
      setBookingError("That exact custom slot is already booked. Please choose another time.");
      return;
    }
    setSelectedTime(converted.studioSlot);
    setCustomTimeConfirmed(true);
    setBookingError(null);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookName.trim() || !bookEmail.trim()) {
      setBookingError("Please provide your name and email.");
      return;
    }

    setBookingStatus("submitting");
    setBookingError(null);

    // If custom time mode and not yet confirmed, apply it
    let targetDate = selectedDate;
    let targetSlot = selectedTime;
    if (regionFilter === "custom") {
      const converted = localTimeToStudio(selectedDate, customLocalTime, selectedTz);
      if (converted) {
        targetDate = converted.studioDate;
        targetSlot = converted.studioSlot;
      }
    }

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: bookName,
          email: bookEmail,
          phone: bookPhone,
          company: bookCompany,
          date: targetDate,
          time: targetSlot,
          service: "Discovery Strategy Session (30 min)",
          notes: bookNotes ? `${bookNotes}\n[Client Timezone: ${selectedTz}]` : `[Client Timezone: ${selectedTz}]`,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Unable to reserve your discovery slot. Please try another time.");
      }

      const localDetails = convertSlotToTz(targetDate, targetSlot, selectedTz);

      setConfirmedBooking({
        id: data.booking.id,
        opportunityId: data.opportunityId,
        dealValue: data.dealValue,
        meetingUrl: data.meetingUrl,
        localTimeDisplay: `${localDetails.displayDate} · ${localDetails.displayTime}`,
        timezone: selectedTz,
        googleCalendarUrl: data.googleCalendarUrl,
        outlookCalendarUrl: data.outlookCalendarUrl,
      });

      // Transition immediately to the Accelerated Sprint Upsell!
      setBookingStatus("upsell");
    } catch (err: unknown) {
      const e = err as Error;
      setBookingError(e.message || "Network error. Please try again.");
      setBookingStatus("error");
    }
  };

  const handleUpsellFinished = (updatedDealValue: number, acceptedAddOns: UpsellItem[]) => {
    if (confirmedBooking) {
      setConfirmedBooking({
        ...confirmedBooking,
        dealValue: updatedDealValue,
        acceptedAddOns,
      });
    }
    setBookingStatus("confirmed");
  };

  const handleUpsellSkip = () => {
    setBookingStatus("confirmed");
  };

  // Ensure selected timezone is in dropdown options
  const timezoneList = useMemo(() => {
    if (TIMEZONE_OPTIONS.some((t) => t.id === selectedTz)) return TIMEZONE_OPTIONS;
    return [{ id: selectedTz, label: `Local (${selectedTz})` }, ...TIMEZONE_OPTIONS];
  }, [selectedTz]);

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="relative scroll-mt-16 overflow-hidden bg-[#060606] py-16 text-white sm:py-24 border-t border-white/10"
    >
      {/* Ambient background glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F5C518]/[0.025] blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[96rem] 2xl:max-w-[104rem] px-5 sm:px-8 lg:px-10 2xl:px-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-white/10 pb-8">
          <div>
            <SectionHeader
              tone="dark"
              eyebrow={eyebrow}
              title={title}
              titleId="contact-title"
              intro={intro}
            />
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 self-start md:self-end bg-white/[0.04] p-1.5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab("calendar")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-sans font-bold uppercase tracking-wider transition-all ${
                activeTab === "calendar"
                  ? "bg-[#F5C518] text-black font-extrabold shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              <Icon name="calendar" className="h-4 w-4" />
              Schedule Strategy Session
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("message")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-sans font-bold uppercase tracking-wider transition-all ${
                activeTab === "message"
                  ? "bg-[#F5C518] text-black font-extrabold shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              <Icon name="arrow-right" className="h-4 w-4" />
              Send a Note
            </button>
          </div>
        </div>

        {/* TAB 1: CALENDAR BOOKING SYSTEM */}
        {activeTab === "calendar" && (
          <div>
            {bookingStatus === "upsell" && confirmedBooking && (
              <div className="max-w-4xl mx-auto">
                <AcceleratedSprintUpsell
                  opportunityId={confirmedBooking.opportunityId}
                  initialDealValue={confirmedBooking.dealValue}
                  clientName={bookName}
                  company={bookCompany || `${bookName}'s Project`}
                  clientEmail={bookEmail}
                  onFinished={handleUpsellFinished}
                  onSkip={handleUpsellSkip}
                />
              </div>
            )}

            {bookingStatus === "confirmed" && confirmedBooking && (
              <div className="max-w-3xl mx-auto rounded-2xl border border-white/15 bg-[#0E0E0E] p-8 shadow-2xl text-white">
                <div className="flex items-center gap-3 text-emerald-400 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    <Icon name="check" className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-monument text-2xl font-black uppercase tracking-tight text-white">
                      Discovery Call Confirmed!
                    </h3>
                    <p className="text-xs font-mono text-zinc-400">
                      Booking ID: {confirmedBooking.id}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-zinc-300 leading-relaxed">
                  Your strategy session with <strong className="text-white">The Virtus Labs</strong> is locked in. We have dispatched an automated confirmation email with calendar invites to <strong className="text-white">{bookEmail}</strong>.
                </p>

                <div className="my-6 rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                    <div>
                      <span className="text-zinc-400 uppercase tracking-wider block">Your Local Time</span>
                      <strong className="text-sm text-white">
                        {confirmedBooking.localTimeDisplay || `${selectedDate} · ${selectedTime}`}
                      </strong>
                      <span className="text-[10px] text-zinc-400 block">({confirmedBooking.timezone})</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 uppercase tracking-wider block">Studio Host</span>
                      <strong className="text-sm text-white">Paks (Studio Director)</strong>
                      <span className="text-[10px] text-zinc-400 block">Asia/Manila (PHT GMT+8)</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 uppercase tracking-wider block">Target Entity</span>
                      <strong className="text-sm text-white">{bookCompany || bookName}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-400 uppercase tracking-wider block">Estimated Project Scope</span>
                      <strong className="text-sm text-[#F5C518] font-bold">${confirmedBooking.dealValue.toLocaleString()}</strong>
                    </div>
                  </div>

                  {confirmedBooking.acceptedAddOns && confirmedBooking.acceptedAddOns.length > 0 && (
                    <div className="border-t border-white/10 pt-3">
                      <span className="text-zinc-400 text-xs uppercase tracking-wider block mb-1">
                        Active Accelerated Sprints:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {confirmedBooking.acceptedAddOns.map((addon) => (
                          <span
                            key={addon.id}
                            className="inline-flex items-center gap-1.5 rounded bg-[#F5C518]/10 border border-[#F5C518]/30 px-2.5 py-1 text-xs font-bold text-[#F5C518]"
                          >
                            <Icon name="bolt" className="h-3 w-3 text-[#F5C518] shrink-0" />
                            <span>{addon.title} (+${addon.price.toLocaleString()})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-white/10 pt-3">
                    <span className="text-zinc-400 text-xs uppercase tracking-wider block mb-1">
                      Direct Meeting Link:
                    </span>
                    <a
                      href={confirmedBooking.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 font-mono text-sm font-bold text-[#F5C518] hover:underline"
                    >
                      {confirmedBooking.meetingUrl}
                      <Icon name="arrow-right" className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  {/* 1-Click Calendar Integrations: Google Calendar, Outlook, Apple Calendar (.ics) */}
                  <div className="border-t border-neutral-200 pt-4">
                    <span className="text-neutral-600 text-xs font-bold uppercase tracking-wider block mb-2 font-mono">
                      📅 Add to Your Calendar:
                    </span>
                    <div className="flex flex-wrap items-center gap-2.5">
                      {confirmedBooking.googleCalendarUrl && (
                        <a
                          href={confirmedBooking.googleCalendarUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-xs font-sans font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all shadow-sm"
                        >
                          <Icon name="calendar" className="h-4 w-4 text-[#FBD227]" />
                          Google Calendar
                        </a>
                      )}
                      {confirmedBooking.outlookCalendarUrl && (
                        <a
                          href={confirmedBooking.outlookCalendarUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-neutral-100 border border-neutral-300 px-4 py-2.5 text-xs font-sans font-bold uppercase tracking-wider text-neutral-800 hover:bg-neutral-200 transition-all"
                        >
                          <Icon name="calendar" className="h-4 w-4 text-blue-600" />
                          Outlook Calendar
                        </a>
                      )}
                      <a
                        href={`/api/bookings/ics?id=${encodeURIComponent(confirmedBooking.id)}`}
                        download={`virtus-strategy-session-${confirmedBooking.id}.ics`}
                        className="inline-flex items-center gap-2 rounded-lg bg-neutral-100 border border-neutral-300 px-4 py-2.5 text-xs font-sans font-bold uppercase tracking-wider text-neutral-800 hover:bg-neutral-200 transition-all"
                      >
                        <Icon name="download" className="h-4 w-4 text-emerald-600" />
                        Apple Calendar / iCal (.ics)
                      </a>
                    </div>
                    <p className="mt-2 text-[11px] font-mono text-neutral-500">
                      An interactive calendar invite has also been dispatched to your email.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setBookingStatus("idle");
                      setBookName("");
                      setBookEmail("");
                      setBookPhone("");
                      setBookCompany("");
                      setBookNotes("");
                    }}
                    className="border border-white/20 bg-white/[0.06] px-6 py-2.5 font-sans text-xs font-bold uppercase tracking-wider text-white hover:bg-white/[0.12] transition-all rounded-lg"
                  >
                    Schedule Another Session
                  </button>
                </div>
              </div>
            )}

            {(bookingStatus === "idle" || bookingStatus === "submitting" || bookingStatus === "error") && (
              <form onSubmit={handleBookingSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Date & Time Picker (7 cols) */}
                <div className="lg:col-span-7 bg-[#0E0E0E] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F5C518] text-black text-xs font-bold">1</span>
                    <h3 className="font-monument text-lg font-bold uppercase tracking-tight text-white">
                      Select Date & Time
                    </h3>
                  </div>

                  {/* Date Strip */}
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Available Dates (Next 2 Weeks)
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 mb-6">
                    {availableDates.map((dateObj) => {
                      const dateKey = formatDateKey(dateObj);
                      const isSelected = selectedDate === dateKey;
                      const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
                      const monthDay = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

                      return (
                        <button
                          key={dateKey}
                          type="button"
                          onClick={() => setSelectedDate(dateKey)}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center select-none ${
                            isSelected
                              ? "border-[#F5C518] bg-[#F5C518] text-black shadow-[0_0_15px_rgba(245,197,24,0.3)] scale-[1.03]"
                              : "border-white/10 bg-white/[0.03] text-zinc-200 hover:border-white/30 hover:bg-white/[0.06]"
                          }`}
                        >
                          <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? "text-black" : "text-zinc-400"}`}>
                            {dayName}
                          </span>
                          <span className="font-mono text-xs font-black mt-0.5">
                            {monthDay}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Timezone Switcher */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4 bg-white/[0.03] p-2.5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-300">
                      <Icon name="clock" className="h-3.5 w-3.5 text-[#F5C518] shrink-0" />
                      <span>Timezone:</span>
                    </div>
                    <select
                      value={selectedTz}
                      onChange={(e) => setSelectedTz(e.target.value)}
                      className="text-xs font-mono font-semibold bg-black/80 border border-white/15 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-[#F5C518] cursor-pointer max-w-full"
                    >
                      {timezoneList.map((opt) => (
                        <option key={opt.id} value={opt.id} className="bg-neutral-900 text-white">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Region Window Filter Tabs */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    <button
                      type="button"
                      onClick={() => setRegionFilter("americas")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider transition-all ${
                        regionFilter === "americas"
                          ? "bg-[#F5C518] text-black font-extrabold shadow"
                          : "bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
                      }`}
                    >
                      Americas (CST/EST/PST)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegionFilter("apac")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider transition-all ${
                        regionFilter === "apac"
                          ? "bg-[#F5C518] text-black font-extrabold shadow"
                          : "bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
                      }`}
                    >
                      Asia & Australia
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegionFilter("emea")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider transition-all ${
                        regionFilter === "emea"
                          ? "bg-[#F5C518] text-black font-extrabold shadow"
                          : "bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
                      }`}
                    >
                      Europe & Mid-East
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegionFilter("all")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider transition-all ${
                        regionFilter === "all"
                          ? "bg-[#F5C518] text-black font-extrabold shadow"
                          : "bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
                      }`}
                    >
                      All 24h Slots
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegionFilter("custom")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                        regionFilter === "custom"
                          ? "bg-[#F5C518] text-black font-extrabold shadow"
                          : "bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
                      }`}
                    >
                      <Icon name="clock" className="h-3 w-3" />
                      <span>Custom Time</span>
                    </button>
                  </div>

                  {/* PRESET TIME SLOTS */}
                  {regionFilter !== "custom" && (
                    <div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                        {filteredSlots.map((item) => {
                          const slot = item.slot;
                          const reserved = isSlotReserved(selectedDate, slot);
                          const isSelected = selectedTime === slot;
                          const converted = convertSlotToTz(selectedDate, slot, selectedTz);

                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={reserved}
                              onClick={() => {
                                setSelectedTime(slot);
                                setCustomTimeConfirmed(false);
                              }}
                              className={`flex flex-col text-left p-3 rounded-xl border transition-all font-mono ${
                                reserved
                                  ? "border-zinc-800/80 bg-zinc-900/60 text-zinc-600 cursor-not-allowed line-through"
                                  : isSelected
                                  ? "border-[#F5C518] bg-[#F5C518] text-black shadow-md ring-1 ring-[#F5C518]"
                                  : "border-white/10 bg-white/[0.025] text-zinc-200 hover:border-[#F5C518]/60 hover:bg-[#F5C518]/10 hover:text-white"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className={`text-xs font-black ${isSelected ? "text-black" : "text-white"}`}>
                                  {converted.displayTime}
                                </span>
                                <span className={`text-[9px] font-sans uppercase font-bold px-1.5 py-0.5 rounded ${
                                  reserved
                                    ? "bg-zinc-800 text-zinc-400"
                                    : isSelected
                                    ? "bg-black text-[#F5C518]"
                                    : "bg-white/10 text-zinc-300"
                                }`}>
                                  {reserved ? "Booked" : isSelected ? "Selected" : "Open"}
                                </span>
                              </div>

                              <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
                                <span>Studio: {slot}</span>
                                {converted.isDifferentDay && (
                                  <span className="text-[#F5C518] font-bold">({converted.displayDate})</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* CUSTOM TIME PICKER */}
                  {regionFilter === "custom" && (
                    <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                        <Icon name="clock" className="h-4 w-4 text-[#F5C518]" />
                        <span className="font-mono text-xs font-bold uppercase text-white">
                          Pick Any Specific Start Time
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Choose your preferred time in your selected timezone (<strong>{selectedTz}</strong>). We&apos;ll automatically verify availability with studio directors.
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <input
                          type="time"
                          value={customLocalTime}
                          onChange={(e) => {
                            setCustomLocalTime(e.target.value);
                            setCustomTimeConfirmed(false);
                          }}
                          className="px-3 py-2 border border-white/20 rounded-lg font-mono text-sm bg-black text-white focus:outline-none focus:border-[#F5C518]"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCustomTime}
                          className="px-4 py-2 bg-[#F5C518] text-black font-mono text-xs font-bold uppercase rounded-lg hover:bg-[#ffd026] transition-colors"
                        >
                          Lock In This Time
                        </button>
                      </div>

                      {customTimeConfirmed && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-400 flex items-center gap-2">
                          <Icon name="check" className="h-4 w-4 text-emerald-400" />
                          <span>Custom slot active: <strong>{customLocalTime}</strong> ({selectedTz}) ➔ Studio slot {selectedTime}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-6 flex items-center gap-2 text-xs text-zinc-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Real-time availability synced with Studio Director calendar</span>
                  </div>
                </div>

                {/* Right Column: Contact Details (5 cols) */}
                <div className="lg:col-span-5 bg-[#0E0E0E] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F5C518] text-black text-xs font-bold">2</span>
                    <h3 className="font-monument text-lg font-bold uppercase tracking-tight text-white">
                      Your Details
                    </h3>
                  </div>

                  {bookingError && (
                    <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300 font-bold">
                      {bookingError}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={bookName}
                        onChange={(e) => setBookName(e.target.value)}
                        placeholder="e.g. Alex Vance"
                        className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-2.5 text-sm font-sans text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#F5C518] focus:ring-1 focus:ring-[#F5C518]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Business Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={bookEmail}
                        onChange={(e) => setBookEmail(e.target.value)}
                        placeholder="alex@company.com"
                        className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-2.5 text-sm font-sans text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#F5C518] focus:ring-1 focus:ring-[#F5C518]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
                          Company / Project
                        </label>
                        <input
                          type="text"
                          value={bookCompany}
                          onChange={(e) => setBookCompany(e.target.value)}
                          placeholder="e.g. Nova Audio"
                          className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-2.5 text-sm font-sans text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#F5C518] focus:ring-1 focus:ring-[#F5C518]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
                          Phone (WhatsApp/SMS)
                        </label>
                        <input
                          type="tel"
                          value={bookPhone}
                          onChange={(e) => setBookPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                          className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-2.5 text-sm font-sans text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#F5C518] focus:ring-1 focus:ring-[#F5C518]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Current Bottleneck / Goals (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={bookNotes}
                        onChange={(e) => setBookNotes(e.target.value)}
                        placeholder="Tell us about what you'd like to build or scope..."
                        className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-2.5 text-sm font-sans text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#F5C518] focus:ring-1 focus:ring-[#F5C518]"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={bookingStatus === "submitting"}
                        className="group w-full min-h-14 inline-flex items-center justify-center gap-3 rounded-lg bg-[#F5C518] py-4 font-sans text-xs font-extrabold uppercase tracking-[0.16em] text-black shadow-[0_0_25px_rgba(245,197,24,0.2)] hover:bg-[#ffd026] hover:shadow-[0_0_35px_rgba(245,197,24,0.4)] transition-all disabled:opacity-60 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518]"
                      >
                        <Icon name="calendar" className="h-4 w-4" />
                        <span>{bookingStatus === "submitting" ? "Reserving Slot..." : "Lock In Strategy Session"}</span>
                      </button>
                    </div>

                    <p className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 text-center">
                      <Icon name="lock" className="h-3 w-3 text-zinc-400 shrink-0" />
                      <span>No payment required for strategy session. Instant email confirmation sent with Zoom room link.</span>
                    </p>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: SEND A NOTE (CLASSIC MESSAGE FORM) */}
        {activeTab === "message" && (
          <div className="grid w-full max-w-[96rem] 2xl:max-w-[104rem] gap-10 lg:grid-cols-[1fr_30rem] 2xl:grid-cols-[1fr_34rem] lg:gap-16 2xl:gap-24">
            <div className="self-center">
              <h3 className="font-monument text-2xl font-bold uppercase text-white mb-3">
                Send a Direct Project Note
              </h3>
              <p className="text-sm text-zinc-400 max-w-md leading-relaxed">
                Prefer an async exchange? Fill out this brief note and our pod lead will review your objectives and reply via email within 24 hours.
              </p>
            </div>

            {msgStatus === "sent" ? (
              <div role="status" className="self-start rounded-2xl border border-white/10 bg-[#0E0E0E] p-6 shadow-xl">
                <p className="flex items-center gap-3 font-sans text-lg font-bold text-white">
                  <Icon name="check" className="h-6 w-6 text-emerald-400" />
                  Received. We will be in touch soon.
                </p>
              </div>
            ) : (
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitMsg({ name: msgName, email: msgEmail, message: msgText }, honeypot);
                }}
                className="space-y-5 bg-[#0E0E0E] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl"
              >
                <Field
                  id="lead-name"
                  label="Name"
                  surface="dark"
                  autoComplete="name"
                  value={msgName}
                  onChange={(e) => setMsgName(e.target.value)}
                  error={msgErrors.name}
                />
                <Field
                  id="lead-email"
                  label="Email"
                  surface="dark"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={msgEmail}
                  onChange={(e) => setMsgEmail(e.target.value)}
                  error={msgErrors.email}
                />
                <Field
                  id="lead-message"
                  label="What are you building? (optional)"
                  surface="dark"
                  as="textarea"
                  rows={3}
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  error={msgErrors.message}
                />
                <Honeypot value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                {msgFormError && (
                  <p role="alert" className="font-sans text-sm font-bold text-red-400">
                    {msgFormError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={msgStatus === "sending"}
                  className="w-full min-h-14 inline-flex items-center justify-center gap-2 rounded-lg bg-[#F5C518] px-6 py-4 font-sans text-xs font-extrabold uppercase tracking-[0.16em] text-black shadow-[0_0_25px_rgba(245,197,24,0.2)] hover:bg-[#ffd026] hover:shadow-[0_0_35px_rgba(245,197,24,0.4)] transition-all disabled:opacity-60 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518]"
                >
                  <span>{msgStatus === "sending" ? "Sending Details..." : "Send Details"}</span>
                  <Icon name="arrow-right" className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Hairline boundary */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#F5C518]/20 to-transparent"
      />
    </section>
  );
};
