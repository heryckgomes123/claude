import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function EmptyState({ icon, title, body, action, className }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('card-surface flex flex-col items-center px-6 py-10 text-center', className)}>
      {icon && <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-lift/10 text-lift-2">{icon}</div>}
      <h3 className="font-display-wide text-base font-bold">{title}</h3>
      {body && <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function LoadingState({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('delayed-reveal space-y-3', className)} aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton h-20 w-full" />
      ))}
    </div>
  )
}

/** Aviso padrão para funções que dependem de integração com backend. */
export function IntegrationNotice({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex gap-2.5 rounded-2xl border border-warn/20 bg-warn/6 p-3.5 text-[12.5px] leading-relaxed text-ink-2', className)}>
      <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-warn" />
      <div>{children}</div>
    </div>
  )
}
