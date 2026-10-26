import { NextResponse } from "next/server";
import { db, type TeamPod, type TeamMemberUser, type MemberPortfolioItem } from "@/db";
import { denyUnlessStaff } from "@/lib/staffAuth";
import { getPersistedTeams, savePersistedTeams } from "@/lib/settingsStore";
import { listStaff, deleteStaff, countActiveAdmins } from "@/lib/staffStore";

export const dynamic = "force-dynamic";

/**
 * Safeguard: filter out dummy seed characters (Paks, Kai, Ren, Sora, Milo, Nadia)
 * across app_settings and in-memory DB.
 */
const DUMMY_IDS = new Set(["user-1", "user-2", "user-3", "user-4", "user-5", "user-6", "user-paks"]);
const DUMMY_NAMES = new Set(["paks", "kai", "ren", "sora", "milo", "nadia"]);
const DUMMY_EMAILS = new Set([
  "paks@thevirtuslabs.com",
  "kai@thevirtuslabs.com",
  "ren@thevirtuslabs.com",
  "sora@thevirtuslabs.com",
  "milo@thevirtuslabs.com",
  "nadia@thevirtuslabs.com",
]);

function isDummySeedMember(m: { id?: string; email?: string; name?: string }): boolean {
  if (m.id && DUMMY_IDS.has(m.id)) return true;
  if (m.email && DUMMY_EMAILS.has(m.email.toLowerCase())) return true;
  if (m.name && DUMMY_NAMES.has(m.name.trim().toLowerCase())) return true;
  return false;
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
        let changed = false;
        let leaderId = t.leaderId || "";
        let leaderName = t.leaderName || "Unassigned";
        let leaderRole = t.leaderRole || "Pod Leader";

        if (leaderId && DUMMY_IDS.has(leaderId)) {
          leaderId = "";
          leaderName = "Unassigned";
          leaderRole = "Pod Leader";
          changed = true;
        } else if (leaderName && DUMMY_NAMES.has(leaderName.trim().toLowerCase())) {
          leaderId = "";
          leaderName = "Unassigned";
          leaderRole = "Pod Leader";
          changed = true;
        }

        const filteredMemberIds = (t.memberIds || []).filter((id) => !DUMMY_IDS.has(id));
        if (filteredMemberIds.length !== (t.memberIds || []).length) {
          changed = true;
        }

        if (changed) {
          needsPersistence = true;
        }

        return {
          ...t,
          leaderId,
          leaderName,
          leaderRole,
          memberIds: filteredMemberIds,
        };
      });
      db.setTeams(sanitizedTeams);
    }

    if (persisted.members && persisted.members.length > 0) {
      // Purge dummy seed characters from persisted members
      const validMembers = persisted.members.filter((m) => {
        if (isDummySeedMember(m)) {
          needsPersistence = true;
          return false;
        }
        return true;
      });
      db.setTeamMembers(validMembers);
    }

    // Step 2: Auto-sync active registered staff & prune disabled accounts
    const staffList = await listStaff().catch(() => []);
    if (staffList && staffList.length > 0) {
      const activeStaff = staffList.filter((s) => s.status === "active" && !isDummySeedMember(s));
      const disabledStaffEmails = new Set(
        staffList.filter((s) => s.status === "disabled").map((s) => s.email.toLowerCase())
      );
      const disabledStaffIds = new Set(
        staffList.filter((s) => s.status === "disabled").map((s) => s.id)
      );

      // Prune any disabled accounts from teamMembers & pods so they never show up
      const currentMembers = db.getTeamMembers();
      const prunedMembers = currentMembers.filter((m) => {
        const isStaffDisabled = disabledStaffEmails.has(m.email.toLowerCase()) || disabledStaffIds.has(m.id);
        if (isStaffDisabled) {
          needsPersistence = true;
          for (const pod of db.getTeams()) {
            if (pod.memberIds?.includes(m.id)) {
              pod.memberIds = pod.memberIds.filter((id) => id !== m.id);
            }
            if (pod.leaderId === m.id) {
              pod.leaderId = "";
              pod.leaderName = "Unassigned";
              pod.leaderRole = "Pod Leader";
            }
          }
          return false;
        }
        return true;
      });
      if (prunedMembers.length !== currentMembers.length) {
        db.setTeamMembers(prunedMembers);
      }

      let addedOrUpdated = false;
      const updatedMembers = db.getTeamMembers();

      for (const staff of activeStaff) {
        const existing = updatedMembers.find(
          (m) =>
            m.id === staff.id ||
            m.email.toLowerCase() === staff.email.toLowerCase()
        );

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
          db.addTeamMember({
            name: staff.name,
            roleTitle: derivedTitle,
            email: staff.email.toLowerCase(),
            permission: staff.role === "admin" ? "Owner / Admin" : "Specialist",
            isLeader: false,
            avatar: staff.name.trim().charAt(0).toUpperCase() || "U",
            activeProjects: [],
            status: "Active",
          });
          addedOrUpdated = true;
        } else {
          if (existing.status !== "Active") {
            db.updateTeamMember(existing.id, { status: "Active" });
            addedOrUpdated = true;
          }
        }
      }

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
    leaderId: t.leaderId && DUMMY_IDS.has(t.leaderId) ? "" : t.leaderId,
    leaderName: t.leaderName && DUMMY_NAMES.has(t.leaderName.trim().toLowerCase()) ? "Unassigned" : t.leaderName,
    memberIds: (t.memberIds || []).filter((id) => !DUMMY_IDS.has(id)),
  }));

  const members = db.getTeamMembers().filter((m) => !isDummySeedMember(m));

  return NextResponse.json(
    {
      ok: true,
      teams,
      members,
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

    const members = db.getTeamMembers().filter((m) => !isDummySeedMember(m));
    const leader = members.find((m) => m.id === leaderId);

    const newPod = db.addTeam({
      name: name.trim(),
      focusArea: focusArea?.trim() || "Multi-disciplinary Design & Engineering",
      leaderId: leader ? leader.id : "",
      leaderName: leader ? leader.name : "Unassigned",
      leaderRole: leader ? leader.roleTitle : "Pod Leader",
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
  const denied = await denyUnlessStaff(["admin", "team"]);
  if (denied) return denied;

  await syncTeamsAndMembers();

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

  if (action === "assign_leader" || action === "update_team") {
    const adminDenied = await denyUnlessStaff(["admin"]);
    if (adminDenied) return adminDenied;
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

    // Handle teamId change & pod synchronization
    if ("teamId" in updates) {
      const rawTeamId = payload.teamId ? String(payload.teamId).trim() : "";
      if (rawTeamId) {
        const pod = db.getTeamById(rawTeamId);
        if (pod) {
          payload.teamId = pod.id;
          payload.teamName = pod.name;
        } else {
          payload.teamId = undefined;
          payload.teamName = undefined;
        }
      } else {
        payload.teamId = undefined;
        payload.teamName = undefined;
      }
    }

    if (payload.name && typeof payload.name === "string") {
      payload.name = payload.name.trim();
      if (!payload.avatar || payload.avatar.length <= 1) {
        payload.avatar = payload.name.charAt(0).toUpperCase();
      }
    }

    if (payload.roleTitle && typeof payload.roleTitle === "string") {
      payload.roleTitle = payload.roleTitle.trim();
    }

    let member = db.updateTeamMember(id, payload);
    if (!member) {
      // Try matching by email
      const existingByEmail = payload.email
        ? db.getTeamMembers().find((m) => m.email?.toLowerCase() === payload.email?.toLowerCase())
        : undefined;
      if (existingByEmail) {
        member = db.updateTeamMember(existingByEmail.id, payload);
      } else {
        // Auto-create/sync member record
        member = db.addTeamMember({
          name: payload.name || "Staff Member",
          roleTitle: payload.roleTitle || "Specialist",
          email: (payload.email || "").toLowerCase(),
          permission: payload.permission || "Specialist",
          teamId: payload.teamId,
          teamName: payload.teamName,
          isLeader: false,
          avatar: payload.avatar || (payload.name ? payload.name.charAt(0).toUpperCase() : "V"),
          activeProjects: [],
          status: "Active",
          bio: payload.bio,
          skills: payload.skills,
          portfolioUrl: payload.portfolioUrl,
          portfolioCollection: payload.portfolioCollection,
          username: payload.username,
          avatarUrl: payload.avatarUrl,
        });
      }
    }

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
    const existing = db.getTeamMembers().find((m) => m.id === id);
    const memberEmail = existing?.email?.toLowerCase();

    // Check if deleting this member would delete the sole active admin in staff_users
    if (memberEmail) {
      const staffList = await listStaff().catch(() => []);
      const matchingStaff = staffList.find(
        (s) => s.id === id || s.email.toLowerCase() === memberEmail
      );
      if (matchingStaff && matchingStaff.role === "admin" && (await countActiveAdmins()) <= 1) {
        return NextResponse.json(
          { ok: false, error: "Keep at least one active admin. You cannot delete the sole administrator." },
          { status: 409 }
        );
      }
      if (matchingStaff) {
        await deleteStaff(matchingStaff.id);
      }
    }

    const success = db.deleteTeamMember(id);
    if (success) {
      await savePersistedTeams(db.getTeams(), db.getTeamMembers());
    }
    return NextResponse.json({ ok: success });
  }

  return NextResponse.json({ ok: false, error: "Invalid delete type" }, { status: 400 });
}
