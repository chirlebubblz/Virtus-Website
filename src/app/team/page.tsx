import { redirect } from "next/navigation";
import { StaffPortal } from "@/components/dashboard/StaffPortal";
import { getStaff } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Team Workspace · The Virtus Labs",
  robots: { index: false, follow: false },
};

export default async function TeamPage() {
  // Middleware checks the cookie signature; this re-checks the account so disabled or signed-out staff are stopped.
  const staff = await getStaff(["admin", "team"]);
  if (!staff) redirect("/staff/login?next=/team");
  // Separate workspaces: admins use /admin, never the team floor.
  if (staff.role === "admin") redirect("/admin");

  return (
    <StaffPortal
      staff={{ name: staff.name, email: staff.email, role: staff.role, memberLabel: staff.memberLabel }}
    />
  );
}
