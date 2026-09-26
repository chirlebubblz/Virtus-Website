import { NextResponse } from "next/server";
import { getTrackData } from "@/lib/track";
import { clientIp, isBlocked, recordFailure } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ipKey = `track-ip:${clientIp(request)}`;
  if (isBlocked(ipKey, 20)) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": "900" } }
    );
  }
  const token = new URL(request.url).searchParams.get("token") ?? undefined;
  const result = await getTrackData(token);

  if (!result.ok) {
    if (result.reason !== "unavailable") recordFailure(ipKey);
    const status = result.reason === "invalid" ? 400 : result.reason === "unavailable" ? 503 : 404;
    return NextResponse.json({ ok: false, error: "Invalid or unknown link" }, { status });
  }
  return NextResponse.json({ ok: true, data: result.data });
}
