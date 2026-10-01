"use client";

import React, { useState } from "react";
import { db } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { fieldCompact } from "./ui";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export const ReportsView: React.FC = () => {
  const invoices = db.getInvoices();
  const opportunities = db.getOpportunities();
  const projects = db.getProjects();
  const tasks = db.getTasks();
  const teamMembers = db.getTeamMembers();
  const teamPods = db.getTeams();
  const clients = db.getClients();

  // Filter & Tab states
  const [activeTab, setActiveTab] = useState<"all" | "projects" | "tasks" | "team" | "financial">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>("all");
  const [projectRiskFilter, setProjectRiskFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  // Financial Calculations
  const collected = invoices.filter((i) => i.status === "Paid").reduce((a, b) => a + b.amount, 0);
  const outstanding = invoices.filter((i) => i.status !== "Paid").reduce((a, b) => a + b.amount, 0);
  const totalBilled = collected + outstanding;

  // Pipeline Metrics
  const openPipeline = opportunities
    .filter((o) => o.stage !== "won" && o.stage !== "lost")
    .reduce((a, b) => a + b.dealValue, 0);
  const won = opportunities.filter((o) => o.stage === "won");
  const closed = opportunities.filter((o) => o.stage === "won" || o.stage === "lost");
  const winRate = closed.length > 0 ? Math.round((won.length / closed.length) * 100) : 0;
  const averageDeal = won.length > 0 ? won.reduce((a, b) => a + b.dealValue, 0) / won.length : 0;

  // Task Performance Calculations
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const reviewTasks = tasks.filter((t) => t.status === "review").length;
  const taskCompletionRate = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const urgentTasksCount = tasks.filter((t) => (t.priority === "urgent" || t.priority === "high") && t.status !== "done").length;

  // Project Performance Calculations
  const totalProjectBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const averageProjectProgress = projects.length > 0
    ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
    : 0;
  const onTrackProjects = projects.filter((p) => p.riskLevel === "On Track").length;
  const needsReviewProjects = projects.filter((p) => p.riskLevel === "Needs Review").length;
  const atRiskProjects = projects.filter((p) => p.riskLevel === "At Risk").length;

  // Filtered Task List
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.projectTitle ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignee.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = taskStatusFilter === "all" || t.status === taskStatusFilter;
    const matchesAssignee = assigneeFilter === "all" || t.assignee.toLowerCase().includes(assigneeFilter.toLowerCase());
    return matchesSearch && matchesStatus && matchesAssignee;
  });

  // Filtered Project List
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.leadName && p.leadName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRisk = projectRiskFilter === "all" || p.riskLevel === projectRiskFilter;
    return matchesSearch && matchesRisk;
  });

  // Specialist Roster Performance Data
  const specialists = [
    { name: "Kai", fullName: "Kai", roleTitle: "Brand & Creative Lead", team: "Brand & Identity" },
    { name: "Ren", fullName: "Ren", roleTitle: "Lead Full-Stack Engineer", team: "Full-Stack Web Flagships" },
    { name: "Sora", fullName: "Sora", roleTitle: "Lead UX & Design Systems", team: "Growth & Automation" },
    { name: "Paks", fullName: "Paks", roleTitle: "Studio Director & Architect", team: "Executive Leadership" },
    ...teamMembers.map((m) => ({ name: m.name, fullName: m.name, roleTitle: m.roleTitle, team: m.teamName || "Engineering" })),
  ].filter((v, i, a) => a.findIndex((t) => t.name.toLowerCase() === v.name.toLowerCase()) === i);

  const specialistMetrics = specialists.map((sp) => {
    const assignedTasks = tasks.filter((t) => t.assignee.toLowerCase().includes(sp.name.toLowerCase()));
    const completed = assignedTasks.filter((t) => t.status === "done").length;
    const open = assignedTasks.length - completed;
    const rate = assignedTasks.length > 0 ? Math.round((completed / assignedTasks.length) * 100) : 0;
    const ledProjects = projects.filter((p) => p.leadName && p.leadName.toLowerCase().includes(sp.name.toLowerCase())).length;

    let workloadStatus: "Optimal" | "Heavy" | "Available" = "Optimal";
    if (open >= 4) workloadStatus = "Heavy";
    else if (open === 0 && assignedTasks.length === 0) workloadStatus = "Available";

    return {
      ...sp,
      totalAssigned: assignedTasks.length,
      completed,
      open,
      rate,
      ledProjects,
      workloadStatus,
    };
  });

  const printReport = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-white font-sans">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#262626] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="block h-1 w-10 bg-[#FBD227]" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FBD227]">
              OPERATIONS OS · EXECUTIVE AUDIT & TELEMETRY
            </span>
          </div>
          <h1 className="font-monument text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 uppercase">
            Performance Reports
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-3xl">
            Real-time delivery velocity, health score audits, budget tracking, and specialist throughput across every active client project and sprint task.
          </p>
        </div>

        {/* Global Report Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={printReport}
            className="px-3.5 py-2 bg-[#181818] border border-[#333333] hover:border-[#FBD227] hover:text-[#FBD227] text-white font-mono text-xs font-bold uppercase transition-colors flex items-center gap-1.5"
            title="Print or save PDF report"
          >
            <Icon name="download" className="h-3.5 w-3.5 text-[#FBD227]" />
            <span>Export / Print Report</span>
          </button>
        </div>
      </div>

      {/* Top Executive KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Project Delivery Health */}
        <div className="bg-[#111111] border border-[#262626] p-4 rounded-lg shadow-2xs space-y-1">
          <div className="flex justify-between items-center">
            <span className="font-mono text-xs text-gray-400 uppercase">Portfolio Health</span>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              {onTrackProjects} of {projects.length} On Track
            </span>
          </div>
          <span className="font-mono text-2xl font-black text-white block">
            {averageProjectProgress}% Avg Progress
          </span>
          <div className="w-full bg-[#222222] h-1.5 rounded-full overflow-hidden mt-1.5">
            <div className="bg-[#FBD227] h-full transition-all duration-500" style={{ width: `${averageProjectProgress}%` }} />
          </div>
          <span className="font-mono text-[11px] text-gray-400 block pt-1">
            {needsReviewProjects} needs review · {atRiskProjects} at risk
          </span>
        </div>

        {/* Task Velocity */}
        <div className="bg-[#111111] border border-[#262626] p-4 rounded-lg shadow-2xs space-y-1">
          <div className="flex justify-between items-center">
            <span className="font-mono text-xs text-gray-400 uppercase">Task Throughput</span>
            <span className="font-mono text-[10px] text-[#FBD227] bg-[#FBD227]/10 px-1.5 py-0.5 rounded border border-[#FBD227]/20">
              {taskCompletionRate}% Completed
            </span>
          </div>
          <span className="font-mono text-2xl font-black text-[#FBD227] block">
            {doneTasks} / {tasks.length} Done
          </span>
          <div className="w-full bg-[#222222] h-1.5 rounded-full overflow-hidden mt-1.5">
            <div className="bg-emerald-400 h-full transition-all duration-500" style={{ width: `${taskCompletionRate}%` }} />
          </div>
          <span className="font-mono text-[11px] text-gray-400 block pt-1">
            {inProgressTasks} in progress · {reviewTasks} in review · {urgentTasksCount} priority pending
          </span>
        </div>

        {/* Capital Under Delivery */}
        <div className="bg-[#111111] border border-[#262626] p-4 rounded-lg shadow-2xs space-y-1">
          <div className="flex justify-between items-center">
            <span className="font-mono text-xs text-gray-400 uppercase">Active Budgets</span>
            <span className="font-mono text-[10px] text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
              {projects.length} Engagements
            </span>
          </div>
          <span className="font-mono text-2xl font-black text-white block">
            {money(totalProjectBudget)}
          </span>
          <span className="font-mono text-[11px] text-emerald-400 block pt-2">
            {money(collected)} collected ({totalBilled > 0 ? Math.round((collected / totalBilled) * 100) : 0}%)
          </span>
          <span className="font-mono text-[10px] text-gray-400 block">
            {money(outstanding)} pending settlement
          </span>
        </div>

        {/* Pipeline & Win Rate */}
        <div className="bg-[#111111] border border-[#262626] p-4 rounded-lg shadow-2xs space-y-1">
          <div className="flex justify-between items-center">
            <span className="font-mono text-xs text-gray-400 uppercase">Conversion Velocity</span>
            <span className="font-mono text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
              {winRate}% Win Rate
            </span>
          </div>
          <span className="font-mono text-2xl font-black text-emerald-400 block">
            {money(openPipeline)} Open
          </span>
          <span className="font-mono text-[11px] text-gray-300 block pt-2">
            Avg Won Deal: {money(averageDeal)}
          </span>
          <span className="font-mono text-[10px] text-gray-400 block">
            {won.length} won · {closed.length} total closed
          </span>
        </div>
      </div>

      {/* Interactive Navigation Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262626] pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 font-mono text-xs font-bold uppercase transition-colors rounded ${
              activeTab === "all" ? "bg-[#FBD227] text-black" : "bg-[#141414] text-gray-400 hover:text-white"
            }`}
          >
            All Telemetry
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("projects")}
            className={`px-3 py-1.5 font-mono text-xs font-bold uppercase transition-colors rounded ${
              activeTab === "projects" ? "bg-[#FBD227] text-black" : "bg-[#141414] text-gray-400 hover:text-white"
            }`}
          >
            Project Reports ({projects.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`px-3 py-1.5 font-mono text-xs font-bold uppercase transition-colors rounded ${
              activeTab === "tasks" ? "bg-[#FBD227] text-black" : "bg-[#141414] text-gray-400 hover:text-white"
            }`}
          >
            Task Reports ({tasks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("team")}
            className={`px-3 py-1.5 font-mono text-xs font-bold uppercase transition-colors rounded ${
              activeTab === "team" ? "bg-[#FBD227] text-black" : "bg-[#141414] text-gray-400 hover:text-white"
            }`}
          >
            Specialist Throughput
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("financial")}
            className={`px-3 py-1.5 font-mono text-xs font-bold uppercase transition-colors rounded ${
              activeTab === "financial" ? "bg-[#FBD227] text-black" : "bg-[#141414] text-gray-400 hover:text-white"
            }`}
          >
            Client & Capital
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search project, task, or specialist..."
              className="border border-[#333333] bg-black px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-[#FBD227] focus:outline-none w-56 sm:w-64 font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1.5 text-gray-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: EVERY PROJECT PERFORMANCE REPORT */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "projects") && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-l-2 border-[#FBD227] pl-3 py-0.5">
            <div>
              <h2 className="font-monument text-base font-black uppercase text-white tracking-wide">
                Project Performance Ledger ({filteredProjects.length} Projects)
              </h2>
              <p className="text-xs text-gray-400 font-mono">
                Comprehensive progress, SLA adherence, phase milestones, and budget allocations for every engagement.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gray-400">Risk Filter:</span>
              <select
                value={projectRiskFilter}
                onChange={(e) => setProjectRiskFilter(e.target.value)}
                className={fieldCompact}
              >
                <option value="all">All Risks</option>
                <option value="On Track">On Track Only</option>
                <option value="Needs Review">Needs Review Only</option>
                <option value="At Risk">At Risk Only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((p) => {
              const projectTasks = tasks.filter((t) => t.projectId === p.id);
              const pDone = projectTasks.filter((t) => t.status === "done").length;
              const pInProg = projectTasks.filter((t) => t.status === "in_progress").length;
              const pReview = projectTasks.filter((t) => t.status === "review").length;
              const pTodo = projectTasks.filter((t) => t.status === "todo").length;
              const pTaskRate = projectTasks.length > 0 ? Math.round((pDone / projectTasks.length) * 100) : 0;
              const clientInvoices = invoices.filter((i) => i.clientId === p.clientId);
              const billedAmount = clientInvoices.reduce((a, b) => a + b.amount, 0);

              const riskBadgeColor =
                p.riskLevel === "On Track"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : p.riskLevel === "At Risk"
                  ? "bg-amber-500/10 text-[#FBD227] border-amber-500/30"
                  : "bg-red-500/10 text-red-400 border-red-500/30";

              return (
                <div
                  key={p.id}
                  className="bg-[#111111] border border-[#262626] rounded-lg p-5 shadow-2xs space-y-4 hover:border-[#383838] transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top Row: Client & Risk */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[10px] text-[#FBD227] uppercase tracking-wider block font-bold">
                          {p.clientName}
                        </span>
                        <h3 className="font-monument text-sm font-bold text-white uppercase leading-snug mt-0.5">
                          {p.title}
                        </h3>
                      </div>
                      <span className={`font-mono text-[10px] px-2 py-0.5 rounded border uppercase font-bold shrink-0 ${riskBadgeColor}`}>
                        ● {p.riskLevel}
                      </span>
                    </div>

                    {/* Progress Bar & Phase */}
                    <div className="space-y-1.5 pt-2 border-t border-[#222222]">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-gray-400">Phase: <strong className="text-white">{p.phase}</strong></span>
                        <span className="font-black text-[#FBD227]">{p.progress}% Progress</span>
                      </div>
                      <div className="w-full bg-black h-2 rounded-full overflow-hidden border border-[#262626]">
                        <div
                          className="bg-[#FBD227] h-full transition-all duration-500"
                          style={{ width: `${Math.max(5, p.progress)}%` }}
                        />
                      </div>
                    </div>

                    {/* Delivery Pod & Lead */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-black/50 p-2.5 rounded border border-[#222222]">
                      <div>
                        <span className="text-gray-400 block text-[10px]">Project Director</span>
                        <strong className="text-gray-200">👑 {p.leadName || "Kai"}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">Delivery Pod</span>
                        <strong className="text-gray-200">{p.podName || "Brand & Identity"}</strong>
                      </div>
                    </div>

                    {/* Task Velocity for this Project */}
                    <div className="space-y-1 font-mono text-xs">
                      <div className="flex justify-between text-gray-400 text-[11px]">
                        <span>Sprint Tasks Completion:</span>
                        <span className="text-white font-bold">{pDone} / {projectTasks.length} ({pTaskRate}%)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {pDone} Done
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {pInProg} In Prog
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          {pReview} Review
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-[#333333]">
                          {pTodo} Todo
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial & Timeline Footer */}
                  <div className="pt-3 border-t border-[#222222] flex items-center justify-between font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block">Contract / Invoiced</span>
                      <strong className="text-[#FBD227]">{money(p.budget)}</strong>
                      <span className="text-[10px] text-gray-400 block font-normal">
                        ({money(billedAmount)} invoiced)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block">Target Launch</span>
                      <span className="text-gray-300">{p.targetDate || "Q4 2026"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: EVERY TASK PERFORMANCE REPORT */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "tasks") && (
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-l-2 border-emerald-400 pl-3 py-0.5">
            <div>
              <h2 className="font-monument text-base font-black uppercase text-white tracking-wide">
                Task Performance Matrix ({filteredTasks.length} Tasks)
              </h2>
              <p className="text-xs text-gray-400 font-mono">
                Individual task telemetry: assignees, SLA completion state, priority ratings, and due date health.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-gray-400">Status:</span>
              <select
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value)}
                className={fieldCompact}
              >
                <option value="all">All Statuses</option>
                <option value="done">Completed (Done)</option>
                <option value="in_progress">In Progress</option>
                <option value="review">QA / Review</option>
                <option value="todo">To Do</option>
              </select>

              <span className="text-xs font-mono text-gray-400 ml-2">Assignee:</span>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className={fieldCompact}
              >
                <option value="all">All Specialists</option>
                {specialists.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border border-[#262626] rounded-lg overflow-x-auto bg-[#0D0D0D]">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead className="bg-[#161616] text-[#FBD227] uppercase text-[10px] border-b border-[#262626]">
                <tr>
                  <th className="p-3">Task Details</th>
                  <th className="p-3">Client Project</th>
                  <th className="p-3">Specialist Assignee</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Status Lane</th>
                  <th className="p-3">Target Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222] text-gray-300 text-[11px]">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-500 font-mono">
                      No tasks matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => {
                    const statusBadge =
                      t.status === "done"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : t.status === "in_progress"
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : t.status === "review"
                        ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                        : "bg-white/5 text-gray-400 border-[#333333]";

                    const priorityBadge =
                      t.priority === "urgent"
                        ? "bg-red-500/20 text-red-400 border-red-500/40 font-bold"
                        : t.priority === "high"
                        ? "bg-amber-500/20 text-[#FBD227] border-amber-500/30"
                        : t.priority === "medium"
                        ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                        : "bg-white/5 text-gray-400 border-[#262626]";

                    return (
                      <tr key={t.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3">
                          <strong className="text-white block font-sans text-xs">{t.title}</strong>
                          <span className="text-[10px] text-gray-500 font-mono">ID: {t.id}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-[#FBD227] font-bold block">{t.projectTitle}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-gray-200">👤 {t.assignee}</span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded border text-[10px] uppercase ${priorityBadge}`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded border text-[10px] uppercase font-bold ${statusBadge}`}>
                            {t.status === "done" ? "✓ Done" : t.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-gray-300">📅 {t.dueDate}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: SPECIALIST & POD THROUGHPUT MATRIX */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "team") && (
        <div className="space-y-4 pt-4">
          <div className="border-l-2 border-indigo-400 pl-3 py-0.5">
            <h2 className="font-monument text-base font-black uppercase text-white tracking-wide">
              Specialist Output & Workload Telemetry ({teamPods.length} Delivery Pods)
            </h2>
            <p className="text-xs text-gray-400 font-mono">
              Individual staff performance: task completion ratios, active project leads, and squad capacity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {specialistMetrics.map((sp) => {
              const workloadBadge =
                sp.workloadStatus === "Optimal"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : sp.workloadStatus === "Heavy"
                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                  : "bg-blue-500/20 text-blue-400 border-blue-500/30";

              return (
                <div
                  key={sp.name}
                  className="bg-[#111111] border border-[#262626] rounded-lg p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <strong className="text-white text-sm block font-monument uppercase">{sp.name}</strong>
                      <span className="text-[11px] text-gray-400 font-mono">{sp.roleTitle}</span>
                    </div>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase ${workloadBadge}`}>
                      {sp.workloadStatus}
                    </span>
                  </div>

                  <div className="space-y-1 font-mono text-xs pt-2 border-t border-[#222222]">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Completion Velocity:</span>
                      <span className="font-black text-[#FBD227]">{sp.rate}%</span>
                    </div>
                    <div className="w-full bg-black h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#FBD227] h-full" style={{ width: `${sp.rate}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 font-mono text-[10px] text-center bg-black/60 p-2 rounded border border-[#222222]">
                    <div>
                      <span className="text-gray-400 block">Done</span>
                      <strong className="text-emerald-400">{sp.completed}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Open</span>
                      <strong className="text-[#FBD227]">{sp.open}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Projects</span>
                      <strong className="text-white">{sp.ledProjects}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: CLIENT & FINANCIAL CAPITAL LEDGER */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "financial") && (
        <div className="space-y-4 pt-4">
          <div className="border-l-2 border-[#DD7230] pl-3 py-0.5">
            <h2 className="font-monument text-base font-black uppercase text-white tracking-wide">
              Client Account Financial & Settlement Ledger
            </h2>
            <p className="text-xs text-gray-400 font-mono">
              Invoiced vs paid distributions, deposit realization, and lifetime contract values by client account.
            </p>
          </div>

          <div className="border border-[#262626] rounded-lg overflow-x-auto bg-[#0D0D0D]">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead className="bg-[#161616] text-[#FBD227] uppercase text-[10px] border-b border-[#262626]">
                <tr>
                  <th className="p-3">Client Company</th>
                  <th className="p-3">Account Status</th>
                  <th className="p-3">Active Projects</th>
                  <th className="p-3">Paid / Collected</th>
                  <th className="p-3">Pending Settlement</th>
                  <th className="p-3">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222] text-gray-300 text-[11px]">
                {clients.map((c) => {
                  const clientInvoices = invoices.filter((i) => i.clientId === c.id);
                  const cPaid = clientInvoices.filter((i) => i.status === "Paid").reduce((a, b) => a + b.amount, 0);
                  const cPending = clientInvoices.filter((i) => i.status !== "Paid").reduce((a, b) => a + b.amount, 0);
                  const cTotal = cPaid + cPending;

                  return (
                    <tr key={c.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <strong className="text-white block font-sans text-xs">{c.company}</strong>
                        <span className="text-[10px] text-gray-400 font-mono">{c.name} · {c.email}</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-bold">
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-white font-bold">{c.activeProjectsCount || 1} Active</span>
                      </td>
                      <td className="p-3 font-bold text-emerald-400">
                        {money(cPaid)}
                      </td>
                      <td className="p-3 text-gray-400">
                        {money(cPending)}
                      </td>
                      <td className="p-3 font-bold text-[#FBD227]">
                        {money(cTotal || c.totalRevenue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Jump Command Footer */}
      <div className="pt-6 border-t border-[#262626] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-gray-400">
        <span>Operations OS Performance Telemetry · Updated in Real-Time</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (window.location.hash = "#tasks")}
            className="hover:text-[#FBD227] underline"
          >
            &rarr; Go to Task Board
          </button>
          <span className="text-gray-600">|</span>
          <button
            type="button"
            onClick={() => (window.location.hash = "#projects")}
            className="hover:text-[#FBD227] underline"
          >
            &rarr; Go to Project Workspaces
          </button>
        </div>
      </div>
    </div>
  );
};
