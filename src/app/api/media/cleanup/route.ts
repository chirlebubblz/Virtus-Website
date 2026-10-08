import { NextResponse } from "next/server";
import { getNeonSql, isNeonConfigured } from "@/lib/neon";
import { safeEqual } from "@/lib/session";
import { getStaff } from "@/lib/staffAuth";
import { abortUpload, deleteObject, findStaleUploads, isStorageConfigured } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Daily cleanup of uploads that never reached the Library (vercel.json cron). Discards unfinished multipart uploads and
// deletes stored files that were never registered, once they are older than a day; no upload runs that long.
// Callers: Vercel Cron (Authorization: Bearer CRON_SECRET; public in middleware, checked here) or a signed-in admin.
// Admins may pass ?minAgeHours= (at least 1) to run it sooner. Without CRON_SECRET the cron call is refused.

const DEFAULT_MIN_AGE_HOURS = 24;

async function isCron(request: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  return Boolean(secret && secret.length >= 16 && header) && safeEqual(header!, `Bearer ${secret}`);
}

export async function GET(request: Request) {
  const cron = await isCron(request);
  const admin = cron ? null : await getStaff(["admin"]);
  if (!cron && !admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!isNeonConfigured() || !isStorageConfigured()) {
    return NextResponse.json({ ok: false, error: "File storage is not set up." }, { status: 503 });
  }

  const requested = Number(new URL(request.url).searchParams.get("minAgeHours"));
  const hours = admin && Number.isFinite(requested) && requested >= 1 ? requested : DEFAULT_MIN_AGE_HOURS;
  const before = new Date(Date.now() - hours * 60 * 60 * 1000);

  try {
    const { unfinished, objects } = await findStaleUploads(before);
    for (const { key, uploadId } of unfinished) await abortUpload(key, uploadId);

    let deleted: string[] = [];
    if (objects.length > 0) {
      const rows = await getNeonSql()!`SELECT object_key AS "key" FROM media_assets WHERE object_key = ANY(${objects})`;
      const registered = new Set(rows.map((r) => r.key as string));
      deleted = objects.filter((key) => !registered.has(key));
      for (const key of deleted) await deleteObject(key);
    }

    console.log(`Library cleanup (older than ${hours}h): ${unfinished.length} unfinished uploads discarded, ${deleted.length} unregistered files deleted.`);
    return NextResponse.json({ ok: true, data: { minAgeHours: hours, discardedUploads: unfinished.length, deletedFiles: deleted.length } });
  } catch (err) {
    console.error("GET /api/media/cleanup error:", err);
    return NextResponse.json({ ok: false, error: "File storage is unavailable. Try again shortly." }, { status: 503 });
  }
}
