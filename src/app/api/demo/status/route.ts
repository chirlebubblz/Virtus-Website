import { NextResponse } from "next/server";
import { db } from "@/db";
import { getNeonSql, isNeonConfigured, neonDemoLoaded } from "@/lib/neon";
import { getStaff } from "@/lib/staffAuth";
import { unavailable } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

// Admin and team: the workspace views read this on load so they show the same sample data the server holds.
export async function GET() {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const sql = isNeonConfigured() ? getNeonSql() : null;
  try {
    const loaded = sql ? await neonDemoLoaded(sql) : db.isDemoLoaded();
    return NextResponse.json({ ok: true, data: { loaded } });
  } catch (err) {
    return unavailable("GET /api/demo/status error", err);
  }
}
