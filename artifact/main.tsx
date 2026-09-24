import { StrictMode, useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "@/components/shell/AppShell";
import { AivaMark } from "@/components/brand";
import { useAiva } from "@/store/aiva";
import { Calibration } from "@/app/onboarding/Calibration";
import { TodayView } from "@/app/(app)/today/TodayView";
import { InboxView } from "@/app/(app)/inbox/InboxView";
import { TasksView } from "@/app/(app)/tasks/TasksView";
import { ProjectsView } from "@/app/(app)/projects/ProjectsView";
import { ProjectDetail } from "@/app/(app)/projects/[id]/ProjectDetail";
import { CalendarView } from "@/app/(app)/calendar/CalendarView";
import { NotesView } from "@/app/(app)/notes/NotesView";
import { CreatorView } from "@/app/(app)/creator/CreatorView";
import { ClientsView } from "@/app/(app)/clients/ClientsView";
import { FinanceView } from "@/app/(app)/finance/FinanceView";
import { GoalsView } from "@/app/(app)/goals/GoalsView";
import { AnalyticsView } from "@/app/(app)/analytics/AnalyticsView";
import { AivaChat } from "@/app/(app)/aiva/AivaChat";
import { SettingsView } from "@/app/(app)/settings/SettingsView";
import { MoreView } from "@/app/(app)/more/MoreView";
import type { Me, Snapshot } from "@/lib/types";
import { router } from "./router";
import { onRefresh } from "./shims/next-navigation";
import { storage } from "./backend/storage";
import { snapshot } from "./backend/repo";

const VIEWS: Record<string, ComponentType> = {
  "/today": TodayView,
  "/inbox": InboxView,
  "/tasks": TasksView,
  "/projects": ProjectsView,
  "/calendar": CalendarView,
  "/notes": NotesView,
  "/creator": CreatorView,
  "/clients": ClientsView,
  "/finance": FinanceView,
  "/goals": GoalsView,
  "/analytics": AnalyticsView,
  "/aiva": AivaChat,
  "/settings": SettingsView,
  "/more": MoreView,
};

function useRouterHref() {
  return useSyncExternalStore(router.subscribe, () => router.href);
}

/** Pulls fresh data into the app store when another device changes something. */
function SyncBridge() {
  const sync = useAiva((s) => s.sync);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const off = storage.onRemoteChange(() => {
      if (t) clearTimeout(t);
      t = setTimeout(sync, 250);
    });
    return () => {
      off();
      if (t) clearTimeout(t);
    };
  }, [sync]);
  return null;
}

function View() {
  useRouterHref();
  const path = router.path;
  const project = /^\/projects\/([\w-]+)$/.exec(path);
  if (project) return <ProjectDetail id={project[1]} />;
  const V = VIEWS[path] ?? TodayView;
  return <V />;
}

function Splash() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5">
      <div className="grid h-24 w-24 animate-pop place-items-center rounded-[28px] border border-white/10 bg-[radial-gradient(120%_120%_at_20%_10%,#241a4d,#0e0b1f_55%,#07070c)] shadow-[0_20px_80px_-20px_rgb(139_92_255/0.8)]">
        <AivaMark size={62} />
      </div>
      <p className="text-sm tracking-[0.3em] text-muted">AIVA</p>
    </main>
  );
}

function Root() {
  const [ready, setReady] = useState(false);
  const [, setVersion] = useState(0);
  const href = useRouterHref();

  useEffect(() => {
    storage.init().finally(() => setReady(true));
    const bump = () => setVersion((v) => v + 1);
    const offRemote = storage.onRemoteChange(bump);
    const offRefresh = onRefresh(bump);
    return () => {
      offRemote();
      offRefresh();
    };
  }, []);

  if (!ready) return <Splash />;

  const settings = storage.settings;
  if (!settings.calibratedAt || href.startsWith("/onboarding")) {
    return <Calibration key={`cal-${router.key}`} initialName={settings.displayName ?? storage.viewerName} />;
  }

  const name = settings.displayName ?? "Você";
  const me: Me = {
    user: { id: "me", email: storage.mode === "cloud" ? "Sincronizado entre seus dispositivos" : "Salvo neste dispositivo", name, avatarColor: "#7c5cff" },
    workspace: { id: "local", name: `${name} · AIVA`, settings },
    ai: { provider: "local" },
  };
  return (
    <AppShell me={me} data={snapshot() as Snapshot}>
      <SyncBridge />
      <View key={router.key} />
    </AppShell>
  );
}

/* Plain <a href="/..."> links inside the app navigate in memory; the data export becomes a download. */
document.addEventListener("click", (e) => {
  const a = (e.target as HTMLElement | null)?.closest?.("a[href^='/']") as HTMLAnchorElement | null;
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  const href = a.getAttribute("href")!;
  if (href === "/api/export") {
    exportData();
    return;
  }
  router.navigate(href);
});

async function exportData() {
  const claude = (window as unknown as { claude?: { use(n: string): Promise<unknown> } }).claude;
  const downloads = (await claude?.use("downloads").catch(() => null)) as { save(r: { filename: string; data: string }): Promise<unknown> } | null;
  const data = JSON.stringify(storage.exportAll(), null, 2);
  if (downloads) {
    await downloads.save({ filename: `aiva-export-${new Date().toISOString().slice(0, 10)}.json`, data }).catch(() => null);
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
