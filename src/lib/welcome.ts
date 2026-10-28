/** The four-step welcome story is shown once after the first sign-in (founder, 28 Oct 2026). Per browser only: a convenience. */
export const WELCOME_KEY = "insight-welcome-v1";
export function welcomeSeen() { try { return localStorage.getItem(WELCOME_KEY) === "1"; } catch { return true; } }
export function markWelcomeSeen() { try { localStorage.setItem(WELCOME_KEY, "1"); } catch { /* storage unavailable */ } }
