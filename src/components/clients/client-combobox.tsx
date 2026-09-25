"use client";

import { Command } from "cmdk";
import { Check, ChevronsUpDown, Loader2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { searchClientsAction } from "@/actions/clients";
import { useCan } from "@/components/layout/app-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/utils/cn";
import { formatPhone } from "@/utils/phone";
import { fieldBase } from "@/components/ui/input";
import { ClientFormDialog } from "./client-form-dialog";

export type ClientOption = { id: string; name: string; phone: string | null; whatsapp?: string | null };

/** Seleção de cliente com busca instantânea (nome/telefone) e cadastro inline. */
export function ClientCombobox({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string;
  value: ClientOption | null;
  onChange: (client: ClientOption | null) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ q: string; items: ClientOption[] } | null>(null);
  const [creating, setCreating] = useState(false);
  const debounced = useDebounce(query, 180);
  const can = useCan();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    searchClientsAction({ q: debounced })
      .then((res) => {
        if (!cancelled) setResult({ q: debounced, items: res.ok ? res.data : [] });
      })
      .catch(() => !cancelled && setResult({ q: debounced, items: [] }));
    return () => {
      cancelled = true;
    };
  }, [debounced, open]);
  const loading = open && result?.q !== debounced;
  const results = result?.items ?? [];

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={`${id}-list`}
            aria-invalid={invalid || undefined}
            className={cn(fieldBase, "flex h-11 items-center justify-between gap-2 text-left")}
          >
            {value ? (
              <span className="min-w-0 truncate">
                <span className="font-semibold">{value.name}</span>
                {value.phone && <span className="ml-2 text-muted-foreground">{formatPhone(value.phone)}</span>}
              </span>
            ) : (
              <span className="text-muted-foreground/70">Buscar por nome ou telefone…</span>
            )}
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0">
          <Command shouldFilter={false}>
            <div className="flex items-center gap-2 border-b border-border px-3">
              {loading && <Loader2 className="size-4 animate-spin text-primary" aria-hidden />}
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Nome, telefone ou WhatsApp"
                className="h-11 flex-1 bg-transparent text-sm outline-none"
                autoFocus
              />
            </div>
            <Command.List id={`${id}-list`} className="scrollbar-thin max-h-64 overflow-y-auto p-1.5">
              {!loading && results.length === 0 && (
                <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhuma cliente encontrada.</Command.Empty>
              )}
              {results.map((client) => (
                <Command.Item
                  key={client.id}
                  value={client.id}
                  onSelect={() => {
                    onChange(client);
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm data-[selected=true]:bg-muted"
                >
                  <Check className={cn("size-4 text-primary", value?.id === client.id ? "opacity-100" : "opacity-0")} aria-hidden />
                  <span className="flex-1 font-medium">{client.name}</span>
                  <span className="text-xs text-muted-foreground">{formatPhone(client.phone ?? client.whatsapp)}</span>
                </Command.Item>
              ))}
              {can("clients.create") && (
                <Command.Item
                  value="__create"
                  onSelect={() => {
                    setOpen(false);
                    setCreating(true);
                  }}
                  className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg border-t border-border px-2.5 py-2.5 text-sm font-semibold text-primary data-[selected=true]:bg-terracotta-50"
                >
                  <UserPlus className="size-4" aria-hidden />
                  {query.trim() ? `Cadastrar “${query.trim()}”` : "Cadastrar nova cliente"}
                </Command.Item>
              )}
            </Command.List>
          </Command>
        </PopoverContent>
      </Popover>
      <ClientFormDialog
        open={creating}
        onOpenChange={setCreating}
        initialName={/\d/.test(query) ? "" : query.trim()}
        onSaved={(client) => onChange(client)}
      />
    </>
  );
}
