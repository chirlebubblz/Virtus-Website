"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { Booking } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { BOOKING_STATUSES, SESSION_TYPES, formatWindow, isHttpsUrl, parseClock, parseWindow, sessionMinutes, toClock } from "@/lib/scheduling";
import { Modal, fieldClass, fieldCompact, labelClass, btnPrimary, btnDark } from "./ui";

interface BookingsViewProps {
  role?: "admin" | "team";
  /** Kept for the shell's signature. The server now decides which calls a team member sees. */
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

const DEFAULT_TYPE = SESSION_TYPES[1].label;

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
  return json.data as Booking;
}

export const BookingsView: React.FC<BookingsViewProps> = ({ role = "admin" }) => {
  // Bookings live on the server (Neon, or the dev store), so every change goes through /api/bookings.
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hosts, setHosts] = useState<string[]>([]);
  const [serverCanSchedule, setServerCanSchedule] = useState(false);
  const [load, setLoad] = useState<"loading" | "ready" | "error">("loading");
  const [actionError, setActionError] = useState<string | null>(null);
  // Team members see their own calls and cannot schedule for others. The API enforces the same rule.
  const canSchedule = role === "admin" && serverCanSchedule;

  const fetchBookings = useCallback(async () => {
    const res = await fetch("/api/bookings");
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) throw new Error("load failed");
    setBookings([...(json.data.bookings as Booking[])].sort(byWhen));
    setHosts(json.data.hosts);
    setServerCanSchedule(Boolean(json.data.canSchedule));
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
      bookingType: sessionMinutes(b.bookingType) === null ? DEFAULT_TYPE : b.bookingType,
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
      setBookings((list) => {
        const rest = list.filter((b) => b.id !== saved.id);
        return [...rest, saved].sort(byWhen);
      });
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

  // Next month leading days to complete grid (multiples of 7)
  const remainingCells = (7 - (calendarDays.length % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    const m = currentMonthIndex === 11 ? 1 : currentMonthIndex + 2;
    const y = currentMonthIndex === 11 ? currentYear + 1 : currentYear;
    const dateString = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarDays.push({ dayNumber: d, dateString, isCurrentMonth: false });
  }

  const selectedDateBookings = bookings.filter((b) => b.date === selectedDate);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-white font-sans">
      {/* Header and Scheduling CTAs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#262626] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-400">
              Operations OS · Calendar
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1 font-monument uppercase">
            Bookings & Calendar
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Meetings and calls by date. Paste a meeting link on a booking once one exists.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Switcher */}
          <div className="flex items-center rounded-lg border border-[#262626] bg-[#141414] p-1 text-xs font-mono font-bold">
            <button
              type="button"
              onClick={() => setCalendarView("month")}
              className={`px-3 py-1 rounded transition-colors ${
                calendarView === "month" ? "bg-[#FBD227] text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              Month View
            </button>
            <button
              type="button"
              onClick={() => setCalendarView("week")}
              className={`px-3 py-1 rounded transition-colors ${
                calendarView === "week" ? "bg-[#FBD227] text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              Week View
            </button>
            <button
              type="button"
              onClick={() => setCalendarView("agenda")}
              className={`px-3 py-1 rounded transition-colors ${
                calendarView === "agenda" ? "bg-[#FBD227] text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              Agenda
            </button>
          </div>

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

            {/* Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-[#262626] bg-[#111111]">
              {calendarDays.map((cell, idx) => {
                const dateBookings = bookings.filter((b) => b.date === cell.dateString);
                const isSelected = selectedDate === cell.dateString;
                const isToday = cell.dateString === today;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(cell.dateString)}
                    className={`min-h-[82px] sm:min-h-[96px] p-1.5 flex flex-col justify-between cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#FBD227]/10 ring-2 ring-[#FBD227] z-10"
                        : cell.isCurrentMonth
                        ? "hover:bg-[#1A1A1A]"
                        : "bg-[#0A0A0A]/60 text-gray-600"
                    }`}
                  >
                    {/* Day number & indicators */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center justify-center font-mono text-xs ${
                          isToday
                            ? "h-5 w-5 rounded-full bg-[#FBD227] text-black font-black"
                            : isSelected
                            ? "font-black text-[#FBD227]"
                            : cell.isCurrentMonth
                            ? "font-medium text-white"
                            : "text-gray-600"
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {dateBookings.length > 0 && (
                        <span className="font-mono text-[0.6rem] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {dateBookings.length}
                        </span>
                      )}
                    </div>

                    {/* Booked Events Snippet */}
                    <div className="space-y-1 mt-1">
                      {dateBookings.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className="px-1.5 py-0.5 rounded text-[0.62rem] font-mono truncate leading-tight bg-[#1C1C1C] text-white border-l-2 border-[#FBD227]"
                          title={`${item.time}: ${item.clientName} (${item.bookingType})`}
                        >
                          <span className="font-bold text-[#FBD227]">{item.time.split("-")[0].trim()}</span> {item.clientName.split(" ")[0]}
                        </div>
                      ))}
                      {dateBookings.length > 2 && (
                        <div className="text-[0.6rem] font-mono text-gray-400 font-semibold px-1">
                          +{dateBookings.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Legend & Integration status */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-[#262626] text-xs font-mono text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#FBD227]"></span>
                Selected Date
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                Active Bookings
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white"></span>
                Today
              </span>
            </div>
          </div>
        </div>

        {/* Right: Selected Date Agenda & Scheduled Calls (4 cols on lg) */}
        <div className="lg:col-span-4 bg-[#111111] border border-[#262626] rounded-lg p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#262626] pb-3 mb-4">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400">
                  Agenda for
                </span>
                <h3 className="font-monument font-black text-lg text-white">
                  {selectedDate}
                </h3>
              </div>

              {canSchedule && (
                <button
                  type="button"
                  onClick={() => openCreate(selectedDate)}
                  className="font-mono text-xs font-bold text-black bg-[#FBD227] px-2.5 py-1 rounded hover:bg-white transition-colors"
                >
                  + Add
                </button>
              )}
            </div>

            {/* List of bookings for selected date */}
            {selectedDateBookings.length === 0 ? (
              <div className="text-center py-10 px-4 border border-dashed border-[#262626] rounded bg-[#0E0E0E]">
                <Icon name="calendar" className="mx-auto h-8 w-8 text-gray-600" />
                <p className="font-mono text-xs font-bold text-gray-300 mt-2">
                  No appointments scheduled
                </p>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                  This slot is completely open for client discovery calls or team sprints.
                </p>
                {canSchedule && (
                  <button
                    type="button"
                    onClick={() => openCreate(selectedDate)}
                    className="mt-3 inline-flex items-center font-mono text-xs font-bold text-black bg-[#FBD227] px-3 py-1 rounded hover:bg-white transition-colors"
                  >
                    Book this date
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateBookings.map((item) => (
                  <div
                    key={item.id}
                    className="border border-[#262626] rounded-lg p-3 bg-[#161616] hover:border-[#383838] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {item.status}
                        </span>
                        <h4 className="font-bold text-sm text-white mt-1.5 font-monument">{item.clientName}</h4>
                        <p className="text-xs text-gray-400 font-medium">{item.company}</p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-[#FBD227] block">{item.time}</span>
                        <span className="font-mono text-xs text-gray-400">{item.host}</span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#262626] text-xs">
                      <p className="font-mono text-xs text-gray-300">{item.bookingType}</p>
                      {item.notes && <p className="mt-1 text-xs text-gray-400 italic">&quot;{item.notes}&quot;</p>}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-[#262626]">
                      {isHttps(item.meetingUrl) ? (
                        <a
                          href={item.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#FBD227] text-black font-mono text-xs font-bold hover:bg-white transition-colors"
                        >
                          <span className="inline-flex items-center gap-1.5"><Icon name="video" className="h-4 w-4" />Join call</span>
                        </a>
                      ) : (
                        <span className="font-mono text-xs text-gray-500">No meeting link yet</span>
                      )}

                      {canSchedule ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            aria-label={`Edit booking with ${item.clientName}`}
                            className="px-2.5 py-1 rounded border border-[#333333] bg-[#1A1A1A] font-mono text-xs font-bold text-gray-200 hover:bg-[#262626] hover:text-white transition-colors"
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
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className="font-mono text-xs font-semibold text-gray-300">{item.status}</span>
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

      {/* All Upcoming Bookings Table */}
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
                <th className="py-2.5 px-3 text-right">Meeting Link</th>
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
                    {isHttps(item.meetingUrl) ? (
                      <a
                        href={item.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#FBD227] hover:text-white hover:underline"
                      >
                        <span>Join call</span>
                        <Icon name="video" className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="font-mono text-xs text-gray-500">No link yet</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
                    {SESSION_TYPES.map((t) => (
                      <option key={t.label} value={t.label}>
                        {t.label}
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
                      <option key={h} value={h}>
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
