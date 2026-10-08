"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { Booking } from "@/db";
import { Icon } from "@/components/icons/Icon";
import {
  BOOKING_STATUSES,
  SESSION_TYPES,
  formatWindow,
  isHttpsUrl,
  parseClock,
  parseWindow,
  sessionMinutes,
  toClock,
} from "@/lib/scheduling";
import { Modal, fieldClass, fieldCompact, labelClass, btnPrimary, btnDark } from "./ui";

interface BookingsViewProps {
  role?: "admin" | "team";
  /** Kept for the shell's signature. The server decides which calls a team member sees. */
  activeMember?: string;
}

/** Local calendar date as YYYY-MM-DD. */
const todayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const isHttps = isHttpsUrl;

/** Chronological: by date, then start time. Stored times are "10:00 AM" text, which does not sort as a string. */
const byWhen = (a: Booking, b: Booking) =>
  a.date.localeCompare(b.date) || (parseWindow(a.time)?.start ?? 0) - (parseWindow(b.time)?.start ?? 0);

const DEFAULT_TYPE = SESSION_TYPES[0].label;

interface BookingForm {
  clientName: string;
  company: string;
  email: string;
  bookingType: string;
  date: string;
  startTime: string;
  host: string;
  meetingUrl: string;
  notes: string;
}

const emptyForm = (date: string, host: string): BookingForm => ({
  clientName: "",
  company: "",
  email: "",
  bookingType: DEFAULT_TYPE,
  date,
  startTime: "10:00",
  host,
  meetingUrl: "",
  notes: "",
});

async function send(method: "POST" | "PATCH", body: Record<string, unknown>) {
  const res = await fetch("/api/bookings", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) throw new Error(json?.error ?? "Could not save the booking. Try again.");
  return json.booking as Booking;
}

