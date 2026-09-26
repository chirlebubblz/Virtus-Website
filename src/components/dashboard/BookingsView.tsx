"use client";

import React, { useState } from "react";
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
  const [, setRefreshKey] = useState(0);
  const allBookings = db.getBookings();
  // Team members see their own calls and cannot schedule for others.
  const canSchedule = role === "admin";

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

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSchedule || !formClient || !formEmail) return;

    db.addBooking({
      clientName: formClient,
      company: formCompany || formClient,
      email: formEmail,
      bookingType: formType,
      date: formDate,
      time: formTime,
      host: formHost,
      meetingUrl: "", // No meeting is created here. Paste a real link on the booking once one exists.
      status: "Confirmed",
      notes: formNotes || "Scheduled from the workspace.",
    });

    setRefreshKey((k) => k + 1);
    setSelectedDate(formDate);
    setIsScheduleModalOpen(false);
    // Reset form
    setFormClient("");
    setFormCompany("");
    setFormEmail("");
    setFormNotes("");
  };

  const handleStatusChange = (bookingId: string, status: Booking["status"]) => {
    if (!canSchedule) return;
    db.updateBookingStatus(bookingId, status);
    setRefreshKey((k) => k + 1);
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
                  onClick={() => {
                    setFormDate(selectedDate);
                    setIsScheduleModalOpen(true);
                  }}
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
                    onClick={() => {
                      setFormDate(selectedDate);
                      setIsScheduleModalOpen(true);
                    }}
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
                      <p className="text-xs text-gray-400 italic">
                        &quot;{item.notes}&quot;
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-[#262626]">
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
                      <select
                        aria-label={`Status for ${item.clientName}`}
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value as Booking["status"])}
                        className={fieldCompact}
                      >
                        <option value="Confirmed">Confirmed</option>
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
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
                    Company / Project
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
                  placeholder="arthur@client.com"
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
                    <option value="15-Min Quick Alignment">15-Min Quick Alignment</option>
                    <option value="Discovery Call (30 min)">Discovery Call (30 min)</option>
                    <option value="Strategy & Scope (45 min)">Strategy & Scope (45 min)</option>
                    <option value="Sprint Kickoff (60 min)">Sprint Kickoff (60 min)</option>
                    <option value="Sprint Demo (30 min)">Sprint Demo (30 min)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="booking-field-5" className={labelClass}>
                    Host Member
                  </label>
                  <select id="booking-field-5"
                    value={formHost}
                    onChange={(e) => setFormHost(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="Paks (Studio Director)">Paks (Studio Director)</option>
                    <option value="Kai (Brand Lead)">Kai (Brand Lead)</option>
                    <option value="Ren (Lead Engineer)">Ren (Lead Engineer)</option>
                    <option value="Sora (UX Designer)">Sora (UX Designer)</option>
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
                    placeholder="10:00 AM - 10:45 AM"
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
