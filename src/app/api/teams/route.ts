import { NextResponse } from "next/server";
import { db, TeamPod, TeamMemberUser } from "@/db";
import { denyUnlessStaff } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await denyUnlessStaff(["admin", "team"]);
  if (denied) return denied;

  return NextResponse.json({
    ok: true,
    teams: db.getTeams(),
    members: db.getTeamMembers(),
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

    const members = db.getTeamMembers();
    const leader = members.find((m) => m.id === leaderId) || members[0];

    const newPod = db.addTeam({
      name: name.trim(),
      focusArea: focusArea?.trim() || "Multi-disciplinary Design & Engineering",
      leaderId: leader ? leader.id : "user-1",
      leaderName: leader ? leader.name : "Paks",
      leaderRole: leader ? leader.roleTitle : "Studio Director",
      memberIds: leader ? [leader.id] : [],
      color,
      activeProjectsCount: 1,
    });

    return NextResponse.json({ ok: true, team: newPod }, { status: 201 });
  }

  if (action === "add_member") {
    const { name, roleTitle, email, teamId, permission = "Specialist" } = payload as {
      name?: string;
      roleTitle?: string;
      email?: string;
      teamId?: string;
      permission?: TeamMemberUser["permission"];
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
    });

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
    const member = db.getTeamMembers().find((m) => m.id === leaderId);
    if (!member) {
      return NextResponse.json({ ok: false, error: "Leader member not found" }, { status: 404 });
    }

    const pod = db.updateTeam(id, {
      leaderId: member.id,
      leaderName: member.name,
      leaderRole: member.roleTitle,
    });

    if (!pod) return NextResponse.json({ ok: false, error: "Pod not found" }, { status: 404 });

    db.updateTeamMember(member.id, {
      teamId: pod.id,
      teamName: pod.name,
      isLeader: true,
    });

    return NextResponse.json({ ok: true, team: pod });
  }

  if (action === "update_team") {
    const pod = db.updateTeam(id, updates as Partial<TeamPod>);
    if (!pod) return NextResponse.json({ ok: false, error: "Pod not found" }, { status: 404 });
    return NextResponse.json({ ok: true, team: pod });
  }

  if (action === "update_member") {
    const member = db.updateTeamMember(id, updates as Partial<TeamMemberUser>);
    if (!member) return NextResponse.json({ ok: false, error: "Member not found" }, { status: 404 });
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
    return NextResponse.json({ ok: success });
  }

  if (type === "member") {
    const success = db.deleteTeamMember(id);
    return NextResponse.json({ ok: success });
  }

  return NextResponse.json({ ok: false, error: "Invalid delete type" }, { status: 400 });
}
