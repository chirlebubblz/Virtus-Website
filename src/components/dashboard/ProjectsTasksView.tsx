"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { Invoice, MediaAsset, Project, Task, TeamPod, TeamMemberUser } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { errorText, workspaceApi } from "./api";
import { Modal, fieldClass, labelClass, btnPrimary, btnGhost, fieldCompact } from "./ui";
import { ImprovementsBoardView } from "./ImprovementsBoardView";
import { getCachedTeamsData, setCachedTeamsData } from "@/lib/teamsClientCache";

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
  activeMember = "Brand Lead",
  onMemberChange,
  lockMember = false,
}) => {
  // Projects and tasks live in the database. The server already limits a team member to their own work.
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<string[]>([]);
  const [member, setMember] = useState<string | null>(null);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [allMedia, setAllMedia] = useState<MediaAsset[]>([]);
  const [load, setLoad] = useState<"loading" | "ready" | "error">("loading");
  const [actionError, setActionError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Teams & Pods state (hydrated with instant SWR cache)
  const [pods, setPods] = useState<TeamPod[]>(() => getCachedTeamsData()?.teams || []);
  const [teamMembers, setTeamMembers] = useState<TeamMemberUser[]>(() => getCachedTeamsData()?.members || []);

  // Team / Pod Filtering State
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");
  const [selectedMemberName, setSelectedMemberName] = useState<string>("all");

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
    role === "team" ? activeMember : "Brand Lead"
  );
  const [taskTeamId, setTaskTeamId] = useState("");
  const [taskTeamName, setTaskTeamName] = useState("");
  const [taskStatus, setTaskStatus] = useState<Task["status"]>("todo");
  const [taskPriority, setTaskPriority] = useState<Task["priority"]>("medium");
  const [taskDueDate, setTaskDueDate] = useState("Tomorrow");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Form State
  const [editTitle, setEditTitle] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editAssignee, setEditAssignee] = useState("");
  const [editTeamId, setEditTeamId] = useState("");
  const [editTeamName, setEditTeamName] = useState("");
  const [editStatus, setEditStatus] = useState<Task["status"]>("todo");
  const [editPriority, setEditPriority] = useState<Task["priority"]>("medium");
  const [editDueDate, setEditDueDate] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Floor sub-tab: sprint tasks vs improvements board
  const [tasksFloorTab, setTasksFloorTab] = useState<"tasks" | "improvements">("tasks");
  const [teamTaskScope, setTeamTaskScope] = useState<"all" | "mine">("mine");

  // Task Updates Modal State
  const [activeTaskForUpdates, setActiveTaskForUpdates] = useState<Task | null>(null);
  const [updateMessage, setUpdateMessage] = useState("");
  const [updateNewStatus, setUpdateNewStatus] = useState<Task["status"] | "">("");
  const [updateAttachmentUrl, setUpdateAttachmentUrl] = useState("");
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const openTaskUpdatesModal = (task: Task) => {
    setActiveTaskForUpdates(task);
    setUpdateMessage("");
    setUpdateNewStatus(task.status);
    setUpdateAttachmentUrl("");
    setUpdateError(null);
  };

  const handlePostTaskUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTaskForUpdates || !updateMessage.trim()) return;
    setUpdateSubmitting(true);
    setUpdateError(null);
    try {
      const payload: {
        id: string;
        updateMessage: string;
        status?: Task["status"];
        attachmentUrl?: string;
      } = {
        id: activeTaskForUpdates.id,
        updateMessage: updateMessage.trim(),
        attachmentUrl: updateAttachmentUrl.trim() || undefined,
      };
      if (updateNewStatus && updateNewStatus !== activeTaskForUpdates.status) {
        payload.status = updateNewStatus;
      }

      const updated = await workspaceApi<Task>("/api/tasks", "PATCH", payload);
      replaceTask(updated);
      setActiveTaskForUpdates(updated);
      setUpdateMessage("");
      setUpdateAttachmentUrl("");
    } catch (err) {
      setUpdateError(errorText(err, "Could not post update. Please try again."));
    } finally {
      setUpdateSubmitting(false);
    }
  };

  const loadAll = useCallback(() => {
    setLoad("loading");
    Promise.all([
      workspaceApi<Project[]>("/api/projects"),
      workspaceApi<TasksPayload>("/api/tasks"),
      // Billing and client files are admin only; team members never load them.
      role === "admin" ? workspaceApi<Invoice[]>("/api/invoices").catch(() => [] as Invoice[]) : Promise.resolve([] as Invoice[]),
      role === "admin" ? workspaceApi<MediaAsset[]>("/api/media").catch(() => [] as MediaAsset[]) : Promise.resolve([] as MediaAsset[]),
    ])
      .then(([projects, tasks, invoices, media]) => {
        setAllMedia(media);
        setAllProjects(projects);
        setAllTasks(tasks.tasks);
        setAssigneeOptions(tasks.assignees);
        setMember(tasks.member);
        setAllInvoices(invoices);
        setLoad("ready");
      })
      .catch(() => setLoad("error"));

    // Sync live pods and team members
    fetch("/api/teams", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json.ok && Array.isArray(json.teams)) {
          setPods(json.teams || []);
          setTeamMembers(json.members || []);
          setCachedTeamsData(json.teams || [], json.members || []);
        }
      })
      .catch(() => {});
  }, [role]);

  useEffect(loadAll, [loadAll]);

  /** The person a new task goes to by default: the member themself, else the first person on the list. */
  const defaultAssignee = () => member ?? assigneeOptions[0] ?? "";

  const openCreateModal = (presetStatus: Task["status"] = "todo", defaultProjectId?: string) => {
    setTaskTitle("");
    setTaskProjectId(defaultProjectId || allProjects[0]?.id || "");
    const initialAssignee = defaultAssignee();
    setTaskAssignee(initialAssignee);

    // Initial team: if selectedTeamId is a valid pod, use it; else look up from assignee
    let initialTeamId = selectedTeamId !== "all" && selectedTeamId !== "unassigned" ? selectedTeamId : "";
    let initialTeamName = "";
    if (initialTeamId) {
      initialTeamName = pods.find((p) => p.id === initialTeamId)?.name || "";
    } else {
      const mem = teamMembers.find((m) => m.name === initialAssignee || matchesAssignee(initialAssignee, m.name));
      if (mem && mem.teamId && mem.teamId !== "unassigned") {
        initialTeamId = mem.teamId;
        initialTeamName = pods.find((p) => p.id === mem.teamId)?.name || "";
      }
    }
    setTaskTeamId(initialTeamId);
    setTaskTeamName(initialTeamName);

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
    setEditTeamId(task.teamId || "");
    setEditTeamName(task.teamName || "");
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
    setProjLeadName(proj.leadName || "Brand Lead");
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
        teamId: taskTeamId || undefined,
        teamName: taskTeamName || undefined,
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
        teamId: editTeamId || undefined,
        teamName: editTeamName || undefined,
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

  // Auto-default team for team members on initial load
  useEffect(() => {
    if (role === "team" && selectedTeamId === "all" && teamMembers.length > 0) {
      const myName = member || activeMember;
      const me = teamMembers.find(
        (m) => (m.name && matchesAssignee(m.name, myName)) || m.name === myName
      );
      if (me && me.teamId && me.teamId !== "unassigned") {
        setSelectedTeamId(me.teamId);
      }
    }
  }, [role, selectedTeamId, teamMembers, member, activeMember]);

  const cleanAssigneeOptions = assigneeOptions.filter(
    (opt) => Boolean(opt) && opt.trim() !== "@" && opt.trim() !== "Unassigned" && opt.trim().length > 1
  );

  const unassignedTasksCount = allTasks.filter((t) => !t.teamId || t.teamId === "unassigned").length;
  const activeSelectedPod = pods.find((p) => p.id === selectedTeamId);
  const activePodTasks = activeSelectedPod
    ? allTasks.filter((t) => t.teamId === activeSelectedPod.id)
    : [];

  const activePodMembers = activeSelectedPod
    ? teamMembers.filter(
        (m) =>
          m.teamId === activeSelectedPod.id ||
          (Array.isArray(activeSelectedPod.memberIds) && activeSelectedPod.memberIds.includes(m.id))
      )
    : [];

  const podAssigneeNames = new Set(activePodMembers.map((m) => m.name.toLowerCase()));
  const extraPodAssignees = [
    ...new Set(
      activePodTasks
        .map((t) => t.assignee?.trim())
        .filter(
          (name) =>
            Boolean(name) &&
            name !== "@" &&
            name !== "Unassigned" &&
            !name.toLowerCase().startsWith("entire") &&
            !podAssigneeNames.has(name.toLowerCase())
        )
    ),
  ];

  const filteredTasks = allTasks.filter((t) => {
    // 1. Pod selection filter
    if (selectedTeamId !== "all") {
      if (selectedTeamId === "unassigned") {
        if (t.teamId && t.teamId !== "unassigned") return false;
      } else {
        if (t.teamId !== selectedTeamId) return false;
      }
    }

    // 2. Member filter within selected pod
    if (selectedTeamId !== "all" && selectedMemberName !== "all") {
      if (!matchesAssignee(t.assignee, selectedMemberName)) return false;
    }

    // 3. For team role with "mine" scope toggle
    if (role === "team" && teamTaskScope === "mine") {
      return matchesAssignee(t.assignee, member || activeMember);
    }

    return true;
  });

  // Team members see only projects they have a task on (also enforced by the server).
  const memberProjectIds = new Set(filteredTasks.map((t) => t.projectId).filter(Boolean));
  const filteredProjects = allProjects.filter((p) => {
    if (role === "admin" || selectedTeamId === "all") return true;
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
  const inspectingMedia = inspectingProject ? allMedia.filter((m) => m.clientId && m.clientId === inspectingProject.clientId) : [];
  const inspectingInvoices = inspectingProject ? allInvoices.filter((i) => i.clientId === inspectingProject.clientId) : [];

  const errorBox = (message: string | null) =>
    message && (
      <p role="alert" className="border border-[#DD7230] bg-[#DD7230]/10 px-3 py-2 font-sans text-xs text-white">
        {message}
      </p>
    );

  return (
    <div className="p-4 sm:p-8 max-w-[96rem] 2xl:max-w-[104rem] mx-auto text-white space-y-6 font-sans">
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

        {/* Member Switcher (For Team Role) & Add Task Button */}
        <div className="flex flex-wrap items-center gap-3">
          {role === "team" && (
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
                  {cleanAssigneeOptions.length > 0 ? (
                    cleanAssigneeOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))
                  ) : (
                    <option value={activeMember}>{activeMember}</option>
                  )}
                </select>
              )}
            </div>
          )}

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
                          <span className="text-white font-bold block">{proj.leadName || "Brand Lead"}</span>
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
        <div className="space-y-4">
          {/* Sub-tab Switcher: Active Sprint Tasks vs Something to Add or Fix Board */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#262626] pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTasksFloorTab("tasks")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                  tasksFloorTab === "tasks"
                    ? "bg-[#FBD227] text-black shadow-sm"
                    : "bg-[#161616] text-gray-400 hover:text-white border border-[#2A2A2A]"
                }`}
              >
                <Icon name="check-circle" className="h-3.5 w-3.5" />
                <span>Active Sprint Tasks ({allTasks.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setTasksFloorTab("improvements")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                  tasksFloorTab === "improvements"
                    ? "bg-[#FBD227] text-black shadow-sm"
                    : "bg-[#161616] text-gray-400 hover:text-white border border-[#2A2A2A]"
                }`}
              >
                <Icon name="bolt" className="h-3.5 w-3.5 text-[#FBD227]" />
                <span>Something to Add or Fix Board</span>
              </button>
            </div>

            {/* Scope toggle for team members */}
            {role === "team" && tasksFloorTab === "tasks" && (
              <div className="flex items-center gap-1.5 bg-[#141414] p-1 rounded-lg border border-[#262626]">
                <button
                  type="button"
                  onClick={() => setTeamTaskScope("mine")}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                    teamTaskScope === "mine"
                      ? "bg-[#252525] text-[#FBD227]"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  My Tasks
                </button>
                <button
                  type="button"
                  onClick={() => setTeamTaskScope("all")}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                    teamTaskScope === "all"
                      ? "bg-[#252525] text-[#FBD227]"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  All Tasks ({allTasks.length})
                </button>
              </div>
            )}
          </div>

          {tasksFloorTab === "improvements" ? (
            <ImprovementsBoardView role={role} activeMember={member || activeMember} />
          ) : (
            <div className="space-y-4">
              {/* ============================================================== */}
              {/* TEAM / POD SELECTOR BAR (Replaces flat 15+ member wall) */}
              {/* ============================================================== */}
              <div className="space-y-2">
                {/* Primary Pill Bar: ALL TEAMS + Pod Tabs + Unassigned */}
                <div className="bg-[#121212] border border-[#242424] p-2.5 rounded-xl shadow-inner">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-gray-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
                      <Icon name="users" className="h-3.5 w-3.5 text-[#FBD227]" />
                      <span>Team Pod:</span>
                    </span>

                    {/* All Teams Pill */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTeamId("all");
                        setSelectedMemberName("all");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 ${
                        selectedTeamId === "all"
                          ? "bg-[#FBD227] text-black shadow-md ring-1 ring-[#FBD227]"
                          : "bg-[#181818] text-gray-400 hover:text-white border border-[#2A2A2A] hover:border-gray-600"
                      }`}
                    >
                      <span>All Teams</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          selectedTeamId === "all" ? "bg-black/25 text-black" : "bg-[#252525] text-gray-300"
                        }`}
                      >
                        {allTasks.length}
                      </span>
                    </button>

                    {/* Each Pod Pill */}
                    {pods.map((pod) => {
                      const podCount = allTasks.filter((t) => t.teamId === pod.id).length;
                      const isSelected = selectedTeamId === pod.id;
                      const podColor = pod.color || "#FBD227";

                      return (
                        <button
                          key={pod.id}
                          type="button"
                          onClick={() => {
                            setSelectedTeamId(pod.id);
                            setSelectedMemberName("all");
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 border ${
                            isSelected
                              ? "bg-[#1C1C1C] text-white shadow-md ring-1"
                              : "bg-[#161616] text-gray-400 hover:text-white border-[#2A2A2A] hover:border-gray-600"
                          }`}
                          style={{
                            borderColor: isSelected ? podColor : undefined,
                            boxShadow: isSelected ? `0 0 12px ${podColor}30` : undefined,
                          }}
                        >
                          <span
                            className="h-2 w-2 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: podColor }}
                          />
                          <span>{pod.name}</span>
                          {pod.leaderName && pod.leaderName !== "Unassigned" && (
                            <span className="text-[10px] text-gray-500 font-normal lowercase tracking-normal hidden md:inline">
                              ({pod.leaderName})
                            </span>
                          )}
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                            style={{
                              backgroundColor: isSelected ? `${podColor}35` : "#252525",
                              color: isSelected ? podColor : "#9CA3AF",
                            }}
                          >
                            {podCount}
                          </span>
                        </button>
                      );
                    })}

                    {/* Unassigned Team (only if > 0) */}
                    {unassignedTasksCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTeamId("unassigned");
                          setSelectedMemberName("all");
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 border ${
                          selectedTeamId === "unassigned"
                            ? "bg-[#252525] text-white border-amber-500 shadow-md ring-1 ring-amber-500/50"
                            : "bg-[#161616] text-gray-400 hover:text-white border-[#2A2A2A] hover:border-gray-600"
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full bg-gray-500 inline-block" />
                        <span>Unassigned Team</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#252525] text-amber-300">
                          {unassignedTasksCount}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Second Row: Specific Team Members (Shown ONLY when a team is selected) */}
                {selectedTeamId !== "all" && activeSelectedPod && (
                  <div className="bg-[#101010] border border-[#222222] p-2 rounded-lg flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono text-gray-400 uppercase px-2 font-bold flex items-center gap-1">
                      <Icon name="user" className="h-3 w-3 text-gray-500" />
                      <span>{activeSelectedPod.name} Members:</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedMemberName("all")}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase transition-colors ${
                        selectedMemberName === "all"
                          ? "bg-white text-black"
                          : "text-gray-400 hover:text-white bg-[#181818] border border-[#2A2A2A]"
                      }`}
                    >
                      All in {activeSelectedPod.name} ({activePodTasks.length})
                    </button>

                    {activePodMembers.map((m) => {
                      const mCount = activePodTasks.filter((t) => matchesAssignee(t.assignee, m.name)).length;
                      const isSelected = selectedMemberName === m.name;
                      return (
                        <button
                          key={m.id || m.name}
                          type="button"
                          onClick={() => setSelectedMemberName(m.name)}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase transition-colors flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-[#FBD227] text-black"
                              : "text-gray-400 hover:text-white bg-[#181818] border border-[#2A2A2A]"
                          }`}
                        >
                          <span>{m.name}</span>
                          <span
                            className={`text-[10px] px-1 py-0.2 rounded ${
                              isSelected ? "bg-black/30 text-black" : "bg-black text-gray-400"
                            }`}
                          >
                            ({mCount})
                          </span>
                        </button>
                      );
                    })}

                    {extraPodAssignees.map((assigneeName) => {
                      const mCount = activePodTasks.filter((t) => matchesAssignee(t.assignee, assigneeName)).length;
                      const isSelected = selectedMemberName === assigneeName;
                      return (
                        <button
                          key={assigneeName}
                          type="button"
                          onClick={() => setSelectedMemberName(assigneeName)}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase transition-colors flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-[#FBD227] text-black"
                              : "text-gray-400 hover:text-white bg-[#181818] border border-[#2A2A2A]"
                          }`}
                        >
                          <span>{assigneeName}</span>
                          <span
                            className={`text-[10px] px-1 py-0.2 rounded ${
                              isSelected ? "bg-black/30 text-black" : "bg-black text-gray-400"
                            }`}
                          >
                            ({mCount})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedTeamId === "unassigned" && (
                  <div className="bg-[#101010] border border-[#222222] p-2 rounded-lg flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono text-gray-400 uppercase px-2 font-bold flex items-center gap-1">
                      <Icon name="user" className="h-3 w-3 text-gray-500" />
                      <span>Unassigned Tasks:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedMemberName("all")}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase transition-colors ${
                        selectedMemberName === "all"
                          ? "bg-white text-black"
                          : "text-gray-400 hover:text-white bg-[#181818] border border-[#2A2A2A]"
                      }`}
                    >
                      All Unassigned ({unassignedTasksCount})
                    </button>
                  </div>
                )}
              </div>

              <h2 className="font-bold text-sm text-white uppercase font-mono tracking-wider flex items-center justify-between">
                <span>
                  {role === "team" && teamTaskScope === "mine"
                    ? "My Active Sprint Tasks"
                    : selectedTeamId !== "all" && activeSelectedPod
                    ? `${activeSelectedPod.name.toUpperCase()} · SPRINT BOARD`
                    : "Master Delivery Task Board"}
                </span>
                <span className="text-xs text-gray-400 font-normal">
                  {filteredTasks.length} task{filteredTasks.length === 1 ? "" : "s"} shown
                </span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
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
                                <div className="flex items-center justify-between mb-2 gap-1.5 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {/* Team / Pod Badge */}
                                    {(() => {
                                      const pod = pods.find((p) => p.id === t.teamId);
                                      const podColor = pod?.color || "#FBD227";
                                      const podName = pod?.name || t.teamName || (t.teamId === "unassigned" ? "Unassigned Pod" : "Studio General");
                                      return (
                                        <span
                                          className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border"
                                          style={{
                                            backgroundColor: `${podColor}15`,
                                            borderColor: `${podColor}40`,
                                            color: podColor,
                                          }}
                                        >
                                          <span
                                            className="h-1.5 w-1.5 rounded-full shrink-0"
                                            style={{ backgroundColor: podColor }}
                                          />
                                          <span className="truncate max-w-[120px]">{podName}</span>
                                        </span>
                                      );
                                    })()}
                                    <span className="text-[0.65rem] font-mono text-gray-400 truncate max-w-[110px]">
                                      {t.projectTitle || "Internal Studio"}
                                    </span>
                                  </div>
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
                                      title="Edit / Update task details"
                                    >
                                      <Icon name="pencil" className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>

                                <h4 className="font-medium text-xs text-white leading-snug">{t.title}</h4>

                                {/* Latest status update note preview */}
                                {t.latestUpdate && (
                                  <div
                                    onClick={() => openTaskUpdatesModal(t)}
                                    className="mt-2 p-2 rounded bg-[#121212] border border-[#242424] hover:border-[#FBD227]/40 cursor-pointer transition-colors"
                                    title="Click to view full update log"
                                  >
                                    <span className="font-mono text-[9px] text-[#FBD227] uppercase font-bold flex items-center gap-1">
                                      <Icon name="chat" className="h-2.5 w-2.5" />
                                      <span>Latest Status:</span>
                                    </span>
                                    <p className="font-sans text-[11px] text-gray-300 line-clamp-2 mt-0.5">
                                      &ldquo;{t.latestUpdate}&rdquo;
                                    </p>
                                  </div>
                                )}

                                <div className="mt-3 pt-2 border-t border-[#262626] flex items-center justify-between text-[0.68rem] text-gray-400 font-mono">
                                  <span className="inline-flex items-center gap-1">
                                    <Icon name="user" className="h-3.5 w-3.5" />
                                    {t.assignee}
                                  </span>
                                  <span>Due: {t.dueDate}</span>
                                </div>

                                {/* Status Transition Control & Updates Button */}
                                <div className="mt-2 pt-2 border-t border-[#222222] flex items-center justify-between gap-1.5 flex-wrap sm:flex-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => openTaskUpdatesModal(t)}
                                    className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-gray-300 hover:text-[#FBD227] bg-[#1E1E1E] hover:bg-[#282828] px-2 py-0.5 rounded border border-[#333333] transition-colors shrink-0 whitespace-nowrap"
                                    title="Open progress updates & status feed"
                                  >
                                    <Icon name="chat" className="h-3 w-3 text-[#FBD227]" />
                                    <span>Updates ({t.updates?.length || 0})</span>
                                  </button>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-xs text-gray-500">Lane:</span>
                                    <select
                                      aria-label={`Move task ${t.title}`}
                                      value={t.status}
                                      onChange={(e) => handleUpdateStatus(t.id, e.target.value as Task["status"])}
                                      className={`${fieldCompact} max-w-[130px] truncate`}
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
                          if (chosen === "Engineering Lead") setProjLeadRole("Lead Frontend Engineer");
                          else if (chosen === "Brand Lead") setProjLeadRole("Brand & Creative Lead");
                          else if (chosen === "UX Specialist") setProjLeadRole("UX & Product Designer");
                          else if (chosen === "Studio Director") setProjLeadRole("Studio Director & Owner");
                        }}
                        className={fieldClass}
                      >
                        <option value="Brand Lead">Brand Lead (Brand & Creative Lead)</option>
                        <option value="Engineering Lead">Engineering Lead (Lead Frontend Engineer)</option>
                        <option value="UX Specialist">UX Specialist (UX & Product Designer)</option>
                        <option value="Studio Director">Studio Director (Studio Director & Owner)</option>
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
                      "Brand Lead",
                      "Engineering Lead",
                      "UX Specialist",
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

                {/* Client files from the Library (admin only) */}
                {role === "admin" && (
                <div>
                  <span className="text-xs font-mono uppercase text-gray-400 font-bold block mb-2">
                    Client Media Assets ({inspectingMedia.length})
                  </span>
                  {inspectingMedia.length === 0 ? (
                    <div className="border border-[#222222] bg-[#141414] p-3 text-xs text-gray-500 font-mono rounded">
                      No files in this client&apos;s Library yet.
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
                )}

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
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {(() => {
                              const pod = pods.find((p) => p.id === t.teamId);
                              const podColor = pod?.color || "#FBD227";
                              const podName = pod?.name || t.teamName || (t.teamId === "unassigned" ? "Unassigned Pod" : "Studio General");
                              return (
                                <span
                                  className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border"
                                  style={{
                                    backgroundColor: `${podColor}15`,
                                    borderColor: `${podColor}40`,
                                    color: podColor,
                                  }}
                                >
                                  <span
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: podColor }}
                                  />
                                  <span>{podName}</span>
                                </span>
                              );
                            })()}
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
                          {t.latestUpdate && (
                            <p
                              onClick={() => openTaskUpdatesModal(t)}
                              className="text-[10px] font-mono text-[#FBD227] hover:underline cursor-pointer truncate max-w-md mt-1"
                            >
                              Latest: &ldquo;{t.latestUpdate}&rdquo;
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => openTaskUpdatesModal(t)}
                            className="px-2 py-1 rounded bg-[#202020] hover:bg-[#2A2A2A] text-[11px] font-mono text-gray-300 hover:text-[#FBD227] border border-[#333333] flex items-center gap-1 transition-colors"
                            title="View / post progress updates"
                          >
                            <Icon name="chat" className="h-3 w-3 text-[#FBD227]" />
                            <span>Updates ({t.updates?.length || 0})</span>
                          </button>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Team / Pod *</label>
              <select
                value={taskTeamId}
                onChange={(e) => {
                  const newPodId = e.target.value;
                  setTaskTeamId(newPodId);
                  const found = pods.find((p) => p.id === newPodId);
                  setTaskTeamName(found ? found.name : "");
                  if (found) {
                    const podMems = teamMembers.filter((m) => m.teamId === found.id);
                    if (podMems.length > 0 && role === "admin") {
                      const isCurrentInPod = podMems.some((m) => matchesAssignee(taskAssignee, m.name));
                      if (!isCurrentInPod) {
                        setTaskAssignee(podMems[0].name);
                      }
                    }
                  }
                }}
                className={fieldClass}
              >
                <option value="">General Studio / Unassigned</option>
                {pods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.leaderName && p.leaderName !== "Unassigned" ? `(Lead: ${p.leaderName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Assignee *</label>
              <select
                value={taskAssignee}
                onChange={(e) => {
                  const val = e.target.value;
                  setTaskAssignee(val);
                  const mem = teamMembers.find((m) => m.name === val || matchesAssignee(val, m.name));
                  if (mem && mem.teamId && mem.teamId !== "unassigned") {
                    setTaskTeamId(mem.teamId);
                    const found = pods.find((p) => p.id === mem.teamId);
                    if (found) setTaskTeamName(found.name);
                  }
                }}
                disabled={role !== "admin"}
                className={fieldClass}
              >
                {taskTeamId && (
                  <option value={`Entire ${taskTeamName || "Pod"}`}>
                    Entire Team / Pod ({taskTeamName || "This Pod"})
                  </option>
                )}
                {taskTeamId ? (
                  <>
                    <optgroup label={`${taskTeamName || "Pod"} Members`}>
                      {teamMembers
                        .filter((m) => m.teamId === taskTeamId)
                        .map((m) => (
                          <option key={m.id || m.name} value={m.name}>
                            {m.name} ({m.roleTitle || "Specialist"})
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Other Studio Assignees">
                      {cleanAssigneeOptions
                        .filter(
                          (opt) =>
                            !teamMembers.some((m) => m.teamId === taskTeamId && matchesAssignee(opt, m.name)) &&
                            opt !== `Entire ${taskTeamName || "Pod"}`
                        )
                        .map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </optgroup>
                  </>
                ) : (
                  cleanAssigneeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))
                )}
              </select>
            </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Team / Pod *</label>
                <select
                  value={editTeamId}
                  onChange={(e) => {
                    const newPodId = e.target.value;
                    setEditTeamId(newPodId);
                    const found = pods.find((p) => p.id === newPodId);
                    setEditTeamName(found ? found.name : "");
                    if (found) {
                      const podMems = teamMembers.filter((m) => m.teamId === found.id);
                      if (podMems.length > 0 && role === "admin") {
                        const isCurrentInPod = podMems.some((m) => matchesAssignee(editAssignee, m.name));
                        if (!isCurrentInPod) {
                          setEditAssignee(podMems[0].name);
                        }
                      }
                    }
                  }}
                  disabled={role !== "admin"}
                  className={fieldClass}
                >
                  <option value="">General Studio / Unassigned</option>
                  {pods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.leaderName && p.leaderName !== "Unassigned" ? `(Lead: ${p.leaderName})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Assignee *</label>
                <select
                  value={editAssignee}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditAssignee(val);
                    const mem = teamMembers.find((m) => m.name === val || matchesAssignee(val, m.name));
                    if (mem && mem.teamId && mem.teamId !== "unassigned") {
                      setEditTeamId(mem.teamId);
                      const found = pods.find((p) => p.id === mem.teamId);
                      if (found) setEditTeamName(found.name);
                    }
                  }}
                  disabled={role !== "admin"}
                  className={fieldClass}
                >
                  {editTeamId && (
                    <option value={`Entire ${editTeamName || "Pod"}`}>
                      Entire Team / Pod ({editTeamName || "This Pod"})
                    </option>
                  )}
                  {editTeamId ? (
                    <>
                      <optgroup label={`${editTeamName || "Pod"} Members`}>
                        {teamMembers
                          .filter((m) => m.teamId === editTeamId)
                          .map((m) => (
                            <option key={m.id || m.name} value={m.name}>
                              {m.name} ({m.roleTitle || "Specialist"})
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Other Studio Assignees">
                        {cleanAssigneeOptions
                          .filter(
                            (opt) =>
                              !teamMembers.some((m) => m.teamId === editTeamId && matchesAssignee(opt, m.name)) &&
                              opt !== `Entire ${editTeamName || "Pod"}`
                          )
                          .map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                      </optgroup>
                    </>
                  ) : (
                    cleanAssigneeOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))
                  )}
                </select>
              </div>

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

      {/* ============================================================== */}
      {/* MODAL: TASK PROGRESS UPDATES & STATUS LOG */}
      {/* ============================================================== */}
      <Modal
        open={activeTaskForUpdates !== null}
        onClose={() => setActiveTaskForUpdates(null)}
        title="Task Updates & Status Log"
        maxWidth="max-w-2xl"
      >
        {activeTaskForUpdates && (
          <div className="space-y-5 text-white">
            {/* Task Context Card */}
            <div className="p-3.5 rounded-xl bg-[#141414] border border-[#262626]">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="font-mono text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {activeTaskForUpdates.projectTitle || "Internal Studio"}
                </span>
                <span
                  className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                    activeTaskForUpdates.priority === "urgent"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      : activeTaskForUpdates.priority === "high"
                      ? "bg-amber-500/10 text-[#FBD227] border-amber-500/30"
                      : "bg-white/5 text-gray-400 border-[#262626]"
                  }`}
                >
                  {activeTaskForUpdates.priority}
                </span>
              </div>
              <h3 className="font-monument text-sm font-bold text-white uppercase tracking-wide mb-2">
                {activeTaskForUpdates.title}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-gray-400 border-t border-[#222222] pt-2">
                <span className="flex items-center gap-1.5">
                  <Icon name="user" className="h-3 w-3 text-[#FBD227]" />
                  <span className="text-white font-medium">{activeTaskForUpdates.assignee}</span>
                </span>
                <span>Due: {activeTaskForUpdates.dueDate}</span>
                <span className="flex items-center gap-1">
                  <span>Current Lane:</span>
                  <span className="text-[#FBD227] font-bold uppercase">{activeTaskForUpdates.status.replace("_", " ")}</span>
                </span>
              </div>
            </div>

            {/* Post New Update Composer Form */}
            <form onSubmit={handlePostTaskUpdate} className="p-4 rounded-xl bg-[#161616] border border-[#2A2A2A] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-monument text-xs font-bold uppercase text-white tracking-wider flex items-center gap-1.5">
                  <Icon name="chat" className="h-3.5 w-3.5 text-[#FBD227]" />
                  <span>Post Progress Update or Status</span>
                </span>
                <span className="font-mono text-[10px] text-gray-400">
                  Posting as: <strong className="text-white">{member || activeMember}</strong>
                </span>
              </div>

              <div>
                <textarea
                  required
                  rows={3}
                  value={updateMessage}
                  onChange={(e) => setUpdateMessage(e.target.value)}
                  placeholder="Share progress details, PR links, blockers, handoff notes, or QA review comments..."
                  className={`${fieldClass} text-xs resize-none`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Update Task Status (Optional)
                  </label>
                  <select
                    value={updateNewStatus}
                    onChange={(e) => setUpdateNewStatus(e.target.value as Task["status"])}
                    className={fieldClass}
                  >
                    <option value="">Keep status as ({activeTaskForUpdates.status})</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">QA / Review</option>
                    <option value="done">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Deliverable / Proof Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={updateAttachmentUrl}
                    onChange={(e) => setUpdateAttachmentUrl(e.target.value)}
                    placeholder="https://figma.com/... or PR link"
                    className={fieldClass}
                  />
                </div>
              </div>

              {updateError && (
                <p className="font-mono text-xs text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20">
                  {updateError}
                </p>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={updateSubmitting || !updateMessage.trim()}
                  className={`${btnPrimary} flex items-center gap-1.5 text-xs font-bold font-mono px-4 py-2 disabled:opacity-50`}
                >
                  <Icon name="arrow-up-right" className="h-3.5 w-3.5" />
                  <span>{updateSubmitting ? "Posting..." : "Post Update & Sync"}</span>
                </button>
              </div>
            </form>

            {/* Updates History Feed */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#222222] pb-2">
                <span className="font-monument text-xs font-bold uppercase text-gray-400 tracking-wider">
                  Update History & Activity ({activeTaskForUpdates.updates?.length || 0})
                </span>
              </div>

              {(!activeTaskForUpdates.updates || activeTaskForUpdates.updates.length === 0) ? (
                <div className="py-8 text-center bg-[#101010] rounded-xl border border-dashed border-[#262626]">
                  <Icon name="chat" className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                  <p className="font-mono text-xs text-gray-500">
                    No status updates posted yet.
                  </p>
                  <p className="font-sans text-[11px] text-gray-600 mt-0.5">
                    Post the first progress update, deliverable link, or status transition above.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {[...activeTaskForUpdates.updates].reverse().map((entry) => {
                    const isLeaderRole = entry.authorRole?.toLowerCase().includes("lead") || entry.authorRole?.toLowerCase().includes("admin");
                    const dateStr = new Date(entry.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={entry.id}
                        className="p-3.5 rounded-xl bg-[#141414] border border-[#242424] hover:border-[#333333] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#202020] border border-[#333333] font-mono text-[10px] font-bold text-white">
                              {entry.authorName.charAt(0).toUpperCase()}
                            </span>
                            <span className="font-bold text-xs text-white">
                              {entry.authorName}
                            </span>
                            <span
                              className={`font-mono text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                                isLeaderRole
                                  ? "bg-[#FBD227]/15 text-[#FBD227] border-[#FBD227]/30"
                                  : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                              }`}
                            >
                              {entry.authorRole}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-gray-500">
                            {dateStr}
                          </span>
                        </div>

                        {entry.statusChange && (
                          <div className="mb-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1C1C1C] border border-[#2A2A2A] font-mono text-[10px] text-gray-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <span>Lane update:</span>
                            <span className="text-[#FBD227] font-bold uppercase">{entry.statusChange}</span>
                          </div>
                        )}

                        <p className="font-sans text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">
                          {entry.message}
                        </p>

                        {entry.attachmentUrl && (
                          <div className="mt-2.5 pt-2 border-t border-[#222222] flex items-center justify-end">
                            <a
                              href={entry.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#FBD227] hover:underline"
                            >
                              <Icon name="link" className="h-3 w-3" />
                              <span>View Deliverable / Attachment</span>
                              <Icon name="arrow-up-right" className="h-2.5 w-2.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
