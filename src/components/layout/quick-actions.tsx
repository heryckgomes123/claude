"use client";

import { CalendarPlus, Plus, Sparkles, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AppointmentFormDialog, type AppointmentPrefill } from "@/components/appointments/appointment-form-dialog";
import { WalkInDialog } from "@/components/attendance/walk-in-dialog";
import type { ClientOption } from "@/components/clients/client-combobox";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/cn";
import { useCan } from "./app-context";

type QuickState =
  { kind: "appointment"; prefill?: AppointmentPrefill } | { kind: "client" } | { kind: "walk-in"; client?: ClientOption } | null;

type QuickActionsValue = {
  newAppointment: (prefill?: AppointmentPrefill) => void;
  newClient: () => void;
  newWalkIn: (client?: ClientOption) => void;
};

const QuickActionsContext = createContext<QuickActionsValue | null>(null);

export function useQuickActions() {
  const ctx = useContext(QuickActionsContext);
  if (!ctx) throw new Error("useQuickActions fora do provider");
  return ctx;
}

export function QuickActionsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<QuickState>(null);
  const router = useRouter();
  const close = useCallback(() => setState(null), []);

  const value = useMemo<QuickActionsValue>(
    () => ({
      newAppointment: (prefill) => setState({ kind: "appointment", prefill }),
      newClient: () => setState({ kind: "client" }),
      newWalkIn: (client) => setState({ kind: "walk-in", client }),
    }),
    [],
  );

  return (
    <QuickActionsContext.Provider value={value}>
      {children}
      <AppointmentFormDialog
        open={state?.kind === "appointment"}
        onOpenChange={(open) => !open && close()}
        prefill={state?.kind === "appointment" ? state.prefill : undefined}
      />
      <ClientFormDialog
        open={state?.kind === "client"}
        onOpenChange={(open) => !open && close()}
        onSaved={(client) => router.push(`/painel/clientes/${client.id}`)}
      />
      <WalkInDialog
        open={state?.kind === "walk-in"}
        onOpenChange={(open) => !open && close()}
        client={state?.kind === "walk-in" ? state.client : undefined}
      />
    </QuickActionsContext.Provider>
  );
}

function useQuickItems() {
  const can = useCan();
  const quick = useQuickActions();
  return [
    can("appointments.create") && { label: "Novo agendamento", icon: CalendarPlus, onSelect: () => quick.newAppointment() },
    can("clients.create") && { label: "Nova cliente", icon: UserPlus, onSelect: quick.newClient },
    can("appointments.create") &&
      can("attendance.create") && { label: "Novo atendimento (encaixe)", icon: Sparkles, onSelect: () => quick.newWalkIn() },
  ].filter(Boolean) as { label: string; icon: typeof Plus; onSelect: () => void }[];
}

/** Botão "+" de ação rápida (topbar no desktop, FAB no mobile). */
export function QuickActionButton({ variant = "desktop" }: { variant?: "desktop" | "fab" }) {
  const items = useQuickItems();
  if (items.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "fab" ? (
          <button
            type="button"
            aria-label="Ações rápidas"
            className={cn(
              "-mt-7 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-terracotta-400 to-terracotta-600 text-white shadow-glow ring-4 ring-background transition active:scale-95",
            )}
          >
            <Plus className="size-6" strokeWidth={2.5} />
          </button>
        ) : (
          <Button>
            <Plus strokeWidth={2.5} /> Novo
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={variant === "fab" ? "center" : "end"} side={variant === "fab" ? "top" : "bottom"} className="w-60">
        {items.map((item) => (
          <DropdownMenuItem key={item.label} onSelect={item.onSelect} className="py-2.5">
            <item.icon /> {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
