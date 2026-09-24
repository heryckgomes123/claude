import { NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import { Home, Dumbbell, LineChart, Trophy, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/treino', label: 'Treino', icon: Dumbbell },
  { to: '/progresso', label: 'Progresso', icon: LineChart },
  { to: '/ranking', label: 'Ranking', icon: Trophy },
  { to: '/perfil', label: 'Perfil', icon: User },
]

export function BottomNavigation() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg px-3 pb-[max(var(--safe-bottom),10px)]"
    >
      <div className="flex h-[var(--nav-h)] items-stretch rounded-[26px] border border-line-strong bg-surface/85 px-1.5 shadow-[0_-10px_40px_-10px_rgb(0_0_0/0.8)] backdrop-blur-xl">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="relative flex flex-1 flex-col items-center justify-center gap-1">
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-x-1.5 inset-y-2 rounded-[18px] bg-lift/14"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <Icon size={21} strokeWidth={isActive ? 2.4 : 1.8} className={cn('relative transition-colors', isActive ? 'text-lift-2' : 'text-muted')} />
                <span className={cn('relative text-[10px] font-semibold tracking-wide transition-colors', isActive ? 'text-ink' : 'text-muted')}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
