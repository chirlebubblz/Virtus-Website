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
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-[#000000]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-500">
              Operations OS · Security and access
            </span>
          </div>
          <h1 className="font-monument text-2xl sm:text-3xl font-black text-[#000000] tracking-tight mt-1 uppercase">
            Security & Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Staff sign-ins, registrations, role changes and database connection status.
          </p>
        </div>

      </div>

      {/* Neon Cloud Database Status & DDL Migrations */}
      <div className="bg-white border-2 border-black rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
          <div className="flex items-center gap-2">
            
            <h3 className="font-mono font-bold text-sm uppercase tracking-wider text-black">
              Neon PostgreSQL Serverless Connection & Schema
            </h3>
          </div>
          <span className="font-mono text-[0.7rem] bg-gray-100 border border-gray-300 px-2 py-1 rounded text-gray-700 font-bold">
            Core tables: clients, pipeline, accounting, bookings, contracts
          </span>
        </div>

        <p className="text-xs text-gray-600">
          Connects to Neon PostgreSQL when DATABASE_URL is set. Without it, the workspace runs on the local in-memory store and changes do not persist.
        </p>

        {notice && (
          <p role="status" className="border border-black bg-gray-50 p-3 font-mono text-xs text-black">
            {notice}
          </p>
        )}

        {!dbStatus && <Skeleton className="h-16 w-full" />}
        {dbStatus && (
          <div className={`p-4 rounded border font-mono text-xs ${dbStatus.configured ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-amber-50 border-amber-300 text-amber-950'}`}>
            <div className="flex items-center justify-between font-bold mb-1">
              <span>{dbStatus.configured ? (
                <><Icon name="check-circle" className="mr-1.5 inline h-4 w-4 align-[-0.2em]" />Neon PostgreSQL connected</>
              ) : (
                <><Icon name="alert" className="mr-1.5 inline h-4 w-4 align-[-0.2em]" />Local storage bridge active</>
              )}</span>
              <span>{dbStatus.latencyMs !== undefined ? `${dbStatus.latencyMs}ms latency` : ''}</span>
            </div>
            <p className="text-[0.75rem] opacity-90">{dbStatus.message}</p>
            {dbStatus.tables && dbStatus.tables.length > 0 && (
              <div className="mt-2 pt-2 border-t border-emerald-200 flex flex-wrap gap-1.5">
                <span className="text-[0.68rem] font-bold text-gray-500 mr-1">Verified Tables:</span>
                {dbStatus.tables.map((tbl: string) => (
                  <span key={tbl} className="bg-white px-2 py-0.5 rounded text-[0.68rem] border border-emerald-200 text-emerald-800">
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
            className="border border-black bg-black text-[#FBD227] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#FBD227] hover:text-black transition-colors disabled:opacity-50"
          >
            {testingDb ? "Pinging Neon..." : <><Icon name="bolt" className="mr-1.5 inline h-4 w-4 align-[-0.2em]" />Ping connection</>}
          </button>
          <button
            type="button"
            disabled={migratingDb}
            onClick={handleMigrateDb}
            className="border border-black bg-[#1C1C1C] text-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors disabled:opacity-50"
          >
            {migratingDb ? "Migrating Schema..." : <><Icon name="database" className="mr-1.5 inline h-4 w-4 align-[-0.2em]" />Initialize schema</>}
          </button>
          <span className="text-[0.68rem] text-gray-500 font-mono">
            Direct endpoint: <code className="bg-gray-100 px-1 py-0.5 rounded">/api/db/init</code>
          </span>
        </div>
      </div>

      {/* Staff audit trail */}
      <div className="bg-white border border-gray-300 rounded-lg shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-black">
            Staff Audit Trail
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 text-[0.68rem] uppercase">
                <th className="py-2.5 px-4">Event</th>
                <th className="py-2.5 px-4">Actor</th>
                <th className="py-2.5 px-4">Target</th>
                <th className="py-2.5 px-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {auditLoading && <SkeletonRows rows={4} cols={4} />}
              {!auditLoading && auditEvents.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 px-4 text-center font-bold text-gray-700">
                    {auditError ?? "No staff activity recorded yet."}
                  </td>
                </tr>
              )}
              {auditEvents.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-bold text-gray-900">{actionLabel(row.action)}</td>
                  <td className="py-3 px-4 text-gray-700">{row.actor}</td>
                  <td className="py-3 px-4 text-gray-700">{row.target}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{new Date(row.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
