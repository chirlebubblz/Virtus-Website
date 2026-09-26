import { redirect } from "next/navigation";
import { AuthShell } from "@/components/client/AuthShell";
import { StaffLoginForm } from "@/components/client/StaffLoginForm";
import { getStaff, homeFor } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Staff Login · The Virtus Labs",
  robots: { index: false, follow: false },
};

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const staff = await getStaff();
  if (staff) redirect(homeFor(staff.role));

  const params = await searchParams;
  const raw = Array.isArray(params.next) ? params.next[0] : params.next;
  // Only internal workspace paths are allowed as a post-login target.
  const next = raw === "/admin" || raw === "/team" ? raw : undefined;

  return (
    <AuthShell footerLabel="The Virtus Labs · Team access">
      <StaffLoginForm next={next} />
    </AuthShell>
  );
}
