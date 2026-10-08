import { NextResponse } from "next/server";
import { isNeonConfigured } from "@/lib/neon";
import { getStaff } from "@/lib/staffAuth";
import { badRequest, readJsonObject, str } from "@/lib/apiUtil";
import {
  KEY_PATTERN,
  MAX_PARTS,
  MAX_UPLOAD_BYTES,
  PART_BYTES,
  UPLOAD_ID_PATTERN,
  abortUpload,
  cleanMime,
  completeUpload,
  formatSize,
  isStorageConfigured,
  newObjectKey,
  partUrl,
  startUpload,
} from "@/lib/storage";

export const dynamic = "force-dynamic";

// Admin only (middleware). Multipart upload in four calls, by `action`:
//   start    {filename, size, mime}      -> {key, uploadId, partSize, parts}
//   part     {key, uploadId, partNumber} -> {url}  5-minute signed PUT the browser sends that part to
//   complete {key, uploadId}             -> joins the parts; then register the file with POST /api/media
//   abort    {key, uploadId}             -> discards an upload that failed or was cancelled
export async function POST(request: Request) {
  const staff = await getStaff(["admin"]);
  if (!staff) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!isNeonConfigured() || !isStorageConfigured()) {
    return NextResponse.json({ ok: false, error: "File storage is not set up." }, { status: 503 });
  }

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");

  try {
    if (body.action === "start") {
      const filename = str(body.filename, 200);
      if (!filename) return badRequest("File name is required.", "file");
      const size = Number(body.size);
      if (!Number.isFinite(size) || size <= 0) return badRequest("The file is empty.", "file");
      // Checked again against the stored object when the file is registered.
      if (size > MAX_UPLOAD_BYTES) return badRequest(`Files can be up to ${formatSize(MAX_UPLOAD_BYTES)}.`, "file");
      const key = newObjectKey(filename);
      const uploadId = await startUpload(key, filename, cleanMime(body.mime));
      return NextResponse.json({ ok: true, data: { key, uploadId, partSize: PART_BYTES, parts: Math.ceil(size / PART_BYTES) } });
    }

    const key = typeof body.key === "string" && KEY_PATTERN.test(body.key) ? body.key : null;
    const uploadId = typeof body.uploadId === "string" && UPLOAD_ID_PATTERN.test(body.uploadId) ? body.uploadId : null;
    if (!key || !uploadId) return badRequest("Unknown upload.", "key");

    if (body.action === "part") {
      const partNumber = Number(body.partNumber);
      if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > MAX_PARTS) return badRequest("Invalid part number.", "partNumber");
      return NextResponse.json({ ok: true, data: { url: await partUrl(key, uploadId, partNumber) } });
    }
    if (body.action === "complete") {
      if (!(await completeUpload(key, uploadId))) return badRequest("The upload did not finish. Try again.", "key");
      return NextResponse.json({ ok: true, data: { key } });
    }
    if (body.action === "abort") {
      await abortUpload(key, uploadId);
      return NextResponse.json({ ok: true });
    }
    return badRequest("Unknown action.", "action");
  } catch (err) {
    console.error("POST /api/media/upload error:", err);
    return NextResponse.json({ ok: false, error: "File storage is unavailable. Try again shortly." }, { status: 503 });
  }
}
