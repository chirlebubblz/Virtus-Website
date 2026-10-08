// Sequential document numbers such as INV-2026-004. Generated on the server; a UNIQUE index on the column
// catches two saves racing for the same number, and the caller retries with the next one.

/** The next number after the highest `<prefix>NNN` in `existing`, e.g. nextNumber("INV-2026-", ["INV-2026-003"]). */
export function nextNumber(prefix: string, existing: string[]): string {
  let max = 0;
  for (const value of existing) {
    if (!value.startsWith(prefix)) continue;
    const n = Number(value.slice(prefix.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

/** Postgres unique_violation. */
export const isUniqueViolation = (err: unknown) => (err as { code?: string } | null)?.code === "23505";

/** How many times to retry an insert that lost a numbering race. */
export const NUMBER_ATTEMPTS = 3;

export const yearPrefix = (code: string) => `${code}-${new Date().getFullYear()}-`;
