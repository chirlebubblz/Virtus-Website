import { AuthShell } from "@/components/client/AuthShell";
import { redirect } from "next/navigation";
import { ClientLoginForm } from "@/components/client/ClientLoginForm";
import { getClientSessionId } from "@/lib/clientSession";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Client Login · The Virtus Labs",
  description: "Log in to your Virtus Labs client dashboard.",
  robots: { index: false, follow: false },
};

export default async function ClientLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string | string[] }>;
}) {
  // Already signed in: skip the form.
  if (await getClientSessionId()) redirect("/client");

  const params = await searchParams;
  const raw = Array.isArray(params.reason) ? params.reason[0] : params.reason;
  const reason = raw === "link" || raw === "expired" || raw === "unavailable" ? raw : undefined;

  return (
    <AuthShell footerLabel="The Virtus Labs · Client login">
      <ClientLoginForm reason={reason} />
    </AuthShell>
  );
}
