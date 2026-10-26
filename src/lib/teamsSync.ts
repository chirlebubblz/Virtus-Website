import { db } from "@/db";
import { getPersistedTeams, savePersistedTeams } from "@/lib/settingsStore";
import { listStaff } from "@/lib/staffStore";

/**
 * Safeguard: filter out dummy seed characters (Paks, Kai, Ren, Sora, Milo, Nadia)
 * across app_settings and in-memory DB so they never leak into the roster.
 */
export const DUMMY_IDS = new Set(["user-1", "user-2", "user-3", "user-4", "user-5", "user-6", "user-paks"]);
export const DUMMY_NAMES = new Set(["paks", "kai", "ren", "sora", "milo", "nadia"]);
export const DUMMY_EMAILS = new Set([
  "paks@thevirtuslabs.com",
  "kai@thevirtuslabs.com",
  "ren@thevirtuslabs.com",
  "sora@thevirtuslabs.com",
  "milo@thevirtuslabs.com",
  "nadia@thevirtuslabs.com",
]);

export function isDummySeedMember(m: { id?: string; email?: string; name?: string }): boolean {
  if (m.id && DUMMY_IDS.has(m.id)) return true;
  if (m.email && DUMMY_EMAILS.has(m.email.toLowerCase())) return true;
  if (m.name && DUMMY_NAMES.has(m.name.trim().toLowerCase())) return true;
  return false;
}

/**
 * Ensures team pods and members are synchronized between:
 * 1. Neon DB app_settings (teamPods, teamMembers)
 * 2. Neon DB staff_users (all registered accounts like JordanS)
 * 3. In-memory db state
 *
 * PRESERVES ALL custom fields:
 * - username, avatar, avatarUrl, bio, skills, portfolioUrl, portfolioCollection
 * - roleTitle, teamId, teamName, isLeader, permission
 * across serverless cold starts, git pushes, and Vercel redeployments!
 */
export async function hydrateTeamsAndMembersFromNeon(): Promise<void> {
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
      // Purge dummy seed characters from persisted members while keeping all custom data
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
            id: staff.id,
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
          addedOrUpdated = true;
        } else {
          // CRITICAL: Preserve all custom profile details (bio, skills, portfolioUrl, portfolioCollection, avatar, username, teamId)
          let memberUpdated = false;
          if (existing.status !== "Active") {
            existing.status = "Active";
            memberUpdated = true;
          }
          if (staff.name && existing.name !== staff.name) {
            existing.name = staff.name;
            memberUpdated = true;
          }
          if (staff.email && existing.email.toLowerCase() !== staff.email.toLowerCase()) {
            existing.email = staff.email.toLowerCase();
            memberUpdated = true;
          }
          if (staff.memberLabel && !existing.username) {
            existing.username = staff.memberLabel.replace(/^@/, "");
            memberUpdated = true;
          }
          if (memberUpdated) {
            db.updateTeamMember(existing.id, existing);
            addedOrUpdated = true;
          }
        }
      }

      // Step 3: Bidirectionally ensure pod memberIds include all assigned members
      const allPods = db.getTeams();
      const allMembers = db.getTeamMembers();
      for (const member of allMembers) {
        if (member.teamId) {
          const pod = allPods.find((p) => p.id === member.teamId);
          if (pod) {
            if (!pod.memberIds) pod.memberIds = [];
            if (!pod.memberIds.includes(member.id)) {
              pod.memberIds.push(member.id);
              needsPersistence = true;
            }
            if (member.teamName !== pod.name) {
              member.teamName = pod.name;
              needsPersistence = true;
            }
          }
        }
      }

      for (const pod of allPods) {
        if (pod.memberIds) {
          const validIds = pod.memberIds.filter((mId) => allMembers.some((m) => m.id === mId));
          if (validIds.length !== pod.memberIds.length) {
            pod.memberIds = validIds;
            needsPersistence = true;
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
    console.warn("hydrateTeamsAndMembersFromNeon warning:", err);
  }
}
