import { NextRequest, NextResponse } from "next/server";
import { getPortfolioFile } from "@/lib/portfolioStorage";
import { getPortfolioBySubdomain } from "@/lib/portfolioStore";
import mime from "mime-types";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{
    subdomain: string;
    slug?: string[];
  }>;
}

function notFoundResponse(subdomain: string): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>404 - Portfolio Page Not Found</title>
  <style>
    body {
      background-color: #0b0f19;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1rem;
    }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 1rem;
      padding: 2.5rem 2rem;
      max-width: 28rem;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: rgba(99, 102, 241, 0.1);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.2);
      margin-bottom: 1.25rem;
    }
    h1 {
      font-size: 1.875rem;
      font-weight: 700;
      margin: 0 0 0.75rem;
      color: #ffffff;
    }
    p {
      color: #94a3b8;
      font-size: 0.95rem;
      line-height: 1.6;
      margin: 0 0 1.5rem;
    }
    .link {
      display: inline-block;
      color: #6366f1;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.9rem;
      transition: color 0.15s;
    }
    .link:hover {
      color: #a5b4fc;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${subdomain}.thevirtuslabs.com</div>
    <h1>404 Not Found</h1>
    <p>The requested page or asset does not exist in this portfolio deployment.</p>
    <a href="/" class="link">&larr; Return to Portfolio Home</a>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

function isPathAccess(request: NextRequest, subdomain: string): boolean {
  const hostHeader =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.host ||
    "";
  const host = hostHeader.split(":")[0].toLowerCase();

  // If host matches *.thevirtuslabs.com or *.localhost where subdomain is in host
  const isSubdomainHost =
    host === `${subdomain}.thevirtuslabs.com` ||
    host === `${subdomain}.localhost` ||
    host.startsWith(`${subdomain}.`);

  return !isSubdomainHost;
}

function transformHtmlForPathAccess(data: Uint8Array, subdomain: string): Uint8Array {
  const decoder = new TextDecoder("utf-8");
  let html = decoder.decode(data);

  const baseHref = `/p/${subdomain}/`;
  const baseTag = `<base href="${baseHref}">`;

  if (/<base\s+[^>]*>/i.test(html)) {
    html = html.replace(/<base\s+[^>]*>/i, baseTag);
  } else if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (match) => `${match}\n  ${baseTag}`);
  } else {
    html = `${baseTag}\n${html}`;
  }

  // Safely rewrite root-relative asset URLs in attributes so they point to /p/${subdomain}/
  // Double-quoted href & src
  html = html.replace(
    /(href\s*=\s*)"\/(?!\/|http|https|#|mailto:|tel:|p\/|portfolios\/)([^"]*)"/gi,
    (_match, p1, p2) => `${p1}"${baseHref}${p2}"`
  );
  html = html.replace(
    /(src\s*=\s*)"\/(?!\/|http|https|data:|p\/|portfolios\/)([^"]*)"/gi,
    (_match, p1, p2) => `${p1}"${baseHref}${p2}"`
  );

  // Single-quoted href & src
  html = html.replace(
    /(href\s*=\s*)'\/(?!\/|http|https|#|mailto:|tel:|p\/|portfolios\/)([^']*)'/gi,
    (_match, p1, p2) => `${p1}'${baseHref}${p2}'`
  );
  html = html.replace(
    /(src\s*=\s*)'\/(?!\/|http|https|data:|p\/|portfolios\/)([^']*)'/gi,
    (_match, p1, p2) => `${p1}'${baseHref}${p2}'`
  );

  return new TextEncoder().encode(html);
}

export async function GET(request: NextRequest, { params }: RouteProps) {
  try {
    const { subdomain, slug } = await params;
    const cleanSubdomain = (subdomain || "").trim().toLowerCase();

    if (!cleanSubdomain) {
      return notFoundResponse("unknown");
    }

    // Check if portfolio is registered and active
    const portfolio = await getPortfolioBySubdomain(cleanSubdomain);
    if (!portfolio || !portfolio.isActive) {
      return notFoundResponse(cleanSubdomain);
    }

    // Determine candidate paths to resolve
    const cleanSlug = (slug || []).filter((s) => s && s.trim() !== "");
    const candidates: string[] = [];
    if (cleanSlug.length === 0) {
      candidates.push(portfolio.entryFile || "index.html");
    } else {
      const joined = cleanSlug.join("/");
      // 1. Exact match (e.g., "styles.css", "about/team.png", "index.html")
      candidates.push(joined);

      const hasExtension = joined.split("/").pop()?.includes(".");
      if (!hasExtension) {
        // 2. Try clean URL with .html extension (e.g. "about" -> "about.html")
        candidates.push(`${joined}.html`);
        // 3. Try directory index (e.g. "about" -> "about/index.html")
        candidates.push(`${joined}/index.html`);
      }
    }

    // Attempt to locate file in storage
    let fileResult: { data: Uint8Array; contentType: string; size: number } | null = null;
    let matchedCandidate = "";
    for (const candidate of candidates) {
      fileResult = await getPortfolioFile(cleanSubdomain, candidate);
      if (fileResult) {
        matchedCandidate = candidate;
        break;
      }
    }

    if (!fileResult) {
      // Check if custom 404.html exists in this portfolio
      const custom404 = await getPortfolioFile(cleanSubdomain, "404.html");
      if (custom404) {
        let data = custom404.data;
        if (isPathAccess(request, cleanSubdomain)) {
          data = transformHtmlForPathAccess(data, cleanSubdomain);
        }
        return new NextResponse(data as unknown as BodyInit, {
          status: 404,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Length": String(data.byteLength),
            "Cache-Control": "no-cache, must-revalidate",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }

      return notFoundResponse(cleanSubdomain);
    }

    // Determine content type
    let contentType = fileResult.contentType;
    if (!contentType || contentType === "application/octet-stream") {
      const extMatch = (matchedCandidate || candidates[0] || "").split("/").pop() || "";
      contentType = (mime.lookup(extMatch) as string) || "application/octet-stream";
    }

    if (contentType.startsWith("text/html") && !contentType.includes("charset")) {
      contentType = `${contentType}; charset=utf-8`;
    }

    // Caching headers:
    // HTML pages: must revalidate so updates show immediately
    // Static assets (CSS, JS, images, fonts): cache for 24 hours
    const isHtml = contentType.startsWith("text/html");
    const cacheControl = isHtml
      ? "public, max-age=0, must-revalidate"
      : "public, max-age=86400, stale-while-revalidate=604800";

    let responseData = fileResult.data;
    if (isHtml && isPathAccess(request, cleanSubdomain)) {
      responseData = transformHtmlForPathAccess(responseData, cleanSubdomain);
    }

    return new NextResponse(responseData as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(responseData.byteLength),
        "Cache-Control": cacheControl,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    console.error("Static file serving error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
