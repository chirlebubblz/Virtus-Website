"use client";

import { useEffect, useState } from "react";
import type { ClientSummary } from "@/db";

/**
 * Clients for the forms that attach a record to one (invoices, contracts, proposals).
 * Only the server list: the APIs reject any client that is not stored there.
 */
export function useClients(): { clients: ClientSummary[]; loading: boolean } {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/clients")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!cancelled && body?.ok && Array.isArray(body.data)) setClients(body.data);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return { clients, loading };
}
