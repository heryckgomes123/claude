/**
 * Browser URL access in one place, so the UI never touches window.location directly.
 * (The standalone single-file build swaps this module for an in-memory router.)
 */
export function currentSearch(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

/** Rewrite the address bar without navigating (drops consumed params). */
export function replaceUrl(url: string) {
  window.history.replaceState(null, "", url);
}

/** True in the single-file build that runs inside the claude.ai artifact viewer. */
export function isEmbedded() {
  return typeof window !== "undefined" && Boolean((window as unknown as { __AIVA_EMBED?: boolean }).__AIVA_EMBED);
}

export function currentHref() {
  return window.location.pathname + window.location.search;
}