export const BookingsView: React.FC<BookingsViewProps> = ({ role = "admin" }) => {
  // Bookings live on the server (Neon, or the dev store), so every change goes through /api/bookings.
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hosts, setHosts] = useState<string[]>([]);
  const [serverCanSchedule, setServerCanSchedule] = useState(false);
  const [load, setLoad] = useState<"loading" | "ready" | "error">("loading");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [copiedMeet, setCopiedMeet] = useState<string | null>(null);
  const [copiedFeed, setCopiedFeed] = useState(false);
  const [copiedBookingLink, setCopiedBookingLink] = useState(false);

  // Team members see their own calls and cannot schedule for others. The API enforces the same rule.
  const canSchedule = role === "admin" && serverCanSchedule;

  const fetchBookings = useCallback(async () => {
    const res = await fetch("/api/bookings");
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok || !Array.isArray(json.bookings)) throw new Error("load failed");
    setBookings([...(json.bookings as Booking[])].sort(byWhen));
    setHosts(Array.isArray(json.hosts) ? json.hosts : []);
    setServerCanSchedule(Boolean(json.canSchedule));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchBookings()
      .then(() => !cancelled && setLoad("ready"))
      .catch(() => !cancelled && setLoad("error"));
    return () => {
      cancelled = true;
    };
  }, [fetchBookings]);

  const today = todayString();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [calendarView, setCalendarView] = useState<"month" | "week" | "agenda">("month");
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);

  // Schedule / edit form. editingId null means a new booking.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BookingForm>(() => emptyForm(todayString(), ""));
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const setField = (key: keyof BookingForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const openCreate = (date: string) => {
    setEditingId(null);
    setForm(emptyForm(date, hosts[0] ?? ""));
    setFormError(null);
    setIsScheduleModalOpen(true);
  };

  const openEdit = (b: Booking) => {
    const window = parseWindow(b.time);
    setEditingId(b.id);
    setForm({
      clientName: b.clientName,
      company: b.company,
      email: b.email,
      bookingType: b.bookingType,
      date: b.date,
      startTime: window ? toClock(window.start) : "10:00",
      host: b.host,
      meetingUrl: b.meetingUrl,
      notes: b.notes ?? "",
    });
    setFormError(null);
    setIsScheduleModalOpen(true);
  };

  const closeModal = () => {
    if (!saving) setIsScheduleModalOpen(false);
  };

  // The window the form will save, shown under the time field.
  const formStart = parseClock(form.startTime);
  const formMinutes = sessionMinutes(form.bookingType);
  const formWindow = formStart !== null && formMinutes !== null ? formatWindow(formStart, formMinutes) : null;

  // Keep a booking's existing type and host selectable when editing, even if they are no longer in the lists.
  const typeChoices: string[] = SESSION_TYPES.map((t) => t.label);
  if (form.bookingType && !typeChoices.includes(form.bookingType)) typeChoices.unshift(form.bookingType);
  const hostChoices = form.host && !hosts.includes(form.host) ? [form.host, ...hosts] : hosts;

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthIndex((m) => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentMonthIndex(now.getMonth());
    setCurrentYear(now.getFullYear());
    setSelectedDate(todayString());
  };

  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSchedule || saving) return;
    setSaving(true);
    setFormError(null);
    try {
      // Client, company and email are fixed once booked; edits change when, who, what and the link.
      const saved = editingId
        ? await send("PATCH", {
            id: editingId,
            bookingType: form.bookingType,
            date: form.date,
            startTime: form.startTime,
            host: form.host,
            meetingUrl: form.meetingUrl,
            notes: form.notes,
          })
        : await send("POST", { ...form });
      setBookings((list) => [...list.filter((b) => b.id !== saved.id), saved].sort(byWhen));
      setSelectedDate(saved.date);
      setIsScheduleModalOpen(false);
      // A new host name may now appear in the list.
      fetchBookings().catch(() => undefined);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save the booking. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (bookingId: string, status: Booking["status"]) => {
    if (!canSchedule) return;
    const previous = bookings;
    setActionError(null);
    setBookings((list) => list.map((b) => (b.id === bookingId ? { ...b, status } : b)));
    try {
      const saved = await send("PATCH", { id: bookingId, status });
      setBookings((list) => list.map((b) => (b.id === saved.id ? saved : b)));
    } catch (err) {
      setBookings(previous);
      setActionError(err instanceof Error ? err.message : "Could not update the status.");
    }
  };

  const copyMeetUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedMeet(id);
      setTimeout(() => setCopiedMeet(null), 2000);
    });
  };


  // Calendar Math: Generate grid days for the displayed month
  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonthIndex, 1).getDay(); // 0 = Sunday

  const calendarDays: { dayNumber: number; dateString: string; isCurrentMonth: boolean }[] = [];

  // Previous month trailing days
  const prevMonthDays = new Date(currentYear, currentMonthIndex, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = currentMonthIndex === 0 ? 12 : currentMonthIndex;
    const y = currentMonthIndex === 0 ? currentYear - 1 : currentYear;
    const dateString = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarDays.push({ dayNumber: d, dateString, isCurrentMonth: false });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const m = currentMonthIndex + 1;
    const dateString = `${currentYear}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarDays.push({ dayNumber: d, dateString, isCurrentMonth: true });
  }

  // Next month leading days to complete grid
  const remainingSlots = 42 - calendarDays.length;
  for (let d = 1; d <= remainingSlots; d++) {
    const m = currentMonthIndex === 11 ? 1 : currentMonthIndex + 2;
    const y = currentMonthIndex === 11 ? currentYear + 1 : currentYear;
    const dateString = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarDays.push({ dayNumber: d, dateString, isCurrentMonth: false });
  }

  const selectedDateBookings = bookings.filter((b) => b.date === selectedDate);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-white font-sans">
      {/* Top Bar Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#262626] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="block h-1 w-10 bg-[#FBD227]" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FBD227]">
              OPERATIONS OS · BOOKINGS & SESSIONS
            </span>
          </div>
          <h1 className="font-monument text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 uppercase">
            Appointments & Calendar
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Client discovery consultations, live Google Meet sessions, and synchronized iCal feeds.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Calendar Setup Modal Button */}
          <button
            type="button"
            onClick={() => setIsSetupModalOpen(true)}
            className="px-3 py-2 border border-[#333333] bg-[#141414] text-[#FBD227] hover:border-[#FBD227] hover:bg-[#1a1a1a] font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
          >
            ⚙️ Calendar Setup & Sync
          </button>

          {/* View Toggles */}
          <div className="flex items-center border border-[#333333] bg-black p-0.5 rounded font-mono text-xs">
            <button
              type="button"
              onClick={() => setCalendarView("month")}
              className={`px-3 py-1 font-bold rounded transition-colors ${
                calendarView === "month" ? "bg-[#FBD227] text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setCalendarView("agenda")}
              className={`px-3 py-1 font-bold rounded transition-colors ${
                calendarView === "agenda" ? "bg-[#FBD227] text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              Agenda
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/book`);
              setCopiedBookingLink(true);
              setTimeout(() => setCopiedBookingLink(false), 2000);
            }}
            className={btnDark}
            title="Copy public booking link (/book)"
          >
            <span>{copiedBookingLink ? "✓ Copied /book URL" : "🔗 Share booking link"}</span>
          </button>

          {canSchedule && (
            <button
              type="button"
              onClick={() => openCreate(selectedDate)}
              className={btnPrimary}
            >
              <span>+ Schedule meeting</span>
            </button>
          )}
        </div>
      </div>

      {load === "loading" && (
        <p role="status" className="font-mono text-xs text-gray-400">
          Loading bookings…
        </p>
      )}
      {load === "error" && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-[#DD7230] bg-[#DD7230]/10 px-4 py-3 text-xs">
          <span>Bookings could not be loaded. Check your connection and try again.</span>
          <button
            type="button"
            onClick={() => {
              setLoad("loading");
              fetchBookings()
                .then(() => setLoad("ready"))
                .catch(() => setLoad("error"));
            }}
            className={btnDark}
          >
            Retry
          </button>
        </div>
      )}
      {actionError && (
        <p role="alert" className="border border-[#DD7230] bg-[#DD7230]/10 px-4 py-3 text-xs">
          {actionError}
        </p>
      )}

      {/* Main Grid: Calendar App + Day Agenda Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: The Interactive Calendar App (7 cols on lg) */}
        <div className="lg:col-span-8 bg-[#111111] border border-[#262626] rounded-lg p-5 shadow-2xs">
          {/* Calendar Month Navigation Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black font-monument tracking-tight text-white uppercase">
                {months[currentMonthIndex]} {currentYear}
              </h2>
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1 rounded border border-[#333333] bg-[#1A1A1A] font-mono text-xs font-bold text-gray-300 hover:bg-[#262626] hover:text-white transition-colors"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded border border-[#333333] bg-[#1A1A1A] hover:bg-[#262626] text-gray-300 font-mono text-sm font-bold transition-colors"
                aria-label="Previous month"
              >
                <Icon name="chevron-left" className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded border border-[#333333] bg-[#1A1A1A] hover:bg-[#262626] text-gray-300 font-mono text-sm font-bold transition-colors"
                aria-label="Next month"
              >
                <Icon name="chevron-right" className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Calendar 7-Day Matrix */}
          <div className="border border-[#262626] rounded overflow-hidden">
            {/* Weekday Labels */}
            <div className="grid grid-cols-7 bg-[#161616] border-b border-[#262626] text-center py-2 font-mono text-xs font-bold uppercase text-gray-400">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Calendar Days Cells Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-[#262626] bg-[#111111]">
              {calendarDays.map((cell, idx) => {
                const dayBookings = bookings.filter((b) => b.date === cell.dateString);
                const isSelected = cell.dateString === selectedDate;
                const isToday = cell.dateString === today;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDate(cell.dateString)}
                    className={`min-h-[75px] sm:min-h-[85px] p-1.5 text-left transition-colors relative flex flex-col justify-between ${
                      !cell.isCurrentMonth
                        ? "bg-[#0c0c0c] text-gray-600"
                        : isSelected
                        ? "bg-[#1E1E1E] ring-1 ring-inset ring-[#FBD227]"
                        : "hover:bg-[#161616]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-mono text-xs font-bold h-5 w-5 flex items-center justify-center rounded-full ${
                          isToday
                            ? "bg-[#FBD227] text-black"
                            : isSelected
                            ? "text-[#FBD227]"
                            : cell.isCurrentMonth
                            ? "text-gray-300"
                            : "text-gray-600"
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {dayBookings.length > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#FBD227]" />
                      )}
                    </div>

                    {/* Booking indicators on day cell */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {dayBookings.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className="truncate text-[10px] font-mono px-1 py-0.5 rounded bg-black/60 border border-[#333333] text-gray-200"
                        >
                          <span className="text-[#FBD227] mr-1">•</span>
                          {item.clientName}
                        </div>
                      ))}
                      {dayBookings.length > 2 && (
                        <span className="text-[9px] font-mono text-gray-500 pl-1">
                          +{dayBookings.length - 2} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Selected Day Agenda & Quick Action Drawer (4 cols on lg) */}
        <div className="lg:col-span-4 bg-[#111111] border border-[#262626] rounded-lg p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#262626] pb-3 mb-4">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-400 block">
                  Day Agenda
                </span>
                <h3 className="font-monument font-black text-sm text-white uppercase mt-0.5">
                  {selectedDate === today ? "Today's Schedule" : selectedDate}
                </h3>
              </div>
              <span className="font-mono text-xs text-[#FBD227] bg-[#FBD227]/10 px-2 py-0.5 rounded border border-[#FBD227]/20 font-bold">
                {selectedDateBookings.length} {selectedDateBookings.length === 1 ? "call" : "calls"}
              </span>
            </div>

            {selectedDateBookings.length === 0 ? (
              <div className="py-12 text-center font-mono">
                <span className="text-2xl block mb-2">☕</span>
                <p className="text-xs text-gray-400 font-bold">No calls scheduled for this date.</p>
                <p className="text-[11px] text-gray-600 mt-1">Calendar slots remain open for bookings.</p>
                {canSchedule && (
                  <button
                    type="button"
                    onClick={() => openCreate(selectedDate)}
                    className="mt-4 px-3 py-1.5 rounded border border-[#333333] bg-[#161616] text-[#FBD227] font-mono text-xs font-bold hover:border-[#FBD227] transition-colors"
                  >
                    + Book slot for this day
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateBookings.map((item) => (
                  <div
                    key={item.id}
                    className="border border-[#262626] bg-[#161616] p-3.5 rounded-lg space-y-2.5 hover:border-[#383838] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs text-white leading-tight">{item.clientName}</h4>
                        <span className="text-xs text-gray-400 font-mono block">{item.company}</span>
                        <span className="text-[10px] text-gray-500 font-mono">{item.email}</span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-bold border ${
                          item.status === "Confirmed"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : item.status === "Pending"
                            ? "bg-amber-500/20 text-[#FBD227] border-amber-500/30"
                            : item.status === "Completed"
                            ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-[#262626]">
                      <div>
                        <span className="text-gray-500 block text-[10px]">Time Window</span>
                        <span className="text-white font-bold">{item.time}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">Studio Host</span>
                        <span className="text-gray-300">{item.host}</span>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-gray-400 italic bg-black/40 border border-[#222222] p-2 rounded">
                        &quot;{item.notes}&quot;
                      </p>
                    )}

                    {/* Actions Row */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#262626]">
                      <div className="flex items-center gap-1.5">
                        {isHttps(item.meetingUrl) ? (
                          <>
                            <a
                              href={item.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded bg-[#FBD227] text-black font-mono text-xs font-bold hover:bg-white transition-colors flex items-center gap-1"
                            >
                              <Icon name="video" className="h-3.5 w-3.5" />
                              Join
                            </a>
                            <button
                              type="button"
                              onClick={() => copyMeetUrl(item.meetingUrl, item.id)}
                              className="px-2 py-1 rounded border border-[#333333] bg-black text-gray-300 font-mono text-[11px] hover:text-white hover:border-white transition-colors"
                              title="Copy Google Meet Link"
                            >
                              {copiedMeet === item.id ? "Copied" : "Copy"}
                            </button>
                          </>
                        ) : null}

                        <a
                          href={`/api/bookings/ics?id=${item.id}`}
                          download
                          className="px-2 py-1 rounded border border-[#333333] bg-[#1a1a1a] text-gray-300 font-mono text-[11px] hover:text-[#FBD227] hover:border-[#FBD227] transition-colors"
                          title="Download iCalendar .ics file"
                        >
                          📅 .ics
                        </a>
                      </div>

                      {canSchedule && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            aria-label={`Edit booking with ${item.clientName}`}
                            className="px-2 py-1 rounded border border-[#333333] bg-[#1a1a1a] text-gray-300 font-mono text-[11px] hover:text-white hover:border-white transition-colors"
                          >
                            Edit
                          </button>
                          <select
                            aria-label={`Status for ${item.clientName}`}
                            value={item.status}
                            onChange={(e) => handleStatusChange(item.id, e.target.value as Booking["status"])}
                            className={fieldCompact}
                          >
                            {BOOKING_STATUSES.map((s) => (
                              <option key={s} value={s} className="bg-black text-white">
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats at bottom of drawer */}
          <div className="mt-6 pt-4 border-t border-[#262626] bg-[#161616] p-3 rounded-lg">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
              Monthly Capacity Overview
            </span>
            <div className="grid grid-cols-2 gap-2 text-center font-mono">
              <div className="bg-[#111111] p-2 rounded border border-[#262626]">
                <span className="text-lg font-black text-white">{bookings.length}</span>
                <span className="text-xs text-gray-400 block">Total Calls</span>
              </div>
              <div className="bg-[#111111] p-2 rounded border border-[#262626]">
                <span className="text-lg font-black text-emerald-400">
                  {bookings.filter((b) => b.status === "Confirmed").length}
                </span>
                <span className="text-xs text-gray-400 block">Confirmed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Master Appointment Registry Table */}
      <div className="bg-[#111111] border border-[#262626] rounded-lg p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-monument font-bold text-sm uppercase tracking-wider text-white">
              Master Appointment Registry
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              All scheduled strategy calls, design sprints, and client walkthroughs.
            </p>
          </div>
          <span className="font-mono text-xs font-bold text-gray-300 bg-[#161616] border border-[#262626] px-2.5 py-1 rounded">
            {bookings.length} total events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#262626] font-mono text-xs uppercase text-gray-400 bg-[#161616]">
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Client & Company</th>
                <th className="py-2.5 px-3">Session Type</th>
                <th className="py-2.5 px-3">Lead Host</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Calendar & Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F1F] text-xs">
              {load === "ready" && bookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 px-3 text-center font-mono text-xs text-gray-400">
                    No bookings yet.{canSchedule ? " Use Schedule meeting to add the first call." : ""}
                  </td>
                </tr>
              )}
              {bookings.map((item) => (
                <tr key={item.id} className="hover:bg-[#161616] transition-colors">
                  <td className="py-3 px-3 font-mono">
                    <span className="font-bold text-white block">{item.date}</span>
                    <span className="text-[0.68rem] text-gray-400">{item.time}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-white block">{item.clientName}</span>
                    <span className="text-gray-400 font-mono text-xs">{item.company}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono font-medium text-gray-200">{item.bookingType}</span>
                    <span className="text-xs text-gray-400 block truncate max-w-xs">{item.notes}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-gray-300">{item.host}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                        item.status === "Confirmed"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : item.status === "Pending"
                          ? "bg-amber-500/20 text-[#FBD227] border-amber-500/30"
                          : item.status === "Completed"
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2 font-mono text-xs">
                      <a
                        href={`/api/bookings/ics?id=${item.id}`}
                        download
                        className="px-2 py-1 rounded border border-[#333333] bg-[#1a1a1a] text-gray-300 hover:text-[#FBD227] hover:border-[#FBD227] transition-colors"
                        title="Download .ics file"
                      >
                        📅 .ics
                      </a>
                      {isHttps(item.meetingUrl) ? (
                        <a
                          href={item.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#FBD227] hover:text-white hover:underline"
                        >
                          <span>Join</span>
                          <Icon name="video" className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="text-gray-600">No link</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calendar Setup & Sync Modal */}
      <Modal open={isSetupModalOpen} onClose={() => setIsSetupModalOpen(false)} title="Calendar Setup & Master Sync">
        <div className="space-y-5 text-white font-sans text-xs">
          <p className="text-gray-300">
            Configure booking availability, Google Meet generation, and calendar subscriptions for Google Calendar, Apple Calendar, and Outlook.
          </p>

          {/* Section 1: Availability Rules */}
          <div className="border border-[#262626] bg-[#141414] p-4 rounded-lg space-y-3">
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-[#FBD227]">
              1. Availability & Working Hours
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
              <div className="bg-black p-2.5 rounded border border-[#222222]">
                <span className="text-gray-400 block text-[10px]">Operating Hours</span>
                <strong className="text-white">09:00 AM – 06:00 PM</strong>
              </div>
              <div className="bg-black p-2.5 rounded border border-[#222222]">
                <span className="text-gray-400 block text-[10px]">Working Days</span>
                <strong className="text-white">Monday – Friday</strong>
              </div>
              <div className="bg-black p-2.5 rounded border border-[#222222]">
                <span className="text-gray-400 block text-[10px]">Default Duration</span>
                <strong className="text-white">30 Min (15m buffer)</strong>
              </div>
            </div>
          </div>

          {/* Section 2: Meeting URL Provider */}
          <div className="border border-[#262626] bg-[#141414] p-4 rounded-lg space-y-2">
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-[#FBD227]">
              2. Meeting Room Provider
            </h4>
            <p className="text-gray-400 font-mono text-[11px]">
              Every booking automatically generates a private, zero-collision Google Meet room URL:
            </p>
            <div className="bg-black p-2 rounded border border-[#222222] font-mono text-[11px] text-gray-300">
              <code>https://meet.google.com/tvl-disc-[random-hash]</code>
            </div>
          </div>

          {/* Section 3: iCal Subscription Feed */}
          <div className="border border-[#262626] bg-[#141414] p-4 rounded-lg space-y-3">
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-[#FBD227]">
              3. Sync to Google Calendar & Apple Calendar
            </h4>
            <p className="text-gray-400 font-mono text-[11px]">
              Clients and team members receive an automated RFC 5545 <code>.ics</code> calendar file attached to every confirmation email. You can also download any event directly using the <strong>📅 .ics</strong> buttons.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/book`);
                  setCopiedBookingLink(true);
                  setTimeout(() => setCopiedBookingLink(false), 2000);
                }}
                className="px-3 py-1.5 bg-[#222222] text-white border border-[#333333] font-mono text-[11px] font-bold rounded uppercase hover:border-[#FBD227] hover:text-[#FBD227] transition-colors"
              >
                {copiedBookingLink ? "✓ Copied /book link" : "Copy booking page link (/book)"}
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/api/bookings/ics`);
                  setCopiedFeed(true);
                  setTimeout(() => setCopiedFeed(false), 2000);
                }}
                className="px-3 py-1.5 bg-[#FBD227] text-black font-mono text-[11px] font-bold rounded uppercase hover:bg-white transition-colors"
              >
                {copiedFeed ? "Copied Feed URL" : "Copy iCal Feed URL"}
              </button>
              <span className="text-gray-500 font-mono text-[11px]">Supports Apple Calendar, Outlook, and Google Calendar.</span>
            </div>
          </div>

          {/* Section 4: Webhook Dispatch Status */}
          <div className="border border-[#262626] bg-[#141414] p-4 rounded-lg space-y-2">
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-[#FBD227]">
              4. Automated Alerts & Webhook Routing
            </h4>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="bg-black p-2 rounded border border-[#222222]">
                <span className="text-gray-400 block">PrivateEmail SMTP:</span>
                <span className="text-emerald-400 font-bold">✓ Active (Client & Host)</span>
              </div>
              <div className="bg-black p-2 rounded border border-[#222222]">
                <span className="text-gray-400 block">CRM & Discord Webhook:</span>
                <span className="text-emerald-400 font-bold">✓ Live Dispatch Enabled</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#262626] flex justify-end">
            <button
              type="button"
              onClick={() => setIsSetupModalOpen(false)}
              className={btnDark}
            >
              Close Setup
            </button>
          </div>
        </div>
      </Modal>

      {/* Schedule / Edit Meeting Modal */}
      {canSchedule && (
        <Modal open={isScheduleModalOpen} onClose={closeModal} title={editingId ? "Edit meeting" : "Schedule new meeting"}>
          <div>
            <form onSubmit={handleSaveBooking} className="space-y-4 text-xs font-mono" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="booking-client" className={labelClass}>
                    Client Name *
                  </label>
                  <input
                    id="booking-client"
                    type="text"
                    required
                    disabled={Boolean(editingId)}
                    value={form.clientName}
                    onChange={setField("clientName")}
                    placeholder="e.g. Arthur Pendelton"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="booking-company" className={labelClass}>
                    Company / Project
                  </label>
                  <input
                    id="booking-company"
                    type="text"
                    disabled={Boolean(editingId)}
                    value={form.company}
                    onChange={setField("company")}
                    placeholder="e.g. Tidewater Coffee"
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="booking-email" className={labelClass}>
                  Client Email *
                </label>
                <input
                  id="booking-email"
                  type="email"
                  required
                  disabled={Boolean(editingId)}
                  value={form.email}
                  onChange={setField("email")}
                  placeholder="arthur@client.com"
                  className={fieldClass}
                />
                <p className="mt-1 text-[0.68rem] text-gray-500">
                  The call shows in the client portal when this matches the client&apos;s email.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="booking-type" className={labelClass}>
                    Session Type
                  </label>
                  <select id="booking-type" value={form.bookingType} onChange={setField("bookingType")} className={fieldClass}>
                    {typeChoices.map((t) => (
                      <option key={t} value={t} className="bg-black text-white">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="booking-host" className={labelClass}>
                    Host Member *
                  </label>
                  <select id="booking-host" required value={form.host} onChange={setField("host")} className={fieldClass}>
                    {hostChoices.length === 0 && <option value="">No active staff</option>}
                    {hostChoices.map((h) => (
                      <option key={h} value={h} className="bg-black text-white">
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="booking-date" className={labelClass}>
                    Date *
                  </label>
                  <input id="booking-date" type="date" required value={form.date} onChange={setField("date")} className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="booking-start" className={labelClass}>
                    Start Time *
                  </label>
                  <input
                    id="booking-start"
                    type="time"
                    required
                    step={300}
                    value={form.startTime}
                    onChange={setField("startTime")}
                    aria-describedby="booking-window"
                    className={fieldClass}
                  />
                  <p id="booking-window" className="mt-1 text-[0.68rem] text-gray-400">
                    {formWindow ? `Books ${formWindow}` : "Pick a start time."}
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="booking-link" className={labelClass}>
                  Meeting Link
                </label>
                <input
                  id="booking-link"
                  type="url"
                  value={form.meetingUrl}
                  onChange={setField("meetingUrl")}
                  placeholder="https://meet.google.com/..."
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="booking-notes" className={labelClass}>
                  Notes / Agenda
                </label>
                <textarea
                  id="booking-notes"
                  rows={2}
                  value={form.notes}
                  onChange={setField("notes")}
                  placeholder="Meeting agenda, topics to cover, or client questions..."
                  className={fieldClass}
                />
              </div>

              {formError && (
                <p role="alert" className="border border-[#DD7230] bg-[#DD7230]/10 px-3 py-2 font-sans text-xs text-white">
                  {formError}
                </p>
              )}

              <div className="pt-3 border-t border-[#262626] flex items-center justify-end gap-2">
                <button type="button" onClick={closeModal} disabled={saving} className={btnDark}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className={btnPrimary}>
                  {saving ? "Saving…" : editingId ? "Save changes" : "Schedule meeting"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};
