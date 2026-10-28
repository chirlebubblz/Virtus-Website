import { NextResponse } from "next/server";
import { getStaff } from "@/lib/staffAuth";
import { deletePortfolioByStaffId, getPortfolioByStaffId } from "@/lib/portfolioStore";
import { deletePortfolioFiles } from "@/lib/portfolioStorage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const staff = await getStaff(["admin", "team"]);
    if (!staff) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const portfolio = await getPortfolioByStaffId(staff.id);
    return NextResponse.json({
      ok: true,
      portfolio,
      urls: portfolio
        ? {
            subdomainUrl: `https://${portfolio.subdomain}.thevirtuslabs.com`,
            directUrl: `https://thevirtuslabs.com/p/${portfolio.subdomain}`,
            localUrl: `/portfolios/${portfolio.subdomain}`,
          }
        : null,
    });
  } catch (error: unknown) {
    console.error("GET /api/portfolio/me error:", error);
    return NextResponse.json({ ok: false, error: "Failed to load portfolio" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const staff = await getStaff(["admin", "team"]);
    if (!staff) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const portfolio = await getPortfolioByStaffId(staff.id);
    if (!portfolio) {
      return NextResponse.json({ ok: false, error: "No portfolio found to delete" }, { status: 404 });
    }

    // Delete static files from storage
    await deletePortfolioFiles(portfolio.subdomain).catch((err) => {
      console.warn(`Warning: failed to delete some files for subdomain ${portfolio.subdomain}:`, err);
    });

    // Delete record from database
    await deletePortfolioByStaffId(staff.id);

    return NextResponse.json({ ok: true, message: "Portfolio successfully removed" });
  } catch (error: unknown) {
    console.error("DELETE /api/portfolio/me error:", error);
    return NextResponse.json({ ok: false, error: "Failed to delete portfolio" }, { status: 500 });
  }
}
