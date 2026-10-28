/**
 * Programmatic Vercel Domain Provisioning
 *
 * Specific subdomains (e.g. `jordans.thevirtuslabs.com`) on Vercel do NOT require
 * ACME DNS-01 challenge TXT records when a wildcard CNAME (*.thevirtuslabs.com -> cname.vercel-dns.com)
 * is already in place. Adding the subdomain to the Vercel project triggers standard HTTP-01
 * validation and generates an SSL certificate within seconds.
 */

interface VercelDomainResult {
  ok: boolean;
  status?: number;
  message?: string;
  error?: string;
  data?: unknown;
}

function getVercelConfig() {
  const token = process.env.VERCEL_AUTH_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID || "virtuswebsite";
  const teamSlug = process.env.VERCEL_TEAM_SLUG || process.env.VERCEL_TEAM_ID || "jordanteam1";
  return { token, projectId, teamSlug };
}

function getTeamQueryParam(teamSlug?: string): string {
  if (!teamSlug) return "";
  const paramKey = teamSlug.startsWith("team_") ? "teamId" : "slug";
  return `${paramKey}=${encodeURIComponent(teamSlug)}`;
}

function formatDomain(subdomain: string): string {
  const clean = subdomain.trim().toLowerCase().replace(/\.thevirtuslabs\.com$/, "");
  return `${clean}.thevirtuslabs.com`;
}

/**
 * Adds a portfolio subdomain to the Vercel project to provision SSL certificate.
 */
export async function addVercelDomain(subdomain: string): Promise<VercelDomainResult> {
  const { token, projectId, teamSlug } = getVercelConfig();

  if (!token) {
    console.warn(
      "[vercelDomains] VERCEL_AUTH_TOKEN is not configured. Skipping automated Vercel domain provisioning."
    );
    return { ok: true, message: "Skipped: VERCEL_AUTH_TOKEN not set" };
  }

  const domain = formatDomain(subdomain);
  const teamParam = getTeamQueryParam(teamSlug);
  const url = `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains${
    teamParam ? `?${teamParam}` : ""
  }`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    });

    if (res.status === 200 || res.status === 201) {
      const data = await res.json().catch(() => ({}));
      console.info(`[vercelDomains] Successfully added domain ${domain} to Vercel project ${projectId}.`);
      return { ok: true, status: res.status, data };
    }

    if (res.status === 409) {
      console.info(`[vercelDomains] Domain ${domain} is already registered on Vercel project ${projectId}.`);
      return { ok: true, status: 409, message: "Domain already registered" };
    }

    const errorBody = await res.text().catch(() => "");
    console.warn(
      `[vercelDomains] Vercel returned status ${res.status} when adding domain ${domain}:`,
      errorBody
    );
    return {
      ok: false,
      status: res.status,
      error: errorBody || `HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[vercelDomains] Network error while adding domain ${domain}:`, msg);
    return { ok: false, error: msg };
  }
}

/**
 * Removes a portfolio subdomain from the Vercel project.
 */
export async function removeVercelDomain(subdomain: string): Promise<VercelDomainResult> {
  const { token, projectId, teamSlug } = getVercelConfig();

  if (!token) {
    console.warn(
      "[vercelDomains] VERCEL_AUTH_TOKEN is not configured. Skipping automated Vercel domain removal."
    );
    return { ok: true, message: "Skipped: VERCEL_AUTH_TOKEN not set" };
  }

  const domain = formatDomain(subdomain);
  const teamParam = getTeamQueryParam(teamSlug);
  const url = `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(
    domain
  )}${teamParam ? `?${teamParam}` : ""}`;

  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 200 || res.status === 204 || res.status === 404) {
      console.info(`[vercelDomains] Successfully removed domain ${domain} from Vercel project ${projectId}.`);
      return { ok: true, status: res.status };
    }

    const errorBody = await res.text().catch(() => "");
    console.warn(
      `[vercelDomains] Vercel returned status ${res.status} when removing domain ${domain}:`,
      errorBody
    );
    return {
      ok: false,
      status: res.status,
      error: errorBody || `HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[vercelDomains] Network error while removing domain ${domain}:`, msg);
    return { ok: false, error: msg };
  }
}
