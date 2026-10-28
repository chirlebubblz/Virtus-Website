export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "api",
  "admin",
  "app",
  "thevirtuslabs",
  "mail",
  "media",
  "billing",
  "dashboard",
  "portal",
  "assets",
  "static",
  "portfolios",
  "client",
  "clients",
  "track",
  "help",
  "support",
  "status",
  "team",
  "staff",
  "auth",
  "login",
  "register",
]);

export const SUBDOMAIN_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

export function validateSubdomain(input: string): { valid: boolean; error?: string; clean: string } {
  if (!input || typeof input !== "string") {
    return { valid: false, error: "Subdomain is required.", clean: "" };
  }
  const clean = input.trim().toLowerCase();
  if (clean.length < 3 || clean.length > 30) {
    return { valid: false, error: "Subdomain must be between 3 and 30 characters.", clean };
  }
  if (!SUBDOMAIN_REGEX.test(clean)) {
    return {
      valid: false,
      error: "Subdomain may only contain lowercase letters, numbers, and hyphens (cannot start or end with a hyphen).",
      clean,
    };
  }
  if (RESERVED_SUBDOMAINS.has(clean)) {
    return { valid: false, error: `The subdomain "${clean}" is reserved by the system.`, clean };
  }
  return { valid: true, clean };
}
