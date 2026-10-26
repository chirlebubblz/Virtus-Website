import { NextResponse } from "next/server";
import { db, type TeamMemberUser, type MemberPortfolioItem } from "@/db";
import {
  getStaff,
  attachStaffSession,
  hashPassword,
  normalizeEmail,
  passwordProblem,
} from "@/lib/staffAuth";
import { updateStaff, toSummary } from "@/lib/staffStore";
import { savePersistedTeams } from "@/lib/settingsStore";
import { hydrateTeamsAndMembersFromNeon } from "@/lib/teamsSync";

export const dynamic = "force-dynamic";

export async function GET() {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  await hydrateTeamsAndMembersFromNeon();

  const members = db.getTeamMembers();
  let member = members.find(
    (m) =>
      m.id === staff.id ||
      m.email.toLowerCase() === staff.email.toLowerCase() ||
      m.name.trim().toLowerCase() === staff.name.trim().toLowerCase()
  );

  if (!member) {
    let derivedTitle = "Specialist";
    if (staff.memberLabel && staff.memberLabel.includes("(") && staff.memberLabel.includes(")")) {
      const match = staff.memberLabel.match(/\(([^)]+)\)/);
      if (match && match[1]) {
        derivedTitle = match[1].trim();
      }
    } else if (staff.role === "admin") {
      derivedTitle = "Studio Director";
    }

    member = db.addTeamMember({
      name: staff.name,
      roleTitle: derivedTitle,
      email: staff.email.toLowerCase(),
      permission: staff.role === "admin" ? "Owner / Admin" : "Specialist",
      isLeader: false,
      avatar: staff.name.trim().charAt(0).toUpperCase() || "V",
      activeProjects: [],
      status: "Active",
      username: staff.memberLabel ? staff.memberLabel.replace(/^@/, "") : undefined,
    });

    await savePersistedTeams(db.getTeams(), db.getTeamMembers());
  }

  return NextResponse.json(
    {
      ok: true,
      staff: toSummary(staff),
      member,
      pods: db.getTeams(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

export async function PATCH(request: Request) {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  await hydrateTeamsAndMembersFromNeon();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON format" }, { status: 400 });
  }

  const {
    name,
    email,
    username,
    newPassword,
    avatar,
    avatarUrl,
    roleTitle,
    teamId,
    bio,
    skills,
    portfolioUrl,
    portfolioCollection,
  } = body as {
    name?: string;
    email?: string;
    username?: string;
    newPassword?: string;
    avatar?: string;
    avatarUrl?: string;
    roleTitle?: string;
    teamId?: string | null;
    bio?: string;
    skills?: string[];
    portfolioUrl?: string;
    portfolioCollection?: MemberPortfolioItem[];
  };

  let nextName = staff.name;
  if (name && typeof name === "string" && name.trim()) {
    nextName = name.trim();
  }

  let nextEmail = staff.email;
  if (email && typeof email === "string" && email.trim()) {
    const norm = normalizeEmail(email);
    if (!norm) {
      return NextResponse.json({ ok: false, error: "Invalid email format." }, { status: 400 });
    }
    nextEmail = norm;
  }

  let nextPasswordHash: string | undefined = undefined;
  if (newPassword && typeof newPassword === "string" && newPassword.trim()) {
    const problem = passwordProblem(newPassword, nextEmail, nextName);
    if (problem) {
      return NextResponse.json({ ok: false, error: problem }, { status: 400 });
    }
    nextPasswordHash = await hashPassword(newPassword);
  }

  const nextUsername =
    typeof username === "string" ? username.trim().replace(/^@/, "") : undefined;

  // 1. Update staff_users (Neon / in-memory store)
  const updatedStaff = await updateStaff(staff.id, {
    name: nextName,
    email: nextEmail,
    passwordHash: nextPasswordHash,
    memberLabel: nextUsername !== undefined ? `@${nextUsername}` : staff.memberLabel,
  });

  // 2. Find or match existing member in db
  const currentMembers = db.getTeamMembers();
  const existingMember = currentMembers.find(
    (m) =>
      m.id === staff.id ||
      m.email.toLowerCase() === staff.email.toLowerCase() ||
      m.email.toLowerCase() === nextEmail.toLowerCase() ||
      m.name.trim().toLowerCase() === staff.name.trim().toLowerCase()
  );

  // Derive pod assignment
  let assignedTeamId: string | undefined = undefined;
  let assignedTeamName: string | undefined = undefined;
  if (teamId !== undefined) {
    const rawTeamId = teamId ? String(teamId).trim() : "";
    if (rawTeamId) {
      const pod = db.getTeamById(rawTeamId);
      if (pod) {
        assignedTeamId = pod.id;
        assignedTeamName = pod.name;
      }
    }
  }

  const rawAvatar = typeof avatar === "string" && avatar.trim() ? avatar.trim() : "";
  const rawAvatarUrl = typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl.trim() : "";
  const effectiveAvatarImage = rawAvatar || rawAvatarUrl;

  const initialLetter = nextName.charAt(0).toUpperCase() || "V";
  const finalAvatar = effectiveAvatarImage || initialLetter;

  const parsedSkills = Array.isArray(skills)
    ? skills.map((s) => String(s).trim()).filter(Boolean)
    : undefined;

  const cleanedCollection = Array.isArray(portfolioCollection)
    ? portfolioCollection
        .filter((c) => c && typeof c.title === "string" && c.title.trim() && typeof c.url === "string" && c.url.trim())
        .map((c) => ({
          ...c,
          id: c.id || `port-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: c.title.trim(),
          url: c.url.trim(),
          tag: c.tag?.trim() || "PRODUCTION BUILD",
          description: c.description?.trim() || "",
          accentColor: c.accentColor || "#FBD227",
          previewImage: c.previewImage?.trim() || undefined,
        }))
    : undefined;

  let member: TeamMemberUser | null = null;
  if (existingMember) {
    member = db.updateTeamMember(existingMember.id, {
      name: nextName,
      email: nextEmail,
      roleTitle: typeof roleTitle === "string" && roleTitle.trim() ? roleTitle.trim() : existingMember.roleTitle,
      teamId: teamId !== undefined ? assignedTeamId : existingMember.teamId,
      teamName: teamId !== undefined ? assignedTeamName : existingMember.teamName,
      bio: typeof bio === "string" ? bio.trim() : existingMember.bio,
      skills: parsedSkills !== undefined ? parsedSkills : existingMember.skills,
      portfolioUrl: typeof portfolioUrl === "string" ? portfolioUrl.trim() : existingMember.portfolioUrl,
      portfolioCollection: cleanedCollection !== undefined ? cleanedCollection : existingMember.portfolioCollection,
      username: nextUsername !== undefined ? nextUsername : existingMember.username,
      avatar: finalAvatar,
      avatarUrl: effectiveAvatarImage || undefined,
    });
  } else {
    member = db.addTeamMember({
      name: nextName,
      roleTitle: typeof roleTitle === "string" && roleTitle.trim() ? roleTitle.trim() : (staff.role === "admin" ? "Studio Director" : "Specialist"),
      email: nextEmail,
      permission: staff.role === "admin" ? "Owner / Admin" : "Specialist",
      teamId: assignedTeamId,
      teamName: assignedTeamName,
      isLeader: false,
      avatar: finalAvatar,
      activeProjects: [],
      status: "Active",
      bio: typeof bio === "string" ? bio.trim() : undefined,
      skills: parsedSkills,
      portfolioUrl: typeof portfolioUrl === "string" ? portfolioUrl.trim() : undefined,
      portfolioCollection: cleanedCollection,
      username: nextUsername,
      avatarUrl: effectiveAvatarImage || undefined,
    });
  }

  await savePersistedTeams(db.getTeams(), db.getTeamMembers());

  const responseStaff = updatedStaff ?? staff;
  const response = NextResponse.json({
    ok: true,
    staff: toSummary(responseStaff),
    member,
  });

  // Re-issue staff session cookie so the browser stays logged in with updated credentials/name/email
  await attachStaffSession(response, responseStaff);

  return response;
}
