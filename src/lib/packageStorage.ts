import { aws, BUCKET, isStorageConfigured, objectUrl } from "@/lib/storage";
import { isNeonConfigured, getNeonSql, ensurePackageFilesTable } from "@/lib/neon";
import mime from "mime-types";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { existsSync } from "fs";

/**
 * Normalizes and sanitizes a relative path inside a package to prevent directory traversal.
 * Disallows leading slashes, backslashes, empty segments, and any ".." or "." segments.
 */
export function normalizePackagePath(p: string): string {
  if (!p || typeof p !== "string") {
    throw new Error("Invalid file path");
  }

  // Replace backslashes with forward slashes
  const clean = p.replace(/\\/g, "/").trim().replace(/^\/+/, "");
  const segments = clean.split("/").filter(Boolean);

  if (segments.length === 0) {
    throw new Error("Path cannot be empty");
  }

  for (const seg of segments) {
    if (seg === ".." || seg === "." || seg.includes("\0")) {
      throw new Error(`Path traversal attempt detected: ${p}`);
    }
  }

  return segments.join("/");
}

export interface ExtractedPackageFile {
  path: string;
  data: Uint8Array;
}

/**
 * Strips common root directory if all files are wrapped in a single top-level folder
 * (standard behavior for folder zips like my-folder/index.html).
 */
export function stripCommonRoots(files: ExtractedPackageFile[]): ExtractedPackageFile[] {
  let current = files.map((f) => ({
    ...f,
    path: f.path.replace(/\\/g, "/").replace(/^\/+/, ""),
  }));

  while (current.length > 0) {
    const hasRootFile = current.some((f) => !f.path.includes("/"));
    if (hasRootFile) break;

    const firstTop = current[0].path.split("/")[0];
    if (!firstTop) break;

    const allShareFirstTop = current.every((f) => f.path.startsWith(`${firstTop}/`));
    if (!allShareFirstTop) break;

    current = current.map((f) => ({
      ...f,
      path: f.path.slice(firstTop.length + 1),
    }));
  }

  return current;
}

const LOCAL_STORAGE_DIR = path.join(os.tmpdir(), "tvl_packages");

function isTextMime(mimeType: string, pathStr: string): boolean {
  const lower = (mimeType || "").toLowerCase();
  if (
    lower.startsWith("text/") ||
    lower.includes("javascript") ||
    lower.includes("json") ||
    lower.includes("xml") ||
    lower.includes("svg")
  ) {
    return true;
  }
  const ext = pathStr.split(".").pop()?.toLowerCase();
  return ["html", "htm", "css", "js", "mjs", "json", "svg", "xml", "txt", "md"].includes(ext || "");
}

/**
 * Writes a package file to S3 (if configured), Neon PostgreSQL (if configured), and local disk cache.
 */
export async function putPackageFile(
  slug: string,
  relativePath: string,
  buffer: Uint8Array | Buffer,
  mimeType?: string
): Promise<{ key: string; size: number }> {
  const safeSlug = slug.trim().toLowerCase();
  const safePath = normalizePackagePath(relativePath);
  const key = `packages/${safeSlug}/${safePath}`;
  const contentType = mimeType || (mime.lookup(safePath) as string) || "application/octet-stream";
  const size = buffer.byteLength;

  // 1. S3 Storage (if configured)
  if (isStorageConfigured()) {
    const url = objectUrl(key);
    const res = await aws().fetch(url.toString(), {
      method: "PUT",
      headers: {
        "content-type": contentType,
        "content-length": String(size),
      },
      body: buffer as unknown as BodyInit,
    });

    if (!res.ok) {
      throw new Error(`Storage upload failed for ${key}: ${res.status} ${res.statusText}`);
    }
  }

  // 2. Neon Serverless Postgres Storage (persistent, zero external S3 required)
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      await ensurePackageFilesTable(sql);
      const isText = isTextMime(contentType, safePath);
      const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
      const dataText = isText ? buf.toString("utf-8") : null;
      const dataBase64 = !isText ? buf.toString("base64") : null;

      await sql`
        INSERT INTO package_files (slug, path, mime_type, data_text, data_base64, size_bytes)
        VALUES (${safeSlug}, ${safePath}, ${contentType}, ${dataText}, ${dataBase64}, ${size})
        ON CONFLICT (slug, path) DO UPDATE SET
          mime_type = EXCLUDED.mime_type,
          data_text = EXCLUDED.data_text,
          data_base64 = EXCLUDED.data_base64,
          size_bytes = EXCLUDED.size_bytes,
          created_at = NOW();
      `;
    }
  }

  // 3. Local disk cache fallback (wrapped in try/catch to never crash read-only serverless filesystems)
  try {
    const localDest = path.join(LOCAL_STORAGE_DIR, safeSlug, safePath);
    await fs.mkdir(path.dirname(localDest), { recursive: true });
    await fs.writeFile(localDest, buffer);
  } catch {
    // Graceful no-op on read-only serverless containers
  }

  return { key, size };
}

