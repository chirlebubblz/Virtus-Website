import { NextResponse } from "next/server";
import { clientIp, isBlocked, recordFailure } from "@/lib/rateLimit";
import { safeEqual } from "@/lib/session";
import { getMassRegistrySetting } from "@/lib/settingsStore";
import { db } from "@/db";
import { hydrateTeamsAndMembersFromNeon } from "@/lib/teamsSync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ipKey = `staff-mass-info:${clientIp(request)}`;
  if (isBlocked(ipKey, 30)) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  let body: { token?: unknown; direct?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const isDirect = Boolean(body?.direct);

  try {
    const setting = await getMassRegistrySetting();

    if (!setting.enabled) {
      return NextResponse.json(
        {
          ok: false,
          error: "Team self-registration is currently paused by an administrator. Please check back later.",
        },
        { status: 403 }
      );
    }

    if (!isDirect) {
      if (!token) {
        return NextResponse.json({ ok: false, error: "Token is required" }, { status: 400 });
      }
      const matches = safeEqual(token, setting.token);
      if (!matches) {
        recordFailure(ipKey, 60 * 60 * 1000);
        return NextResponse.json(
          {
            ok: false,
            error: "That team registration link is invalid or has expired. Please ask an administrator for an updated link.",
          },
          { status: 404 }
        );
      }
    }

    await hydrateTeamsAndMembersFromNeon();

    const pods = db.getTeams().map((p) => ({
      id: p.id,
      name: p.name,
      focusArea: p.focusArea,
      color: p.color,
    }));

    return NextResponse.json({
      ok: true,
      data: {
        role: "team" as const,
        roleLabel: "Team Member",
        permission: "Specialist" as const,
        joinToken: setting.token,
        pods,
      },
    });
  } catch (err) {
    console.error("POST /api/staff/mass-register-info error:", err);
    return NextResponse.json({ ok: false, error: "Service temporarily unavailable" }, { status: 500 });
  }
}
