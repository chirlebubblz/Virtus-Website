import { NextResponse } from "next/server";
import { CLIENT_COOKIE, sessionCookieOptions } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CLIENT_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
