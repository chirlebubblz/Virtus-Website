import { PortalUnavailableError, findClientByToken, getClientPortalData } from "@/lib/clientPortal";
import { PORTAL_TOKEN_PATTERN } from "@/lib/tokens";

export interface TrackData {
  clientName: string;
  contactName: string;
  company: string;
  invoice: { invoiceNumber: string; amount: number; paidAt?: string } | null;
  project: { title: string; phase: string } | null;
}

export type TrackResult =
  | { ok: true; data: TrackData }
  | { ok: false; reason: "invalid" | "not_found" | "unavailable" };

/** Returns only fields safe to show a client. Never returns email, revenue, or other clients. */
export async function getTrackData(token: string | undefined): Promise<TrackResult> {
  if (!token || !PORTAL_TOKEN_PATTERN.test(token)) return { ok: false, reason: "invalid" };

  const client = await findClientByToken(token);
  if (!client) return { ok: false, reason: "not_found" };

  let portal;
  try {
    portal = await getClientPortalData(client.id);
  } catch (err) {
    if (err instanceof PortalUnavailableError) return { ok: false, reason: "unavailable" };
    throw err;
  }
  if (!portal) return { ok: false, reason: "not_found" };

  const paid = portal.invoices
    .filter((i) => i.status === "Paid")
    .sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? ""))[0];

  return {
    ok: true,
    data: {
      clientName: client.name,
      contactName: portal.client.contactName,
      company: client.company,
      invoice: paid ? { invoiceNumber: paid.invoiceNumber, amount: paid.amount, paidAt: paid.paidAt } : null,
      project: portal.project ? { title: portal.project.title, phase: portal.project.phase } : null,
    },
  };
}
