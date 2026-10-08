import { NextResponse } from "next/server";
import { isNeonConfigured } from "@/lib/neon";
import { getStaff } from "@/lib/staffAuth";
import { badRequest, readJsonObject, str } from "@/lib/apiUtil";
import { MAX_UPLOAD_BYTES, formatSize, isStorageConfigured, newObjectKey, uploadUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Admin only (middleware). Returns a 5-minute signed link (and the headers to send) the browser PUTs the file to. Register it with POST /api/media. */
export async function POST(request: Request) {
  const staff = await getStaff(["admin"]);
  if (!staff) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!isNeonConfigured() || !isStorageConfigured()) {
    return NextResponse.json({ ok: false, error: "File storage is not set up." }, { status: 503 });
  }

  const body = await readJsonObject(request);
  const filename = str(body?.filename, 200);
  if (!filename) return badRequest("File name is required.", "file");
  const size = Number(body?.size);
  if (!Number.isFinite(size) || size <= 0) return badRequest("The file is empty.", "file");
  // Checked again against the stored object when the file is registered.
  if (size > MAX_UPLOAD_BYTES) return badRequest(`Files can be up to ${formatSize(MAX_UPLOAD_BYTES)}.`, "file");

  const key = newObjectKey(filename);
  const { url, headers } = await uploadUrl(key, filename);
  return NextResponse.json({ ok: true, data: { key, uploadUrl: url, headers } });
}
