import { AuthShell } from "@/components/client/AuthShell";
import { StaffResetForm } from "@/components/client/StaffResetForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reset Password · The Virtus Labs",
  robots: { index: false, follow: false },
};

export default function StaffResetPage() {
  return (
    <AuthShell footerLabel="The Virtus Labs · Team access">
      <StaffResetForm />
    </AuthShell>
  );
}
