"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import type { Permission, Role } from "@/config/permissions";

export type ShellUser = { id: string; name: string; email: string; role: Role; roleLabel: string; professionalId: string | null };

export type RefService = {
  id: string;
  name: string;
  categoryName: string;
  durationMinutes: number;
  priceCents: number;
  professionalIds: string[];
};
export type RefProfessional = { id: string; name: string; color: string; title: string; serviceIds: string[] };

type AppContextValue = {
  user: ShellUser;
  permissions: Permission[];
  business: { name: string; isDemo: boolean; cashOpen: boolean };
  services: RefService[];
  professionals: RefProfessional[];
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ value, children }: { value: AppContextValue; children: React.ReactNode }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve ser usado dentro de <AppProvider>");
  return ctx;
}

/** Consulta de permissão para a interface (a autorização real acontece no servidor). */
export function useCan() {
  const { permissions } = useApp();
  const set = useMemo(() => new Set(permissions), [permissions]);
  return useCallback((...perms: Permission[]) => perms.some((p) => set.has(p)), [set]);
}
