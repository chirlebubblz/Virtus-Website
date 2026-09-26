import { NextResponse } from "next/server";
import { RESET_TTL_MS, getStaff, hashSecret, newSecretToken } from "@/lib/staffAuth";
import {
  StoreUnavailableError,
  addAudit,
  countActiveAdmins,
  createReset,
  getStaffById,
  toSummary,
  updateStaff,
} from "@/lib/staffStore";

const TEAM_PROFILE_LABELS = ["Kai (Brand Lead)", "Ren (Frontend)", "Sora (UX)"];

export const dynamic = "force-dynamic";

type Action = "set_role" | "disable" | "enable" | "sign_out" | "reset_link" | "set_label";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getStaff(["admin"]);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: { action?: Action; role?: unknown; memberLabel?: unknown };
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object") throw new Error("bad body");
    body = parsed as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

  try {
    const target = await getStaffById(id);
    if (!target) return bad("Person not found.", 404);

    // Never let the workspace end up with no active admin.
    const removesAdmin =
      target.role === "admin" &&
      target.status === "active" &&
      (body.action === "disable" || (body.action === "set_role" && body.role !== "admin"));
    if (removesAdmin && (await countActiveAdmins()) <= 1) return bad("Keep at least one active admin.", 409);

    switch (body.action) {
      case "set_role": {
        if (body.role !== "admin" && body.role !== "team") return bad("Choose a role.");
        const updated = await updateStaff(id, { role: body.role, bumpSession: true });
        await addAudit(admin.email, "role_change", `${target.email} -> ${body.role}`);
        return NextResponse.json({ ok: true, data: updated && toSummary(updated) });
      }
      case "disable": {
        const updated = await updateStaff(id, { status: "disabled", bumpSession: true });
        await addAudit(admin.email, "disable", target.email);
        return NextResponse.json({ ok: true, data: updated && toSummary(updated) });
      }
      case "enable": {
        const updated = await updateStaff(id, { status: "active" });
        await addAudit(admin.email, "enable", target.email);
        return NextResponse.json({ ok: true, data: updated && toSummary(updated) });
      }
      case "sign_out": {
        const updated = await updateStaff(id, { bumpSession: true });
        await addAudit(admin.email, "sign_out", target.email);
        return NextResponse.json({ ok: true, data: updated && toSummary(updated) });
      }
      case "set_label": {
        const label = typeof body.memberLabel === "string" ? body.memberLabel.trim().slice(0, 120) : "";
        if (label && !TEAM_PROFILE_LABELS.includes(label)) return bad("Choose one of the listed task board profiles.");
        const updated = await updateStaff(id, { memberLabel: label || null });
        await addAudit(admin.email, "set_team_profile", `${target.email} -> ${label || "none"}`);
        return NextResponse.json({ ok: true, data: updated && toSummary(updated) });
      }
      case "reset_link": {
        const token = newSecretToken("stfrst");
        await createReset({
          staffId: id,
          tokenHash: await hashSecret(token),
          expiresAt: new Date(Date.now() + RESET_TTL_MS).toISOString(),
        });
        await addAudit(admin.email, "password_reset_link", target.email);
        return NextResponse.json({ ok: true, data: { token } });
      }
      default:
        return bad("Unknown action.");
    }
  } catch (err) {
    if (err instanceof StoreUnavailableError) return bad(err.message, 503);
    console.error("PATCH /api/staff/users/[id] error:", err);
    return bad("Something went wrong.", 500);
  }
}
