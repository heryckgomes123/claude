"use client";

import { Bell, Search } from "lucide-react";
import type { ReactNode } from "react";
import { useAiva } from "@/store/aiva";
import { cn } from "@/lib/cn";

export function HeaderIcons({ className }: { className?: string }) {
  const setUI = useAiva((s) => s.setUI);
  const unread = useAiva((s) => s.data?.notifications.filter((n) => !n.readAt).length ?? 0);
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <button onClick={() => setUI({ searchOpen: true })} className="pressable grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-muted hover:text-ink lg:hidden" aria-label="Buscar">
        <Search className="h-[18px] w-[18px]" />
      </button>
      <button onClick={() => setUI({ notificationsOpen: true })} className="pressable relative grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-muted hover:text-ink" aria-label={`Notificações${unread ? ` (${unread} novas)` : ""}`}>
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && <span className="absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-pink px-1 text-[10px] font-semibold text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, className }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn("mb-5 flex items-end justify-between gap-3 pt-4 lg:mb-7 lg:pt-8", className)}>
      <div className="min-w-0">
        <h1 className="truncate text-[28px] font-semibold tracking-tight lg:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        <HeaderIcons />
      </div>
    </header>
  );
}

/** Page container: mobile gutters + space for the bottom nav; wider on desktop. */
export function Page({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return (
    <main
      className={cn(
        "relative z-[1] mx-auto w-full px-safe pt-[var(--safe-top)] pb-[calc(var(--nav-h)+var(--safe-bottom)+96px)] lg:px-10 lg:pb-16",
        wide ? "max-w-[1400px]" : "max-w-5xl",
        className,
      )}
    >
      {children}
    </main>
  );
}
