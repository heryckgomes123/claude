/**
 * In-memory router for the single-file build. The artifact frame only lets a bare
 * `#token` through, so the hash mirrors the first path segment and the rest of the
 * URL (id, query) lives here.
 */
type Listener = () => void;

const ROUTES = new Set(["today", "inbox", "tasks", "projects", "calendar", "notes", "creator", "clients", "finance", "goals", "analytics", "aiva", "settings", "more", "onboarding"]);

function initial(): string {
  try {
    const token = window.location.hash.replace(/^#/, "");
    if (ROUTES.has(token)) return `/${token}`;
  } catch {
    /* no location access */
  }
  return "/today";
}

const state = { href: initial(), key: 0 };
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

function mirrorHash(href: string) {
  const token = href.split(/[/?]/)[1] ?? "today";
  try {
    if (ROUTES.has(token) && window.location.hash !== `#${token}`) window.history.replaceState(null, "", `#${token}`);
  } catch {
    /* the frame may refuse history access */
  }
}

export const router = {
  get href() {
    return state.href;
  },
  get key() {
    return state.key;
  },
  get path() {
    return state.href.split("?")[0] || "/today";
  },
  get search() {
    return new URLSearchParams(state.href.split("?")[1] ?? "");
  },
  /** Navigate: remounts the view. */
  navigate(href: string) {
    if (href === "/" || href === "/login" || href === "/signup") href = "/today";
    state.href = href;
    state.key++;
    mirrorHash(href);
    emit();
    window.scrollTo({ top: 0 });
  },
  /** Rewrite the current URL without remounting (consumed params, tab changes). */
  replace(href: string) {
    state.href = href;
    mirrorHash(href);
    emit();
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
