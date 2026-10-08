import { NextResponse } from "next/server";
import { getClientSessionId } from "@/lib/clientSession";
import { getNeonSql, isNeonConfigured } from "@/lib/neon";
import { downloadUrl, isStorageConfigured } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Opens a file the team shared with this client. The client comes from the session cookie only. */
export async function GET(request: Request) {
  const clientId = await getClientSessionId();
  if (!clientId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!isNeonConfigured() || !isStorageConfigured()) {
    return NextResponse.json({ ok: false, error: "Files are unavailable right now." }, { status: 503 });
  }

  const id = new URL(request.url).searchParams.get("id") ?? "";
  try {
    const [row] = await getNeonSql()!`
      SELECT object_key AS "key" FROM media_assets
      WHERE id = ${id} AND client_id = ${clientId} AND visible_to_client LIMIT 1`;
    if (!row) return NextResponse.json({ ok: false, error: "File not found." }, { status: 404 });
    const url = await downloadUrl(row.key);
    return NextResponse.redirect(url, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/client/files error:", err);
    return NextResponse.json({ ok: false, error: "Files are unavailable right now. Try again shortly." }, { status: 503 });
  }
}
