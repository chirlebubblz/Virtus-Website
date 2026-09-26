import { redirect } from "next/navigation";
import { StaffPortal } from "@/components/dashboard/StaffPortal";
import { getStaff } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Workspace · The Virtus Labs",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  // Middleware checks the cookie signature; this re-checks the account so disabled or signed-out staff are stopped.
  const staff = await getStaff(["admin"]);
  if (!staff) redirect("/staff/login?next=/admin");

  return (
    <StaffPortal
      staff={{ name: staff.name, email: staff.email, role: staff.role, memberLabel: staff.memberLabel }}
    />
  );
}
