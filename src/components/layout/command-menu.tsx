"use client";

import { Command } from "cmdk";
import { CalendarClock, CornerDownLeft, Loader2, Scissors, Search, UserRound, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { globalSearchAction } from "@/actions/search";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useDebounce } from "@/hooks/use-debounce";
import type { SearchResults } from "@/services/search";
import { formatDateTime } from "@/utils/dates";
import { formatMoney } from "@/utils/money";
import { formatPhone } from "@/utils/phone";
import { useVisibleNav } from "./nav-links";

const CommandContext = createContext<{ open: () => void } | null>(null);
export const useCommandMenu = () => useContext(CommandContext)!;

const itemClass =
  "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-muted data-[selected=true]:bg-muted [&_svg]:size-4 [&_svg]:text-muted-foreground";
const groupClass =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[0.68rem] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase";

/** Busca global (Ctrl/⌘ + K): clientes, profissionais, serviços, agendamentos e navegação. */
export function CommandMenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounce(query, 200);
  const router = useRouter();
  const nav = useVisibleNav();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (debounced.trim().length < 2) {
        setResults(null);
        return;
      }
      setLoading(true);
      try {
        const res = await globalSearchAction({ q: debounced });
        if (!cancelled) setResults(res.ok ? res.data : null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router],
  );

  const hasResults =
    results && (results.clients.length || results.professionals.length || results.services.length || results.appointments.length);

  return (
    <CommandContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
          <DialogPrimitive.Content className="fixed top-[10vh] left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-lifted data-[state=open]:animate-scale-in">
            <DialogPrimitive.Title className="sr-only">Busca global</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Pesquise clientes, profissionais, serviços e agendamentos.
            </DialogPrimitive.Description>
            <Command shouldFilter={false} label="Busca global" className="flex max-h-[70vh] flex-col">
              <div className="flex items-center gap-3 border-b border-border px-4">
                {loading ? <Loader2 className="size-4 animate-spin text-primary" /> : <Search className="size-4 text-muted-foreground" />}
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Buscar cliente, telefone, serviço, profissional…"
                  className="h-14 flex-1 bg-transparent text-[0.95rem] outline-none placeholder:text-muted-foreground/70"
                />
                <kbd className="hidden rounded-md border border-border bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold text-muted-foreground sm:block">
                  ESC
                </kbd>
              </div>
              <Command.List className="scrollbar-thin overflow-y-auto p-2">
                {query.trim().length >= 2 && !loading && !hasResults && (
                  <Command.Empty className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum resultado para “{query}”.
                  </Command.Empty>
                )}
                {results?.clients.length ? (
                  <Command.Group heading="Clientes" className={groupClass}>
                    {results.clients.map((c) => (
                      <Command.Item
                        key={c.id}
                        value={`client-${c.id}`}
                        onSelect={() => go(`/painel/clientes/${c.id}`)}
                        className={itemClass}
                      >
                        <Users /> <span className="flex-1 font-medium">{c.name}</span>
                        <span className="text-xs text-muted-foreground">{formatPhone(c.phone)}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}
                {results?.appointments.length ? (
                  <Command.Group heading="Agendamentos" className={groupClass}>
                    {results.appointments.map((a) => (
                      <Command.Item
                        key={a.id}
                        value={`appt-${a.id}`}
                        onSelect={() => go(`/painel/agenda?appointment=${a.id}`)}
                        className={itemClass}
                      >
                        <CalendarClock />
                        <span className="flex-1">
                          <span className="font-medium">{a.clientName}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            · {a.serviceName} · {a.professionalName}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(a.startsAt)}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}
                {results?.professionals.length ? (
                  <Command.Group heading="Profissionais" className={groupClass}>
                    {results.professionals.map((p) => (
                      <Command.Item
                        key={p.id}
                        value={`prof-${p.id}`}
                        onSelect={() => go(`/painel/profissionais/${p.id}`)}
                        className={itemClass}
                      >
                        <UserRound /> <span className="flex-1 font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.title}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}
                {results?.services.length ? (
                  <Command.Group heading="Serviços" className={groupClass}>
                    {results.services.map((s) => (
                      <Command.Item
                        key={s.id}
                        value={`svc-${s.id}`}
                        onSelect={() => go(`/painel/servicos?q=${encodeURIComponent(s.name)}`)}
                        className={itemClass}
                      >
                        <Scissors /> <span className="flex-1 font-medium">{s.name}</span>
                        <span className="text-xs text-muted-foreground">{formatMoney(s.priceCents)}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}
                {query.trim().length < 2 && (
                  <Command.Group heading="Ir para" className={groupClass}>
                    {nav.map((item) => (
                      <Command.Item key={item.href} value={`nav-${item.href}`} onSelect={() => go(item.href)} className={itemClass}>
                        <item.icon /> <span className="flex-1">{item.label}</span>
                        <CornerDownLeft className="opacity-0 [[data-selected=true]_&]:opacity-100" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
            </Command>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </CommandContext.Provider>
  );
}
