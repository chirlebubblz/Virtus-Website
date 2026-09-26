import { NextResponse } from "next/server";
import { confirmAdminPassword } from "@/lib/adminConfirm";
import { badRequest, readJsonObject, unavailable } from "@/lib/apiUtil";
import { getStaff } from "@/lib/staffAuth";
import { addAudit } from "@/lib/staffStore";
import {
  SETTINGS_CACHE_TTL_MS,
  SettingsUnavailableError,
  generateInviteCode,
  getSettings,
  hashSecretSalted,
  parseDomains,
  removeSetting,
  saveSetting,
  type AppSettings,
} from "@/lib/settingsStore";

export const dynamic = "force-dynamic";

type Source = "settings" | "environment" | "none";

/** Environment values the app needs before it can reach the database. Presence only, never the value. */
const ENV_ONLY: { name: string; required: boolean; note: string }[] = [
  { name: "DATABASE_URL", required: true, note: "Needed to connect to the database, so it cannot be stored in it." },
  { name: "SESSION_SECRET", required: true, note: "Signs login cookies. Read before any database call." },
];

const DOMAIN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

function summarize(saved: AppSettings) {
  const secretSource = (savedValue: unknown, envName: string): Source =>
    savedValue ? "settings" : process.env[envName] ? "environment" : "none";
  const envDomains = process.env.STAFF_EMAIL_DOMAINS ? parseDomains(process.env.STAFF_EMAIL_DOMAINS) : null;
  return {
    inviteTeam: {
      source: secretSource(saved.inviteTeam, "STAFF_INVITE_CODE"),
      updatedAt: saved.inviteTeam?.updatedAt ?? null,
      updatedBy: saved.inviteTeam?.updatedBy ?? null,
    },
    inviteAdmin: {
      source: secretSource(saved.inviteAdmin, "ADMIN_INVITE_CODE"),
      updatedAt: saved.inviteAdmin?.updatedAt ?? null,
      updatedBy: saved.inviteAdmin?.updatedBy ?? null,
    },
    emailDomains: {
      value: saved.emailDomains?.value?.length ? saved.emailDomains.value : envDomains ?? ["*"],
      source: (saved.emailDomains?.value?.length ? "settings" : envDomains ? "environment" : "none") as Source,
    },
    demoAccess: {
      value: typeof saved.demoAccess?.value === "boolean" ? saved.demoAccess.value : process.env.ALLOW_DEMO_ACCESS === "true",
      source: (typeof saved.demoAccess?.value === "boolean" ? "settings" : process.env.ALLOW_DEMO_ACCESS ? "environment" : "none") as Source,
    },
    env: ENV_ONLY.map((e) => ({ ...e, present: Boolean(process.env[e.name]) })),
    cacheSeconds: SETTINGS_CACHE_TTL_MS / 1000,
  };
}

export async function GET() {
  const admin = await getStaff(["admin"]);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, data: summarize(await getSettings()) });
  } catch (err) {
    if (err instanceof SettingsUnavailableError) return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
    return unavailable("GET /api/settings error", err);
  }
}

/** Every change needs the admin's own password. The invite code is returned once and stored only as a salted hash. */
export async function PATCH(request: Request) {
  const admin = await getStaff(["admin"]);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid request.");
  const denied = await confirmAdminPassword(admin, body.password, "settings");
  if (denied) return denied;

  const stamp = { updatedAt: new Date().toISOString(), updatedBy: admin.email };
  const role = body.role === "admin" ? "admin" : body.role === "team" ? "team" : null;
  const key = role === "admin" ? "inviteAdmin" : "inviteTeam";

  try {
    switch (body.action) {
      case "rotate_invite": {
        if (!role) return badRequest("Choose team or admin.", "role");
        let code = generateInviteCode();
        if (typeof body.code === "string" && body.code.trim()) {
          code = body.code.trim();
          if (code.length < 16 || code.length > 128) return badRequest("Use a code of 16 to 128 characters.", "code");
        }
        await saveSetting(key, { value: await hashSecretSalted(code), ...stamp });
        await addAudit(admin.email, "invite_code_rotated", role);
        return NextResponse.json({ ok: true, data: { code, summary: summarize(await getSettings()) } });
      }
      case "revert_invite": {
        if (!role) return badRequest("Choose team or admin.", "role");
        await removeSetting(key);
        await addAudit(admin.email, "invite_code_reverted", role);
        return NextResponse.json({ ok: true, data: { summary: summarize(await getSettings()) } });
      }
      case "set_email_domains": {
        const list = Array.isArray(body.domains) ? body.domains : typeof body.domains === "string" ? parseDomains(body.domains) : null;
        if (!list) return badRequest("Enter one or more domains.", "domains");
        const domains = [...new Set(list.map((d) => String(d).trim().toLowerCase()).filter(Boolean))];
        if (domains.length === 0) {
          await removeSetting("emailDomains"); // empty means back to the environment default
        } else {
          if (domains.length > 10) return badRequest("Use at most 10 domains.", "domains");
          const bad = domains.find((d) => !DOMAIN.test(d));
          if (bad) return badRequest(`"${bad}" is not a valid domain, for example example.com.`, "domains");
          await saveSetting("emailDomains", { value: domains, ...stamp });
        }
        await addAudit(admin.email, "email_domains_changed", domains.join(",") || "default");
        return NextResponse.json({ ok: true, data: { summary: summarize(await getSettings()) } });
      }
      case "set_demo_access": {
        if (typeof body.enabled !== "boolean") return badRequest("Choose on or off.", "enabled");
        await saveSetting("demoAccess", { value: body.enabled, ...stamp });
        await addAudit(admin.email, "demo_access_changed", String(body.enabled));
        return NextResponse.json({ ok: true, data: { summary: summarize(await getSettings()) } });
      }
      default:
        return badRequest("Unknown action.", "action");
    }
  } catch (err) {
    if (err instanceof SettingsUnavailableError) return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
    return unavailable("PATCH /api/settings error", err);
  }
}
