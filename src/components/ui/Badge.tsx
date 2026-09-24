import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'lift' | 'ok' | 'warn' | 'danger' | 'neutral' | 'gold'

const tones: Record<Tone, string> = {
  lift: 'bg-lift/14 text-lift-3 border-lift/25',
  ok: 'bg-ok/12 text-ok border-ok/25',
  warn: 'bg-warn/12 text-warn border-warn/25',
  danger: 'bg-danger/12 text-danger border-danger/25',
  neutral: 'bg-white/5 text-ink-2 border-line-strong',
  gold: 'bg-gold/12 text-gold border-gold/25',
}

export function Badge({ children, tone = 'neutral', icon, className }: { children: ReactNode; tone?: Tone; icon?: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold tracking-wide whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}

/** Selo discreto que indica dados/funções de demonstração. */
export function DemoTag({ className, label = 'DEMO' }: { className?: string; label?: string }) {
  return (
    <span
      title="Dados de demonstração — ainda sem backend conectado"
      className={cn('inline-flex h-5 items-center rounded-md border border-warn/30 bg-warn/10 px-1.5 text-[9.5px] font-bold tracking-[0.14em] text-warn', className)}
    >
      {label}
    </span>
  )
}
