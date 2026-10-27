import { NextResponse } from "next/server";
import { denyUnlessStaff } from "@/lib/staffAuth";
import { addAudit } from "@/lib/staffStore";
import {
  generateMassRegistryToken,
  getMassRegistrySetting,
  saveMassRegistrySetting,
} from "@/lib/settingsStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const setting = await getMassRegistrySetting();
  return NextResponse.json({
    ok: true,
    data: setting,
  });
}

export async function POST(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const staff = (await request.json().catch(() => null)) as {
    action?: string;
    token?: string;
    enabled?: boolean;
  } | null;

  if (!staff?.action) {
    return NextResponse.json({ ok: false, error: "Action is required" }, { status: 400 });
  }

  const current = await getMassRegistrySetting();

  try {
    if (staff.action === "rotate") {
      const newToken = generateMassRegistryToken();
      const updated = await saveMassRegistrySetting(newToken, current.enabled, "admin");
      await addAudit("admin", "mass_registry_rotate", `Rotated token to ${newToken}`);
      return NextResponse.json({ ok: true, data: updated });
    }

    if (staff.action === "toggle") {
      const nextEnabled = typeof staff.enabled === "boolean" ? staff.enabled : !current.enabled;
      const updated = await saveMassRegistrySetting(current.token, nextEnabled, "admin");
      await addAudit(
        "admin",
        "mass_registry_toggle",
        `Mass registration ${nextEnabled ? "enabled" : "paused"}`
      );
      return NextResponse.json({ ok: true, data: updated });
    }

    if (staff.action === "update") {
      const customToken = staff.token?.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (!customToken || customToken.length < 4 || customToken.length > 64) {
        return NextResponse.json(
          { ok: false, error: "Token must be 4 to 64 alphanumeric characters, dashes, or underscores." },
          { status: 400 }
        );
      }
      const updated = await saveMassRegistrySetting(customToken, current.enabled, "admin");
      await addAudit("admin", "mass_registry_update", `Updated token to ${customToken}`);
      return NextResponse.json({ ok: true, data: updated });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/staff/mass-register error:", err);
    return NextResponse.json({ ok: false, error: "Could not update mass registry settings" }, { status: 500 });
  }
}
