import { NextResponse } from "next/server";
import { db } from "@/db";
import type { Project } from "@/db";
import { denyUnlessStaff } from "@/lib/staffAuth";
import { badRequest, readJsonObject, str } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await denyUnlessStaff(["admin", "team"]);
  if (denied) return denied;

  return NextResponse.json({
    ok: true,
    data: db.getProjects(),
  });
}

export async function PATCH(request: Request) {
  const denied = await denyUnlessStaff(["admin", "team"]);
  if (denied) return denied;

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid JSON payload");

  const id = str(body.id, 50);
  if (!id) return badRequest("Project ID is required");

  const updates: Partial<Omit<Project, "id">> = {};

  if (body.title !== undefined) updates.title = str(body.title, 200) || "";
  if (body.phase !== undefined) updates.phase = body.phase as Project["phase"];
  if (body.progress !== undefined) {
    const p = Number(body.progress);
    updates.progress = Math.max(0, Math.min(100, isNaN(p) ? 0 : p));
  }
  if (body.riskLevel !== undefined) updates.riskLevel = body.riskLevel as Project["riskLevel"];
  if (body.targetDate !== undefined) updates.targetDate = str(body.targetDate, 50) || "";
  if (body.budget !== undefined) updates.budget = Number(body.budget) || 0;
  if (body.leadName !== undefined) updates.leadName = str(body.leadName, 100) || undefined;
  if (body.leadRole !== undefined) updates.leadRole = str(body.leadRole, 100) || undefined;
  if (body.podName !== undefined) updates.podName = str(body.podName, 100) || undefined;
  if (Array.isArray(body.teamMembers)) updates.teamMembers = body.teamMembers.map(String);
  if (Array.isArray(body.docs)) updates.docs = body.docs as Project["docs"];
  if (Array.isArray(body.deliverables)) updates.deliverables = body.deliverables as Project["deliverables"];

  const updated = db.updateProject(id, updates);
  if (!updated) return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });

  return NextResponse.json({ ok: true, data: updated });
}
