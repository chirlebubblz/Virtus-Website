import { NextResponse } from "next/server";
import { db } from "@/db";
import type { Task } from "@/db";
import { denyUnlessStaff } from "@/lib/staffAuth";
import { badRequest, readJsonObject, str } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await denyUnlessStaff(["admin", "team"]);
  if (denied) return denied;

  return NextResponse.json({
    ok: true,
    data: db.getTasks(),
  });
}

export async function POST(request: Request) {
  const denied = await denyUnlessStaff(["admin", "team"]);
  if (denied) return denied;

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid JSON payload");

  const title = str(body.title, 200);
  if (!title) return badRequest("Task title is required");

  const assignee = str(body.assignee, 100) || "Kai (Brand Lead)";
  const status = (str(body.status, 20) || "todo") as Task["status"];
  const priority = (str(body.priority, 20) || "medium") as Task["priority"];
  const dueDate = str(body.dueDate, 50) || "Tomorrow";
  const projectId = str(body.projectId, 50) || undefined;
  const projectTitle = str(body.projectTitle, 100) || undefined;

  const task = db.addTask({
    title,
    assignee,
    status,
    priority,
    dueDate,
    projectId,
    projectTitle,
  });

  return NextResponse.json({ ok: true, data: task }, { status: 201 });
}

export async function PATCH(request: Request) {
  const denied = await denyUnlessStaff(["admin", "team"]);
  if (denied) return denied;

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid JSON payload");

  const id = str(body.id, 50);
  if (!id) return badRequest("Task ID is required");

  const updates: Partial<Omit<Task, "id">> = {};
  if (body.title !== undefined) updates.title = str(body.title, 200) || "";
  if (body.assignee !== undefined) updates.assignee = str(body.assignee, 100) || "";
  if (body.status !== undefined) updates.status = body.status as Task["status"];
  if (body.priority !== undefined) updates.priority = body.priority as Task["priority"];
  if (body.dueDate !== undefined) updates.dueDate = str(body.dueDate, 50) || "";
  if (body.projectId !== undefined) updates.projectId = str(body.projectId, 50) || undefined;
  if (body.projectTitle !== undefined) updates.projectTitle = str(body.projectTitle, 100) || undefined;

  const updated = db.updateTask(id, updates);
  if (!updated) return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 });

  return NextResponse.json({ ok: true, data: updated });
}

export async function DELETE(request: Request) {
  const denied = await denyUnlessStaff(["admin", "team"]);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return badRequest("Missing task id");

  const deleted = db.deleteTask(id);
  if (!deleted) return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
