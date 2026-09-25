"use client";

import { LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/actions/auth";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/utils/cn";
import { useApp } from "./app-context";
import { isActivePath, useVisibleNav } from "./nav-links";
import { QuickActionButton } from "./quick-actions";

/** Navegação inferior do mobile: 4 atalhos prioritários + ação rápida + menu "Mais". */
export function MobileNav() {
  const pathname = usePathname();
  const items = useVisibleNav();
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const primary = items.filter((i) => i.mobile).slice(0, 4);
  const left = primary.slice(0, 2);
  const right = primary.slice(2, 4);
  const more = items.filter((i) => !right.includes(i) && !left.includes(i));

  const link = (item: (typeof items)[number]) => {
    const active = isActivePath(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-1 flex-col items-center gap-1 py-2 text-[0.65rem] font-semibold transition-colors",
          active ? "text-terracotta-600" : "text-muted-foreground",
        )}
      >
        <item.icon className={cn("size-5", active && "stroke-[2.3]")} aria-hidden />
        {item.label === "Visão Geral" ? "Início" : item.label}
      </Link>
    );
  };

  return (
    <>
      <nav
        aria-label="Navegação inferior"
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card/95 shadow-[0_-8px_24px_-12px_rgb(42_36_33/0.15)] backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto flex max-w-lg items-end px-2">
          {left.map(link)}
          <div className="flex flex-1 justify-center">
            <QuickActionButton variant="fab" />
          </div>
          {right.map(link)}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-[0.65rem] font-semibold text-muted-foreground"
            aria-label="Mais opções de navegação"
          >
            <Menu className="size-5" aria-hidden /> Mais
          </button>
        </div>
      </nav>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
            <p className="text-sm text-muted-foreground">
              {user.name} · {user.roleLabel}
            </p>
          </SheetHeader>
          <SheetBody className="pb-safe">
            <div className="grid grid-cols-3 gap-2">
              {more.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border p-3 text-center text-xs font-semibold transition",
                      active ? "border-terracotta-200 bg-terracotta-50 text-terracotta-700" : "border-border bg-card hover:bg-muted",
                    )}
                  >
                    <item.icon className="size-5" aria-hidden /> {item.label}
                  </Link>
                );
              })}
              <form action={logoutAction} className="contents">
                <button
                  type="submit"
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-xs font-semibold text-destructive hover:bg-[#fdf6f4]"
                >
                  <LogOut className="size-5" aria-hidden /> Sair
                </button>
              </form>
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}
