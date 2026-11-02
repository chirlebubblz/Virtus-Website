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
  "Digital Home Idea",
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

async function getOrSeedImprovements(): Promise<ImprovementItem[]> {
  let items = await getPersistedImprovements();
  if (items.length === 0) {
    const now = new Date().toISOString();
    const initialSeeds: ImprovementItem[] = [
      {
        id: "imp-seed-1",
        title: "Interactive Website Conversion Scorecard (Free Sample)",
        description: "Build a 60-second diagnostic quiz on virtuslabs.com that rates visitors' current website performance and captures their email before revealing their score.",
        category: "Digital Home Idea",
        bucket: "free-samples",
        priority: "High",
        status: "Suggested",
        authorName: "Brand Lead",
        authorRole: "Leader / Admin",
        upvotedBy: ["Brand Lead", "Specialist"],
        comments: [
          {
            id: "com-seed-1",
            authorName: "Specialist",
            authorRole: "Specialist",
            message: "Great idea! We can use a lightweight multi-step quiz format that delivers an instant grade (A to F).",
            createdAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "imp-seed-2",
        title: "The $1,250 5-Day Landing Page Sprint (Starter Kit)",
        description: "Productized entry offer with clear deliverables and satisfaction guarantee. Recovers customer acquisition cost within 21 days and qualifies clients for custom builds.",
        category: "Digital Home Idea",
        bucket: "starter-packs",
        priority: "High",
        status: "Suggested",
        authorName: "Brand Lead",
        authorRole: "Leader / Admin",
        upvotedBy: ["Brand Lead"],
        comments: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "imp-seed-3",
        title: "LinkedIn Bio Bridge & Carousel Hook Strategy",
        description: "Update team bios with direct CTA to the diagnostic quiz. Publish weekly 5-slide before/after teardown carousels driving traffic to the free tool.",
        category: "Digital Home Idea",
        bucket: "social-hooks",
        priority: "Medium",
        status: "Suggested",
        authorName: "Growth Lead",
        authorRole: "Specialist",
        upvotedBy: ["Growth Lead", "Brand Lead"],
        comments: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "imp-seed-4",
        title: "Neon DB Lead Vault & Instant Slack Notification",
        description: "Automatically pipe all quiz submissions and starter kit requests into our Neon DB customer vault and trigger an instant Slack alert to the team.",
        category: "Digital Home Idea",
        bucket: "operations",
        priority: "High",
        status: "In Progress",
        authorName: "Tech Lead",
        authorRole: "Specialist",
        upvotedBy: ["Tech Lead"],
        comments: [],
        createdAt: now,
        updatedAt: now,
      },
    ];
    await savePersistedImprovements(initialSeeds);
    items = initialSeeds;
  }
  return items;
}

export async function GET() {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const items = await getOrSeedImprovements();
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
  const bucket = (["free-samples", "starter-packs", "social-hooks", "operations"] as const).find(
    (b) => b === body.bucket
  );

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
    bucket,
  };

  try {
    const items = await getOrSeedImprovements();
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
    const items = await getOrSeedImprovements();
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
    const items = await getOrSeedImprovements();
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
