"use client";

import React, { useState } from "react";
import { db, Project, Task } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { fieldCompact } from "./ui";

interface ProjectsTasksViewProps {
  /** Which page to show. Projects lists client projects; tasks is the sprint board. */
  section?: "projects" | "tasks";
  role?: "admin" | "team";
  activeMember?: string;
  onMemberChange?: (member: string) => void;
  /** Team members cannot browse other people's boards. */
  lockMember?: boolean;
}

/** Whole-word match on the first name, so "Ren" never matches "Karen" or "Loren". */
function matchesAssignee(assignee: string, who: string): boolean {
  const tokens = (value: string) => value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const first = tokens(who)[0];
  return Boolean(first) && tokens(assignee).includes(first);
}

export const ProjectsTasksView: React.FC<ProjectsTasksViewProps> = ({
  role = "admin",
  section = "tasks",
  activeMember = "Kai (Brand Lead)",
  onMemberChange,
  lockMember = false,
}) => {
  const [allProjects] = useState<Project[]>(db.getProjects());
  const [allTasks, setAllTasks] = useState<Task[]>(db.getTasks());
  const [selectedFilterAssignee, setSelectedFilterAssignee] = useState<string>(
    role === "team" ? activeMember : "all"
  );

  const handleUpdateStatus = (taskId: string, newStatus: Task["status"]) => {
    db.updateTaskStatus(taskId, newStatus);
    setAllTasks(db.getTasks());
  };

  // Scoping logic:
  // If role is team, strictly scope to active member
  const currentAssignee = role === "team" ? activeMember : selectedFilterAssignee;

  const filteredTasks = allTasks.filter((t) => currentAssignee === "all" || matchesAssignee(t.assignee, currentAssignee));

  // Team members see only projects they have a task on. No task, no project: scoping fails closed.
  const memberProjectIds = new Set(filteredTasks.map((t) => t.projectId).filter(Boolean));
  const filteredProjects = allProjects.filter((p) => {
    if (role === "admin" || currentAssignee === "all") return true;
    return memberProjectIds.has(p.id);
  });

  const taskStatuses = [
    { id: "todo", label: "To Do", count: filteredTasks.filter((t) => t.status === "todo").length },
    { id: "in_progress", label: "In Progress", count: filteredTasks.filter((t) => t.status === "in_progress").length },
    { id: "review", label: "QA / Review", count: filteredTasks.filter((t) => t.status === "review").length },
    { id: "done", label: "Completed", count: filteredTasks.filter((t) => t.status === "done").length },
  ] as const;

  return (
    <div className="p-4 sm:p-8 max-w-[88rem] mx-auto text-white space-y-6 font-sans">
      {/* Top Header with Role Indicator */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#262626] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                role === "admin" ? "bg-[#FBD227]" : "bg-blue-400"
              } animate-pulse`}
            />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-400">
              {role === "admin"
                ? section === "projects"
                  ? "Studio Command · Client Projects"
                  : "Studio Command · All Team Workloads"
                : section === "projects"
                ? "Delivery Floor · My Projects"
                : "Delivery Floor · My Sprint Tasks"}
            </span>
          </div>
          <h1 className="font-monument text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            {role === "admin"
              ? section === "projects"
                ? "CLIENT PROJECTS"
                : "TEAM TASK BOARD"
              : section === "projects"
              ? `MY PROJECTS · ${activeMember.toUpperCase()}`
              : `SPRINT BOARD · ${activeMember.toUpperCase()}`}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            {role === "admin"
              ? section === "projects"
                ? "Every client project with its phase, progress, budget, target date and open work."
                : "Every task across the team. Filter by assignee and move tasks between lanes."
              : section === "projects"
              ? "The client projects you have tasks on."
              : "Your assigned tasks. Move them between lanes as work progresses."}
          </p>
        </div>

        {/* Member Switcher (For Team Role testing) / Filter (For Admin) */}
        {role === "team" ? (
          <div className="flex items-center gap-2 bg-[#141414] border border-[#262626] p-1.5 rounded-lg">
            <span className="text-[0.7rem] font-mono font-bold text-gray-400 uppercase px-1">
              Active Member:
            </span>
            {lockMember ? (
              <span className="font-mono text-xs font-bold text-white px-1">{activeMember}</span>
            ) : (
            <select
              aria-label="Active team member"
              value={activeMember}
              onChange={(e) => onMemberChange && onMemberChange(e.target.value)}
              className={fieldCompact}
            >
              <option value="Kai (Brand Lead)">Kai (Brand Lead)</option>
              <option value="Ren (Frontend)">Ren (Frontend)</option>
              <option value="Sora (UX)">Sora (UX)</option>
            </select>
            )}
          </div>
        ) : section === "tasks" ? (
          <div className="flex flex-wrap items-center gap-1.5 bg-[#141414] p-1 rounded-lg border border-[#262626] text-xs font-mono">
            <span className="text-[0.65rem] text-gray-400 uppercase px-2 font-bold">Assignee:</span>
            <button
              type="button"
              onClick={() => setSelectedFilterAssignee("all")}
              className={`px-2.5 py-1 rounded font-bold uppercase transition-colors ${
                selectedFilterAssignee === "all" ? "bg-[#FBD227] text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              All ({allTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilterAssignee("Kai")}
              className={`px-2.5 py-1 rounded font-bold uppercase transition-colors ${
                selectedFilterAssignee === "Kai" ? "bg-[#FBD227] text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              Kai ({allTasks.filter((t) => t.assignee.includes("Kai")).length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilterAssignee("Ren")}
              className={`px-2.5 py-1 rounded font-bold uppercase transition-colors ${
                selectedFilterAssignee === "Ren" ? "bg-[#FBD227] text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              Ren ({allTasks.filter((t) => t.assignee.includes("Ren")).length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilterAssignee("Sora")}
              className={`px-2.5 py-1 rounded font-bold uppercase transition-colors ${
                selectedFilterAssignee === "Sora" ? "bg-[#FBD227] text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              Sora ({allTasks.filter((t) => t.assignee.includes("Sora")).length})
            </button>
          </div>
        ) : null}
      </div>

      {/* Role Scoping Notice */}
      {role === "team" && (
        <div className="bg-blue-950/40 border border-blue-500/20 border-l-4 border-l-blue-500 p-3 rounded-r text-xs font-mono text-blue-200 flex items-center justify-between">
          <span>
            <Icon name="lock" className="mr-1.5 inline h-4 w-4 align-[-0.2em]" /> <strong>Team Floor Scope:</strong> You have delivery-level access. You can view and update your assigned tasks and project deliverables. Confidential client financial ledgers, studio margins, and CRM lead pipelines are restricted.
          </span>
          <span className="text-[0.65rem] text-blue-300 bg-blue-900/60 border border-blue-700/50 px-2 py-0.5 rounded font-bold">
            Team Scoped
          </span>
        </div>
      )}

      {/* Projects */}
      {section === "projects" && (
      <div>
        <h2 className="font-bold text-sm text-white mb-3 uppercase font-mono tracking-wider flex items-center justify-between">
          <span>{role === "team" ? "My Assigned Projects" : "All Client Projects"}</span>
          <span className="text-xs text-gray-400 font-normal">
            {filteredProjects.length} active delivery pod{filteredProjects.length === 1 ? "" : "s"}
          </span>
        </h2>
        {role === "admin" && filteredProjects.length === 0 && (
          <p className="mb-8 border border-[#262626] bg-[#111111] p-4 text-sm text-gray-400 rounded-lg">
            No projects yet. A project is created when a lead is moved to Won, or you can load demo data in Settings.
          </p>
        )}
        {role === "team" && filteredProjects.length === 0 && filteredTasks.length === 0 && (
          <p className="mb-8 border border-[#262626] bg-[#111111] p-4 text-sm text-gray-400 rounded-lg">
            Nothing is assigned to {activeMember} yet. Ask an admin to link your task-board profile in Staff and access.
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {filteredProjects.map((proj) => (
            <div key={proj.id} className="border border-[#262626] bg-[#111111] p-5 rounded-lg shadow-2xs hover:border-[#333333] transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-[#FBD227] bg-[#FBD227]/10 px-2 py-0.5 rounded border border-[#FBD227]/20">
                  Phase: {proj.phase}
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {proj.riskLevel}
                </span>
              </div>

              <h3 className="font-bold text-base text-white font-monument tracking-tight">{proj.title}</h3>
              <span className="text-xs text-gray-400 block mt-0.5 font-mono">Client: {proj.clientName}</span>

              <p className="mt-2 font-mono text-xs text-gray-300">
                {allTasks.filter((t) => t.projectId === proj.id && t.status !== "done").length} open of{" "}
                {allTasks.filter((t) => t.projectId === proj.id).length} tasks
              </p>

              <div className="mt-4 pt-3 border-t border-[#262626]">
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="text-gray-400">Milestone Progress</span>
                  <span className="font-bold text-[#FBD227]">{proj.progress}%</span>
                </div>
                <div className="w-full bg-[#1F1F1F] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#FBD227] h-full transition-all duration-300" style={{ width: `${proj.progress}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 font-mono mt-2">
                  <span>Target: {proj.targetDate}</span>
                  {role === "admin" && (
                    <span className="text-white font-bold">
                      Budget: ${proj.budget.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Task board */}
      {section === "tasks" && (
      <div>
        <h2 className="font-bold text-sm text-white mb-3 uppercase font-mono tracking-wider flex items-center justify-between">
          <span>{role === "team" ? "My Active Sprint Tasks" : "Master Delivery Task Board"}</span>
          <span className="text-xs text-gray-400 font-normal">
            {filteredTasks.length} task{filteredTasks.length === 1 ? "" : "s"} shown
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {taskStatuses.map((statusCol) => {
            const colTasks = filteredTasks.filter((t) => t.status === statusCol.id);
            return (
              <div key={statusCol.id} className="bg-[#111111] p-4 rounded-lg border border-[#262626] min-h-[22rem]">
                <div className="flex items-center justify-between border-b border-[#262626] pb-2 mb-3">
                  <span className="font-bold text-xs uppercase tracking-wider text-white font-monument">
                    {statusCol.label}
                  </span>
                  <span className="font-mono text-xs font-bold bg-[#1C1C1C] px-2 py-0.5 rounded border border-[#262626] text-[#FBD227]">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {colTasks.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-6 font-mono">No tasks in this lane</p>
                  ) : (
                    colTasks.map((t) => (
                      <div key={t.id} className="bg-[#161616] border border-[#262626] p-3.5 rounded hover:border-[#383838] transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[0.65rem] font-mono text-gray-400 truncate max-w-[120px]">
                            {t.projectTitle}
                          </span>
                          <span
                            className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded uppercase border ${
                              t.priority === "urgent"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                : t.priority === "high"
                                ? "bg-amber-500/10 text-[#FBD227] border-amber-500/20"
                                : "bg-white/5 text-gray-400 border-[#262626]"
                            }`}
                          >
                            {t.priority}
                          </span>
                        </div>

                        <h4 className="font-medium text-xs text-white leading-snug">{t.title}</h4>

                        <div className="mt-3 pt-2 border-t border-[#262626] flex items-center justify-between text-[0.68rem] text-gray-400 font-mono">
                          <span className="inline-flex items-center gap-1"><Icon name="user" className="h-3.5 w-3.5" />{t.assignee}</span>
                          <span>Due: {t.dueDate}</span>
                        </div>

                        {/* Status Transition Control */}
                        <div className="mt-2 pt-2 border-t border-[#222222] flex items-center justify-between">
                          <span className="text-xs text-gray-400">Move lane:</span>
                          <select
                            aria-label={`Move task ${t.title}`}
                            value={t.status}
                            onChange={(e) => handleUpdateStatus(t.id, e.target.value as Task["status"])}
                            className={fieldCompact}
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="review">QA / Review</option>
                            <option value="done">Completed</option>
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
};
