import { NextRequest, NextResponse } from "next/server";
import { getStaff } from "@/lib/staffAuth";
import {
  ensureMediaAssetsTable,
  ensureUploadChunksTable,
  getNeonSql,
  isNeonConfigured,
} from "@/lib/neon";
import {
  getPortfolioByStaffId,
  isSubdomainAvailable,
  upsertPortfolio,
} from "@/lib/portfolioStore";
import { deletePortfolioFiles, putPortfolioFile } from "@/lib/portfolioStorage";
import { validateSubdomain } from "@/lib/portfolioValidation";
import { putPackageFile } from "@/lib/packageStorage";
import {
  aws,
  cleanMime,
  contentDisposition,
  fileTypeFor,
  formatSize,
  isStorageConfigured,
  newObjectKey,
  objectUrl,
} from "@/lib/storage";
import { uid } from "@/db";
import type { MediaAsset } from "@/db";
import JSZip from "jszip";
import mime from "mime-types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface ExtractedFile {
  path: string;
  data: Uint8Array;
}

const CATEGORIES: MediaAsset["category"][] = [
  "Templates",
  "Brand Kit",
  "Deliverables",
  "Stock / Raw",
  "Legal",
];

function stripCommonRoots(files: ExtractedFile[]): ExtractedFile[] {
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

export async function POST(request: NextRequest) {
  try {
    const staff = await getStaff(["admin", "team"]);
    if (!staff) {
      return NextResponse.json({ ok: false, error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    if (!isNeonConfigured()) {
      return NextResponse.json({ ok: false, error: "Database storage is not configured." }, { status: 503 });
    }

    const sql = getNeonSql()!;
    await ensureUploadChunksTable(sql);

    const formData = await request.formData();
    const uploadId = String(formData.get("uploadId") || "").trim();
    const action = String(formData.get("action") || "").trim();
    const purpose = String(formData.get("purpose") || "").trim();
    const partNumber = Number(formData.get("partNumber") || 0);
    const totalParts = Number(formData.get("totalParts") || 0);

    if (!uploadId || uploadId.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(uploadId)) {
      return NextResponse.json({ ok: false, error: "Invalid upload ID." }, { status: 400 });
    }

    if (action === "part") {
      if (!partNumber || partNumber < 1) {
        return NextResponse.json({ ok: false, error: "Invalid part number." }, { status: 400 });
      }

      const chunkFile = formData.get("chunk");
      if (!chunkFile || typeof chunkFile === "string") {
        return NextResponse.json({ ok: false, error: "Missing chunk binary." }, { status: 400 });
      }

      const arrayBuffer = await chunkFile.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString("base64");

      await sql`
        INSERT INTO upload_chunks (upload_id, part_number, data_base64)
        VALUES (${uploadId}, ${partNumber}, ${base64Data})
        ON CONFLICT (upload_id, part_number) DO UPDATE SET
          data_base64 = EXCLUDED.data_base64;
      `;

      return NextResponse.json({ ok: true, partNumber });
    }

    if (action === "complete") {
      const metadataRaw = formData.get("metadata");
      let metadata: Record<string, unknown> = {};
      if (typeof metadataRaw === "string" && metadataRaw) {
        try {
          metadata = JSON.parse(metadataRaw);
        } catch {
          return NextResponse.json({ ok: false, error: "Invalid metadata JSON." }, { status: 400 });
        }
      }

      // Fetch all chunks for this uploadId
      const chunkRows = await sql`
        SELECT part_number, data_base64
        FROM upload_chunks
        WHERE upload_id = ${uploadId}
        ORDER BY part_number ASC;
      `;

      if (chunkRows.length === 0) {
        return NextResponse.json({ ok: false, error: "No uploaded chunks found." }, { status: 400 });
      }

      if (totalParts && chunkRows.length < totalParts) {
        return NextResponse.json(
          { ok: false, error: `Incomplete upload: received ${chunkRows.length} of ${totalParts} parts.` },
          { status: 400 }
        );
      }

      const buffers = chunkRows.map((r) => Buffer.from(r.data_base64 as string, "base64"));
      const completeBuffer = Buffer.concat(buffers);

      // Clean up uploaded chunks immediately to keep DB lean
      await sql`DELETE FROM upload_chunks WHERE upload_id = ${uploadId}`;
      sql`DELETE FROM upload_chunks WHERE created_at < NOW() - INTERVAL '24 hours'`.catch(() => {});

      // Purpose 1: portfolio
      if (purpose === "portfolio") {
        const subdomainInput = String(metadata.subdomain || "").trim();
        const titleInput = metadata.title ? String(metadata.title).trim() : null;

        const { valid, error: validationError, clean: subdomain } = validateSubdomain(subdomainInput);
        if (!valid || !subdomain) {
          return NextResponse.json({ ok: false, error: validationError || "Invalid subdomain" }, { status: 400 });
        }

        const available = await isSubdomainAvailable(subdomain, staff.id);
        if (!available) {
          return NextResponse.json(
            { ok: false, error: `Subdomain "${subdomain}" is already claimed by another team member.` },
            { status: 409 }
          );
        }

        const zip = await JSZip.loadAsync(completeBuffer);
        const rawFiles: ExtractedFile[] = [];

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

        if (rawFiles.length === 0) {
          return NextResponse.json({ ok: false, error: "No files found in portfolio zip archive." }, { status: 400 });
        }

        const normalizedFiles = stripCommonRoots(rawFiles);
        const hasIndex = normalizedFiles.some(
          (f) => f.path.toLowerCase() === "index.html" || f.path.toLowerCase() === "index.htm"
        );
        if (!hasIndex) {
          return NextResponse.json(
            { ok: false, error: "No index.html found. Your portfolio must have an index.html file at its root level." },
            { status: 400 }
          );
        }

        const previousPortfolio = await getPortfolioByStaffId(staff.id);
        if (previousPortfolio && previousPortfolio.subdomain !== subdomain) {
          await deletePortfolioFiles(previousPortfolio.subdomain).catch(() => undefined);
        }

        await deletePortfolioFiles(subdomain).catch(() => undefined);

        let totalSizeBytes = 0;
        for (const file of normalizedFiles) {
          const mimeType = (mime.lookup(file.path) as string) || "application/octet-stream";
          await putPortfolioFile(subdomain, file.path, file.data, mimeType);
          totalSizeBytes += file.data.byteLength;
        }

        const portfolio = await upsertPortfolio({
          staffId: staff.id,
          subdomain,
          title: titleInput || `${staff.name}'s Portfolio`,
          entryFile: "index.html",
          fileCount: normalizedFiles.length,
          totalSizeBytes,
          isActive: true,
        });

        return NextResponse.json({
          ok: true,
          portfolio,
          subdomain,
          url: `https://${subdomain}.thevirtuslabs.com`,
          localUrl: `/portfolios/${subdomain}`,
          fileCount: normalizedFiles.length,
          totalSize: totalSizeBytes,
        });
      }

      // Purpose 2: package
      if (purpose === "package") {
        const titleInput = metadata.title ? String(metadata.title).trim() : null;
        const rawCategory = String(metadata.category || "Deliverables");
        const category: MediaAsset["category"] = CATEGORIES.includes(rawCategory as MediaAsset["category"])
          ? (rawCategory as MediaAsset["category"])
          : "Deliverables";
        const clientId = metadata.clientId ? String(metadata.clientId).trim() : null;
        const visibleToClient = Boolean(clientId) && Boolean(metadata.visibleToClient);
        const filenameInput = metadata.filename ? String(metadata.filename).trim() : "package.zip";

        const zip = await JSZip.loadAsync(completeBuffer);
        const rawFiles: ExtractedFile[] = [];

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

        if (rawFiles.length === 0) {
          return NextResponse.json({ ok: false, error: "No files found in package zip." }, { status: 400 });
        }

        const normalizedFiles = stripCommonRoots(rawFiles);
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

        let totalSizeBytes = 0;
        for (const f of normalizedFiles) {
          totalSizeBytes += f.data.byteLength;
        }

        const filename = filenameInput || (hasIndexHtml ? "web-package.zip" : "package.zip");
        const title =
          titleInput ||
          filename
            .replace(/\.zip$/i, "")
            .replace(/[-_]+/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()) ||
          "Deliverable Package";

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

        let clientName: string | undefined;
        await ensureMediaAssetsTable(sql);

        if (clientId) {
          const [clientRow] = await sql`SELECT id, name FROM clients WHERE id = ${clientId} LIMIT 1`;
          if (!clientRow) {
            return NextResponse.json({ ok: false, error: "Selected client not found." }, { status: 400 });
          }
          clientName = clientRow.name ? String(clientRow.name) : undefined;
        }

        let attempt = 0;
        while (attempt < 5) {
          const existing = await sql`SELECT id FROM media_assets WHERE slug = ${cleanSlug} LIMIT 1`;
          if (existing.length === 0) break;
          attempt++;
          cleanSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
        }

        for (const file of normalizedFiles) {
          const fileMime = (mime.lookup(file.path) as string) || "application/octet-stream";
          await putPackageFile(cleanSlug, file.path, file.data, fileMime);
        }

        const id = `med_pkg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
        const mimeType = hasIndexHtml ? "text/html" : "application/zip";
        const objectKey = hasIndexHtml ? `packages/${cleanSlug}/index.html` : `packages/${cleanSlug}/${filename}`;

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

        const asset: MediaAsset = {
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

        return NextResponse.json({ ok: true, data: asset }, { status: 201 });
      }

      // Purpose 3: media
      if (purpose === "media") {
        const rawFilename = metadata.filename ? String(metadata.filename).trim() : "file.bin";
        const filename = rawFilename;
        const mimeType = cleanMime(metadata.mime || mime.lookup(filename) || "application/octet-stream");
        const title = metadata.title ? String(metadata.title).trim() : filename;
        const rawCategory = String(metadata.category || "Templates");
        const category: MediaAsset["category"] = CATEGORIES.includes(rawCategory as MediaAsset["category"])
          ? (rawCategory as MediaAsset["category"])
          : "Templates";
        const clientId = metadata.clientId ? String(metadata.clientId).trim() : null;
        const visibleToClient = Boolean(clientId) && Boolean(metadata.visibleToClient);

        await ensureMediaAssetsTable(sql);

        let clientName: string | undefined;
        if (clientId) {
          const [clientRow] = await sql`SELECT id, name FROM clients WHERE id = ${clientId} LIMIT 1`;
          if (!clientRow) {
            return NextResponse.json({ ok: false, error: "Selected client not found." }, { status: 400 });
          }
          clientName = clientRow.name ? String(clientRow.name) : undefined;
        }

        const id = uid("media");
        const size = completeBuffer.length;
        let objectKey = `uploads/chunked/${id}/${filename}`;
        let contentToStore: string | null = null;

        if (isStorageConfigured()) {
          const key = newObjectKey(filename);
          objectKey = key;
          const url = objectUrl(key);
          const s3Res = await aws().fetch(url.toString(), {
            method: "PUT",
            headers: {
              "content-type": mimeType,
              "content-length": String(size),
              "content-disposition": contentDisposition(filename),
            },
            body: completeBuffer,
          });
          if (!s3Res.ok) {
            console.warn("S3 PUT failed for chunked media, falling back to database storage:", s3Res.status);
          }
        }

        const isHtml = filename.toLowerCase().endsWith(".html") || filename.toLowerCase().endsWith(".htm") || mimeType === "text/html";
        if (isHtml) {
          contentToStore = completeBuffer.toString("utf-8");
        } else {
          contentToStore = "base64:" + completeBuffer.toString("base64");
        }

        const cleanSlug = isHtml
          ? filename.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9-_]/g, "-") || id
          : null;

        await sql`
          INSERT INTO media_assets (
            id, client_id, title, filename, file_type, mime, size_bytes,
            object_key, category, visible_to_client, uploaded_by, content, slug
          ) VALUES (
            ${id}, ${clientId}, ${title}, ${filename}, ${fileTypeFor(mimeType)}, ${mimeType},
            ${size}, ${objectKey}, ${category}, ${visibleToClient}, ${staff.id},
            ${contentToStore}, ${cleanSlug}
          )
          ON CONFLICT (object_key) DO UPDATE SET
            content = EXCLUDED.content,
            slug = EXCLUDED.slug,
            size_bytes = EXCLUDED.size_bytes
        `;

        const asset: MediaAsset = {
          id,
          clientId,
          clientName,
          title,
          filename,
          fileType: fileTypeFor(mimeType),
          fileSize: formatSize(size),
          url: cleanSlug ? `/library/${cleanSlug}` : `/api/media/file?id=${encodeURIComponent(id)}`,
          category,
          mime: mimeType,
          slug: cleanSlug || undefined,
          visibleToClient,
          createdAt: new Date().toISOString().slice(0, 10),
        };

        return NextResponse.json({ ok: true, data: asset }, { status: 201 });
      }

      return NextResponse.json({ ok: false, error: `Unknown purpose: "${purpose}"` }, { status: 400 });
    }

    return NextResponse.json({ ok: false, error: `Unknown action: "${action}"` }, { status: 400 });
  } catch (error: unknown) {
    console.error("Chunked upload route error:", error);
    const msg = error instanceof Error ? error.message : "Internal chunked upload error.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
