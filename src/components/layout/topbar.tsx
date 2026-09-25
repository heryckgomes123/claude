"use client";

import { Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { BrandLockup } from "./brand";
import { useApp } from "./app-context";
import { useCommandMenu } from "./command-menu";
import { QuickActionButton } from "./quick-actions";

export function Topbar({ todayLabel }: { todayLabel: string }) {
  const { open } = useCommandMenu();
  const { user, business } = useApp();
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="lg:hidden">
          <BrandLockup tone="light" compact />
        </div>
        <button
          type="button"
          onClick={open}
          className="ml-auto flex h-10 items-center gap-2.5 rounded-xl border border-border bg-card px-3 text-sm text-muted-foreground shadow-soft transition hover:border-terracotta-200 hover:text-foreground lg:ml-0 lg:w-80"
          aria-label="Abrir busca global (Ctrl+K)"
        >
          <Search className="size-4" aria-hidden />
          <span className="hidden flex-1 text-left lg:inline">Buscar clientes, agenda, serviços…</span>
          <kbd className="hidden rounded-md border border-border bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold lg:inline">Ctrl K</kbd>
        </button>
        <div className="hidden flex-1 lg:block" />
        <p className="hidden text-sm font-medium text-muted-foreground first-letter:uppercase xl:block">{todayLabel}</p>
        {business.isDemo && (
          <span className="rounded-full bg-bronze-100 px-2 py-0.5 text-[0.6rem] font-bold tracking-widest text-bronze-700 uppercase lg:hidden">
            Demo
          </span>
        )}
        <div className="hidden lg:block">
          <QuickActionButton />
        </div>
        <div className="lg:hidden">
          <Avatar name={user.name} color="#9c7248" size="sm" />
        </div>
      </div>
    </header>
  );
}
