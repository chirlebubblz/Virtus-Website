import { NextResponse } from "next/server";

export const badRequest = (error: string, field?: string) =>
  NextResponse.json({ ok: false, error, ...(field ? { field } : {}) }, { status: 400 });

export const serverError = (label: string, err: unknown) => {
  console.error(`${label}:`, err);
  return NextResponse.json({ ok: false, error: "Something went wrong. Try again." }, { status: 500 });
};

export const unavailable = (label: string, err: unknown) => {
  console.error(`${label}:`, err);
  return NextResponse.json({ ok: false, error: "The database is unavailable. Try again shortly." }, { status: 503 });
};

/** Parses a JSON object body. Returns null for invalid JSON, null, arrays and primitives. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await request.json();
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function str(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;
}

/** Finite, non-negative number, or null. Accepts numeric strings; rejects empty input. */
export function money(value: unknown): number | null {
  if (typeof value === "string" && value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 1e9 ? Math.round(n * 100) / 100 : null;
}

export function dateOnly(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? null : value;
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
