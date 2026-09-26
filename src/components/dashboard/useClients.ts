"use client";

import { useEffect, useMemo, useState } from "react";
import { db, toClientSummary, type ClientSummary } from "@/db";

/**
 * Clients for the forms that attach a record to one (invoices, contracts, proposals).
 * The server list is the source of truth. Anything in the local store is merged in so demo data still shows.
 */
export function useClients(): { clients: ClientSummary[]; loading: boolean } {
  const [remote, setRemote] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/clients")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!cancelled && body?.ok && Array.isArray(body.data)) setRemote(body.data);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const clients = useMemo(() => {
    const seen = new Set(remote.map((c) => c.id));
    return [...remote, ...db.getClients().map(toClientSummary).filter((c) => !seen.has(c.id))];
  }, [remote]);

  return { clients, loading };
}
