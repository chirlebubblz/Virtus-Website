import { redirect } from "next/navigation";
import { getStaff } from "@/lib/staffAuth";
import { PortfolioManager } from "@/components/portfolio/PortfolioManager";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Team Portfolio Hosting · The Virtus Labs",
  robots: { index: false, follow: false },
};

export default async function StaffPortfolioPage() {
  const staff = await getStaff(["admin", "team"]);
  if (!staff) {
    redirect("/staff/login?next=/staff/portfolio");
  }

  const homeUrl = staff.role === "admin" ? "/admin" : "/team";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            href={homeUrl}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Operations OS ({staff.role === "admin" ? "Admin" : "Team"})</span>
          </Link>
          <div className="text-xs text-slate-500 font-mono">Signed in as {staff.email}</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <PortfolioManager staff={{ name: staff.name, email: staff.email, role: staff.role }} />
      </main>
    </div>
  );
}
