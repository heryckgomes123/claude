"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { Avatar } from "@/components/ui/avatar";
import { useApp, useCan } from "./app-context";

export function UserCard() {
  const { user } = useApp();
  const can = useCan();
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
      <div className="flex items-center gap-3">
        <Avatar name={user.name} color="#9c7248" size="sm" className="ring-charcoal" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-cream">{user.name}</p>
          <p className="truncate text-xs text-stone-400">{user.roleLabel}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-1.5">
        {can("settings.view") && (
          <Link
            href="/painel/configuracoes"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/[0.05] px-2 py-1.5 text-xs font-semibold text-stone-300 transition hover:bg-white/10 hover:text-cream"
          >
            <Settings className="size-3.5" aria-hidden /> Configurações
          </Link>
        )}
        <form action={logoutAction} className="flex flex-1">
          <button
            type="submit"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/[0.05] px-2 py-1.5 text-xs font-semibold text-stone-300 transition hover:bg-terracotta-500/20 hover:text-terracotta-200"
          >
            <LogOut className="size-3.5" aria-hidden /> Sair
          </button>
        </form>
      </div>
    </div>
  );
}
