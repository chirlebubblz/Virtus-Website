import { NextResponse } from "next/server";
import { db, DEFAULT_SEED_MEMBERS, type TeamPod, type TeamMemberUser, type MemberPortfolioItem } from "@/db";
import { denyUnlessStaff } from "@/lib/staffAuth";
import { getPersistedTeams, savePersistedTeams } from "@/lib/settingsStore";
import { listStaff } from "@/lib/staffStore";

export const dynamic = "force-dynamic";

/**
 * Safeguard: filter out Paks to respect user request across app_settings and in-memory DB.
 */
function isPaks(m: { id?: string; email?: string; name?: string }): boolean {
  return (
    m.id === "user-1" ||
    m.email?.toLowerCase() === "paks@thevirtuslabs.com" ||
    m.name?.trim().toLowerCase() === "paks"
  );
}

/**
 * Ensures team pods and members are synchronized between:
 * 1. Neon DB app_settings (teamPods, teamMembers)
 * 2. Neon DB staff_users (all registered accounts like Jam B.)
 * 3. In-memory db state
 */
async function syncTeamsAndMembers(): Promise<void> {
  try {
    let needsPersistence = false;

    // Step 1: Load persisted teams/members from Neon settings if available
    const persisted = await getPersistedTeams();
    if (persisted.teams && persisted.teams.length > 0) {
      const sanitizedTeams = persisted.teams.map((t) => {
        if (t.id === "pod-3" || t.leaderId === "user-1" || t.leaderName?.toLowerCase() === "paks") {
          needsPersistence = true;
          return {
            ...t,
            leaderId: "user-6",
            leaderName: "Nadia",
            leaderRole: "Strategy & Discovery Lead",
            memberIds: (t.memberIds || []).filter((id) => id !== "user-1" && id !== "user-paks").concat("user-6"),
          };
        }
        if (t.memberIds && t.memberIds.includes("user-1")) {
          needsPersistence = true;
          return {
            ...t,
            memberIds: t.memberIds.filter((id) => id !== "user-1" && id !== "user-paks"),
          };
        }
        return t;
      });
      db.setTeams(sanitizedTeams);
    }
    if (persisted.members && persisted.members.length > 0) {
      // Safeguard: strip out any persisted member matching Paks
      const nonPaksMembers = persisted.members.filter((m) => {
        if (isPaks(m)) {
          needsPersistence = true;
          return false;
        }
        return true;
      });

      // Backfill bio, skills, portfolioUrl, and portfolioCollection from seed defaults if undefined
      const updatedMembers = nonPaksMembers.map((m) => {
        const seed = DEFAULT_SEED_MEMBERS.find(
          (s) => s.id === m.id || s.name.toLowerCase() === m.name.toLowerCase()
        );
        let changed = false;
        const memberCopy = { ...m };
        if (memberCopy.portfolioCollection === undefined && seed?.portfolioCollection) {
          memberCopy.portfolioCollection = seed.portfolioCollection;
          changed = true;
        }
        if (memberCopy.bio === undefined && seed?.bio) {
          memberCopy.bio = seed.bio;
          changed = true;
        }
        if (memberCopy.skills === undefined && seed?.skills) {
          memberCopy.skills = seed.skills;
          changed = true;
        }
        if (memberCopy.portfolioUrl === undefined && seed?.portfolioUrl) {
          memberCopy.portfolioUrl = seed.portfolioUrl;
          changed = true;
        }
        if (changed) needsPersistence = true;
        return memberCopy;
      });
      db.setTeamMembers(updatedMembers);
    }

    // Step 2: Auto-sync any registered staff from Neon staff_users into team members roster
    const staffList = await listStaff().catch(() => []);
    if (staffList && staffList.length > 0) {
      const currentMembers = db.getTeamMembers();
      let addedOrUpdated = false;

      for (const staff of staffList) {
        if (isPaks(staff)) continue;
        const existing = currentMembers.find(
          (m) =>
            m.id === staff.id ||
            m.email.toLowerCase() === staff.email.toLowerCase()
        );

        // Derive roleTitle from memberLabel if present (e.g. "Jam B. (UI/UX Designer)" -> "UI/UX Designer")
        let derivedTitle = "Specialist";
        if (staff.memberLabel && staff.memberLabel.includes("(") && staff.memberLabel.includes(")")) {
          const match = staff.memberLabel.match(/\(([^)]+)\)/);
          if (match && match[1]) {
            derivedTitle = match[1].trim();
          }
        } else if (staff.role === "admin") {
          derivedTitle = "Studio Director";
        }

        if (!existing) {
          // Add new staff user to members roster
          db.addTeamMember({
            name: staff.name,
            roleTitle: derivedTitle,
            email: staff.email.toLowerCase(),
            permission: staff.role === "admin" ? "Owner / Admin" : "Specialist",
            isLeader: false,
            avatar: staff.name.trim().charAt(0).toUpperCase() || "U",
            activeProjects: [],
            status: staff.status === "disabled" ? "Away" : "Active",
          });
          addedOrUpdated = true;
        } else {
          // If member is in roster but status needs refresh
          if (
            (staff.status === "disabled" && existing.status !== "Away") ||
            (staff.status === "active" && existing.status === "Away")
          ) {
            db.updateTeamMember(existing.id, {
              status: staff.status === "disabled" ? "Away" : "Active",
            });
            addedOrUpdated = true;
          }
        }
      }

      // If changes occurred, save back to Neon settings store
      if (addedOrUpdated || needsPersistence || !persisted.teams || !persisted.members) {
        await savePersistedTeams(db.getTeams(), db.getTeamMembers());
      }
    } else if (needsPersistence) {
      await savePersistedTeams(db.getTeams(), db.getTeamMembers());
    }
  } catch (err) {
    console.warn("syncTeamsAndMembers warning:", err);
  }
}

