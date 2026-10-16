import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getNeonSql, isNeonConfigured } from "@/lib/neon";
import { db } from "@/db";
import { downloadUrl, isStorageConfigured } from "@/lib/storage";

export const dynamic = "force-dynamic";

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".html":
    case ".htm":
      return "text/html; charset=utf-8";
    case ".pdf":
      return "application/pdf";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    case ".mp4":
      return "video/mp4";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".zip":
      return "application/zip";
    case ".json":
      return "application/json";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).trim();
  const searchParams = new URL(request.url).searchParams;
  const asDownload = searchParams.get("download") === "1";

  // 1. Check local static files in public/
  const publicDir = path.join(process.cwd(), "public");
  const candidateFiles = [
    path.join(publicDir, decodedSlug),
    path.join(publicDir, `${decodedSlug}.html`),
    path.join(publicDir, decodedSlug, "index.html"),
    path.join(publicDir, "assets", decodedSlug),
    path.join(publicDir, "assets", `${decodedSlug}.pdf`),
    path.join(publicDir, "assets", `${decodedSlug}.html`),
  ];

  // Specific alias mappings for known deliverables
  if (decodedSlug === "oak-harbor" || decodedSlug === "oak-harbor-growth-strategy") {
    candidateFiles.unshift(path.join(publicDir, "oak-harbor-growth-strategy.html"));
    candidateFiles.unshift(path.join(publicDir, "oak-harbor", "index.html"));
  }
  if (decodedSlug === "brand-guide" || decodedSlug === "tvl-brand-stylebook-2026") {
    candidateFiles.unshift(path.join(publicDir, "assets", "brand-guide.pdf"));
  }
  if (decodedSlug === "sow-template" || decodedSlug === "tvl-standard-sow-template") {
    candidateFiles.unshift(path.join(publicDir, "assets", "sow-template.pdf"));
  }

  for (const filePath of candidateFiles) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const fileBuffer = fs.readFileSync(filePath);
      const mime = getMimeType(filePath);
      const filename = path.basename(filePath);
      const headers = new Headers();
      headers.set("Content-Type", mime);

      if (asDownload) {
        headers.set("Content-Disposition", `attachment; filename="${filename}"`);
      } else if (mime.startsWith("text/html")) {
        headers.set("Cache-Control", "public, max-age=300");
      } else {
        headers.set("Content-Disposition", `inline; filename="${filename}"`);
      }

      return new Response(fileBuffer, { headers });
    }
  }

  // 2. Check Neon database for media assets matching slug/id/filename
  if (isNeonConfigured()) {
    try {
      const sql = getNeonSql()!;
      const rows = await sql`
        SELECT id, filename, title, mime, file_type AS "fileType", object_key AS "key", content, slug
        FROM media_assets
        WHERE slug = ${decodedSlug}
           OR id = ${decodedSlug}
           OR filename ILIKE ${decodedSlug}
           OR filename ILIKE ${decodedSlug + ".html"}
           OR filename ILIKE ${decodedSlug + ".pdf"}
        LIMIT 1
      `;
      if (rows.length > 0) {
        const row = rows[0];
        // If content is saved directly in DB (e.g. direct HTML upload)
        if (row.content) {
          const headers = new Headers();
          headers.set("Content-Type", (row.mime as string) || "text/html; charset=utf-8");
          if (asDownload) {
            headers.set("Content-Disposition", `attachment; filename="${row.filename}"`);
          } else {
            headers.set("Cache-Control", "public, max-age=300");
          }
          return new Response(row.content as string, { headers });
        }

        if (isStorageConfigured()) {
          const signedUrl = await downloadUrl(row.key, row.filename, asDownload);
          // If it's HTML, we can fetch from storage and stream it directly under this URL
          if (row.mime === "text/html" || row.filename.toLowerCase().endsWith(".html")) {
            const res = await fetch(signedUrl);
            if (res.ok) {
              const htmlContent = await res.text();
              return new Response(htmlContent, {
                headers: {
                  "Content-Type": "text/html; charset=utf-8",
                  "Cache-Control": "public, max-age=300",
                },
              });
            }
          }
          return NextResponse.redirect(signedUrl);
        }
      }
    } catch (dbErr) {
      console.error("Neon lookup error in /library/[slug]:", dbErr);
    }
  }

  // 3. Check in-memory sample assets
  const localAsset = db.getMediaAssets().find((a) => {
    const fn = a.filename.toLowerCase();
    const target = decodedSlug.toLowerCase();
    return (
      a.id.toLowerCase() === target ||
      fn === target ||
      fn.replace(/\.[^.]+$/, "") === target
    );
  });

  if (localAsset && localAsset.url) {
    if (localAsset.url.startsWith("http")) {
      return NextResponse.redirect(localAsset.url);
    }
    // Check if relative path exists
    const relPath = path.join(publicDir, localAsset.url.replace(/^\//, ""));
    if (fs.existsSync(relPath)) {
      const buf = fs.readFileSync(relPath);
      const mime = getMimeType(relPath);
      return new Response(buf, {
        headers: {
          "Content-Type": mime,
          "Content-Disposition": asDownload ? `attachment; filename="${localAsset.filename}"` : `inline; filename="${localAsset.filename}"`,
        },
      });
    }
    return NextResponse.redirect(new URL(localAsset.url, request.url));
  }

  // 4. Not found response
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Deliverable Not Found | The Virtus Labs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { background-color: #0d0d0d; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: #141414; border: 1px solid #262626; max-width: 480px; width: 100%; padding: 32px; border-radius: 8px; text-align: center; }
    .badge { display: inline-block; background: #FBD227; color: #000; font-weight: bold; font-size: 11px; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; margin-bottom: 16px; letter-spacing: 0.1em; }
    h1 { font-size: 20px; font-weight: 800; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em; }
    p { font-size: 14px; color: #888888; line-height: 1.5; margin: 0 0 24px; }
    a { display: inline-block; background: #262626; color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 4px; border: 1px solid #333; transition: all 0.2s; }
    a:hover { background: #FBD227; color: #000; border-color: #FBD227; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Virtus Library</div>
    <h1>Document Not Found</h1>
    <p>The requested file or interactive subpage <strong>${decodedSlug}</strong> was not found in The Virtus Labs library.</p>
    <a href="/admin#library">Return to Media Library</a>
  </div>
</body>
</html>`,
    {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}
