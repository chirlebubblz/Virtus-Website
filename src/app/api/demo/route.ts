import { NextResponse } from "next/server";
import { db } from "@/db";
import { clearNeonDemo, getNeonSql, isNeonConfigured, seedNeonDemo } from "@/lib/neon";
import { confirmAdminPassword } from "@/lib/adminConfirm";
import { getStaff } from "@/lib/staffAuth";
import { addAudit } from "@/lib/staffStore";
import { badRequest, readJsonObject, unavailable } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

/**
 * Loads or removes the sample (demo) records. Admin only, and the admin must re-enter their own password, so an
 * accidental click or a borrowed session cannot wipe or fill the workspace. Removal matches the fixed demo ids
 * only. Real records are never selected.
 */
export async function POST(request: Request) {
  const admin = await getStaff(["admin"]);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");
  const action = body.action === "load" || body.action === "clear" ? body.action : null;
  if (!action) return badRequest("Choose load or clear.", "action");
  const denied = await confirmAdminPassword(admin, body.password, "demo");
  if (denied) return denied;

  const sql = isNeonConfigured() ? getNeonSql() : null;
  try {
    if (sql) {
      if (action === "load") await seedNeonDemo(sql);
      else await clearNeonDemo(sql);
    }
    let removed = 0;
    if (action === "load") db.loadDemoData();
    else removed = db.clearDemoData();
    await addAudit(admin.email, action === "load" ? "demo_loaded" : "demo_removed", sql ? "neon + memory" : "memory");
    return NextResponse.json({ ok: true, data: { loaded: action === "load", removed } });
  } catch (err) {
    return unavailable(`POST /api/demo ${action} error`, err);
  }
}
