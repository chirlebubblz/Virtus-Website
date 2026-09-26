import { NextResponse } from "next/server";
import { getStaff } from "@/lib/staffAuth";
import { StoreUnavailableError, addAudit, consumeInvite } from "@/lib/staffStore";

export const dynamic = "force-dynamic";

// Revokes a pending invite by marking it used, so the link stops working.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getStaff(["admin"]);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    if (!(await consumeInvite(id))) {
      return NextResponse.json({ ok: false, error: "That invite is already used or gone." }, { status: 404 });
    }
    await addAudit(admin.email, "invite_revoked", id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof StoreUnavailableError) return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
    console.error("DELETE /api/staff/invites/[id] error:", err);
    return NextResponse.json({ ok: false, error: "Something went wrong." }, { status: 500 });
  }
}
