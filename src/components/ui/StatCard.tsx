import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { AnimatedNumber } from './AnimatedNumber'

interface StatCardProps {
  label: string
  value: number
  unit?: string
  icon?: ReactNode
  hint?: string
  className?: string
  accent?: boolean
}

export function StatCard({ label, value, unit, icon, hint, className, accent }: StatCardProps) {
  return (
    <div className={cn('card-surface flex flex-col justify-between gap-3 p-4', className)}>
      <div className="flex items-center justify-between">
        <span className="hud-label">{label}</span>
        {icon && <span className={cn('text-muted', accent && 'text-lift-2')}>{icon}</span>}
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <AnimatedNumber value={value} className="font-display-wide text-[28px] leading-none font-bold tabular" />
          {unit && <span className="text-[13px] font-medium text-muted">{unit}</span>}
        </div>
        {hint && <p className="mt-1.5 text-[12px] text-muted">{hint}</p>}
      </div>
    </div>
  )
}
