import { aws, BUCKET, isStorageConfigured, objectUrl } from "@/lib/storage";
import mime from "mime-types";
import path from "path";
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

const LOCAL_STORAGE_DIR = path.join(process.cwd(), "public", "packages");

/**
 * Writes a package file to S3 (if configured) AND local disk fallback.
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

  // Always write to local storage as fallback/cache
  try {
    const localDest = path.join(LOCAL_STORAGE_DIR, safeSlug, safePath);
    await fs.mkdir(path.dirname(localDest), { recursive: true });
    await fs.writeFile(localDest, buffer);
  } catch (err) {
    console.warn("Could not write package file to local storage:", err);
  }

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

  return { key, size };
}

/**
 * Retrieves a package file from local storage or S3.
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

  // 1. Check local storage
  const localDest = path.join(LOCAL_STORAGE_DIR, safeSlug, safePath);
  if (existsSync(localDest)) {
    try {
      const data = await fs.readFile(localDest);
      const contentType = (mime.lookup(safePath) as string) || "application/octet-stream";
      return { data: new Uint8Array(data), contentType, size: data.byteLength };
    } catch {
      // Continue to S3
    }
  }

  // 2. Check S3
  if (isStorageConfigured()) {
    const key = `packages/${safeSlug}/${safePath}`;
    const url = objectUrl(key);
    const res = await aws().fetch(url.toString(), { method: "GET" });

    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Failed to read package file ${key}: ${res.status}`);
    }

    const contentType = res.headers.get("content-type") || (mime.lookup(safePath) as string) || "application/octet-stream";
    const arrayBuffer = await res.arrayBuffer();
    return {
      data: new Uint8Array(arrayBuffer),
      contentType,
      size: arrayBuffer.byteLength,
    };
  }

  return null;
}

/**
 * Removes all files for a package from disk and S3.
 */
export async function deletePackageFiles(slug: string): Promise<void> {
  const safeSlug = slug.trim().toLowerCase();
  // Clean local
  try {
    const localDir = path.join(LOCAL_STORAGE_DIR, safeSlug);
    await fs.rm(localDir, { recursive: true, force: true });
  } catch {}

  // Clean S3
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
}
