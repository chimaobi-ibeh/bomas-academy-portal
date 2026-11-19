/**
 * Remembers the latest application on this device, so a parent who returns from the payment
 * page (or closes the tab mid-payment) can carry on. Holds the reference and access token only.
 */
const KEY = "bomas-admission-pending-v1";
const MAX_AGE_MS = 30 * 24 * 3600 * 1000;

export type PendingApplication = { reference: string; token: string; savedAt: number };

export function savePending(p: { reference: string; token: string }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...p, savedAt: Date.now() }));
  } catch {
    /* storage blocked: the email link still works */
  }
}

export function loadPending(reference?: string): PendingApplication | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "null") as PendingApplication | null;
    if (!p || Date.now() - p.savedAt > MAX_AGE_MS) return null;
    if (reference && p.reference !== reference) return null;
    return p;
  } catch {
    return null;
  }
}

export function clearPending() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Reads "t=..." from the URL fragment. */
export function tokenFromHash() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.hash.replace(/^#/, "")).get("t") ?? "";
}
