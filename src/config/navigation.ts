import {
  Boxes,
  CalendarDays,
  HandCoins,
  LayoutDashboard,
  type LucideIcon,
  Scissors,
  Settings,
  Sparkles,
  UserRound,
  Users,
  Vault,
  Wallet,
} from "lucide-react";
import type { Permission } from "./permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Qualquer uma das permissões libera o item. */
  permissions: Permission[];
  /** Prioritário na navegação inferior do mobile. */
  mobile?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/painel", label: "Visão Geral", icon: LayoutDashboard, permissions: ["dashboard.view"], mobile: true },
  { href: "/painel/agenda", label: "Agenda", icon: CalendarDays, permissions: ["appointments.view"], mobile: true },
  { href: "/painel/clientes", label: "Clientes", icon: Users, permissions: ["clients.view"], mobile: true },
  { href: "/painel/profissionais", label: "Profissionais", icon: UserRound, permissions: ["professionals.view"] },
  { href: "/painel/servicos", label: "Serviços", icon: Scissors, permissions: ["services.view"] },
  { href: "/painel/atendimentos", label: "Atendimento", icon: Sparkles, permissions: ["attendance.view"], mobile: true },
  { href: "/painel/financeiro", label: "Financeiro", icon: Wallet, permissions: ["finance.view"] },
  { href: "/painel/caixa", label: "Caixa", icon: Vault, permissions: ["cash.view"] },
  { href: "/painel/comissoes", label: "Comissões", icon: HandCoins, permissions: ["commissions.view", "commissions.view_own"] },
  { href: "/painel/estoque", label: "Estoque", icon: Boxes, permissions: ["inventory.view"] },
  { href: "/painel/configuracoes", label: "Configurações", icon: Settings, permissions: ["settings.view"] },
];
