import { NextResponse } from "next/server";
import { db, uid } from "@/db";
import type { MediaAsset } from "@/db";
import { getNeonSql, isNeonConfigured } from "@/lib/neon";
import { getStaff } from "@/lib/staffAuth";
import { badRequest, readJsonObject, str, unavailable } from "@/lib/apiUtil";
import { KEY_PATTERN, MAX_UPLOAD_BYTES, cleanMime, deleteObject, fileTypeFor, formatSize, isStorageConfigured, objectSize } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Library index. Admins see and manage every file. Team members (TEAM_API in middleware) see the General Library
// only, never client files. Uploading is two steps: POST /api/media/upload gives a signed upload link, the browser
// sends the file straight to storage, then POST here registers it after checking the stored object.

const CATEGORIES: MediaAsset["category"][] = ["Templates", "Brand Kit", "Deliverables", "Stock / Raw", "Legal"];

type Sql = NonNullable<ReturnType<typeof getNeonSql>>;

async function selectAssets(sql: Sql, generalOnly: boolean, id?: string): Promise<MediaAsset[]> {
  const rows = await sql`
    SELECT m.id, m.client_id AS "clientId", c.name AS "clientName", m.title, m.filename, m.file_type AS "fileType",
           m.size_bytes AS "sizeBytes", m.category, m.visible_to_client AS "visibleToClient", m.created_at AS "createdAt"
    FROM media_assets m LEFT JOIN clients c ON c.id = m.client_id
    WHERE (${id ?? null}::text IS NULL OR m.id = ${id ?? null})
      AND (${!generalOnly} OR m.client_id IS NULL)
    ORDER BY m.created_at DESC`;
  return rows.map((r) => ({
    id: r.id,
    clientId: r.clientId ?? null,
    clientName: r.clientName ?? undefined,
    title: r.title,
    filename: r.filename,
    fileType: r.fileType,
    fileSize: formatSize(Number(r.sizeBytes)),
    url: `/api/media/file?id=${encodeURIComponent(r.id)}`,
    category: r.category,
    visibleToClient: Boolean(r.visibleToClient),
    createdAt: new Date(r.createdAt).toISOString().slice(0, 10),
  }));
}

const unauthorized = () => NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
const forbidden = () => NextResponse.json({ ok: false, error: "Only admins can change the Library." }, { status: 403 });
const notSetUp = () => NextResponse.json({ ok: false, error: "File storage is not set up." }, { status: 503 });

export async function GET() {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return unauthorized();
  const generalOnly = staff.role !== "admin";

  // Without a database the dev store's sample list is shown (no real files behind it).
  if (!isNeonConfigured()) {
    const all = db.getMediaAssets();
    return NextResponse.json({ ok: true, data: generalOnly ? all.filter((m) => !m.clientId) : all });
  }
  try {
    return NextResponse.json({ ok: true, data: await selectAssets(getNeonSql()!, generalOnly) });
  } catch (err) {
    return unavailable("GET /api/media error", err);
  }
}

export async function POST(request: Request) {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return unauthorized();
  if (staff.role !== "admin") return forbidden();
  if (!isNeonConfigured() || !isStorageConfigured()) return notSetUp();

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");
  const key = typeof body.key === "string" && KEY_PATTERN.test(body.key) ? body.key : null;
  if (!key) return badRequest("Upload the file first.", "key");
  const title = str(body.title, 200);
  if (!title) return badRequest("Title is required (up to 200 characters).", "title");
  const mime = cleanMime(body.mime);
  const category = CATEGORIES.find((c) => c === body.category);
  if (!category) return badRequest("Choose a category.", "category");
  const clientId = body.clientId == null || body.clientId === "" ? null : str(body.clientId, 50);
  if (body.clientId != null && body.clientId !== "" && !clientId) return badRequest("Unknown client.", "clientId");
  // Only client files can be shared with a client.
  const visibleToClient = Boolean(clientId) && body.visibleToClient === true;

  const sql = getNeonSql()!;
  try {
    if (clientId) {
      const [client] = await sql`SELECT id FROM clients WHERE id = ${clientId} LIMIT 1`;
      if (!client) return badRequest("Unknown client.", "clientId");
    }
    // The size comes from storage, not the browser, and proves the upload finished.
    const size = await objectSize(key);
    if (size === null) return badRequest("The upload did not finish. Try again.", "key");
    if (size > MAX_UPLOAD_BYTES) {
      await deleteObject(key);
      return badRequest(`Files can be up to ${formatSize(MAX_UPLOAD_BYTES)}.`, "file");
    }

    const id = uid("media");
    const filename = str(body.filename, 200) ?? key.slice(key.lastIndexOf("/") + 1);
    const inserted = await sql`
      INSERT INTO media_assets (id, client_id, title, filename, file_type, mime, size_bytes, object_key, category, visible_to_client, uploaded_by)
      VALUES (${id}, ${clientId}, ${title}, ${filename}, ${fileTypeFor(mime)}, ${mime}, ${size}, ${key}, ${category}, ${visibleToClient}, ${staff.id})
      ON CONFLICT (object_key) DO NOTHING RETURNING id`;
    if (inserted.length === 0) return NextResponse.json({ ok: false, error: "This file is already in the Library." }, { status: 409 });
    const [asset] = await selectAssets(sql, false, id);
    return NextResponse.json({ ok: true, data: asset }, { status: 201 });
  } catch (err) {
    return unavailable("POST /api/media error", err);
  }
}

/** Share or unshare a client file with that client. */
export async function PATCH(request: Request) {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return unauthorized();
  if (staff.role !== "admin") return forbidden();
  if (!isNeonConfigured()) return notSetUp();

  const body = await readJsonObject(request);
  const id = str(body?.id, 50);
  if (!id) return badRequest("File ID is required.", "id");
  if (typeof body?.visibleToClient !== "boolean") return badRequest("visibleToClient must be true or false.", "visibleToClient");

  const sql = getNeonSql()!;
  try {
    const rows = await sql`
      UPDATE media_assets SET visible_to_client = ${body.visibleToClient} AND client_id IS NOT NULL
      WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) return NextResponse.json({ ok: false, error: "File not found." }, { status: 404 });
    const [asset] = await selectAssets(sql, false, id);
    return NextResponse.json({ ok: true, data: asset });
  } catch (err) {
    return unavailable("PATCH /api/media error", err);
  }
}

export async function DELETE(request: Request) {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) return unauthorized();
  if (staff.role !== "admin") return forbidden();
  if (!isNeonConfigured() || !isStorageConfigured()) return notSetUp();

  const body = await readJsonObject(request);
  const id = str(body?.id, 50);
  if (!id) return badRequest("File ID is required.", "id");

  const sql = getNeonSql()!;
  try {
    const [row] = await sql`SELECT object_key AS "key" FROM media_assets WHERE id = ${id} LIMIT 1`;
    if (!row) return NextResponse.json({ ok: false, error: "File not found." }, { status: 404 });
    // Bytes first: if storage fails the row stays, so the admin can retry and nothing is left unreachable.
    await deleteObject(row.key as string);
    await sql`DELETE FROM media_assets WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return unavailable("DELETE /api/media error", err);
  }
}
