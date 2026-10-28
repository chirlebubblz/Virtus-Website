import { aws, BUCKET, isStorageConfigured, objectUrl } from "@/lib/storage";
import { isNeonConfigured, getNeonSql, ensurePortfolioFilesTable } from "@/lib/neon";
import mime from "mime-types";
import path from "path";
import os from "os";
import fs from "fs/promises";

/**
 * Normalizes and sanitizes a relative path inside a portfolio to prevent directory traversal.
 * Disallows leading slashes, backslashes, empty segments, and any ".." or "." segments.
 */
export function normalizePortfolioPath(p: string): string {
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

/** Local storage directory in temp folder used as fallback/cache (never crashes serverless read-only paths) */
const LOCAL_STORAGE_DIR = path.join(os.tmpdir(), "tvl_portfolios");

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
 * Uploads/writes a single static portfolio file for a subdomain.
 * Stores in S3 if configured, Neon database if configured, with resilient local cache fallback.
 */
export async function putPortfolioFile(
  subdomain: string,
  relativePath: string,
  buffer: Uint8Array | Buffer,
  mimeType?: string
): Promise<{ key: string; size: number }> {
  const safeSubdomain = subdomain.trim().toLowerCase();
  const safePath = normalizePortfolioPath(relativePath);
  const key = `portfolios/${safeSubdomain}/${safePath}`;
  const contentType = mimeType || mime.lookup(safePath) || "application/octet-stream";
  const size = buffer.byteLength;

  // 1. External S3 Storage (if configured)
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

  // 2. Neon Serverless Postgres Storage (persistent, zero-S3 required)
  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      await ensurePortfolioFilesTable(sql);
      const isText = isTextMime(contentType, safePath);
      const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
      const dataText = isText ? buf.toString("utf-8") : null;
      const dataBase64 = !isText ? buf.toString("base64") : null;

      await sql`
        INSERT INTO portfolio_files (subdomain, path, mime_type, data_text, data_base64, size_bytes)
        VALUES (${safeSubdomain}, ${safePath}, ${contentType}, ${dataText}, ${dataBase64}, ${size})
        ON CONFLICT (subdomain, path) DO UPDATE SET
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
    const localDest = path.join(LOCAL_STORAGE_DIR, safeSubdomain, safePath);
    await fs.mkdir(path.dirname(localDest), { recursive: true });
    await fs.writeFile(localDest, buffer);
  } catch {
    // Graceful no-op on read-only serverless containers
  }

  return { key, size };
}

/**
 * Retrieves a portfolio file from storage by subdomain and relative path.
 * Checks S3 -> Neon PostgreSQL -> local cache.
 * Returns null if not found.
 */
export async function getPortfolioFile(
  subdomain: string,
  relativePath: string
): Promise<{ data: Uint8Array; contentType: string; size: number } | null> {
  const safeSubdomain = subdomain.trim().toLowerCase();
  let safePath: string;
  try {
    safePath = normalizePortfolioPath(relativePath);
  } catch {
    return null;
  }

  const key = `portfolios/${safeSubdomain}/${safePath}`;

  // 1. S3 Object Storage
  if (isStorageConfigured()) {
    try {
      const url = objectUrl(key);
      const res = await aws().fetch(url.toString(), { method: "GET" });

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const headerMime = res.headers.get("content-type");
        const inferredMime = mime.lookup(safePath);
        const contentType =
          headerMime && headerMime !== "application/octet-stream"
            ? headerMime
            : inferredMime || "application/octet-stream";

        return {
          data,
          contentType: String(contentType),
          size: data.length,
        };
      }
    } catch (e) {
      console.warn(`S3 getPortfolioFile failed for ${key}, falling back:`, e);
    }
  }

  // 2. Neon Serverless Postgres
  if (isNeonConfigured()) {
    try {
      const sql = getNeonSql();
      if (sql) {
        await ensurePortfolioFilesTable(sql);
        const rows = await sql`
          SELECT mime_type, data_text, data_base64, size_bytes
          FROM portfolio_files
          WHERE subdomain = ${safeSubdomain} AND path = ${safePath}
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
            size: Number(row.size_bytes ?? data.length),
          };
        }
      }
    } catch (e) {
      console.warn(`Neon getPortfolioFile error for ${safeSubdomain}/${safePath}:`, e);
    }
  }

  // 3. Local disk fallback
  try {
    const localDest = path.join(LOCAL_STORAGE_DIR, safeSubdomain, safePath);
    const data = await fs.readFile(localDest);
    const contentType = mime.lookup(safePath) || "application/octet-stream";
    return {
      data: new Uint8Array(data),
      contentType: String(contentType),
      size: data.length,
    };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "ENOENT") {
      return null;
    }
    return null;
  }
}

const xmlValue = (block: string, tag: string) => block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1];

/**
 * Deletes all files belonging to a subdomain's portfolio across S3, Neon, and local cache.
 */
export async function deletePortfolioFiles(subdomain: string): Promise<number> {
  const safeSubdomain = subdomain.trim().toLowerCase();
  const prefix = `portfolios/${safeSubdomain}/`;
  let deletedCount = 0;

  // 1. S3 Object Storage
  if (isStorageConfigured()) {
    try {
      const base = objectUrl("x");
      base.pathname = `/${BUCKET}`;
      const keysToDelete: string[] = [];

      for (let token = "", more = true; more; ) {
        const listUrl = `${base}?list-type=2&prefix=${encodeURIComponent(prefix)}${token}`;
        const res = await aws().fetch(listUrl);
        if (!res.ok) break;
        const xml = await res.text();

        for (const [block] of xml.matchAll(/<Contents>[\s\S]*?<\/Contents>/g)) {
          const key = xmlValue(block, "Key");
          if (key && key.startsWith(prefix)) {
            keysToDelete.push(key);
          }
        }

        more = xmlValue(xml, "IsTruncated") === "true";
        token = `&continuation-token=${encodeURIComponent(xmlValue(xml, "NextContinuationToken") ?? "")}`;
      }

      for (let i = 0; i < keysToDelete.length; i += 20) {
        const batch = keysToDelete.slice(i, i + 20);
        await Promise.all(
          batch.map(async (key) => {
            const res = await aws().fetch(objectUrl(key).toString(), { method: "DELETE" });
            if (res.ok || res.status === 404) deletedCount++;
          })
        );
      }
    } catch (e) {
      console.warn("Could not delete portfolio files from S3:", e);
    }
  }

  // 2. Neon Database
  if (isNeonConfigured()) {
    try {
      const sql = getNeonSql();
      if (sql) {
        await ensurePortfolioFilesTable(sql);
        await sql`DELETE FROM portfolio_files WHERE subdomain = ${safeSubdomain}`;
        deletedCount++;
      }
    } catch (e) {
      console.warn("Could not delete portfolio files from Neon:", e);
    }
  }

  // 3. Local disk cache
  try {
    const dir = path.join(LOCAL_STORAGE_DIR, safeSubdomain);
    await fs.rm(dir, { recursive: true, force: true });
    deletedCount++;
  } catch {
    // Ignore local cleanup error
  }

  return deletedCount;
}
