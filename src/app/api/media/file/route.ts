import { NextResponse } from "next/server";
import { getNeonSql, isNeonConfigured } from "@/lib/neon";
import { getStaff } from "@/lib/staffAuth";
import { downloadUrl, isStorageConfigured } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Opens a Library file through a short-lived signed link. Team members (TEAM_API) only reach General Library files. */
export async function GET(request: Request) {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!isNeonConfigured() || !isStorageConfigured()) {
    return NextResponse.json({ ok: false, error: "File storage is not set up." }, { status: 503 });
  }

  const id = new URL(request.url).searchParams.get("id") ?? "";
  try {
    const [row] = await getNeonSql()!`
      SELECT object_key AS "key", client_id AS "clientId" FROM media_assets WHERE id = ${id} LIMIT 1`;
    // Same answer for missing and not allowed, so team members cannot probe for client files.
    if (!row || (staff.role !== "admin" && row.clientId)) {
      return NextResponse.json({ ok: false, error: "File not found." }, { status: 404 });
    }
    const url = await downloadUrl(row.key);
    return NextResponse.redirect(url, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/media/file error:", err);
    return NextResponse.json({ ok: false, error: "The file is unavailable. Try again shortly." }, { status: 503 });
  }
}
