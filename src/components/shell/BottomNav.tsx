"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Sun, CheckSquare, Clapperboard, CalendarDays, Menu, Plus } from "lucide-react";
import { AivaOrb } from "@/components/brand";
import { cn } from "@/lib/cn";
import { useAiva } from "@/store/aiva";
import { useRouter } from "next/navigation";

/** Mobile bottom navigation: Hoje · Tarefas · AIVA · Creator/Agenda · Mais — plus the capture FAB. */
export function BottomNav() {
  const path = usePathname();
  const router = useRouter();
  const creator = useAiva((s) => s.me?.workspace.settings.creatorMode);
  const setUI = useAiva((s) => s.setUI);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);

  const items = [
    { href: "/today", label: "Hoje", icon: Sun },
    { href: "/tasks", label: "Tarefas", icon: CheckSquare },
    null,
    creator ? { href: "/creator", label: "Creator", icon: Clapperboard } : { href: "/calendar", label: "Agenda", icon: CalendarDays },
    { href: "/more", label: "Mais", icon: Menu },
  ];

  return (
    <>
      {path !== "/aiva" && (
      <button
        onClick={() => setUI({ captureOpen: true, captureMode: "text" })}
        className="pressable grad fixed right-[max(16px,var(--safe-right))] z-40 grid h-14 w-14 place-items-center rounded-2xl text-white shadow-[0_10px_40px_-8px_rgb(139_92_255/0.9)] lg:hidden"
        style={{ bottom: "calc(var(--nav-h) + var(--safe-bottom) + 14px)" }}
        aria-label="Capturar"
      >
        <Plus className="h-6 w-6" strokeWidth={2.4} />
      </button>
      )}
      <nav
        className="glass fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 lg:hidden"
        style={{ paddingBottom: "var(--safe-bottom)" }}
        aria-label="Navegação principal"
      >
        <div className="mx-auto grid h-[var(--nav-h)] max-w-lg grid-cols-5 items-center px-[max(8px,var(--safe-left))]">
          {items.map((item) => {
            if (!item) {
              return (
                <button
                  key="aiva"
                  aria-label="AIVA — toque para conversar, segure para falar"
                  className="pressable relative -mt-6 flex flex-col items-center gap-1"
                  onPointerDown={() => {
                    held.current = false;
                    hold.current = setTimeout(() => {
                      held.current = true;
                      navigator.vibrate?.(15);
                      setUI({ voiceOpen: true });
                    }, 380);
                  }}
                  onPointerUp={() => hold.current && clearTimeout(hold.current)}
                  onPointerLeave={() => hold.current && clearTimeout(hold.current)}
                  onClick={() => !held.current && router.push("/aiva")}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <span className={cn("grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-bg-2 shadow-[0_0_30px_rgb(139_92_255/0.45)]", path === "/aiva" && "ring-2 ring-violet/60")}>
                    <AivaOrb size={34} />
                  </span>
                  <span className="text-[10px] font-medium text-ink">AIVA</span>
                </button>
              );
            }
            const active = path === item.href || path.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="pressable flex h-full flex-col items-center justify-center gap-1" aria-current={active ? "page" : undefined}>
                <Icon className={cn("h-[22px] w-[22px]", active ? "text-ink" : "text-faint")} strokeWidth={active ? 2.3 : 1.8} />
                <span className={cn("text-[10px] font-medium", active ? "text-ink" : "text-faint")}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
