import { NextResponse } from "next/server";
import { getStaff } from "@/lib/staffAuth";
import { StoreUnavailableError, listAudit, listStaff, toSummary } from "@/lib/staffStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getStaff(["admin"]);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const [users, audit] = await Promise.all([listStaff(), listAudit(50)]);
    return NextResponse.json({ ok: true, data: { users: users.map(toSummary), audit, currentId: admin.id } });
  } catch (err) {
    if (err instanceof StoreUnavailableError) return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
    throw err;
  }
}
