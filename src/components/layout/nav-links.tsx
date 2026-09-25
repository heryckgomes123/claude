"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/config/navigation";
import { cn } from "@/utils/cn";
import { useCan } from "./app-context";

export function isActivePath(pathname: string, href: string) {
  return href === "/painel" ? pathname === "/painel" : pathname === href || pathname.startsWith(`${href}/`);
}

export function useVisibleNav() {
  const can = useCan();
  return NAV_ITEMS.filter((item) => can(...item.permissions));
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = useVisibleNav();
  return (
    <nav aria-label="Navegação principal" className="space-y-0.5">
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9rem] font-medium transition-all duration-150",
              active
                ? "bg-gradient-to-r from-white/[0.09] to-white/[0.02] text-cream shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
                : "text-stone-400 hover:bg-white/[0.04] hover:text-cream",
            )}
          >
            {active && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-terracotta-400" aria-hidden />}
            <Icon
              className={cn(
                "size-[1.1rem] transition-colors",
                active ? "text-terracotta-300" : "text-stone-500 group-hover:text-terracotta-300",
              )}
              aria-hidden
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
