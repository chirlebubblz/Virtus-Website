import { NextRequest, NextResponse } from "next/server";
import { getStaff } from "@/lib/staffAuth";
import {
  getPortfolioByStaffId,
  isSubdomainAvailable,
  upsertPortfolio,
} from "@/lib/portfolioStore";
import { deletePortfolioFiles, putPortfolioFile } from "@/lib/portfolioStorage";
import { validateSubdomain } from "@/lib/portfolioValidation";
import { addVercelDomain, removeVercelDomain } from "@/lib/vercelDomains";
import JSZip from "jszip";
import mime from "mime-types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface ExtractedFile {
  path: string;
  data: Uint8Array;
}

/**
 * Strips common root directory if all files are wrapped in a top-level folder
 * (standard behavior for folder zips like my-site/index.html).
 */
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

    const formData = await request.formData();
    const subdomainInput = String(formData.get("subdomain") || "").trim();
    const titleInput = formData.get("title") ? String(formData.get("title")).trim() : null;

    // Validate subdomain
    const { valid, error: validationError, clean: subdomain } = validateSubdomain(subdomainInput);
    if (!valid || !subdomain) {
      return NextResponse.json(
        { ok: false, error: validationError || "Invalid subdomain" },
        { status: 400 }
      );
    }

    // Check ownership / availability
    const available = await isSubdomainAvailable(subdomain, staff.id);
    if (!available) {
      return NextResponse.json(
        { ok: false, error: `Subdomain "${subdomain}" is already claimed by another team member.` },
        { status: 409 }
      );
    }

    const rawFiles: ExtractedFile[] = [];

    // Check if zip file was uploaded
    const singleFile = formData.get("zip") || formData.get("file");
    const isZip =
      singleFile instanceof File &&
      (singleFile.name.endsWith(".zip") ||
        singleFile.type === "application/zip" ||
        singleFile.type === "application/x-zip-compressed");

    if (isZip && singleFile instanceof File) {
      const arrayBuffer = await singleFile.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;
        // Ignore OS junk files and hidden metadata
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
      // Multiple files from folder drop or selection
      const files = formData.getAll("files").filter((item): item is File => item instanceof File);
      const paths = formData.getAll("paths").map(String);

      // Also check if single file wasn't caught as zip
      if (files.length === 0 && singleFile instanceof File) {
        files.push(singleFile);
        paths.push(singleFile.name);
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const relativePath = paths[i] || file.webkitRelativePath || file.name;

        // Skip OS junk files
        if (
          relativePath.includes("__MACOSX/") ||
          relativePath.endsWith(".DS_Store") ||
          relativePath.startsWith("._") ||
          relativePath.includes("/._")
        ) {
          continue;
        }

        const data = new Uint8Array(await file.arrayBuffer());
        rawFiles.push({ path: relativePath, data });
      }
    }

    if (rawFiles.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No files found in upload. Please upload a .zip file or a folder." },
        { status: 400 }
      );
    }

    // Strip common parent folders so root files sit at /
    const normalizedFiles = stripCommonRoots(rawFiles);

    // Verify index.html exists
    const hasIndex = normalizedFiles.some(
      (f) => f.path.toLowerCase() === "index.html" || f.path.toLowerCase() === "index.htm"
    );

    if (!hasIndex) {
      return NextResponse.json(
        {
          ok: false,
          error: "No index.html found. Your portfolio must have an index.html file at its root level.",
        },
        { status: 400 }
      );
    }

    // Clean up any old files from previous subdomain if staff changed handles
    const previousPortfolio = await getPortfolioByStaffId(staff.id);
    if (previousPortfolio && previousPortfolio.subdomain !== subdomain) {
      await deletePortfolioFiles(previousPortfolio.subdomain).catch(() => undefined);
      await removeVercelDomain(previousPortfolio.subdomain).catch(() => undefined);
    }

    // Delete existing files under this subdomain before uploading new version
    await deletePortfolioFiles(subdomain).catch(() => undefined);

    // Upload all files
    let totalSizeBytes = 0;
    for (const file of normalizedFiles) {
      const mimeType = mime.lookup(file.path) || "application/octet-stream";
      await putPortfolioFile(subdomain, file.path, file.data, mimeType);
      totalSizeBytes += file.data.byteLength;
    }

    // Save/update in database
    const portfolio = await upsertPortfolio({
      staffId: staff.id,
      subdomain,
      title: titleInput || `${staff.name}'s Portfolio`,
      entryFile: "index.html",
      fileCount: normalizedFiles.length,
      totalSizeBytes,
      isActive: true,
    });

    // Programmatically provision custom subdomain on Vercel
    await addVercelDomain(subdomain).catch((err) => {
      console.warn(`[deploy] Failed to provision Vercel domain for ${subdomain}:`, err);
    });

    return NextResponse.json({
      ok: true,
      portfolio,
      subdomain,
      url: `https://${subdomain}.thevirtuslabs.com`,
      subdomainUrl: `https://${subdomain}.thevirtuslabs.com`,
      directUrl: `https://thevirtuslabs.com/p/${subdomain}`,
      localUrl: `/portfolios/${subdomain}`,
      fileCount: normalizedFiles.length,
      totalSize: totalSizeBytes,
    });
  } catch (error: unknown) {
    console.error("Portfolio deployment failed:", error);
    const msg = error instanceof Error ? error.message : "Internal deployment error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
