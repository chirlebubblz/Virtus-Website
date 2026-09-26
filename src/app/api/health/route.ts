import { NextResponse } from "next/server";
import { isNeonConfigured, getNeonSql } from "@/lib/neon";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  let neonStatus: {
    status: string;
    latencyMs?: number;
  } = { status: "not_configured" };

  if (isNeonConfigured()) {
    try {
      const sql = getNeonSql();
      if (sql) {
        const pingStart = Date.now();
        await sql`SELECT 1 as ping`;
        neonStatus = {
          status: "connected",
          latencyMs: Date.now() - pingStart,
        };
      }
    } catch (err: unknown) {
      console.error("GET /api/health database error:", err);
      neonStatus = { status: "error" };
    }
  } else {
    neonStatus = {
      status: "fallback_local",
    };
  }

  return NextResponse.json(
    {
      status: neonStatus.status === "error" ? "degraded" : "healthy",
      service: "virtus-agency-os",
      timestamp: new Date().toISOString(),
      database: { status: neonStatus.status, ...(neonStatus.latencyMs !== undefined ? { latencyMs: neonStatus.latencyMs } : {}) },
      responseTimeMs: Date.now() - startTime,
    },
    { status: 200 }
  );
}
