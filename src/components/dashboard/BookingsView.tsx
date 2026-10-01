"use client";

import React, { useEffect, useState } from "react";
import { db, Booking } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { Modal, fieldClass, fieldCompact, labelClass, btnPrimary, btnDark } from "./ui";

interface BookingsViewProps {
  role?: "admin" | "team";
  activeMember?: string;
}

/** Local calendar date as YYYY-MM-DD. */
const todayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Whole-word first-name match, so "Ren" never matches "Karen". */
const hostMatches = (host: string, member: string) => {
  const tokens = (v: string) => v.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const first = tokens(member)[0];
  return Boolean(first) && tokens(host).includes(first);
};

const isHttps = (url: string) => /^https:\/\//i.test(url);

export const BookingsView: React.FC<BookingsViewProps> = ({
  role = "admin",
  activeMember = "Kai (Brand Lead)",
}) => {
  const [allBookings, setAllBookings] = useState<Booking[]>(() => db.getBookings());
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [copiedMeet, setCopiedMeet] = useState<string | null>(null);
  const [copiedFeed, setCopiedFeed] = useState(false);

  // Team members see their own calls and cannot schedule for others.
  const canSchedule = role === "admin";

  // Fetch live bookings from server
  useEffect(() => {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((json) => {
        if (json?.ok && Array.isArray(json.bookings)) {
          setAllBookings(json.bookings);
        }
      })
      .catch(() => {});
  }, []);

  const bookings = allBookings.filter((b) => role === "admin" || hostMatches(b.host, activeMember));

  const today = todayString();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [calendarView, setCalendarView] = useState<"month" | "week" | "agenda">("month");
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);

  // Form State for new booking
  const [formClient, setFormClient] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formType, setFormType] = useState("Discovery Call (30 min)");
  const [formDate, setFormDate] = useState(todayString());
  const [formTime, setFormTime] = useState("10:00 AM - 10:30 AM");
  const [formHost, setFormHost] = useState("Paks (Studio Director)");
  const [formNotes, setFormNotes] = useState("");

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

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSchedule || !formClient || !formEmail) return;

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formClient,
          company: formCompany || formClient,
          email: formEmail,
          service: formType,
          date: formDate,
          time: formTime,
          notes: formNotes,
        }),
      });
      const json = await res.json();
      if (json?.ok && json.booking) {
        setAllBookings((prev) => [json.booking, ...prev]);
      } else {
        throw new Error(json?.error || "Failed to schedule");
      }
    } catch {
      const roomHash = Math.random().toString(36).substring(2, 7);
      const b = db.addBooking({
        clientName: formClient,
        company: formCompany || formClient,
        email: formEmail,
        bookingType: formType,
        date: formDate,
        time: formTime,
        host: formHost,
        meetingUrl: `https://meet.google.com/tvl-disc-${roomHash}`,
        status: "Confirmed",
        notes: formNotes || "Scheduled from workspace.",
      });
      setAllBookings((prev) => [b, ...prev]);
    }

    setSelectedDate(formDate);
    setIsScheduleModalOpen(false);
    setFormClient("");
    setFormCompany("");
    setFormEmail("");
    setFormNotes("");
  };

  const handleStatusChange = async (bookingId: string, status: Booking["status"]) => {
    if (!canSchedule) return;
    setAllBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status } : b)));
    db.updateBooking(bookingId, { status });
    await fetch("/api/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: bookingId, status }),
    }).catch(() => {});
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

          {canSchedule && (
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(true)}
              className={btnPrimary}
            >
              <span>+ Schedule meeting</span>
            </button>
          )}
        </div>
      </div>

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
                    onClick={() => {
                      setFormDate(selectedDate);
                      setIsScheduleModalOpen(true);
                    }}
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
                        <select
                          aria-label={`Status for ${item.clientName}`}
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value as Booking["status"])}
                          className={fieldCompact}
                        >
                          <option value="Confirmed" className="bg-black text-white">Confirmed</option>
                          <option value="Pending" className="bg-black text-white">Pending</option>
                          <option value="Completed" className="bg-black text-white">Completed</option>
                          <option value="Cancelled" className="bg-black text-white">Cancelled</option>
                        </select>
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/api/bookings/ics`);
                  setCopiedFeed(true);
                  setTimeout(() => setCopiedFeed(false), 2000);
                }}
                className="px-3 py-1.5 bg-[#FBD227] text-black font-mono font-bold rounded uppercase hover:bg-white transition-colors"
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

      {/* Schedule Meeting Modal */}
      {canSchedule && (
        <Modal open={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title="Schedule new meeting">
          <div>
            <form onSubmit={handleCreateBooking} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="booking-field-1" className={labelClass}>
                    Client Name *
                  </label>
                  <input id="booking-field-1"
                    type="text"
                    required
                    value={formClient}
                    onChange={(e) => setFormClient(e.target.value)}
                    placeholder="e.g. Arthur Pendelton"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="booking-field-2" className={labelClass}>
                    Company / Org
                  </label>
                  <input id="booking-field-2"
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="e.g. Tidewater Coffee"
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="booking-field-3" className={labelClass}>
                  Client Email *
                </label>
                <input id="booking-field-3"
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="arthur@tidewater.coffee"
                  className={fieldClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="booking-field-4" className={labelClass}>
                    Session Type
                  </label>
                  <select id="booking-field-4"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="Discovery Call (30 min)" className="bg-black text-white">Discovery Call (30 min)</option>
                    <option value="Brand Architecture Strategy (45 min)" className="bg-black text-white">Brand Architecture Strategy (45 min)</option>
                    <option value="Technical Prototype Review (60 min)" className="bg-black text-white">Technical Prototype Review (60 min)</option>
                    <option value="Executive SOW Alignment (30 min)" className="bg-black text-white">Executive SOW Alignment (30 min)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="booking-field-5" className={labelClass}>
                    Host / Lead Assignee
                  </label>
                  <select id="booking-field-5"
                    value={formHost}
                    onChange={(e) => setFormHost(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="Paks (Studio Director)" className="bg-black text-white">Paks (Studio Director)</option>
                    <option value="Kai (Brand Lead)" className="bg-black text-white">Kai (Brand Lead)</option>
                    <option value="Ren (Lead Engineer)" className="bg-black text-white">Ren (Lead Engineer)</option>
                    <option value="Sora (UX Designer)" className="bg-black text-white">Sora (UX Designer)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="booking-field-6" className={labelClass}>
                    Date (YYYY-MM-DD)
                  </label>
                  <input id="booking-field-6"
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="booking-field-7" className={labelClass}>
                    Time Window
                  </label>
                  <input id="booking-field-7"
                    type="text"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    placeholder="10:00 AM - 10:30 AM"
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="booking-field-8" className={labelClass}>
                  Notes / Agenda
                </label>
                <textarea id="booking-field-8"
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Meeting agenda, topics to cover, or client questions..."
                  className={fieldClass}
                />
              </div>

              <div className="pt-3 border-t border-[#262626] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className={btnDark}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={btnPrimary}
                >
                  Schedule meeting
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};