export async function GET() {
  await syncTeamsAndMembers();

  const teams = db.getTeams().map((t) => ({
    ...t,
    leaderName: t.leaderName?.toLowerCase() === "paks" ? "Nadia" : t.leaderName,
    leaderRole: t.leaderName?.toLowerCase() === "paks" ? "Strategy & Discovery Lead" : t.leaderRole,
    memberIds: (t.memberIds || []).filter((id) => id !== "user-1"),
  }));

  const members = db.getTeamMembers().filter((m) => !isPaks(m));

  return NextResponse.json({
    ok: true,
    teams,
    members,
  });
}

export async function POST(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON format" }, { status: 400 });
  }

  const { action = "create_team", ...payload } = (body as Record<string, unknown>) || {};

  if (action === "create_team") {
    const { name, focusArea, leaderId, color = "#FBD227" } = payload as {
      name?: string;
      focusArea?: string;
      leaderId?: string;
      color?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ ok: false, error: "Pod name is required" }, { status: 400 });
    }

    const members = db.getTeamMembers().filter((m) => !isPaks(m));
    const leader = members.find((m) => m.id === leaderId) || members[0];

    const newPod = db.addTeam({
      name: name.trim(),
      focusArea: focusArea?.trim() || "Multi-disciplinary Design & Engineering",
      leaderId: leader ? leader.id : "user-6",
      leaderName: leader ? leader.name : "Nadia",
      leaderRole: leader ? leader.roleTitle : "Strategy & Discovery Lead",
      memberIds: leader ? [leader.id] : [],
      color,
      activeProjectsCount: 1,
    });

    await savePersistedTeams(db.getTeams(), db.getTeamMembers());

    return NextResponse.json({ ok: true, team: newPod }, { status: 201 });
  }

  if (action === "add_member") {
    const {
      name,
      roleTitle,
      email,
      teamId,
      permission = "Specialist",
      bio,
      skills,
      portfolioUrl,
      portfolioCollection,
    } = payload as {
      name?: string;
      roleTitle?: string;
      email?: string;
      teamId?: string;
      permission?: TeamMemberUser["permission"];
      bio?: string;
      skills?: string[];
      portfolioUrl?: string;
      portfolioCollection?: MemberPortfolioItem[];
    };

    if (!name?.trim() || !roleTitle?.trim() || !email?.trim()) {
      return NextResponse.json({ ok: false, error: "Name, role title, and email are required" }, { status: 400 });
    }

    const team = teamId ? db.getTeamById(teamId) : undefined;

    const newMember = db.addTeamMember({
      name: name.trim(),
      roleTitle: roleTitle.trim(),
      email: email.trim().toLowerCase(),
      permission,
      teamId: team?.id,
      teamName: team?.name,
      isLeader: false,
      avatar: name.trim().charAt(0).toUpperCase(),
      activeProjects: [],
      status: "Active",
      bio: bio?.trim(),
      skills: Array.isArray(skills) ? skills : undefined,
      portfolioUrl: portfolioUrl?.trim(),
      portfolioCollection: Array.isArray(portfolioCollection) ? portfolioCollection : undefined,
    });

    await savePersistedTeams(db.getTeams(), db.getTeamMembers());

    return NextResponse.json({ ok: true, member: newMember }, { status: 201 });
  }

  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}

