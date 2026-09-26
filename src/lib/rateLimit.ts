// In-memory failed-attempt limiter. Per server instance; see plan notes for the serverless caveat.

interface Bucket {
  count: number;
  resetAt: number;
}

const globalForLimit = globalThis as unknown as { __rateBuckets?: Map<string, Bucket> };
const buckets = globalForLimit.__rateBuckets ?? (globalForLimit.__rateBuckets = new Map<string, Bucket>());

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_BUCKETS = 5000;

/**
 * Caller IP. Prefers headers the platform sets itself (Vercel), then the last
 * x-forwarded-for hop, which the nearest proxy appends. The first hop is
 * client-controlled and must not be trusted.
 */
export function clientIp(request: Request): string {
  const platform = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-real-ip");
  if (platform) return platform.split(",")[0].trim();
  const forwarded = request.headers.get("x-forwarded-for");
  const hops = forwarded?.split(",").map((h) => h.trim()).filter(Boolean) ?? [];
  return hops[hops.length - 1] ?? "unknown";
}

function live(key: string): Bucket | undefined {
  const bucket = buckets.get(key);
  if (bucket && bucket.resetAt <= Date.now()) {
    buckets.delete(key);
    return undefined;
  }
  return bucket;
}

export function isBlocked(key: string, max: number = LOGIN_MAX_FAILURES): boolean {
  return (live(key)?.count ?? 0) >= max;
}

export function recordFailure(key: string, windowMs: number = LOGIN_WINDOW_MS): void {
  const bucket = live(key);
  if (bucket) {
    bucket.count += 1;
    return;
  }
  if (buckets.size >= MAX_BUCKETS) {
    // Drop the oldest entries only. Clearing everything would let an attacker flush every lockout.
    const drop = Math.ceil(MAX_BUCKETS / 10);
    let i = 0;
    for (const k of buckets.keys()) {
      buckets.delete(k);
      if (++i >= drop) break;
    }
  }
  buckets.set(key, { count: 1, resetAt: Date.now() + windowMs });
}

export function clearFailures(key: string): void {
  buckets.delete(key);
}
