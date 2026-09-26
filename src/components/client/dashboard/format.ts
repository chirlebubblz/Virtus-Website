// Formatting helpers for the client dashboard. Date-only values (YYYY-MM-DD) are handled in UTC so they never shift a
// day in the Americas.

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(DATE_ONLY.test(value) ? `${value}T00:00:00Z` : value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dateLabel(value?: string | null, style: "short" | "long" = "short"): string {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: style === "long" ? "long" : "short",
    day: "numeric",
    ...(value && DATE_ONLY.test(value) ? { timeZone: "UTC" } : {}),
  });
}

/** Month abbreviation and day number for a date block. */
export function dateParts(value?: string | null): { month: string; day: string } {
  const d = toDate(value);
  if (!d) return { month: "—", day: "" };
  const opts = value && DATE_ONLY.test(value) ? ({ timeZone: "UTC" } as const) : {};
  return {
    month: d.toLocaleDateString("en-US", { month: "short", ...opts }),
    day: d.toLocaleDateString("en-US", { day: "numeric", ...opts }),
  };
}

/** Today as YYYY-MM-DD in the viewer's time zone, comparable with date-only strings. */
export function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Whole days from today until a date-only value. Negative when it has passed. Null when unparseable. */
export function daysUntil(value: string | null | undefined, today: string): number | null {
  const target = toDate(value);
  if (!target || !today) return null;
  const [y, m, d] = today.split("-").map(Number);
  return Math.round((target.getTime() - Date.UTC(y, m - 1, d)) / 86_400_000);
}

/** Greeting for a local hour. Neutral until the hour is known, so it matches on the server. */
export function greeting(hour: number | null): string {
  if (hour === null) return "Welcome back";
  return hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/**
 * Name to greet. A distinct contact person gets their first name. When the contact is just the account name, or the
 * first word is a title, use what makes sense instead of clipping a company name to its first word.
 */
export function greetingName(contactName: string, accountName: string): string {
  const contact = contactName.trim();
  if (!contact) return accountName.trim() || "there";
  if (contact.toLowerCase() === accountName.trim().toLowerCase()) return contact;
  const stripped = contact.replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, "");
  return stripped.split(/\s+/)[0] || contact;
}

export function timeAgo(from: number, now: number): string {
  const s = Math.max(0, Math.round((now - from) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

// Only https links and same-origin paths are safe to open from portal data.
export const isOpenableUrl = (url: string) => /^https:\/\//i.test(url) || (url.startsWith("/") && !url.startsWith("//"));
export const isHttps = (url: string) => /^https:\/\//i.test(url);

export type InvoiceState = "paid" | "overdue" | "soon" | "pending";

export function invoiceState(status: string, dueDate: string, today: string): InvoiceState {
  if (status === "Paid") return "paid";
  const days = daysUntil(dueDate, today);
  if (status === "Overdue" || (days !== null && days < 0)) return "overdue";
  if (days !== null && days <= 7) return "soon";
  return "pending";
}
