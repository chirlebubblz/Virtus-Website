import { redirect } from "next/navigation";
import { AuthShell } from "@/components/client/AuthShell";
import { StaffRegisterForm } from "@/components/client/StaffRegisterForm";
import { getStaff, homeFor } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Join the Team · The Virtus Labs",
  robots: { index: false, follow: false },
};

export default async function StaffRegisterPage() {
  const staff = await getStaff();
  if (staff) redirect(homeFor(staff.role));

  return (
    <AuthShell footerLabel="The Virtus Labs · Team access">
      <StaffRegisterForm />
    </AuthShell>
  );
}
