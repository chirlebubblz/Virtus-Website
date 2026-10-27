import { NextResponse } from "next/server";
import { db } from "@/db";
import type { Task, TaskUpdateEntry } from "@/db";
import { getNeonSql, isNeonConfigured } from "@/lib/neon";
import { getStaff } from "@/lib/staffAuth";
import { StoreUnavailableError, listStaff } from "@/lib/staffStore";
import { badRequest, readJsonObject, serverError, str, unavailable } from "@/lib/apiUtil";
import { hostMatches } from "@/lib/scheduling";

export const dynamic = "force-dynamic";

// Admins see, assign and delete every task. Team members (TEAM_API in middleware) see and edit only tasks assigned
// to them, create tasks only for themselves, and cannot reassign or delete. A member is matched by their task-board
// profile, else their name (first name, whole word), the same rule as bookings.

const STATUSES: Task["status"][] = ["todo", "in_progress", "review", "done"];
const PRIORITIES: Task["priority"][] = ["low", "medium", "high", "urgent"];

type Sql = NonNullable<ReturnType<typeof getNeonSql>>;
const neon = (): Sql | null => (isNeonConfigured() ? getNeonSql() : null);

let columnsEnsured = false;
async function ensureTaskColumns(sql: Sql) {
  if (columnsEnsured) return;
  try {
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updates JSONB DEFAULT '[]'::jsonb;`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS latest_update TEXT;`;
    columnsEnsured = true;
  } catch {
    // Column may already exist or table migration in progress
  }
}

async function selectTasks(sql: Sql, id?: string): Promise<Task[]> {
  await ensureTaskColumns(sql);
  const rows = id
    ? await sql`
        SELECT id, project_id AS "projectId", project_title AS "projectTitle", title, assignee, status, priority, due_date AS "dueDate", updates, latest_update AS "latestUpdate"
        FROM tasks WHERE id = ${id} LIMIT 1`
    : await sql`
        SELECT id, project_id AS "projectId", project_title AS "projectTitle", title, assignee, status, priority, due_date AS "dueDate", updates, latest_update AS "latestUpdate"
        FROM tasks ORDER BY created_at ASC`;
  return (rows as (Task & { updates?: unknown })[]).map((t) => {
    let parsedUpdates: Task["updates"] = [];
    if (Array.isArray(t.updates)) {
      parsedUpdates = t.updates as Task["updates"];
    } else if (typeof t.updates === "string") {
      try {
        parsedUpdates = JSON.parse(t.updates);
      } catch {
        parsedUpdates = [];
      }
    }
    return {
      ...t,
      projectId: t.projectId ?? undefined,
      projectTitle: t.projectTitle ?? undefined,
      dueDate: t.dueDate ?? "",
      updates: parsedUpdates,
      latestUpdate:
        t.latestUpdate ??
        (parsedUpdates && parsedUpdates.length > 0
          ? parsedUpdates[parsedUpdates.length - 1].message
          : undefined),
    };
  });
}

