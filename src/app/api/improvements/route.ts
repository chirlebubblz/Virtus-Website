import { NextResponse } from "next/server";
import { getStaff } from "@/lib/staffAuth";
import { badRequest, readJsonObject, serverError, str } from "@/lib/apiUtil";
import { getPersistedImprovements, savePersistedImprovements } from "@/lib/settingsStore";
import type { ImprovementItem, ImprovementComment } from "@/db";

export const dynamic = "force-dynamic";

const CATEGORIES: ImprovementItem["category"][] = [
  "Something to Add",
  "Something to Fix",
  "Workflow / Process",
];

const PRIORITIES: ImprovementItem["priority"][] = [
  "Low",
  "Medium",
  "High",
  "Critical",
];

const STATUSES: ImprovementItem["status"][] = [
  "Suggested",
  "Under Review",
  "In Progress",
  "Shipped / Fixed",
];

export async function GET() {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const items = await getPersistedImprovements();
    return NextResponse.json({
      ok: true,
      data: items,
      currentUser: staff.name,
      isAdmin: staff.role === "admin",
    });
  } catch (err) {
    return serverError("GET /api/improvements error", err);
  }
}

export async function POST(request: Request) {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request format.");

  const title = str(body.title, 200);
  const description = str(body.description, 2000);
  const category = CATEGORIES.find((c) => c === body.category) || "Something to Add";
  const priority = PRIORITIES.find((p) => p === body.priority) || "Medium";

  if (!title) return badRequest("Please enter a title for the improvement or fix.", "title");
  if (!description) return badRequest("Please enter details or context.", "description");

  const authorRole = staff.role === "admin" ? "Leader / Admin" : "Specialist";
  const now = new Date().toISOString();

  const newItem: ImprovementItem = {
    id: `imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    description,
    category,
    priority,
    status: "Suggested",
    authorName: staff.name,
    authorRole,
    upvotedBy: [staff.name], // Auto-upvote by author
    comments: [],
    createdAt: now,
    updatedAt: now,
  };

  try {
    const items = await getPersistedImprovements();
    const updated = [newItem, ...items];
    await savePersistedImprovements(updated);

    return NextResponse.json({ ok: true, data: newItem }, { status: 201 });
  } catch (err) {
    return serverError("POST /api/improvements error", err);
  }
}

export async function PATCH(request: Request) {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request format.");

  const id = str(body.id, 64);
  if (!id) return badRequest("Missing improvement item ID.", "id");

  try {
    const items = await getPersistedImprovements();
    const target = items.find((item) => item.id === id);
    if (!target) {
      return NextResponse.json({ ok: false, error: "Improvement item not found." }, { status: 404 });
    }

    const action = str(body.action, 32);
    const now = new Date().toISOString();
    const authorRole = staff.role === "admin" ? "Leader / Admin" : "Specialist";

    if (action === "toggle_upvote") {
      const alreadyUpvoted = target.upvotedBy.includes(staff.name);
      target.upvotedBy = alreadyUpvoted
        ? target.upvotedBy.filter((n) => n !== staff.name)
        : [...target.upvotedBy, staff.name];
      target.updatedAt = now;
    } else if (action === "update_status") {
      const nextStatus = STATUSES.find((s) => s === body.status);
      if (!nextStatus) return badRequest("Invalid status provided.", "status");
      const prevStatus = target.status;
      target.status = nextStatus;
      target.updatedAt = now;

      // Optional status change note
      const noteMessage = str(body.message, 1000);
      target.comments.push({
        id: `com-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        authorName: staff.name,
        authorRole,
        message: noteMessage || `Status changed from ${prevStatus} to ${nextStatus}`,
        createdAt: now,
      });
    } else if (action === "add_comment") {
      const message = str(body.message, 2000);
      if (!message) return badRequest("Comment message cannot be empty.", "message");

      const comment: ImprovementComment = {
        id: `com-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        authorName: staff.name,
        authorRole,
        message,
        createdAt: now,
      };
      target.comments.push(comment);
      target.updatedAt = now;
    } else if (action === "edit") {
      if (body.title !== undefined) {
        const title = str(body.title, 200);
        if (title) target.title = title;
      }
      if (body.description !== undefined) {
        const desc = str(body.description, 2000);
        if (desc) target.description = desc;
      }
      if (body.category !== undefined) {
        const cat = CATEGORIES.find((c) => c === body.category);
        if (cat) target.category = cat;
      }
      if (body.priority !== undefined) {
        const prio = PRIORITIES.find((p) => p === body.priority);
        if (prio) target.priority = prio;
      }
      target.updatedAt = now;
    } else {
      return badRequest("Unrecognized action.");
    }

    await savePersistedImprovements(items);
    return NextResponse.json({ ok: true, data: target });
  } catch (err) {
    return serverError("PATCH /api/improvements error", err);
  }
}

export async function DELETE(request: Request) {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const id = str(new URL(request.url).searchParams.get("id"), 64);
  if (!id) return badRequest("Missing item id.", "id");

  try {
    const items = await getPersistedImprovements();
    const target = items.find((item) => item.id === id);
    if (!target) {
      return NextResponse.json({ ok: false, error: "Item not found." }, { status: 404 });
    }

    // Admins can delete any item; team members can only delete items they authored
    if (staff.role !== "admin" && target.authorName.toLowerCase() !== staff.name.toLowerCase()) {
      return NextResponse.json({ ok: false, error: "You can only remove items you created." }, { status: 403 });
    }

    const filtered = items.filter((item) => item.id !== id);
    await savePersistedImprovements(filtered);

    return NextResponse.json({ ok: true, data: { id } });
  } catch (err) {
    return serverError("DELETE /api/improvements error", err);
  }
}
