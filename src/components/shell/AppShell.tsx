"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AivaContext, createAivaStore, useAiva } from "@/store/aiva";
import type { Me, Snapshot } from "@/lib/types";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { CaptureSheet } from "./CaptureSheet";
import { VoiceOverlay } from "./VoiceOverlay";
import { SearchPalette } from "./SearchPalette";
import { NotificationsSheet } from "./NotificationsSheet";
import { Toaster } from "./Toaster";
import { DetailHost } from "@/components/detail/DetailHost";
import { useClientValue } from "@/hooks/use-client-value";
import { Skeleton } from "@/components/ui";

export function AppShell({ me, data, children }: { me: Me; data: Snapshot; children: ReactNode }) {
  // One store per mounted shell, seeded with server data (pages paint instantly, no loading flash).
  const [store] = useState(() => createAivaStore(me, data));
  return (
    <AivaContext.Provider value={store}>
      <Shell>{children}</Shell>
    </AivaContext.Provider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const sync = useAiva((s) => s.sync);
  const setUI = useAiva((s) => s.setUI);
  const notifications = useAiva((s) => s.data?.notifications);
  const seen = useRef<Set<string> | null>(null);

  // Keep data fresh: on mount, on focus and every minute.
  useEffect(() => {
    sync();
    const onVisible = () => document.visibilityState === "visible" && sync();
    document.addEventListener("visibilitychange", onVisible);
    const id = setInterval(() => document.visibilityState === "visible" && sync(), 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(id);
    };
  }, [sync]);

  // Service worker (production only — avoids stale caches during development).
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => null);
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("capture") === "1") setUI({ captureOpen: true, captureMode: "text" });
    if (params.get("voice") === "1") setUI({ voiceOpen: true });
  }, [setUI]);

  // Surface new smart notifications as system notifications (if the user allowed them).
  useEffect(() => {
    if (!notifications) return;
    if (!seen.current) {
      seen.current = new Set(notifications.map((n) => n.id));
      return;
    }
    const fresh = notifications.filter((n) => !n.readAt && !seen.current!.has(n.id));
    fresh.forEach((n) => seen.current!.add(n.id));
    if (!fresh.length || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    navigator.serviceWorker?.getRegistration().then((reg) => {
      for (const n of fresh.slice(0, 3)) {
        const opts = { body: n.body ?? undefined, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag: n.id, data: { href: n.href } };
        if (reg) reg.showNotification(n.title, opts);
        else new Notification(n.title, opts);
      }
    });
  }, [notifications]);

  // Keyboard shortcuts: ⌘K search · ⌘J voice · N capture.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea, select, [contenteditable=true]");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setUI({ searchOpen: true });
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setUI({ voiceOpen: true });
      } else if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setUI({ captureOpen: true, captureMode: "text" });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setUI]);

  // Every screen depends on the user's clock and timezone, which the server can't know:
  // render content only on the client (the data is already embedded, so this is instant).
  const hydrated = useClientValue(() => true, false);

  return (
    <div className="relative flex min-h-dvh">
      <Sidebar />
      <div className="min-w-0 flex-1">{hydrated ? children : <ShellSkeleton />}</div>
      <BottomNav />
      <CaptureSheet />
      <VoiceOverlay />
      <SearchPalette />
      <NotificationsSheet />
      <DetailHost />
      <Toaster />
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 px-safe pt-[calc(var(--safe-top)+24px)] lg:px-10 lg:pt-10" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-8 w-2/3 max-w-sm" />
      <Skeleton className="h-4 w-1/2 max-w-xs" />
      <Skeleton className="mt-4 h-40 w-full rounded-3xl" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
