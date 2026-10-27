/**
 * Where to go after sign-in or sign-up, for links that need an account (deal links, invitations).
 * Only Insight paths of known shapes are accepted, so this can never become an open redirect.
 * Storage can be unavailable (private mode): every access is guarded.
 */
const KEY = "insight.returnTo";
const ALLOWED = /^\/(d\/[a-z0-9]{8,16}(\?start=1)?|invite\/[A-Za-z0-9_-]{8,80})$/;

export function isSafeReturnTo(path: string | null | undefined): path is string {
  return !!path && ALLOWED.test(path);
}
export function setReturnTo(path: string) {
  if (!isSafeReturnTo(path)) return;
  try { window.localStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() })); } catch { /* storage unavailable */ }
}
/** Reads and clears the saved path; older than 2 hours is ignored. */
export function takeReturnTo(): string | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    window.localStorage.removeItem(KEY);
    if (!raw) return null;
    const { path, at } = JSON.parse(raw) as { path?: string; at?: number };
    return isSafeReturnTo(path) && typeof at === "number" && Date.now() - at < 2 * 3600_000 ? path : null;
  } catch { return null; }
}