export async function PATCH(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON format" }, { status: 400 });
  }

  const { action, id, ...updates } = (body as Record<string, unknown>) || {};

  if (!id || typeof id !== "string") {
    return NextResponse.json({ ok: false, error: "Missing entity id" }, { status: 400 });
  }

  if (action === "assign_leader") {
    const { leaderId } = updates as { leaderId: string };
    const member = db.getTeamMembers().find((m) => m.id === leaderId || m.email?.toLowerCase() === leaderId?.toLowerCase());
    if (!member) {
      return NextResponse.json({ ok: false, error: "Leader member not found" }, { status: 404 });
    }

    const pod = db.updateTeam(id, {
      leaderId: member.id,
      leaderName: member.name,
      leaderRole: member.roleTitle,
    });

    if (!pod) return NextResponse.json({ ok: false, error: "Pod not found" }, { status: 404 });

    // Update the new leader's properties and assign to pod
    db.updateTeamMember(member.id, {
      teamId: pod.id,
      teamName: pod.name,
      isLeader: true,
      permission: member.permission === "Owner / Admin" ? "Owner / Admin" : "Pod Lead",
    });

    // Demote any previous leader for this pod
    for (const m of db.getTeamMembers()) {
      if (m.teamId === pod.id && m.id !== member.id && m.isLeader) {
        db.updateTeamMember(m.id, {
          isLeader: false,
          permission: m.permission === "Owner / Admin" ? "Owner / Admin" : "Specialist",
        });
      }
    }

    await savePersistedTeams(db.getTeams(), db.getTeamMembers());

    return NextResponse.json({ ok: true, team: pod });
  }

  if (action === "update_team") {
    const pod = db.updateTeam(id, updates as Partial<TeamPod>);
    if (!pod) return NextResponse.json({ ok: false, error: "Pod not found" }, { status: 404 });
    await savePersistedTeams(db.getTeams(), db.getTeamMembers());
    return NextResponse.json({ ok: true, team: pod });
  }

  if (action === "update_member") {
    const payload = { ...updates } as Partial<TeamMemberUser>;
    if (payload.teamId === "" || payload.teamId === null) {
      payload.teamId = undefined;
      payload.teamName = undefined;
    }
    const member = db.updateTeamMember(id, payload);
    if (!member) return NextResponse.json({ ok: false, error: "Member not found" }, { status: 404 });
    await savePersistedTeams(db.getTeams(), db.getTeamMembers());
    return NextResponse.json({ ok: true, member });
  }

  return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
}

export async function DELETE(request: Request) {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ ok: false, error: "Missing id parameter" }, { status: 400 });

  if (type === "team") {
    const success = db.deleteTeam(id);
    if (success) {
      await savePersistedTeams(db.getTeams(), db.getTeamMembers());
    }
    return NextResponse.json({ ok: success });
  }

  if (type === "member") {
    const success = db.deleteTeamMember(id);
    if (success) {
      await savePersistedTeams(db.getTeams(), db.getTeamMembers());
    }
    return NextResponse.json({ ok: success });
  }

  return NextResponse.json({ ok: false, error: "Invalid delete type" }, { status: 400 });
}
