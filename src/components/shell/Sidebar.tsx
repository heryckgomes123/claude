"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Search, Mic } from "lucide-react";
import { AivaLogo, AivaOrb } from "@/components/brand";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useAiva } from "@/store/aiva";
import { NAV, SETTINGS_ITEM } from "./nav";

export function Sidebar() {
  const path = usePathname();
  const me = useAiva((s) => s.me);
  const setUI = useAiva((s) => s.setUI);
  const inboxCount = useAiva((s) => (s.data?.captures.filter((c) => c.status === "pending").length ?? 0) + (s.data?.tasks.filter((t) => t.status === "inbox").length ?? 0));
  const creator = me?.workspace.settings.creatorMode;
  const items = NAV.filter((n) => !n.creator || creator);

  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line bg-bg-2/60 px-3 py-5 backdrop-blur-xl lg:flex">
      <Link href="/today" className="mb-6 px-2">
        <AivaLogo size={24} tagline />
      </Link>

      <div className="mb-4 grid grid-cols-[1fr_auto] gap-2 px-1">
        <button onClick={() => setUI({ captureOpen: true, captureMode: "text" })} className="pressable grad flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-medium text-white shadow-[0_8px_30px_-10px_rgb(139_92_255/0.8)]">
          <Plus className="h-4 w-4" /> Capturar
        </button>
        <button onClick={() => setUI({ searchOpen: true })} className="pressable grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-muted hover:text-ink" aria-label="Buscar (Ctrl+K)" title="Buscar  ⌘K">
          <Search className="h-4 w-4" />
        </button>
      </div>

      <nav className="grid gap-0.5 overflow-y-auto no-scrollbar">
        {items.map((item) => {
          const active = path === item.href || path.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "pressable group flex h-10 items-center gap-3 rounded-xl px-3 text-[14px]",
                active ? "bg-surface-3 text-ink" : "text-muted hover:bg-surface hover:text-ink",
              )}
            >
              <Icon className={cn("h-[18px] w-[18px]", active && "text-[#b9a2ff]")} />
              <span className="flex-1">{item.label}</span>
              {item.href === "/inbox" && inboxCount > 0 && <span className="rounded-full bg-violet/25 px-1.5 text-[11px] text-[#cbb9ff]">{inboxCount}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto grid gap-1 border-t border-line pt-4">
        <Link href="/aiva" className={cn("pressable grad-border flex h-12 items-center gap-3 rounded-xl px-3", path === "/aiva" && "brightness-125")}>
          <AivaOrb size={22} />
          <span className="flex-1 text-sm font-medium">AIVA AI</span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              setUI({ voiceOpen: true });
            }}
            onKeyDown={(e) => e.key === "Enter" && setUI({ voiceOpen: true })}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-3 hover:text-ink"
            aria-label="Falar com AIVA"
          >
            <Mic className="h-4 w-4" />
          </span>
        </Link>
        <Link href={SETTINGS_ITEM.href} className={cn("pressable flex h-11 items-center gap-3 rounded-xl px-3 text-sm", path === "/settings" ? "bg-surface-3 text-ink" : "text-muted hover:bg-surface hover:text-ink")}>
          {me ? <Avatar name={me.workspace.settings.displayName ?? me.user.name} color={me.user.avatarColor} size={24} /> : null}
          <span className="flex-1 truncate">{me?.workspace.settings.displayName ?? me?.user.name}</span>
          <SETTINGS_ITEM.icon className="h-4 w-4" />
        </Link>
      </div>
    </aside>
  );
}
