import { aws, BUCKET, isStorageConfigured, objectUrl } from "@/lib/storage";
import mime from "mime-types";
import path from "path";
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

/** Local storage directory used as fallback when S3/Neon object storage is not configured */
const LOCAL_STORAGE_DIR = path.join(process.cwd(), ".portfolios");

/**
 * Uploads/writes a single static portfolio file for a subdomain.
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

    return { key, size };
  }

  // Local fallback: write to disk under .portfolios/[subdomain]/...
  const localDest = path.join(LOCAL_STORAGE_DIR, safeSubdomain, safePath);
  await fs.mkdir(path.dirname(localDest), { recursive: true });
  await fs.writeFile(localDest, buffer);

  return { key, size };
}

/**
 * Retrieves a portfolio file from storage by subdomain and relative path.
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

  if (isStorageConfigured()) {
    const url = objectUrl(key);
    const res = await aws().fetch(url.toString(), { method: "GET" });

    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Failed to read file ${key}: ${res.status}`);
    }

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

  // Local disk fallback
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
    throw err;
  }
}

const xmlValue = (block: string, tag: string) => block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1];

/**
 * Deletes all files belonging to a subdomain's portfolio.
 */
export async function deletePortfolioFiles(subdomain: string): Promise<number> {
  const safeSubdomain = subdomain.trim().toLowerCase();
  const prefix = `portfolios/${safeSubdomain}/`;
  let deletedCount = 0;

  if (isStorageConfigured()) {
    const base = objectUrl("x");
    base.pathname = `/${BUCKET}`;
    const keysToDelete: string[] = [];

    // List all objects with prefix
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

    // Delete keys in batches
    for (let i = 0; i < keysToDelete.length; i += 20) {
      const batch = keysToDelete.slice(i, i + 20);
      await Promise.all(
        batch.map(async (key) => {
          const res = await aws().fetch(objectUrl(key).toString(), { method: "DELETE" });
          if (res.ok || res.status === 404) deletedCount++;
        })
      );
    }

    return deletedCount;
  }

  // Local fallback
  try {
    const dir = path.join(LOCAL_STORAGE_DIR, safeSubdomain);
    await fs.rm(dir, { recursive: true, force: true });
    return 1;
  } catch {
    return 0;
  }
}
