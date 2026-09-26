import { cookies } from "next/headers";
import { CLIENT_COOKIE, verifySession } from "@/lib/session";
import { isClientActive } from "@/lib/clientPortal";

/** Returns the signed-in client's id, or null. The id always comes from the cookie, never from the request. */
export async function getClientSessionId(): Promise<string | null> {
  const store = await cookies();
  const session = await verifySession(store.get(CLIENT_COOKIE)?.value, "client");
  if (!session) return null;
  return (await isClientActive(session.sub, session.tv)) ? session.sub : null;
}
