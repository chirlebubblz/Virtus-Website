import { NextRequest, NextResponse } from "next/server";
import { getStaff } from "@/lib/staffAuth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon";
import { db } from "@/db";
import type { MediaAsset } from "@/db";
import { formatSize } from "@/lib/storage";
import {
  ExtractedPackageFile,
  putPackageFile,
  stripCommonRoots,
} from "@/lib/packageStorage";
import JSZip from "jszip";
import mime from "mime-types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const CATEGORIES: MediaAsset["category"][] = [
  "Templates",
  "Brand Kit",
  "Deliverables",
  "Stock / Raw",
  "Legal",
];

type Sql = NonNullable<ReturnType<typeof getNeonSql>>;

async function ensureTableAndColumns(sql: Sql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS media_assets (
      id VARCHAR(50) PRIMARY KEY,
      client_id VARCHAR(50) REFERENCES clients(id),
      title VARCHAR(200) NOT NULL,
      filename VARCHAR(200) NOT NULL,
      file_type VARCHAR(20) NOT NULL,
      mime VARCHAR(120) NOT NULL,
      size_bytes BIGINT NOT NULL,
      object_key VARCHAR(300) NOT NULL UNIQUE,
      category VARCHAR(40) NOT NULL,
      visible_to_client BOOLEAN NOT NULL DEFAULT FALSE,
      uploaded_by VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS media_assets_client_idx ON media_assets (client_id);`;
  await sql`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS content TEXT;`;
  await sql`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS slug VARCHAR(150);`;
  await sql`CREATE INDEX IF NOT EXISTS media_assets_slug_idx ON media_assets (slug);`;
}

export async function POST(request: NextRequest) {
  try {
    const staff = await getStaff(["admin", "team"]);
    if (!staff) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const titleInput = String(formData.get("title") || "").trim();
    const rawCategory = String(formData.get("category") || "Deliverables");
    const category: MediaAsset["category"] = CATEGORIES.includes(rawCategory as MediaAsset["category"])
      ? (rawCategory as MediaAsset["category"])
      : "Deliverables";

    const clientIdInput = formData.get("clientId") ? String(formData.get("clientId")).trim() : null;
    const clientId = clientIdInput || null;
    const visibleToClient = Boolean(clientId) && formData.get("visibleToClient") === "true";

    const rawFiles: ExtractedPackageFile[] = [];
    let detectedPackageName = "";

    // 1. Check for single ZIP archive
    const singleFile = formData.get("zip") || formData.get("file");
    const isZip =
      singleFile instanceof File &&
      (singleFile.name.toLowerCase().endsWith(".zip") ||
        singleFile.type === "application/zip" ||
        singleFile.type === "application/x-zip-compressed");

    if (isZip && singleFile instanceof File) {
      detectedPackageName = singleFile.name;
      const arrayBuffer = await singleFile.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;
        if (
          relativePath.includes("__MACOSX/") ||
          relativePath.endsWith(".DS_Store") ||
          relativePath.startsWith("._") ||
          relativePath.includes("/._")
        ) {
          continue;
        }

        const data = await zipEntry.async("uint8array");
        rawFiles.push({ path: relativePath, data });
      }
    } else {
      // 2. Check for multiple files from folder upload
      const files = formData.getAll("files").filter((item): item is File => item instanceof File);
      const paths = formData.getAll("paths").map(String);

      if (files.length === 0 && singleFile instanceof File) {
        files.push(singleFile);
        paths.push(singleFile.name);
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const relativePath = paths[i] || file.webkitRelativePath || file.name;

        if (
          relativePath.includes("__MACOSX/") ||
          relativePath.endsWith(".DS_Store") ||
          relativePath.startsWith("._") ||
          relativePath.includes("/._")
        ) {
          continue;
        }

        if (!detectedPackageName && file.webkitRelativePath) {
          detectedPackageName = file.webkitRelativePath.split("/")[0] || file.name;
        }

        const data = new Uint8Array(await file.arrayBuffer());
        rawFiles.push({ path: relativePath, data });
      }
    }

    if (rawFiles.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No files found. Please select a valid folder or .zip file." },
        { status: 400 }
      );
    }

    // Strip common wrapper directory so root deliverable files sit at root level
    const normalizedFiles = stripCommonRoots(rawFiles);

    // Check for interactive index.html
    const indexFile = normalizedFiles.find(
      (f) => f.path.toLowerCase() === "index.html" || f.path.toLowerCase() === "index.htm"
    );
    const hasIndexHtml = Boolean(indexFile);
    let primaryHtml: string | null = null;
    if (indexFile) {
      try {
        primaryHtml = new TextDecoder("utf-8").decode(indexFile.data);
      } catch (err) {
        console.warn("Could not decode primary index.html:", err);
      }
    }

    // Calculate total size
    let totalSizeBytes = 0;
    for (const f of normalizedFiles) {
      totalSizeBytes += f.data.byteLength;
    }

    // Determine titles & filenames
    const filename = detectedPackageName || (hasIndexHtml ? "web-package.zip" : "package.zip");
    const title =
      titleInput ||
      filename
        .replace(/\.zip$/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()) ||
      "Deliverable Package";

    // Generate safe clean slug
    let baseSlug = title
      .toLowerCase()
      .replace(/\.zip$/i, "")
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    if (!baseSlug) {
      baseSlug = `pkg-${Date.now().toString(36)}`;
    }

    let cleanSlug = baseSlug;

    // Database client verification & slug uniqueness
    let clientName: string | undefined;
    if (isNeonConfigured()) {
      const sql = getNeonSql()!;
      await ensureTableAndColumns(sql);

      if (clientId) {
        const [clientRow] = await sql`SELECT id, name FROM clients WHERE id = ${clientId} LIMIT 1`;
        if (!clientRow) {
          return NextResponse.json({ ok: false, error: "Selected client not found." }, { status: 400 });
        }
        clientName = clientRow.name ? String(clientRow.name) : undefined;
      }

      // Check unique slug
      let attempt = 0;
      while (attempt < 5) {
        const existing = await sql`SELECT id FROM media_assets WHERE slug = ${cleanSlug} LIMIT 1`;
        if (existing.length === 0) break;
        attempt++;
        cleanSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      }
    } else {
      if (clientId) {
        const client = db.getClients().find((c) => c.id === clientId);
        if (client) clientName = client.name;
      }

      let attempt = 0;
      while (attempt < 5) {
        const existing = db.getMediaAssets().some((a) => a.slug === cleanSlug);
        if (!existing) break;
        attempt++;
        cleanSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      }
    }

    // Store all files using packageStorage (writes to local disk + S3 if configured)
    for (const file of normalizedFiles) {
      const fileMime = (mime.lookup(file.path) as string) || "application/octet-stream";
      await putPackageFile(cleanSlug, file.path, file.data, fileMime);
    }

    const id = `med_pkg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const mimeType = hasIndexHtml ? "text/html" : "application/zip";
    const objectKey = hasIndexHtml ? `packages/${cleanSlug}/index.html` : `packages/${cleanSlug}/${filename}`;

    let asset: MediaAsset;

    if (isNeonConfigured()) {
      const sql = getNeonSql()!;
      await sql`
        INSERT INTO media_assets (
          id, client_id, title, filename, file_type, mime, size_bytes,
          object_key, category, visible_to_client, uploaded_by, content, slug
        ) VALUES (
          ${id}, ${clientId}, ${title}, ${filename}, 'document', ${mimeType},
          ${totalSizeBytes}, ${objectKey}, ${category}, ${visibleToClient}, ${staff.id},
          ${primaryHtml}, ${cleanSlug}
        )
        ON CONFLICT (object_key) DO UPDATE SET
          content = EXCLUDED.content,
          slug = EXCLUDED.slug,
          size_bytes = EXCLUDED.size_bytes
      `;

      asset = {
        id,
        clientId,
        clientName,
        title,
        filename,
        fileType: "document",
        fileSize: formatSize(totalSizeBytes),
        url: `/library/${cleanSlug}`,
        category,
        mime: mimeType,
        slug: cleanSlug,
        visibleToClient,
        createdAt: new Date().toISOString().slice(0, 10),
      };
    } else {
      asset = db.addMediaAsset({
        clientId,
        clientName,
        title,
        filename,
        fileType: "document",
        fileSize: formatSize(totalSizeBytes),
        url: `/library/${cleanSlug}`,
        category,
        mime: mimeType,
        slug: cleanSlug,
        visibleToClient,
      });
    }

    return NextResponse.json({ ok: true, data: asset }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/media/package error:", error);
    const msg = error instanceof Error ? error.message : "Internal error processing package";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
