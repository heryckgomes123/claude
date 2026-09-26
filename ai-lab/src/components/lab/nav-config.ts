import {
  BookOpen,
  Compass,
  FlaskConical,
  Home,
  Images,
  LayoutGrid,
  type LucideIcon,
  Sparkles,
  Wand2,
  Workflow,
  Wrench,
} from 'lucide-react'

export type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean }

export const PRIMARY_NAV: NavItem[] = [
  { href: '/lab', label: 'Home', icon: Home, exact: true },
  { href: '/lab/explore', label: 'Explorar', icon: Compass },
  { href: '/lab/prompts', label: 'Prompts', icon: Sparkles },
  { href: '/lab/workflows', label: 'Workflows', icon: Workflow },
  { href: '/lab/tools', label: 'Ferramentas', icon: Wrench },
  { href: '/lab/references', label: 'Referências', icon: Images },
  { href: '/lab/tutorials', label: 'Tutoriais', icon: BookOpen },
  { href: '/lab/my-lab', label: 'Meu Lab', icon: LayoutGrid },
]

export const STUDIO_NAV: NavItem[] = [
  { href: '/lab/prompt-builder', label: 'Prompt Builder', icon: Wand2 },
  { href: '/lab/experiments', label: 'Experimentos', icon: FlaskConical },
]

export function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
}