/**
 * Retrieves a package file from S3, Neon PostgreSQL, or local disk fallback.
 */
export async function getPackageFile(
  slug: string,
  relativePath: string
): Promise<{ data: Uint8Array; contentType: string; size: number } | null> {
  const safeSlug = slug.trim().toLowerCase();
  let safePath: string;
  try {
    safePath = normalizePackagePath(relativePath);
  } catch {
    return null;
  }

  const key = `packages/${safeSlug}/${safePath}`;

  // 1. S3 Object Storage
  if (isStorageConfigured()) {
    try {
      const url = objectUrl(key);
      const res = await aws().fetch(url.toString(), { method: "GET" });

      if (res.ok) {
        const contentType =
          res.headers.get("content-type") || (mime.lookup(safePath) as string) || "application/octet-stream";
        const arrayBuffer = await res.arrayBuffer();
        return {
          data: new Uint8Array(arrayBuffer),
          contentType,
          size: arrayBuffer.byteLength,
        };
      }
    } catch (e) {
      console.warn(`S3 getPackageFile failed for ${key}, falling back:`, e);
    }
  }

  // 2. Neon Serverless Postgres
  if (isNeonConfigured()) {
    try {
      const sql = getNeonSql();
      if (sql) {
        await ensurePackageFilesTable(sql);
        const rows = await sql`
          SELECT mime_type, data_text, data_base64, size_bytes
          FROM package_files
          WHERE slug = ${safeSlug} AND path = ${safePath}
          LIMIT 1
        `;

        if (rows.length > 0) {
          const row = rows[0];
          let data: Uint8Array;
          if (row.data_text != null) {
            data = new Uint8Array(Buffer.from(row.data_text as string, "utf-8"));
          } else if (row.data_base64 != null) {
            data = new Uint8Array(Buffer.from(row.data_base64 as string, "base64"));
          } else {
            data = new Uint8Array(0);
          }

          return {
            data,
            contentType: String(row.mime_type || mime.lookup(safePath) || "application/octet-stream"),
            size: Number(row.size_bytes ?? data.byteLength),
          };
        }
      }
    } catch (e) {
      console.warn(`Neon getPackageFile error for ${safeSlug}/${safePath}:`, e);
    }
  }

  // 3. Local disk fallback (check temp directory and legacy public/packages)
  try {
    const candidatePaths = [
      path.join(LOCAL_STORAGE_DIR, safeSlug, safePath),
      path.join(process.cwd(), "public", "packages", safeSlug, safePath),
    ];
    for (const p of candidatePaths) {
      if (existsSync(p)) {
        const data = await fs.readFile(p);
        const contentType = (mime.lookup(safePath) as string) || "application/octet-stream";
        return { data: new Uint8Array(data), contentType, size: data.byteLength };
      }
    }
  } catch {
    // Continue to return null
  }

  return null;
}

/**
 * Removes all files for a package from S3, Neon, and disk.
 */
export async function deletePackageFiles(slug: string): Promise<void> {
  const safeSlug = slug.trim().toLowerCase();

  // 1. S3 Object Storage
  if (isStorageConfigured()) {
    try {
      const base = objectUrl("x");
      base.pathname = `/${BUCKET}`;
      const prefix = `packages/${safeSlug}/`;
      const res = await aws().fetch(`${base}?list-type=2&prefix=${encodeURIComponent(prefix)}`);
      if (res.ok) {
        const xml = await res.text();
        for (const [block] of xml.matchAll(/<Contents>[\s\S]*?<\/Contents>/g)) {
          const key = block.match(/<Key>([^<]*)<\/Key>/)?.[1];
          if (key) {
            await aws().fetch(objectUrl(key).toString(), { method: "DELETE" }).catch(() => undefined);
          }
        }
      }
    } catch (e) {
      console.warn("Could not delete package files from S3:", e);
    }
  }

  // 2. Neon Database
  if (isNeonConfigured()) {
    try {
      const sql = getNeonSql();
      if (sql) {
        await ensurePackageFilesTable(sql);
        await sql`DELETE FROM package_files WHERE slug = ${safeSlug}`;
      }
    } catch (e) {
      console.warn("Could not delete package files from Neon:", e);
    }
  }

  // 3. Local disk cache
  try {
    const localDir = path.join(LOCAL_STORAGE_DIR, safeSlug);
    await fs.rm(localDir, { recursive: true, force: true });
  } catch {}

  try {
    const publicDir = path.join(process.cwd(), "public", "packages", safeSlug);
    await fs.rm(publicDir, { recursive: true, force: true });
  } catch {}
}
