import {
  Sun,
  Inbox,
  CheckSquare,
  FolderKanban,
  CalendarDays,
  StickyNote,
  Clapperboard,
  Users,
  Wallet,
  Target,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; creator?: boolean };

export const NAV: NavItem[] = [
  { href: "/today", label: "Hoje", icon: Sun },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/tasks", label: "Tarefas", icon: CheckSquare },
  { href: "/projects", label: "Projetos", icon: FolderKanban },
  { href: "/calendar", label: "Calendário", icon: CalendarDays },
  { href: "/notes", label: "Notas", icon: StickyNote },
  { href: "/creator", label: "Creator", icon: Clapperboard, creator: true },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/finance", label: "Financeiro", icon: Wallet },
  { href: "/goals", label: "Metas & Rotina", icon: Target },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Configurações", icon: Settings };
