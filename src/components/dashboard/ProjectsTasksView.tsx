"use client";

import React, { useCallback, useEffect, useState } from "react";
import { db, Invoice, Project, Task } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { errorText, workspaceApi } from "./api";
import { Modal, fieldClass, labelClass, btnPrimary, btnGhost, fieldCompact } from "./ui";

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

interface TasksPayload {
  tasks: Task[];
  assignees: string[];
  /** The signed-in team member's label; null for admins. */
  member: string | null;
}

export const ProjectsTasksView: React.FC<ProjectsTasksViewProps> = ({
  role = "admin",
  section = "tasks",
  activeMember = "Kai (Brand Lead)",
  onMemberChange,
  lockMember = false,
}) => {
  // Projects and tasks live in the database. The server already limits a team member to their own work.
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<string[]>([]);
  const [member, setMember] = useState<string | null>(null);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [load, setLoad] = useState<"loading" | "ready" | "error">("loading");
  const [actionError, setActionError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedFilterAssignee, setSelectedFilterAssignee] = useState<string>(
    role === "team" ? activeMember : "all"
  );

  // Modals State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Project Workspace Inspection Modal State
  const [inspectingProject, setInspectingProject] = useState<Project | null>(null);
  const [projProgress, setProjProgress] = useState(0);
  const [projPhase, setProjPhase] = useState<Project["phase"]>("Build");
  const [projRisk, setProjRisk] = useState<Project["riskLevel"]>("On Track");
  const [projTargetDate, setProjTargetDate] = useState("");
  const [projLeadName, setProjLeadName] = useState("");
  const [projLeadRole, setProjLeadRole] = useState("");
  const [projSaving, setProjSaving] = useState(false);
  const [projNotice, setProjNotice] = useState<string | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<"overview" | "team" | "docs" | "tasks">("overview");

  // Create Form State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("");
  const [taskAssignee, setTaskAssignee] = useState(
    role === "team" ? activeMember : "Kai (Brand Lead)"
  );
  const [taskStatus, setTaskStatus] = useState<Task["status"]>("todo");
  const [taskPriority, setTaskPriority] = useState<Task["priority"]>("medium");
  const [taskDueDate, setTaskDueDate] = useState("Tomorrow");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Form State
  const [editTitle, setEditTitle] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editAssignee, setEditAssignee] = useState("");
  const [editStatus, setEditStatus] = useState<Task["status"]>("todo");
  const [editPriority, setEditPriority] = useState<Task["priority"]>("medium");
  const [editDueDate, setEditDueDate] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const loadAll = useCallback(() => {
    setLoad("loading");
    Promise.all([
      workspaceApi<Project[]>("/api/projects"),
      workspaceApi<TasksPayload>("/api/tasks"),
      // Billing is admin only; team members never load it.
      role === "admin" ? workspaceApi<Invoice[]>("/api/invoices").catch(() => [] as Invoice[]) : Promise.resolve([] as Invoice[]),
    ])
      .then(([projects, tasks, invoices]) => {
        setAllProjects(projects);
        setAllTasks(tasks.tasks);
        setAssigneeOptions(tasks.assignees);
        setMember(tasks.member);
        setAllInvoices(invoices);
        setLoad("ready");
      })
      .catch(() => setLoad("error"));
  }, [role]);

  useEffect(loadAll, [loadAll]);

  /** The person a new task goes to by default: the member themself, else the first person on the list. */
  const defaultAssignee = () => member ?? assigneeOptions[0] ?? "";

  const openCreateModal = (presetStatus: Task["status"] = "todo", defaultProjectId?: string) => {
    setTaskTitle("");
    setTaskProjectId(defaultProjectId || allProjects[0]?.id || "");
    setTaskAssignee(defaultAssignee());
    setTaskStatus(presetStatus);
    setTaskPriority("medium");
    setTaskDueDate("Tomorrow");
    setFormError(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditProjectId(task.projectId || "");
    setEditAssignee(task.assignee);
    setEditStatus(task.status);
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate);
    setFormError(null);
  };

  const openProjectWorkspace = (proj: Project) => {
    setInspectingProject(proj);
    setProjProgress(proj.progress);
    setProjPhase(proj.phase);
    setProjRisk(proj.riskLevel);
    setProjTargetDate(proj.targetDate);
    setProjLeadName(proj.leadName || "Kai");
    setProjLeadRole(proj.leadRole || "Brand & Creative Lead");
    setProjNotice(null);
    setWorkspaceTab("overview");
  };

  const replaceTask = (saved: Task) => setAllTasks((list) => list.map((t) => (t.id === saved.id ? saved : t)));

  const handleSaveProjectProgress = async () => {
    if (!inspectingProject) return;
    setProjSaving(true);
    setProjNotice(null);
    // Team members may change progress, phase and risk only; the server refuses anything else.
    const changes =
      role === "admin"
        ? { progress: projProgress, phase: projPhase, riskLevel: projRisk, targetDate: projTargetDate, leadName: projLeadName, leadRole: projLeadRole }
        : { progress: projProgress, phase: projPhase, riskLevel: projRisk };
    try {
      const saved = await workspaceApi<Project>("/api/projects", "PATCH", { id: inspectingProject.id, ...changes });
      setAllProjects((list) => list.map((p) => (p.id === saved.id ? saved : p)));
      setInspectingProject(saved);
      setProjNotice("Project saved.");
    } catch (err) {
      setProjNotice(`Not saved: ${errorText(err, "try again.")}`);
    } finally {
      setProjSaving(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: Task["status"]) => {
    const previous = allTasks;
    setActionError(null);
    setAllTasks((list) => list.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    try {
      replaceTask(await workspaceApi<Task>("/api/tasks", "PATCH", { id: taskId, status: newStatus }));
    } catch (err) {
      setAllTasks(previous);
      setActionError(errorText(err, "Could not move the task."));
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!taskTitle.trim()) return setFormError("Enter a task title.");
    setIsSubmitting(true);
    setFormError(null);
    try {
      const created = await workspaceApi<Task>("/api/tasks", "POST", {
        title: taskTitle.trim(),
        projectId: taskProjectId || undefined,
        assignee: taskAssignee,
        status: taskStatus,
        priority: taskPriority,
        dueDate: taskDueDate.trim() || "Upcoming",
      });
      setAllTasks((list) => [...list, created]);
      setIsCreateOpen(false);
    } catch (err) {
      setFormError(errorText(err, "Could not create the task."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || editSubmitting) return;
    if (!editTitle.trim()) return setFormError("Enter a task title.");
    setEditSubmitting(true);
    setFormError(null);
    try {
      const saved = await workspaceApi<Task>("/api/tasks", "PATCH", {
        id: editingTask.id,
        title: editTitle.trim(),
        projectId: editProjectId || "",
        ...(role === "admin" ? { assignee: editAssignee } : {}),
        status: editStatus,
        priority: editPriority,
        dueDate: editDueDate.trim() || editingTask.dueDate,
      });
      replaceTask(saved);
      setEditingTask(null);
    } catch (err) {
      setFormError(errorText(err, "Could not save the task."));
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!editingTask || role !== "admin") return;
    if (!window.confirm(`Are you sure you want to delete task "${editingTask.title}"?`)) return;
    setEditSubmitting(true);
    setFormError(null);
    try {
      await workspaceApi(`/api/tasks?id=${encodeURIComponent(editingTask.id)}`, "DELETE");
      setAllTasks((list) => list.filter((t) => t.id !== editingTask.id));
      setEditingTask(null);
    } catch (err) {
      setFormError(errorText(err, "Could not delete the task."));
    } finally {
      setEditSubmitting(false);
    }
  };

  // Scoping logic:
  // If role is team, strictly scope to active member
  const currentAssignee = role === "team" ? activeMember : selectedFilterAssignee;

  // The server already returns only a team member's own tasks; the filter here drives the admin assignee buttons.
  const filteredTasks = role === "team" ? allTasks : allTasks.filter((t) => currentAssignee === "all" || matchesAssignee(t.assignee, currentAssignee));

  // Team members see only projects they have a task on (also enforced by the server).
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

  // Selected project auxiliary data
  const inspectingTasks = inspectingProject ? allTasks.filter((t) => t.projectId === inspectingProject.id) : [];
  // ponytail: media assets are still the in-memory sample until the Library phase stores them.
  const inspectingMedia = inspectingProject ? db.getMediaAssets(inspectingProject.clientId) : [];
  const inspectingInvoices = inspectingProject ? allInvoices.filter((i) => i.clientId === inspectingProject.clientId) : [];

  const errorBox = (message: string | null) =>
    message && (
      <p role="alert" className="border border-[#DD7230] bg-[#DD7230]/10 px-3 py-2 font-sans text-xs text-white">
        {message}
      </p>
    );

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
                ? "Click any client project to inspect team leads, assigned personnel, media assets, docs, and update progress."
                : "Every task across the team. Filter by assignee, add new tickets, and move tasks between lanes."
              : section === "projects"
              ? "The client projects you have tasks on. Click to inspect deliverables and progress."
              : "Your assigned tasks. Move them between lanes as work progresses."}
          </p>
        </div>

        {/* Member Switcher (For Team Role) / Filter + Add Task (For Admin & Tasks) */}
        <div className="flex flex-wrap items-center gap-3">
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

          {/* + Add Task Button */}
          {section === "tasks" && (
            <button
              type="button"
              onClick={() => openCreateModal()}
              className={btnPrimary}
            >
              <Icon name="plus" className="h-4 w-4" />
              <span>+ Add Task</span>
            </button>
          )}
        </div>
      </div>

      {load === "error" && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-[#DD7230] bg-[#DD7230]/10 px-4 py-3 text-xs">
          <span>Projects and tasks could not be loaded. Check your connection and try again.</span>
          <button type="button" onClick={loadAll} className={btnGhost}>
            Retry
          </button>
        </div>
      )}
      {load === "loading" && <p role="status" className="font-mono text-xs text-gray-400">Loading projects and tasks…</p>}
      {errorBox(actionError)}

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

      {/* Projects Grid View */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            {filteredProjects.map((proj) => {
              const openCount = allTasks.filter((t) => t.projectId === proj.id && t.status !== "done").length;
              const totalCount = allTasks.filter((t) => t.projectId === proj.id).length;

              return (
                <div
                  key={proj.id}
                  onClick={() => openProjectWorkspace(proj)}
                  className="border border-[#262626] bg-[#111111] p-5 rounded-xl shadow-lg hover:border-[#FBD227]/70 cursor-pointer transition-all hover:bg-[#141414] group flex flex-col justify-between"
                >
                  <div>
                    {/* Header Badges */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold text-[#FBD227] bg-[#FBD227]/10 px-2.5 py-0.5 rounded border border-[#FBD227]/30">
                        Phase: {proj.phase}
                      </span>
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                          proj.riskLevel === "On Track"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : proj.riskLevel === "Needs Review"
                            ? "bg-amber-500/10 text-[#FBD227] border-amber-500/30"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        }`}
                      >
                        {proj.riskLevel}
                      </span>
                    </div>

                    <h3 className="font-bold text-lg text-white font-monument tracking-tight group-hover:text-[#FBD227] transition-colors flex items-center justify-between">
                      <span>{proj.title}</span>
                      <span className="text-sm font-mono text-gray-500 group-hover:text-[#FBD227] group-hover:translate-x-1 transition-all">
                        →
                      </span>
                    </h3>
                    <span className="text-xs text-gray-400 block mt-1 font-mono">Client: {proj.clientName}</span>

                    {/* Who is in charge badge */}
                    <div className="mt-3.5 flex items-center justify-between border border-[#262626] bg-[#161616] px-3 py-2 rounded-lg text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-full bg-[#FBD227] text-black font-bold flex items-center justify-center text-[10px]">
                          {(proj.leadName || "K").charAt(0)}
                        </span>
                        <div>
                          <span className="text-white font-bold block">{proj.leadName || "Kai"}</span>
                          <span className="text-[10px] text-gray-400">{proj.leadRole || "Project Lead"}</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-black/60 border border-[#333333] text-[#FBD227]">
                        {proj.podName || "Delivery Pod"}
                      </span>
                    </div>

                    {/* Deliverables summary */}
                    <div className="mt-3 flex items-center justify-between text-xs font-mono text-gray-300">
                      <span>Tasks: {openCount} open of {totalCount}</span>
                      <span className="text-gray-400">{proj.docs?.length || 3} Docs / Media</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-[#262626]">
                    <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                      <span className="text-gray-400">Milestone Progress</span>
                      <span className="font-bold text-[#FBD227]">{proj.progress}%</span>
                    </div>
                    <div className="w-full bg-[#1F1F1F] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#FBD227] h-full transition-all duration-300"
                        style={{ width: `${proj.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400 font-mono mt-2.5">
                      <span>Target: {proj.targetDate}</span>
                      {role === "admin" && (
                        <span className="text-white font-bold">
                          Budget: ${proj.budget.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-[#202020] flex items-center justify-between text-xs font-mono text-[#FBD227]">
                      <span className="group-hover:underline">Inspect Workspace & Update</span>
                      <span>Open →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task Board */}
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
                <div key={statusCol.id} className="bg-[#111111] p-4 rounded-lg border border-[#262626] min-h-[22rem] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-[#262626] pb-2 mb-3">
                      <span className="font-bold text-xs uppercase tracking-wider text-white font-monument">
                        {statusCol.label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold bg-[#1C1C1C] px-2 py-0.5 rounded border border-[#262626] text-[#FBD227]">
                          {colTasks.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => openCreateModal(statusCol.id)}
                          className="h-6 w-6 rounded bg-[#1C1C1C] hover:bg-[#FBD227] hover:text-black text-gray-400 border border-[#333333] flex items-center justify-center text-xs font-bold transition-colors"
                          title={`Add task to ${statusCol.label}`}
                        >
                          <Icon name="plus" className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {colTasks.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-6 font-mono">No tasks in this lane</p>
                      ) : (
                        colTasks.map((t) => (
                          <div key={t.id} className="bg-[#161616] border border-[#262626] p-3.5 rounded hover:border-[#383838] transition-colors group">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[0.65rem] font-mono text-gray-400 truncate max-w-[120px]">
                                {t.projectTitle || "Internal Studio"}
                              </span>
                              <div className="flex items-center gap-1.5">
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
                                <button
                                  type="button"
                                  onClick={() => openEditModal(t)}
                                  className="h-6 w-6 rounded bg-[#202020] border border-[#333333] hover:border-[#FBD227] text-gray-400 hover:text-[#FBD227] flex items-center justify-center transition-colors"
                                  title="Edit / Update task"
                                >
                                  <Icon name="pencil" className="h-3 w-3" />
                                </button>
                              </div>
                            </div>

                            <h4 className="font-medium text-xs text-white leading-snug">{t.title}</h4>

                            <div className="mt-3 pt-2 border-t border-[#262626] flex items-center justify-between text-[0.68rem] text-gray-400 font-mono">
                              <span className="inline-flex items-center gap-1">
                                <Icon name="user" className="h-3.5 w-3.5" />
                                {t.assignee}
                              </span>
                              <span>Due: {t.dueDate}</span>
                            </div>

                            {/* Status Transition Control & Edit Details */}
                            <div className="mt-2 pt-2 border-t border-[#222222] flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => openEditModal(t)}
                                className="text-[11px] font-mono text-gray-400 hover:text-[#FBD227] transition-colors"
                              >
                                Edit details
                              </button>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">Lane:</span>
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
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Quick Add at lane bottom */}
                  <button
                    type="button"
                    onClick={() => openCreateModal(statusCol.id)}
                    className="w-full mt-3 py-1.5 border border-dashed border-[#262626] hover:border-[#FBD227]/50 text-gray-500 hover:text-[#FBD227] text-xs font-mono rounded transition-colors text-center"
                  >
                    + Add to {statusCol.label}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: PROJECT WORKSPACE & PROGRESS CONTROLLER */}
      {/* ============================================================== */}
      <Modal
        open={inspectingProject !== null}
        onClose={() => setInspectingProject(null)}
        title={inspectingProject ? `${inspectingProject.title} — Workspace & Progress` : "Project Details"}
      >
        {inspectingProject && (
          <div className="space-y-5 text-white">
            {/* Project Header Banner */}
            <div className="border border-[#262626] bg-[#141414] p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#FBD227] uppercase">
                    Client: {inspectingProject.clientName}
                  </span>
                  <span className="text-gray-500">·</span>
                  <span className="text-xs font-mono text-gray-400">ID: {inspectingProject.id}</span>
                </div>
                <h3 className="font-monument text-lg font-bold text-white mt-1">
                  {inspectingProject.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#FBD227] bg-[#FBD227]/10 px-2.5 py-1 rounded border border-[#FBD227]/30">
                  Phase: {projPhase}
                </span>
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {projRisk}
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-[#262626] pb-1 text-xs font-mono">
              <button
                type="button"
                onClick={() => setWorkspaceTab("overview")}
                className={`px-3 py-1.5 rounded font-bold uppercase transition-colors ${
                  workspaceTab === "overview" ? "bg-[#FBD227] text-black" : "text-gray-400 hover:text-white"
                }`}
              >
                1. Progress & Phase
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceTab("team")}
                className={`px-3 py-1.5 rounded font-bold uppercase transition-colors ${
                  workspaceTab === "team" ? "bg-[#FBD227] text-black" : "text-gray-400 hover:text-white"
                }`}
              >
                2. Who&apos;s in Charge &amp; Team
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceTab("docs")}
                className={`px-3 py-1.5 rounded font-bold uppercase transition-colors ${
                  workspaceTab === "docs" ? "bg-[#FBD227] text-black" : "text-gray-400 hover:text-white"
                }`}
              >
                3. Media, Docs & Data
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceTab("tasks")}
                className={`px-3 py-1.5 rounded font-bold uppercase transition-colors ${
                  workspaceTab === "tasks" ? "bg-[#FBD227] text-black" : "text-gray-400 hover:text-white"
                }`}
              >
                4. Sprint Tasks ({inspectingTasks.length})
              </button>
            </div>

            {projNotice && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 rounded font-mono text-xs">
                {projNotice}
              </div>
            )}

            {/* ================= TAB 1: OVERVIEW & PROGRESS CONTROLLER ================= */}
            {workspaceTab === "overview" && (
              <div className="space-y-4">
                {/* Visual Progress Bar & Slider */}
                <div className="border border-[#262626] bg-[#161616] p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-monument text-xs uppercase text-white font-bold tracking-wider block">
                        Milestone Completion Progress
                      </span>
                      <span className="text-[11px] text-gray-400">
                        Adjust progress bar to sync with client portal and sprint dashboards.
                      </span>
                    </div>
                    <span className="font-monument text-3xl font-black text-[#FBD227]">
                      {projProgress}%
                    </span>
                  </div>

                  {/* Animated Bar */}
                  <div className="w-full bg-[#202020] h-3.5 rounded-full overflow-hidden border border-[#333333]">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-[#FBD227] h-full transition-all duration-300"
                      style={{ width: `${projProgress}%` }}
                    />
                  </div>

                  {/* Interactive Slider + Numeric Input */}
                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={projProgress}
                      onChange={(e) => setProjProgress(Number(e.target.value))}
                      className="w-full accent-[#FBD227] cursor-pointer h-2 bg-[#262626] rounded-lg"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={projProgress}
                        onChange={(e) => setProjProgress(Math.max(0, Math.min(100, Number(e.target.value))))}
                        className="w-16 border border-[#333333] bg-black px-2 py-1 font-mono text-sm text-[#FBD227] text-center font-bold rounded"
                      />
                      <span className="font-mono text-xs text-gray-400">%</span>
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-mono text-gray-400 uppercase mr-1">Presets:</span>
                    {[10, 25, 35, 50, 68, 75, 90, 100].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setProjProgress(val)}
                        className={`text-xs font-mono px-2 py-0.5 rounded border transition-colors ${
                          projProgress === val
                            ? "bg-[#FBD227] text-black border-[#FBD227] font-bold"
                            : "bg-[#1C1C1C] text-gray-300 border-[#333333] hover:text-white hover:border-gray-500"
                        }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phase, Risk, & Target Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Phase Stage</label>
                    <select
                      value={projPhase}
                      onChange={(e) => setProjPhase(e.target.value as Project["phase"])}
                      className={fieldClass}
                    >
                      <option value="Discover">Discover (Scoping & Strategy)</option>
                      <option value="Design">Design (Figma & Prototypes)</option>
                      <option value="Build">Build (Development & Sprints)</option>
                      <option value="Deliver">Deliver (QA, Staging & Sign-off)</option>
                      <option value="Support">Support (Maintenance & Growth)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Risk Assessment</label>
                    <select
                      value={projRisk}
                      onChange={(e) => setProjRisk(e.target.value as Project["riskLevel"])}
                      className={fieldClass}
                    >
                      <option value="On Track">On Track</option>
                      <option value="Needs Review">Needs Review</option>
                      <option value="At Risk">At Risk</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Target Launch Date</label>
                    <input
                      type="date"
                      value={projTargetDate}
                      onChange={(e) => setProjTargetDate(e.target.value)}
                      disabled={role !== "admin"}
                      className={fieldClass}
                    />
                  </div>
                </div>

                {/* Live Deliverables Checklist */}
                <div>
                  <span className="text-xs font-mono uppercase text-gray-400 font-bold block mb-2">
                    Active Deliverables Status
                  </span>
                  <div className="space-y-2">
                    {(inspectingProject.deliverables || [
                      { title: "Discovery & Brand Architecture", status: "Approved", approvedAt: "2026-09-24" },
                      { title: "Next.js Core Architecture & Staging Platform", status: "In Review" },
                      { title: "Full Production Launch & Content Engine", status: "Pending" },
                    ]).map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between border border-[#222222] bg-[#141414] px-3.5 py-2.5 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              d.status === "Approved"
                                ? "bg-emerald-400"
                                : d.status === "In Review"
                                ? "bg-[#FBD227]"
                                : "bg-gray-600"
                            }`}
                          />
                          <span className="font-bold text-white">{d.title}</span>
                        </div>
                        <span
                          className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                            d.status === "Approved"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : d.status === "In Review"
                              ? "bg-amber-500/10 text-[#FBD227] border-amber-500/30"
                              : "bg-gray-800 text-gray-400 border-gray-700"
                          }`}
                        >
                          {d.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={projSaving}
                    onClick={handleSaveProjectProgress}
                    className={btnPrimary}
                  >
                    {projSaving ? "Saving..." : "Save Progress & Phase"}
                  </button>
                </div>
              </div>
            )}

            {/* ================= TAB 2: WHO IS IN CHARGE & TEAM SQUAD ================= */}
            {workspaceTab === "team" && (
              <div className="space-y-4">
                {/* Leader Box */}
                <div className="border border-[#262626] bg-[#161616] p-4 rounded-lg">
                  <span className="text-xs font-mono uppercase text-gray-400 font-bold block mb-2">
                    Who is in Charge (Project Lead)
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FBD227] font-monument font-black text-black text-lg">
                        {projLeadName.charAt(0) || "K"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{projLeadName}</span>
                          <span className="text-[10px] font-mono text-[#FBD227] bg-[#FBD227]/10 border border-[#FBD227]/30 px-1.5 py-0.5 rounded">
                            👑 Accountable Lead
                          </span>
                        </div>
                        <span className="text-xs font-mono text-gray-400 block mt-0.5">{projLeadRole}</span>
                        <span className="text-[11px] font-mono text-sky-400 block mt-0.5">
                          Delivery Pod: {inspectingProject.podName || "Brand & Creative Pod"}
                        </span>
                      </div>
                    </div>

                    <div className="w-full sm:w-64">
                      <label className={labelClass}>Reassign Lead</label>
                      <select
                        value={projLeadName}
                        disabled={role !== "admin"}
                        onChange={(e) => {
                          const chosen = e.target.value;
                          setProjLeadName(chosen);
                          if (chosen === "Ren") setProjLeadRole("Lead Frontend Engineer");
                          else if (chosen === "Kai") setProjLeadRole("Brand & Creative Lead");
                          else if (chosen === "Sora") setProjLeadRole("UX & Product Designer");
                          else if (chosen === "Paks") setProjLeadRole("Studio Director & Owner");
                        }}
                        className={fieldClass}
                      >
                        <option value="Kai">Kai (Brand & Creative Lead)</option>
                        <option value="Ren">Ren (Lead Frontend Engineer)</option>
                        <option value="Sora">Sora (UX & Product Designer)</option>
                        <option value="Paks">Paks (Studio Director & Owner)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Team Roster for this project */}
                <div>
                  <span className="text-xs font-mono uppercase text-gray-400 font-bold block mb-2">
                    Assigned Project Specialists & Engineers
                  </span>
                  <div className="space-y-2">
                    {(inspectingProject.teamMembers || [
                      "Kai (Brand Lead)",
                      "Ren (Frontend)",
                      "Sora (UX)",
                    ]).map((member, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between border border-[#222222] bg-[#141414] px-3.5 py-2.5 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded bg-[#262626] font-mono font-bold text-gray-200">
                            {member.charAt(0)}
                          </span>
                          <div>
                            <span className="font-bold text-white block">{member}</span>
                            <span className="text-[10px] font-mono text-gray-400">Assigned Delivery Specialist</span>
                          </div>
                        </div>
                        <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          Active on Project
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {role === "admin" && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={projSaving}
                      onClick={handleSaveProjectProgress}
                      className={btnPrimary}
                    >
                      {projSaving ? "Saving..." : "Save Assigned Lead"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ================= TAB 3: MEDIA, DOCS & CLOUD DATA ================= */}
            {workspaceTab === "docs" && (
              <div className="space-y-4">
                {/* Architecture Docs & Specs */}
                <div>
                  <span className="text-xs font-mono uppercase text-gray-400 font-bold block mb-2">
                    Specifications, Design Systems & Live Links
                  </span>
                  <div className="space-y-2">
                    {(inspectingProject.docs || [
                      { title: "Brand Identity & Stylebook (PDF)", url: "/assets/brand-guide.pdf", type: "Brand Kit", size: "14.2 MB" },
                      { title: "Next.js & Shopify Headless Spec", url: "https://github.com/chirlebubblz/Virtus-Website", type: "Technical Spec", size: "Cloud" },
                      { title: "Figma UI/UX Prototypes & Flows", url: "https://figma.com/@virtuslabs", type: "Design System", size: "Figma" },
                    ]).map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between border border-[#222222] bg-[#141414] px-3.5 py-2.5 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon name="file" className="h-4 w-4 text-[#FBD227]" />
                          <div>
                            <span className="font-bold text-white block">{doc.title}</span>
                            <span className="text-[10px] font-mono text-gray-400">
                              {doc.type} {doc.size ? `· ${doc.size}` : ""}
                            </span>
                          </div>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs text-[#FBD227] hover:underline flex items-center gap-1 font-bold"
                        >
                          <span>Open Document</span>
                          <span>↗</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Media Assets from library */}
                <div>
                  <span className="text-xs font-mono uppercase text-gray-400 font-bold block mb-2">
                    Client Media Assets ({inspectingMedia.length})
                  </span>
                  {inspectingMedia.length === 0 ? (
                    <div className="border border-[#222222] bg-[#141414] p-3 text-xs text-gray-500 font-mono rounded">
                      No media files tagged specifically for this client in the general media library.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {inspectingMedia.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between border border-[#222222] bg-[#141414] px-3.5 py-2 rounded text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] uppercase bg-black px-1.5 py-0.5 rounded text-[#FBD227] border border-[#333333]">
                              {m.fileType}
                            </span>
                            <span className="text-white font-bold">{m.title}</span>
                          </div>
                          <span className="font-mono text-[10px] text-gray-400">{m.fileSize}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Financial Ledger & Invoices (admin only) */}
                {role === "admin" && (
                <div>
                  <span className="text-xs font-mono uppercase text-gray-400 font-bold block mb-2">
                    Billing & SOW Milestones ({inspectingInvoices.length})
                  </span>
                  <div className="space-y-2">
                    {inspectingInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between border border-[#222222] bg-[#141414] px-3.5 py-2 rounded text-xs font-mono"
                      >
                        <div>
                          <span className="text-white font-bold block">{inv.invoiceNumber}</span>
                          <span className="text-[10px] text-gray-400">Due: {inv.dueDate}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[#FBD227] font-bold block">${inv.amount.toLocaleString()}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              inv.status === "Paid" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-[#FBD227]"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                )}
              </div>
            )}

            {/* ================= TAB 4: SPRINT TASKS ================= */}
            {workspaceTab === "tasks" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-gray-400 font-bold">
                    Active Tasks for this Project
                  </span>
                  <button
                    type="button"
                    onClick={() => openCreateModal("todo", inspectingProject.id)}
                    className={btnPrimary}
                  >
                    <Icon name="plus" className="h-3 w-3" />
                    <span>+ Add Task to Project</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {inspectingTasks.length === 0 ? (
                    <div className="border border-[#222222] bg-[#141414] p-4 text-center text-xs text-gray-400 font-mono rounded">
                      No sprint tasks created yet for this project.
                    </div>
                  ) : (
                    inspectingTasks.map((t) => (
                      <div
                        key={t.id}
                        className="border border-[#262626] bg-[#141414] p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded uppercase border ${
                                t.priority === "urgent"
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  : t.priority === "high"
                                  ? "bg-amber-500/10 text-[#FBD227] border-amber-500/20"
                                  : "bg-white/5 text-gray-400 border-[#262626]"
                              }`}
                            >
                              {t.priority}
                            </span>
                            <span className="font-bold text-white">{t.title}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] font-mono text-gray-400">
                            <span>Assignee: {t.assignee}</span>
                            <span>Due: {t.dueDate}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={t.status}
                            onChange={(e) => handleUpdateStatus(t.id, e.target.value as Task["status"])}
                            className={fieldCompact}
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="review">QA / Review</option>
                            <option value="done">Completed</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => openEditModal(t)}
                            className="p-1 rounded bg-[#222222] hover:bg-[#333333] text-gray-300 hover:text-white"
                            title="Edit task"
                          >
                            <Icon name="pencil" className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end border-t border-[#262626] pt-4">
              <button
                type="button"
                onClick={() => setInspectingProject(null)}
                className={btnGhost}
              >
                Close Workspace
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 1: CREATE NEW TASK */}
      {/* ============================================================== */}
      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Task">
        <form onSubmit={handleCreateTask} className="space-y-4 text-white">
          <div>
            <label className={labelClass}>Task Title *</label>
            <input
              type="text"
              required
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className={fieldClass}
              placeholder="e.g. Implement Webhook Dispatch Handler"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Linked Project</label>
              <select
                value={taskProjectId}
                onChange={(e) => setTaskProjectId(e.target.value)}
                className={fieldClass}
              >
                <option value="">Internal Studio Operations</option>
                {allProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.clientName})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Assignee</label>
              <select
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
                disabled={role !== "admin"}
                className={fieldClass}
              >
                {assigneeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Status Lane</label>
              <select
                value={taskStatus}
                onChange={(e) => setTaskStatus(e.target.value as Task["status"])}
                className={fieldClass}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">QA / Review</option>
                <option value="done">Completed</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as Task["priority"])}
                className={fieldClass}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Due Date</label>
              <input
                type="text"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className={fieldClass}
                placeholder="e.g. Tomorrow or Sep 28"
              />
            </div>
          </div>

          {errorBox(formError)}

          <div className="flex justify-end gap-2 border-t border-[#262626] pt-4">
            <button type="button" onClick={() => setIsCreateOpen(false)} className={btnGhost}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className={btnPrimary}>
              {isSubmitting ? "Creating…" : "Create Task"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: EDIT / UPDATE TASK */}
      {/* ============================================================== */}
      <Modal open={editingTask !== null} onClose={() => setEditingTask(null)} title="Edit / Update Task">
        {editingTask && (
          <form onSubmit={handleUpdateTask} className="space-y-4 text-white">
            <div>
              <label className={labelClass}>Task Title *</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={fieldClass}
                placeholder="e.g. Implement Webhook Dispatch Handler"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Linked Project</label>
                <select
                  value={editProjectId}
                  onChange={(e) => setEditProjectId(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Internal Studio Operations</option>
                  {allProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.clientName})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Assignee</label>
                <select
                  value={editAssignee}
                  onChange={(e) => setEditAssignee(e.target.value)}
                  disabled={role !== "admin"}
                  className={fieldClass}
                >
                  {assigneeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Status Lane</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as Task["status"])}
                  className={fieldClass}
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">QA / Review</option>
                  <option value="done">Completed</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Priority</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as Task["priority"])}
                  className={fieldClass}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Due Date</label>
                <input
                  type="text"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className={fieldClass}
                  placeholder="e.g. Tomorrow or Sep 28"
                />
              </div>
            </div>

            {errorBox(formError)}

            <div className="flex items-center justify-between border-t border-[#262626] pt-4">
              {role === "admin" ? (
                <button
                  type="button"
                  onClick={handleDeleteTask}
                  disabled={editSubmitting}
                  className="text-xs font-mono font-bold text-rose-400 hover:text-rose-300 hover:underline"
                >
                  Delete Task
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditingTask(null)} className={btnGhost}>
                  Cancel
                </button>
                <button type="submit" disabled={editSubmitting} className={btnPrimary}>
                  {editSubmitting ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
