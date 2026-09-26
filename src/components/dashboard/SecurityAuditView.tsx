"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@/components/icons/Icon";
import { Skeleton, SkeletonRows } from "./Skeleton";

interface DbStatus {
  configured?: boolean;
  success?: boolean;
  status?: string;
  message?: string;
  latencyMs?: number;
  tables?: string[];
}

export const SecurityAuditView: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [testingDb, setTestingDb] = useState(false);
  const [migratingDb, setMigratingDb] = useState(false);

  const fetchDbStatus = async () => {
    try {
      const res = await fetch("/api/db/init");
      const data = await res.json();
      setDbStatus(data);
    } catch {
      setDbStatus({ configured: false, status: "Error", message: "Could not reach the server." });
    }
  };

  useEffect(() => {
    fetchDbStatus();
  }, []);

  const handleTestDb = async () => {
    setTestingDb(true);
    await fetchDbStatus();
    setTestingDb(false);
  };

  const handleMigrateDb = async () => {
    setMigratingDb(true);
    try {
      const res = await fetch("/api/db/init", { method: "POST" });
      const data = await res.json();
      setDbStatus(data);
      setNotice(data.message || (data.success ? "Schema is ready." : "Migration finished."));
    } catch {
      setNotice("Migration failed. Could not reach the server.");
    } finally {
      setMigratingDb(false);
    }
  };

  // Real staff audit trail: sign-ins, registrations, role changes and access removals.
  const [auditEvents, setAuditEvents] = useState<{ id: string; actor: string; action: string; target: string; at: string }[]>([]);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(true);

  useEffect(() => {
    fetch("/api/staff/users")
      .then((r) => r.json())
      .then((body) => (body?.ok ? setAuditEvents(body.data.audit) : setAuditError(body?.error ?? "Could not load the audit trail.")))
      .catch(() => setAuditError("Could not load the audit trail."))
      .finally(() => setAuditLoading(false));
  }, []);

  const actionLabel = (action: string) => action.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-white font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#262626] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-400">
              Operations OS · Security and access
            </span>
          </div>
          <h1 className="font-monument text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 uppercase">
            Security & Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Staff sign-ins, registrations, role changes and database connection status.
          </p>
        </div>
      </div>

      {/* Neon Cloud Database Status & DDL Migrations */}
      <div className="bg-[#111111] border border-[#262626] rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262626] pb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-monument font-bold text-sm uppercase tracking-wider text-white">
              Neon PostgreSQL Serverless Connection & Schema
            </h3>
          </div>
          <span className="font-mono text-[0.7rem] bg-[#161616] border border-[#262626] px-2 py-1 rounded text-gray-400 font-bold">
            Core tables: clients, pipeline, accounting, bookings, contracts
          </span>
        </div>

        <p className="text-xs text-gray-400">
          Connects to Neon PostgreSQL serverless cluster when DATABASE_URL is configured.
        </p>

        {notice && (
          <p role="status" className="border border-[#FBD227]/40 bg-[#FBD227]/10 p-3 font-mono text-xs text-[#FBD227] rounded">
            {notice}
          </p>
        )}

        {!dbStatus && <Skeleton className="h-16 w-full" />}
        {dbStatus && (
          <div className={`p-4 rounded border font-mono text-xs ${dbStatus.configured ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-amber-950/30 border-amber-500/30 text-amber-300'}`}>
            <div className="flex items-center justify-between font-bold mb-1">
              <span>{dbStatus.configured ? (
                <><Icon name="check-circle" className="mr-1.5 inline h-4 w-4 align-[-0.2em] text-emerald-400" />Neon PostgreSQL connected</>
              ) : (
                <><Icon name="alert" className="mr-1.5 inline h-4 w-4 align-[-0.2em] text-amber-400" />Local storage bridge active</>
              )}</span>
              <span className="text-[#FBD227]">{dbStatus.latencyMs !== undefined ? `${dbStatus.latencyMs}ms latency` : ''}</span>
            </div>
            <p className="text-[0.75rem] opacity-90">{dbStatus.message}</p>
            {dbStatus.tables && dbStatus.tables.length > 0 && (
              <div className="mt-2 pt-2 border-t border-emerald-500/20 flex flex-wrap gap-1.5">
                <span className="text-[0.68rem] font-bold text-gray-400 mr-1">Verified Tables:</span>
                {dbStatus.tables.map((tbl: string) => (
                  <span key={tbl} className="bg-[#161616] px-2 py-0.5 rounded text-[0.68rem] border border-[#262626] text-gray-300">
                    {tbl}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            disabled={testingDb}
            onClick={handleTestDb}
            className="border border-[#FBD227] bg-[#FBD227] text-black px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider rounded hover:bg-white hover:border-white transition-colors disabled:opacity-50"
          >
            {testingDb ? "Pinging Neon..." : <><Icon name="bolt" className="mr-1.5 inline h-4 w-4 align-[-0.2em]" />Ping connection</>}
          </button>
          <button
            type="button"
            disabled={migratingDb}
            onClick={handleMigrateDb}
            className="border border-[#333333] bg-[#1C1C1C] text-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider rounded hover:bg-[#262626] transition-colors disabled:opacity-50"
          >
            {migratingDb ? "Migrating Schema..." : <><Icon name="database" className="mr-1.5 inline h-4 w-4 align-[-0.2em]" />Initialize schema</>}
          </button>
          <span className="text-[0.68rem] text-gray-500 font-mono">
            Direct endpoint: <code className="bg-[#1C1C1C] px-1 py-0.5 rounded text-gray-300">/api/db/init</code>
          </span>
        </div>
      </div>

      {/* Staff audit trail */}
      <div className="bg-[#111111] border border-[#262626] rounded-lg shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#262626] bg-[#161616] flex items-center justify-between">
          <h3 className="font-monument font-bold text-xs uppercase tracking-wider text-white">
            Staff Audit Trail
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-[#262626] text-gray-400 text-[0.68rem] uppercase bg-[#141414]">
                <th className="py-2.5 px-4">Event</th>
                <th className="py-2.5 px-4">Actor</th>
                <th className="py-2.5 px-4">Target</th>
                <th className="py-2.5 px-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F1F]">
              {auditLoading && <SkeletonRows rows={4} cols={4} />}
              {!auditLoading && auditEvents.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 px-4 text-center font-bold text-gray-400">
                    {auditError ?? "No staff activity recorded yet."}
                  </td>
                </tr>
              )}
              {auditEvents.map((row) => (
                <tr key={row.id} className="hover:bg-[#161616] transition-colors">
                  <td className="py-3 px-4 font-bold text-white">{actionLabel(row.action)}</td>
                  <td className="py-3 px-4 text-gray-300">{row.actor}</td>
                  <td className="py-3 px-4 text-gray-400">{row.target}</td>
                  <td className="py-3 px-4 text-right text-gray-400">{new Date(row.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
