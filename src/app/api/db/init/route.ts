import { NextResponse } from "next/server";
import { isNeonConfigured, getNeonSql, initNeonSchema } from "@/lib/neon";
import { denyUnlessStaff } from "@/lib/staffAuth";

export async function GET() {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const configured = isNeonConfigured();

  if (!configured) {
    return NextResponse.json({
      configured: false,
      mode: "local_fallback",
      provider: "In-Memory / Local Storage Bridge",
      status: "Ready",
      message: "DATABASE_URL is not set in .env.local. The agency OS is running safely in local fallback mode.",
      latencyMs: 0,
    });
  }

  const sql = getNeonSql();
  if (!sql) {
    return NextResponse.json({
      configured: false,
      mode: "local_fallback",
      message: "Invalid PostgreSQL connection string.",
    }, { status: 400 });
  }

  try {
    const startTime = Date.now();
    const result = await sql`SELECT NOW() as current_time, current_database() as db_name`;
    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      configured: true,
      mode: "neon_cloud",
      provider: "Neon Serverless PostgreSQL",
      status: "Connected & Active",
      database: result[0]?.db_name,
      latencyMs,
      timestamp: result[0]?.current_time,
    });
  } catch (error: unknown) {
    console.error("GET /api/db/init error:", error);
    return NextResponse.json({
      configured: true,
      mode: "connection_error",
      provider: "Neon Serverless PostgreSQL",
      status: "Error",
      message: "Failed to connect to Neon PostgreSQL. Check the server logs.",
    }, { status: 500 });
  }
}

export async function POST() {
  const denied = await denyUnlessStaff(["admin"]);
  if (denied) return denied;

  const result = await initNeonSchema();
  return NextResponse.json(result);
}
