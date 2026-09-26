import { NextResponse } from "next/server";
import { CLIENT_COOKIE, isSessionConfigured, sessionCookieOptions, signSession } from "@/lib/session";
import { clearFailures, clientIp, isBlocked, recordFailure } from "@/lib/rateLimit";
import { findClientByToken } from "@/lib/clientPortal";

export const dynamic = "force-dynamic";

const GENERIC_ERROR = "That access key did not work. Check it and try again.";

export async function POST(request: Request) {
  const ipKey = `client:${clientIp(request)}`;
  if (isBlocked(ipKey)) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again in 15 minutes." },
      { status: 429, headers: { "Retry-After": "900" } }
    );
  }

  if (!isSessionConfigured()) {
    console.error("SESSION_SECRET is not configured; refusing to issue client sessions.");
    return NextResponse.json({ ok: false, error: "Login is temporarily unavailable." }, { status: 503 });
  }

  let token: unknown;
  try {
    ({ token } = await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: GENERIC_ERROR }, { status: 400 });
  }

  const client = typeof token === "string" ? await findClientByToken(token.trim()) : null;
  if (!client) {
    recordFailure(ipKey);
    return NextResponse.json({ ok: false, error: GENERIC_ERROR }, { status: 401 });
  }

  const session = await signSession(client.id, "client", { tv: client.tv });
  if (!session) {
    return NextResponse.json({ ok: false, error: "Login is temporarily unavailable." }, { status: 503 });
  }

  clearFailures(ipKey);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CLIENT_COOKIE, session, sessionCookieOptions());
  return response;
}
