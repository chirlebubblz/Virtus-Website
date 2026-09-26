import { NextResponse } from "next/server";
import { clientIp, isBlocked, recordFailure } from "@/lib/rateLimit";
import { hashSecret } from "@/lib/staffAuth";
import { StoreUnavailableError, findInvite } from "@/lib/staffStore";

export const dynamic = "force-dynamic";

// Lets the register page prefill and lock the email for a personal invite. Holder of the token only.
export async function POST(request: Request) {
  const ipKey = `staff-invite-info:${clientIp(request)}`;
  if (isBlocked(ipKey, 20)) return NextResponse.json({ ok: false }, { status: 429 });

  let invite: unknown;
  try {
    ({ invite } = await request.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (typeof invite !== "string" || !invite) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const found = await findInvite(await hashSecret(invite));
    if (!found || found.usedAt || new Date(found.expiresAt).getTime() <= Date.now()) {
      recordFailure(ipKey, 60 * 60 * 1000);
      return NextResponse.json({ ok: false }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: { email: found.email, role: found.role } });
  } catch (err) {
    if (err instanceof StoreUnavailableError) return NextResponse.json({ ok: false }, { status: 503 });
    throw err;
  }
}
