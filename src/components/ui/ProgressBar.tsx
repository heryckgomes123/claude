import { motion } from 'motion/react'
import { cn, clamp } from '@/lib/utils'

interface ProgressBarProps {
  value: number // 0..1
  className?: string
  tone?: 'lift' | 'ok' | 'gold'
  size?: 'sm' | 'md' | 'lg'
  segments?: number
  label?: string
}

const toneCls = {
  lift: 'bg-gradient-to-r from-lift to-lift-2',
  ok: 'bg-ok',
  gold: 'bg-gold',
}

export function ProgressBar({ value, className, tone = 'lift', size = 'md', segments, label }: ProgressBarProps) {
  const v = clamp(value)
  const h = size === 'sm' ? 'h-1.5' : size === 'md' ? 'h-2' : 'h-3'
  if (segments && segments <= 12) {
    const filled = Math.round(v * segments)
    return (
      <div className={cn('flex gap-1', className)} role="progressbar" aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        {Array.from({ length: segments }, (_, i) => (
          <motion.div
            key={i}
            className={cn('flex-1 rounded-full', h, i < filled ? toneCls[tone] : 'bg-white/8')}
            initial={{ scaleX: 0.3, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.05 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>
    )
  }
  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-white/8', h, className)}
      role="progressbar"
      aria-valuenow={Math.round(v * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <motion.div
        className={cn('h-full rounded-full', toneCls[tone])}
        initial={{ width: 0 }}
        animate={{ width: `${v * 100}%` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  )
}
