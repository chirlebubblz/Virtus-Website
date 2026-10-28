import { NextResponse } from "next/server";
import { getNeonSql, isNeonConfigured } from "@/lib/neon";
import { getStaff } from "@/lib/staffAuth";
import { downloadUrl, isStorageConfigured } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Opens a Library file through a short-lived signed link. Team members (TEAM_API) only reach General Library files. */
export async function GET(request: Request) {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!isNeonConfigured()) {
    return NextResponse.json({ ok: false, error: "Database is not configured." }, { status: 503 });
  }

  const searchParams = new URL(request.url).searchParams;
  const id = searchParams.get("id") ?? "";
  const asDownload = searchParams.get("download") === "1";

  try {
    const [row] = await getNeonSql()!`
      SELECT object_key AS "key", client_id AS "clientId", filename, content, mime FROM media_assets WHERE id = ${id} LIMIT 1`;
    // Same answer for missing and not allowed, so team members cannot probe for client files.
    if (!row || (staff.role !== "admin" && row.clientId)) {
      return NextResponse.json({ ok: false, error: "File not found." }, { status: 404 });
    }
    if (row.content) {
      const isBase64 = typeof row.content === "string" && row.content.startsWith("base64:");
      const rawData = isBase64
        ? Buffer.from((row.content as string).slice(7), "base64")
        : (row.content as string);
      const headers = new Headers();
      headers.set("Content-Type", (row.mime as string) || (isBase64 ? "application/octet-stream" : "text/html; charset=utf-8"));
      if (asDownload) {
        headers.set("Content-Disposition", `attachment; filename="${row.filename}"`);
      } else {
        headers.set("Content-Disposition", `inline; filename="${row.filename}"`);
      }
      return new Response(rawData, { headers });
    }
    if (row.key && row.key.startsWith("/")) {
      return NextResponse.redirect(new URL(row.key, request.url));
    }
    if (!isStorageConfigured()) {
      return NextResponse.json({ ok: false, error: "File storage is not set up." }, { status: 503 });
    }
    const url = await downloadUrl(row.key, (row.filename as string) || undefined, asDownload);
    return NextResponse.redirect(url, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/media/file error:", err);
    return NextResponse.json({ ok: false, error: "The file is unavailable. Try again shortly." }, { status: 503 });
  }
}
