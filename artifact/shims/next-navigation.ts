import { useSyncExternalStore } from "react";
import { router } from "../router";

const snapshot = () => router.href;

export function usePathname() {
  const href = useSyncExternalStore(router.subscribe, snapshot, snapshot);
  return href.split("?")[0];
}

export function useSearchParams() {
  const href = useSyncExternalStore(router.subscribe, snapshot, snapshot);
  return new URLSearchParams(href.split("?")[1] ?? "");
}

const refreshListeners = new Set<() => void>();
export function onRefresh(fn: () => void) {
  refreshListeners.add(fn);
  return () => refreshListeners.delete(fn);
}

const instance = {
  push: (href: string) => router.navigate(href),
  replace: (href: string) => router.navigate(href),
  back: () => router.navigate("/today"),
  refresh: () => refreshListeners.forEach((f) => f()),
  prefetch: () => {},
};

export function useRouter() {
  return instance;
}

export function redirect(href: string): never {
  router.navigate(href);
  throw new Error("redirect");
}
