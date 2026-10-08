"use client";

// Virtus Studio Calendar Engine v2.1 - Multi-Timezone & CST Window Support
import React, { useState, useEffect, useMemo } from "react";
import { Icon } from "@/components/icons/Icon";
import { SectionHeader } from "./SectionHeader";
import { useLeadForm } from "./useLeadForm";
import { Button, Field, Honeypot, SlantDivider } from "./ui";
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
  title = "Let’s Architect What’s Next",
  intro = "Schedule a 1-on-1 discovery call directly with a studio director, or drop our team a quick note below.",
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
      className="relative scroll-mt-16 bg-tvl-amber py-16 text-black sm:py-24"
    >
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b-2 border-black pb-8">
          <div>
            <SectionHeader
              tone="light"
              eyebrow={eyebrow}
              title={title}
              titleId="contact-title"
              intro={intro}
            />
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 self-start md:self-end bg-black/10 p-1.5 rounded-xl border border-black/20">
            <button
              type="button"
              onClick={() => setActiveTab("calendar")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-sans font-bold uppercase tracking-wider transition-all ${
                activeTab === "calendar"
                  ? "bg-black text-white shadow-md"
                  : "text-black/80 hover:text-black hover:bg-black/5"
              }`}
            >
              <Icon name="calendar" className="h-4 w-4 text-[#FBD227]" />
              Schedule Discovery Call
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("message")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-sans font-bold uppercase tracking-wider transition-all ${
                activeTab === "message"
                  ? "bg-black text-white shadow-md"
                  : "text-black/80 hover:text-black hover:bg-black/5"
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
              <div className="max-w-3xl mx-auto rounded-2xl border-4 border-black bg-white p-8 shadow-2xl">
                <div className="flex items-center gap-3 text-emerald-600 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 border border-emerald-300">
                    <Icon name="check" className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-monument text-2xl font-black uppercase tracking-tight text-black">
                      Discovery Call Confirmed!
                    </h3>
                    <p className="text-xs font-mono text-neutral-600">
                      Booking ID: {confirmedBooking.id}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-neutral-700 leading-relaxed">
                  Your strategy session with <strong className="text-black">The Virtus Labs</strong> is locked in. We have dispatched an automated confirmation email with calendar invites to <strong className="text-black">{bookEmail}</strong>.
                </p>

                <div className="my-6 rounded-xl border-2 border-neutral-200 bg-neutral-50 p-5 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                    <div>
                      <span className="text-neutral-500 uppercase tracking-wider block">Your Local Time</span>
                      <strong className="text-sm text-black">
                        {confirmedBooking.localTimeDisplay || `${selectedDate} · ${selectedTime}`}
                      </strong>
                      <span className="text-[10px] text-neutral-500 block">({confirmedBooking.timezone})</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 uppercase tracking-wider block">Studio Host</span>
                      <strong className="text-sm text-black">Paks (Studio Director)</strong>
                      <span className="text-[10px] text-neutral-500 block">Asia/Manila (PHT GMT+8)</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 uppercase tracking-wider block">Target Entity</span>
                      <strong className="text-sm text-black">{bookCompany || bookName}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 uppercase tracking-wider block">Estimated Project Scope</span>
                      <strong className="text-sm text-emerald-700 font-bold">${confirmedBooking.dealValue.toLocaleString()}</strong>
                    </div>
                  </div>

                  {confirmedBooking.acceptedAddOns && confirmedBooking.acceptedAddOns.length > 0 && (
                    <div className="border-t border-neutral-200 pt-3">
                      <span className="text-neutral-500 text-xs uppercase tracking-wider block mb-1">
                        Active Accelerated Sprints:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {confirmedBooking.acceptedAddOns.map((addon) => (
                          <span
                            key={addon.id}
                            className="inline-flex items-center gap-1 rounded bg-[#FBD227]/20 border border-black/20 px-2.5 py-1 text-xs font-bold text-black"
                          >
                            💎 {addon.title} (+${addon.price.toLocaleString()})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-neutral-200 pt-3">
                    <span className="text-neutral-500 text-xs uppercase tracking-wider block mb-1">
                      Direct Meeting Link:
                    </span>
                    <a
                      href={confirmedBooking.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 font-mono text-sm font-bold text-blue-700 hover:underline"
                    >
                      {confirmedBooking.meetingUrl}
                      <Icon name="arrow-right" className="h-3.5 w-3.5" />
                    </a>
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
                    className="border-2 border-black bg-black px-6 py-2.5 font-sans text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all rounded-lg"
                  >
                    Schedule Another Session
                  </button>
                </div>
              </div>
            )}

            {(bookingStatus === "idle" || bookingStatus === "submitting" || bookingStatus === "error") && (
              <form onSubmit={handleBookingSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Date & Time Picker (7 cols) */}
                <div className="lg:col-span-7 bg-white border-2 border-black rounded-2xl p-6 sm:p-8 shadow-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[#FBD227] text-xs font-bold">1</span>
                    <h3 className="font-monument text-lg font-bold uppercase tracking-tight text-black">
                      Select Date & Time
                    </h3>
                  </div>

                  {/* Date Strip */}
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-600 mb-2">
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
                          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition-all text-center select-none ${
                            isSelected
                              ? "border-black bg-black text-white shadow-md scale-[1.03]"
                              : "border-neutral-200 bg-neutral-50 text-black hover:border-black/50 hover:bg-white"
                          }`}
                        >
                          <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? "text-[#FBD227]" : "text-neutral-500"}`}>
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
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4 bg-neutral-100 p-2.5 rounded-xl border border-neutral-300">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-neutral-800">
                      <span className="text-sm">🌐</span>
                      <span>Timezone:</span>
                    </div>
                    <select
                      value={selectedTz}
                      onChange={(e) => setSelectedTz(e.target.value)}
                      className="text-xs font-mono font-semibold bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-black focus:outline-none focus:ring-2 focus:ring-black cursor-pointer max-w-full"
                    >
                      {timezoneList.map((opt) => (
                        <option key={opt.id} value={opt.id}>
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
                          ? "bg-black text-[#FBD227] shadow"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      Americas (CST/EST/PST)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegionFilter("apac")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider transition-all ${
                        regionFilter === "apac"
                          ? "bg-black text-[#FBD227] shadow"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      Asia & Australia
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegionFilter("emea")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider transition-all ${
                        regionFilter === "emea"
                          ? "bg-black text-[#FBD227] shadow"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      Europe & Mid-East
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegionFilter("all")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider transition-all ${
                        regionFilter === "all"
                          ? "bg-black text-[#FBD227] shadow"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      All 24h Slots
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegionFilter("custom")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider transition-all ${
                        regionFilter === "custom"
                          ? "bg-[#FBD227] text-black font-black border border-black shadow"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      ✨ Custom Time
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
                              className={`flex flex-col text-left p-3 rounded-xl border-2 transition-all font-mono ${
                                reserved
                                  ? "border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed line-through"
                                  : isSelected
                                  ? "border-black bg-black text-white shadow-md ring-2 ring-[#FBD227]"
                                  : "border-neutral-200 bg-white text-black hover:border-black"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className={`text-xs font-black ${isSelected ? "text-[#FBD227]" : "text-black"}`}>
                                  {converted.displayTime}
                                </span>
                                <span className={`text-[9px] font-sans uppercase font-bold px-1.5 py-0.5 rounded ${
                                  reserved
                                    ? "bg-neutral-200 text-neutral-500"
                                    : isSelected
                                    ? "bg-[#FBD227] text-black"
                                    : "bg-neutral-100 text-neutral-600"
                                }`}>
                                  {reserved ? "Booked" : isSelected ? "Selected" : "Open"}
                                </span>
                              </div>

                              <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-400">
                                <span>Studio: {slot}</span>
                                {converted.isDifferentDay && (
                                  <span className="text-[#DD7230] font-bold">({converted.displayDate})</span>
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
                    <div className="p-4 bg-neutral-50 border-2 border-black rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                        <Icon name="clock" className="h-4 w-4 text-black" />
                        <span className="font-mono text-xs font-bold uppercase text-black">
                          Pick Any Specific Start Time
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600">
                        Choose your preferred time in your selected timezone (<strong>{selectedTz}</strong>). We'll automatically verify availability with studio directors.
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <input
                          type="time"
                          value={customLocalTime}
                          onChange={(e) => {
                            setCustomLocalTime(e.target.value);
                            setCustomTimeConfirmed(false);
                          }}
                          className="px-3 py-2 border-2 border-black rounded-lg font-mono text-sm bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCustomTime}
                          className="px-4 py-2 bg-black text-[#FBD227] font-mono text-xs font-bold uppercase rounded-lg hover:bg-neutral-800 transition-colors"
                        >
                          Lock In This Time
                        </button>
                      </div>

                      {customTimeConfirmed && (
                        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-mono text-emerald-800 flex items-center gap-2">
                          <Icon name="check" className="h-4 w-4 text-emerald-600" />
                          <span>Custom slot active: <strong>{customLocalTime}</strong> ({selectedTz}) ➔ Studio slot {selectedTime}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-6 flex items-center gap-2 text-xs text-neutral-500">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Real-time availability synced with Studio Director calendar</span>
                  </div>
                </div>

                {/* Right Column: Contact Details (5 cols) */}
                <div className="lg:col-span-5 bg-white border-2 border-black rounded-2xl p-6 sm:p-8 shadow-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[#FBD227] text-xs font-bold">2</span>
                    <h3 className="font-monument text-lg font-bold uppercase tracking-tight text-black">
                      Your Details
                    </h3>
                  </div>

                  {bookingError && (
                    <div className="mb-4 rounded-lg border border-red-500 bg-red-50 p-3 text-xs text-red-700 font-bold">
                      {bookingError}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={bookName}
                        onChange={(e) => setBookName(e.target.value)}
                        placeholder="e.g. Alex Vance"
                        className="w-full rounded-xl border-2 border-black bg-white px-4 py-2.5 text-sm font-sans text-black focus:outline-none focus:ring-2 focus:ring-[#FBD227]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                        Business Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={bookEmail}
                        onChange={(e) => setBookEmail(e.target.value)}
                        placeholder="alex@company.com"
                        className="w-full rounded-xl border-2 border-black bg-white px-4 py-2.5 text-sm font-sans text-black focus:outline-none focus:ring-2 focus:ring-[#FBD227]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                          Company / Project
                        </label>
                        <input
                          type="text"
                          value={bookCompany}
                          onChange={(e) => setBookCompany(e.target.value)}
                          placeholder="e.g. Nova Audio"
                          className="w-full rounded-xl border-2 border-black bg-white px-4 py-2.5 text-sm font-sans text-black focus:outline-none focus:ring-2 focus:ring-[#FBD227]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                          Phone (WhatsApp/SMS)
                        </label>
                        <input
                          type="tel"
                          value={bookPhone}
                          onChange={(e) => setBookPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                          className="w-full rounded-xl border-2 border-black bg-white px-4 py-2.5 text-sm font-sans text-black focus:outline-none focus:ring-2 focus:ring-[#FBD227]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                        Current Bottleneck / Goals (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={bookNotes}
                        onChange={(e) => setBookNotes(e.target.value)}
                        placeholder="Tell us about what you'd like to build or scope..."
                        className="w-full rounded-xl border-2 border-black bg-white px-4 py-2.5 text-sm font-sans text-black focus:outline-none focus:ring-2 focus:ring-[#FBD227]"
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={bookingStatus === "submitting"}
                        tone="black"
                        hoverTone="white"
                        size="lg"
                        icon="calendar"
                        className="w-full justify-center"
                      >
                        {bookingStatus === "submitting" ? "Reserving Slot..." : "Lock In Strategy Session"}
                      </Button>
                    </div>

                    <p className="text-[11px] text-neutral-600 text-center">
                      🔒 No payment required for discovery consultation. Instant email confirmation sent with Google Meet room link.
                    </p>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: SEND A NOTE (CLASSIC MESSAGE FORM) */}
        {activeTab === "message" && (
          <div className="grid w-full max-w-[88rem] gap-10 lg:grid-cols-[1fr_28rem] lg:gap-20">
            <div className="self-center">
              <h3 className="font-monument text-2xl font-bold uppercase text-black mb-3">
                Send a Direct Project Note
              </h3>
              <p className="text-sm text-black/80 max-w-md leading-relaxed">
                Prefer an async exchange? Fill out this brief note and our pod lead will review your objectives and reply via email within 24 hours.
              </p>
            </div>

            {msgStatus === "sent" ? (
              <div role="status" className="self-start rounded-xl border-2 border-black bg-white p-6 shadow-xl">
                <p className="flex items-center gap-3 font-sans text-lg font-bold">
                  <Icon name="check" className="h-6 w-6 text-emerald-600" />
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
                className="space-y-5 bg-white border-2 border-black rounded-2xl p-6 sm:p-8 shadow-xl"
              >
                <Field
                  id="lead-name"
                  label="Name"
                  autoComplete="name"
                  value={msgName}
                  onChange={(e) => setMsgName(e.target.value)}
                  error={msgErrors.name}
                />
                <Field
                  id="lead-email"
                  label="Email"
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
                  as="textarea"
                  rows={3}
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  error={msgErrors.message}
                />
                <Honeypot value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                {msgFormError && (
                  <p role="alert" className="font-sans text-sm font-bold text-red-600">
                    {msgFormError}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={msgStatus === "sending"}
                  tone="black"
                  hoverTone="white"
                  size="lg"
                  icon="arrow-right"
                  className="w-full justify-center"
                >
                  {msgStatus === "sending" ? "Sending" : "Send details"}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>

      <SlantDivider toTone="black" />
    </section>
  );
};