/** Who can be assigned: active staff (task-board profile, else name) plus anyone already on a task. */
async function assigneeOptions(tasks: Task[]): Promise<string[]> {
  let staff: { memberLabel: string | null; name: string; status: string }[] = [];
  try {
    staff = await listStaff();
  } catch (err) {
    if (!(err instanceof StoreUnavailableError)) throw err;
  }
  const names = [...staff.filter((s) => s.status === "active").map((s) => s.memberLabel ?? s.name), ...tasks.map((t) => t.assignee)];
  return [...new Set(names.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

/** The project's title, or null when the id is unknown. Undefined when no project was chosen. */
async function projectTitle(sql: Sql | null, projectId: string | undefined): Promise<string | null | undefined> {
  if (!projectId) return undefined;
  if (!sql) return db.getProjects().find((p) => p.id === projectId)?.title ?? null;
  const [row] = await sql`SELECT title FROM projects WHERE id = ${projectId} LIMIT 1`;
  return row ? (row.title as string) : null;
}

const forbidden = (error: string) => NextResponse.json({ ok: false, error }, { status: 403 });
const notFound = () => NextResponse.json({ ok: false, error: "Task not found." }, { status: 404 });

export async function GET() {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const sql = neon();
  try {
    const all = sql ? await selectTasks(sql) : db.getTasks();
    const assignees = await assigneeOptions(all);
    const member = staff.memberLabel ?? staff.name;
    if (staff.role === "admin") {
      return NextResponse.json({ ok: true, data: { tasks: all, assignees, member: null } });
    }
    return NextResponse.json({
      ok: true,
      data: { tasks: all, assignees, member },
    });
  } catch (err) {
    return sql ? unavailable("GET /api/tasks error", err) : serverError("GET /api/tasks error", err);
  }
}

export async function POST(request: Request) {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const member = staff.memberLabel ?? staff.name;

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");

  const title = str(body.title, 200);
  const requested = str(body.assignee, 120);
  const assignee = staff.role === "admin" ? requested : member;
  const status = body.status === undefined ? "todo" : STATUSES.find((s) => s === body.status);
  const priority = body.priority === undefined ? "medium" : PRIORITIES.find((p) => p === body.priority);
  const dueDate = str(body.dueDate, 50) ?? "Upcoming";
  const projectId = str(body.projectId, 64) ?? undefined;

  if (!title) return badRequest("Enter a task title.", "title");
  if (staff.role !== "admin" && requested && !hostMatches(requested, member)) return forbidden("You can only create tasks for yourself.");
  if (!assignee) return badRequest("Choose an assignee.", "assignee");
  if (!status) return badRequest("Choose a valid status.", "status");
  if (!priority) return badRequest("Choose a valid priority.", "priority");

  const sql = neon();
  try {
    const projectName = await projectTitle(sql, projectId);
    if (projectName === null) return badRequest("Unknown project.", "projectId");
    const task: Omit<Task, "id"> = { title, assignee, status, priority, dueDate, projectId, projectTitle: projectName ?? "Internal Studio" };

    if (!sql) return NextResponse.json({ ok: true, data: db.addTask(task) }, { status: 201 });

    const id = `task-${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    await sql`
      INSERT INTO tasks (id, project_id, project_title, title, assignee, status, priority, due_date)
      VALUES (${id}, ${task.projectId ?? null}, ${task.projectTitle}, ${title}, ${assignee}, ${status}, ${priority}, ${dueDate})`;
    const [created] = await selectTasks(sql, id);
    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (err) {
    return sql ? unavailable("POST /api/tasks error", err) : serverError("POST /api/tasks error", err);
  }
}

export async function PATCH(request: Request) {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const isAdmin = staff.role === "admin";
  const member = staff.memberLabel ?? staff.name;

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");
  const id = str(body.id, 64);
  if (!id) return badRequest("Missing task id.", "id");

  const updates: Partial<Omit<Task, "id">> = {};
  if (body.title !== undefined) {
    const title = str(body.title, 200);
    if (!title) return badRequest("Enter a task title.", "title");
    updates.title = title;
  }
  if (body.assignee !== undefined) {
    const assignee = str(body.assignee, 120);
    if (!assignee) return badRequest("Choose an assignee.", "assignee");
    if (!isAdmin && !hostMatches(assignee, member)) return forbidden("Only admins can reassign tasks.");
    updates.assignee = isAdmin ? assignee : member;
  }
  if (body.status !== undefined) {
    const status = STATUSES.find((s) => s === body.status);
    if (!status) return badRequest("Choose a valid status.", "status");
    updates.status = status;
  }
  if (body.priority !== undefined) {
    const priority = PRIORITIES.find((p) => p === body.priority);
    if (!priority) return badRequest("Choose a valid priority.", "priority");
    updates.priority = priority;
  }
  if (body.dueDate !== undefined) updates.dueDate = str(body.dueDate, 50) ?? "Upcoming";

  const updateMessage = typeof body.updateMessage === "string" ? body.updateMessage.trim() : undefined;
  const attachmentUrl = typeof body.attachmentUrl === "string" ? body.attachmentUrl.trim() : undefined;

  const sql = neon();
  try {
    if (body.projectId !== undefined) {
      const projectId = str(body.projectId, 64) ?? undefined;
      const name = await projectTitle(sql, projectId);
      if (name === null) return badRequest("Unknown project.", "projectId");
      updates.projectId = projectId;
      updates.projectTitle = name ?? "Internal Studio";
    }

    const current = sql ? (await selectTasks(sql, id))[0] : db.getTasks().find((t) => t.id === id);
    if (!current) return notFound();

    // Append update entry or status transition note
    const nextUpdates: TaskUpdateEntry[] = Array.isArray(current.updates) ? [...current.updates] : [];
    const authorRole = staff.role === "admin" ? "Leader / Admin" : "Specialist";

    if (updateMessage) {
      const statusChangeText = updates.status && updates.status !== current.status ? `${current.status} -> ${updates.status}` : undefined;
      nextUpdates.push({
        id: `upd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        authorName: staff.name,
        authorRole,
        message: updateMessage,
        statusChange: statusChangeText,
        attachmentUrl: attachmentUrl || undefined,
        createdAt: new Date().toISOString(),
      });
      updates.updates = nextUpdates;
      updates.latestUpdate = updateMessage;
    } else if (updates.status && updates.status !== current.status) {
      nextUpdates.push({
        id: `upd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        authorName: staff.name,
        authorRole,
        message: `Status moved to ${updates.status}`,
        statusChange: `${current.status} -> ${updates.status}`,
        createdAt: new Date().toISOString(),
      });
      updates.updates = nextUpdates;
      updates.latestUpdate = `Status moved to ${updates.status}`;
    }

    if (!sql) return NextResponse.json({ ok: true, data: db.updateTask(id, updates) });

    const next = { ...current, ...updates };
    await sql`
      UPDATE tasks SET
        title = ${next.title},
        assignee = ${next.assignee},
        status = ${next.status},
        priority = ${next.priority},
        due_date = ${next.dueDate},
        project_id = ${next.projectId ?? null},
        project_title = ${next.projectTitle ?? null},
        updates = ${JSON.stringify(next.updates || [])}::jsonb,
        latest_update = ${next.latestUpdate ?? null}
      WHERE id = ${id}`;
    const [saved] = await selectTasks(sql, id);
    return NextResponse.json({ ok: true, data: saved });
  } catch (err) {
    return sql ? unavailable("PATCH /api/tasks error", err) : serverError("PATCH /api/tasks error", err);
  }
}

export async function DELETE(request: Request) {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (staff.role !== "admin") return forbidden("Only admins can delete tasks.");

  const id = str(new URL(request.url).searchParams.get("id"), 64);
  if (!id) return badRequest("Missing task id.", "id");

  const sql = neon();
  try {
    const deleted = sql ? (await sql`DELETE FROM tasks WHERE id = ${id} RETURNING id`).length > 0 : db.deleteTask(id);
    return deleted ? NextResponse.json({ ok: true, data: { id } }) : notFound();
  } catch (err) {
    return sql ? unavailable("DELETE /api/tasks error", err) : serverError("DELETE /api/tasks error", err);
  }
}
