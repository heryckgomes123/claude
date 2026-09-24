"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, Sparkles, CornerDownLeft, ArrowRight } from "lucide-react";
import { useAiva } from "@/store/aiva";
import { useSnapshot } from "@/hooks/use-snapshot";
import { searchAll } from "@/lib/intelligence";
import { NAV } from "./nav";
import { cn } from "@/lib/cn";

/** Global search (⌘K): every entity, natural language, plus "ask AIVA". */
export function SearchPalette() {
  const open = useAiva((s) => s.ui.searchOpen);
  return open ? <Palette /> : null;
}

function Palette() {
  const setUI = useAiva((s) => s.setUI);
  const snap = useSnapshot();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);

  const results = useMemo(() => {
    const hits = q.trim() ? searchAll(snap, q, 20) : [];
    const nav = NAV.filter((n) => !q.trim() || n.label.toLowerCase().includes(q.toLowerCase())).slice(0, q.trim() ? 3 : 8);
    return [
      ...(q.trim() ? [{ key: "ask", title: `Perguntar à AIVA: “${q}”`, subtitle: "IA", href: `/aiva?q=${encodeURIComponent(q)}`, ai: true }] : []),
      ...hits.map((h) => ({ key: `${h.entity}:${h.id}`, title: h.title, subtitle: h.subtitle, href: h.href, ai: false })),
      ...nav.map((n) => ({ key: `nav:${n.href}`, title: n.label, subtitle: "Ir para", href: n.href, ai: false })),
    ];
  }, [q, snap]);

  const close = () => setUI({ searchOpen: false });
  const go = (href: string) => {
    close();
    router.push(href);
  };

  return createPortal(
    <div className="fixed inset-0 z-[75] flex items-start justify-center px-3 pt-[max(12px,var(--safe-top))] lg:pt-[12vh]" role="dialog" aria-modal="true" aria-label="Busca">
      <div className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm" onClick={close} />
      <div className="glass relative flex max-h-[80dvh] w-full max-w-2xl animate-pop flex-col overflow-hidden rounded-3xl shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-5 w-5 shrink-0 text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((s) => Math.min(s + 1, results.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((s) => Math.max(s - 1, 0));
              }
              if (e.key === "Enter" && results[sel]) go(results[sel].href);
            }}
            placeholder="Buscar tudo… ou “tudo sobre a campanha da Nike”"
            className="h-14 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-faint"
            aria-label="Buscar"
          />
          <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-[11px] text-faint sm:block">ESC</kbd>
        </div>
        <div className="overflow-y-auto p-2">
          {results.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted">Nada encontrado.</p>}
          {results.map((r, i) => (
            <button
              key={r.key}
              onMouseEnter={() => setSel(i)}
              onClick={() => go(r.href)}
              className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left", i === sel ? "bg-surface-3" : "hover:bg-surface-2")}
            >
              <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", r.ai ? "grad" : "bg-surface-2")}>
                {r.ai ? <Sparkles className="h-4 w-4 text-white" /> : <ArrowRight className="h-4 w-4 text-muted" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{r.title}</span>
                <span className="block text-[12px] text-faint">{r.subtitle}</span>
              </span>
              {i === sel && <CornerDownLeft className="h-4 w-4 shrink-0 text-faint" />}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
