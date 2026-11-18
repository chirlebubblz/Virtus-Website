import { NextResponse, type NextRequest } from "next/server";
import { badRequest, forbidden, readJsonObject, str, unavailable } from "@/lib/apiUtil";
import {
  LAB_PROJECT_PILLARS,
  createLabProject,
  deleteLabProject,
  getLabProjectById,
  listLabProjects,
  updateLabProject,
  type LabProjectPillar,
  type LabProjectStatus,
} from "@/lib/labProjectsStore";
import { getStaff } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

const ALL_STATUSES: readonly LabProjectStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
];

const unauthorized = () =>
  NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

const notFound = () =>
  NextResponse.json({ ok: false, error: "Lab project not found." }, { status: 404 });

function parsePillar(value: unknown): LabProjectPillar | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return LAB_PROJECT_PILLARS.find((p) => p === trimmed) ?? null;
}

function parseLiveUrl(value: unknown): { valid: boolean; value: string | null } {
  if (value === undefined || value === null || value === "") {
    return { valid: true, value: null };
  }
  const s = str(value, 500);
  if (!s) return { valid: false, value: null };
  const isInternal = s.startsWith("/") && !s.startsWith("//");
  const isHttp = /^https?:\/\//i.test(s);
  if (!isInternal && !isHttp) {
    return { valid: false, value: null };
  }
  return { valid: true, value: s };
}

export async function GET(request: NextRequest) {
  try {
    const scope = request.nextUrl.searchParams.get("scope");
    if (scope === "public") {
      const approved = await listLabProjects({ status: "approved" });
      return NextResponse.json({ ok: true, data: approved });
    }

    const staff = await getStaff(["admin", "team"]);
    if (!staff) {
      const approved = await listLabProjects({ status: "approved" });
      return NextResponse.json({ ok: true, data: approved });
    }

    if (staff.role === "admin") {
      const all = await listLabProjects();
      return NextResponse.json({ ok: true, data: all });
    }

    const teamVisible = await listLabProjects({ approvedOrSubmittedBy: staff.id });
    return NextResponse.json({ ok: true, data: teamVisible });
  } catch (err) {
    return unavailable("GET /api/lab-projects error", err);
  }
}

export async function POST(request: NextRequest) {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return unauthorized();

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request body.");

  const title = str(body.title, 200);
  if (!title) return badRequest("Title is required (up to 200 characters).", "title");

  const pillar = parsePillar(body.pillar);
  if (!pillar) {
    return badRequest(
      `Pillar must be one of: ${LAB_PROJECT_PILLARS.join(", ")}.`,
      "pillar"
    );
  }

  const summary = str(body.summary, 2000);
  if (!summary) return badRequest("Summary is required (up to 2000 characters).", "summary");

  const parsedUrl = parseLiveUrl(body.liveUrl ?? body.live_url);
  if (!parsedUrl.valid) {
    return badRequest(
      "Live URL must be an internal /library/... path or an https:// URL.",
      "liveUrl"
    );
  }

  const requestedStatus =
    body.status === undefined || body.status === null || body.status === ""
      ? "draft"
      : body.status;

  if (typeof requestedStatus !== "string" || !ALL_STATUSES.includes(requestedStatus as LabProjectStatus)) {
    return badRequest("Invalid status.", "status");
  }

  const status = requestedStatus as LabProjectStatus;

  if (staff.role === "admin") {
    if (status !== "draft" && status !== "approved") {
      return badRequest("Admins can create a project as draft or approved.", "status");
    }
  } else {
    if (status !== "draft" && status !== "pending_approval") {
      return forbidden("Team members can only save as draft or submit for approval.");
    }
  }

  try {
    const created = await createLabProject({
      title,
      pillar,
      summary,
      liveUrl: parsedUrl.value,
      status,
      submittedBy: staff.id,
      submittedByName: staff.name,
      reviewedBy: status === "approved" ? staff.id : null,
      reviewedByName: status === "approved" ? staff.name : null,
    });
    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (err) {
    return unavailable("POST /api/lab-projects error", err);
  }
}

export async function PATCH(request: NextRequest) {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return unauthorized();

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request body.");

  const id = str(body.id, 64);
  if (!id) return badRequest("Lab project ID is required.", "id");

  try {
    const existing = await getLabProjectById(id);
    if (!existing) return notFound();

    const isAdmin = staff.role === "admin";

    if (!isAdmin) {
      if (existing.submittedBy !== staff.id) {
        return forbidden("You can only edit your own lab projects.");
      }
      if (existing.status !== "draft" && existing.status !== "rejected") {
        return forbidden("Only draft or rejected projects can be updated or submitted.");
      }
    }

    const patch: {
      title?: string;
      pillar?: LabProjectPillar;
      summary?: string;
      liveUrl?: string | null;
      status?: LabProjectStatus;
      reviewedBy?: string | null;
      reviewedByName?: string | null;
    } = {};

    if (body.title !== undefined) {
      const title = str(body.title, 200);
      if (!title) return badRequest("Title is required (up to 200 characters).", "title");
      patch.title = title;
    }

    if (body.pillar !== undefined) {
      const pillar = parsePillar(body.pillar);
      if (!pillar) {
        return badRequest(
          `Pillar must be one of: ${LAB_PROJECT_PILLARS.join(", ")}.`,
          "pillar"
        );
      }
      patch.pillar = pillar;
    }

    if (body.summary !== undefined) {
      const summary = str(body.summary, 2000);
      if (!summary) return badRequest("Summary is required (up to 2000 characters).", "summary");
      patch.summary = summary;
    }

    if (body.liveUrl !== undefined || body.live_url !== undefined) {
      const parsedUrl = parseLiveUrl(body.liveUrl ?? body.live_url);
      if (!parsedUrl.valid) {
        return badRequest(
          "Live URL must be an internal /library/... path or an https:// URL.",
          "liveUrl"
        );
      }
      patch.liveUrl = parsedUrl.value;
    }

    if (body.status !== undefined) {
      if (typeof body.status !== "string" || !ALL_STATUSES.includes(body.status as LabProjectStatus)) {
        return badRequest("Invalid status.", "status");
      }
      const nextStatus = body.status as LabProjectStatus;

      if (!isAdmin) {
        if (nextStatus !== "draft" && nextStatus !== "pending_approval") {
          return forbidden("Only admins can approve or reject lab projects.");
        }
        patch.status = nextStatus;
        patch.reviewedBy = null;
        patch.reviewedByName = null;
      } else {
        patch.status = nextStatus;
        if (nextStatus === "approved" || nextStatus === "rejected") {
          patch.reviewedBy = staff.id;
          patch.reviewedByName = staff.name;
        } else {
          patch.reviewedBy = null;
          patch.reviewedByName = null;
        }
      }
    }

    const updated = await updateLabProject(id, patch);
    if (!updated) return notFound();
    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    return unavailable("PATCH /api/lab-projects error", err);
  }
}

export async function DELETE(request: NextRequest) {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return unauthorized();

  let id = str(request.nextUrl.searchParams.get("id"), 64);
  if (!id) {
    const body = await readJsonObject(request);
    id = str(body?.id, 64);
  }
  if (!id) return badRequest("Lab project ID is required.", "id");

  try {
    const existing = await getLabProjectById(id);
    if (!existing) return notFound();

    if (staff.role !== "admin") {
      if (existing.submittedBy !== staff.id || existing.status !== "draft") {
        return forbidden("Team members can only delete their own draft projects.");
      }
    }

    await deleteLabProject(id);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return unavailable("DELETE /api/lab-projects error", err);
  }
}
