const KEY = "vl_lead_seen";
const QUIET_MS = 7 * 24 * 60 * 60 * 1000;

/** True while the visitor is inside the quiet period after closing or submitting a lead form. */
export function leadPopupSuppressed(): boolean {
  try {
    const at = Number(window.localStorage.getItem(KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < QUIET_MS;
  } catch {
    return false;
  }
}

export function markLeadSeen(): void {
  try {
    window.localStorage.setItem(KEY, String(Date.now()));
  } catch {
    // Storage can throw in private windows. The popup then just may show again.
  }
}
