import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CLIENT_COOKIE, STAFF_COOKIE, verifySession } from "@/lib/session";

// API routes anyone may call without signing in.
const PUBLIC_API = new Set([
  "/api/track",
  "/api/health",
  "/api/brief",
  "/api/lead",
  "/api/client/login",
  "/api/client/logout",
  "/api/staff/login",
  "/api/staff/logout",
  "/api/staff/register",
  "/api/staff/reset",
  "/api/staff/invite-info",
  "/api/staff/mass-register-info",
  // The website calendar books without signing in. The handler checks the role for staff actions and only
  // gives visitors taken time slots.
  "/api/bookings",
  "/api/proposals/public",
  "/api/contracts/public",
  "/api/invoices/public",
  // Vercel Cron has no staff cookie. The handler accepts only CRON_SECRET or a signed-in admin.
  "/api/media/cleanup",
  // Public team and specialist showcase for website visitors
  "/api/teams",
]);

// Staff API routes team members may call. Every other non-public /api route is admin only.
// Handlers still decide what each role may do: team members only get the calls they host.
const TEAM_API = new Set([
  "/api/demo/status",
  "/api/bookings/ics",
  "/api/projects",
  "/api/tasks",
  "/api/media",
  "/api/media/file",
  "/api/media/package",
  "/api/reports",
  "/api/portfolio/deploy",
  "/api/portfolio/me",
  "/api/upload/chunk",
]);

function applySecurityHeaders(response: NextResponse, pathname: string): NextResponse {
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  // Never leak the client token via Referer
  const under = (base: string) => pathname === base || pathname.startsWith(`${base}/`);
  if (under("/track") || under("/client")) {
    response.headers.set("Referrer-Policy", "no-referrer");
  }

  // Authenticated surfaces must never be cached by browsers or shared caches
  if (
    under("/client") ||
    under("/admin") ||
    under("/team") ||
    under("/staff") ||
    under("/track") ||
    pathname.startsWith("/api/")
  ) {
    response.headers.set("Cache-Control", "no-store");
  }

  return response;
}

function redirectTo(request: NextRequest, pathname: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return applySecurityHeaders(NextResponse.redirect(url), request.nextUrl.pathname);
}

function getPortfolioSubdomain(request: NextRequest): string | null {
  const hostHeader = request.headers.get("host") || request.nextUrl.host || "";
  const host = hostHeader.split(":")[0].toLowerCase();

  // Production wildcard *.thevirtuslabs.com
  if (host.endsWith(".thevirtuslabs.com")) {
    const sub = host.slice(0, -".thevirtuslabs.com".length);
    if (sub && sub !== "www" && sub !== "api" && !sub.includes(".")) {
      return sub;
    }
  }

  // Local development *.localhost
  if (host.endsWith(".localhost")) {
    const sub = host.slice(0, -".localhost".length);
    if (sub && sub !== "www" && sub !== "api" && !sub.includes(".")) {
      return sub;
    }
  }

  return null;
}

function unauthorized(pathname: string): NextResponse {
  return applySecurityHeaders(
    NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
    pathname
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const portfolioSubdomain = getPortfolioSubdomain(request);
  if (portfolioSubdomain && !pathname.startsWith("/_next") && !pathname.startsWith("/api/")) {
    if (!pathname.startsWith("/portfolios/")) {
      const url = request.nextUrl.clone();
      url.pathname = `/portfolios/${portfolioSubdomain}${pathname === "/" ? "" : pathname}`;
      return applySecurityHeaders(NextResponse.rewrite(url), pathname);
    }
  }

  const isClientPage = pathname === "/client" || (pathname.startsWith("/client/") && pathname !== "/client/login");
  const isStaffPage =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/team" ||
    pathname.startsWith("/team/");
  const isClientApi = pathname.startsWith("/api/client/") && !PUBLIC_API.has(pathname);
  const isStaffApi = pathname.startsWith("/api/") && !pathname.startsWith("/api/client/") && !PUBLIC_API.has(pathname);

  // Signed-in staff are sent home by the login page itself, which re-checks the account.
  // A signature-only check here loops forever when the account was disabled or signed out.

  if (isClientPage || isClientApi) {
    const session = await verifySession(request.cookies.get(CLIENT_COOKIE)?.value, "client");
    if (!session) return isClientApi ? unauthorized(pathname) : redirectTo(request, "/client/login");
  } else if (isStaffPage || isStaffApi) {
    // Signature and role only. Handlers and pages re-check the account (disabled, signed out) against the database.
    const session = await verifySession(request.cookies.get(STAFF_COOKIE)?.value, ["admin", "team"]);
    if (!session) {
      if (isStaffApi) return unauthorized(pathname);
      const url = request.nextUrl.clone();
      url.pathname = "/staff/login";
      url.search = `?next=${encodeURIComponent(pathname.startsWith("/team") ? "/team" : "/admin")}`;
      return applySecurityHeaders(NextResponse.redirect(url), pathname);
    }
    const adminOnly = (isStaffApi && !TEAM_API.has(pathname)) || pathname === "/admin" || pathname.startsWith("/admin/");
    if (adminOnly && session.role !== "admin") return isStaffApi ? unauthorized(pathname) : redirectTo(request, "/team");
    // Admins have their own workspace. /team is for team members and their assigned work only.
    if (!isStaffApi && session.role === "admin" && (pathname === "/team" || pathname.startsWith("/team/"))) {
      return redirectTo(request, "/admin");
    }
  }

  return applySecurityHeaders(NextResponse.next(), pathname);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
