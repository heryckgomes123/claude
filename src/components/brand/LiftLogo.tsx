import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

/** Marca provisória: três barras ascendentes (Estrutura • Consistência • Evolução). */
export function LiftMark({ size = 28, animated, className }: { size?: number; animated?: boolean; className?: string }) {
  const bars = [
    { x: 0, h: 0.48, fill: '#2a3242' },
    { x: 0.37, h: 0.72, fill: '#5b7fff', o: 0.6 },
    { x: 0.74, h: 1, fill: '#2f6bff' },
  ]
  return (
    <svg width={size} height={size} viewBox="0 0 1 1" className={className} aria-hidden>
      {bars.map((b, i) => (
        <motion.rect
          key={i}
          x={b.x}
          width={0.26}
          rx={0.06}
          fill={b.fill}
          opacity={b.o ?? 1}
          initial={animated ? { y: 1, height: 0 } : false}
          animate={{ y: 1 - b.h, height: b.h }}
          transition={{ delay: animated ? 0.15 + i * 0.14 : 0, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </svg>
  )
}

export function LiftWordmark({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'xl' }) {
  const cls = { sm: 'text-lg', md: 'text-2xl', xl: 'text-[64px]' }[size]
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LiftMark size={size === 'xl' ? 52 : size === 'md' ? 24 : 18} />
      <span className={cn('font-display-wide leading-none font-black tracking-[0.02em]', cls)}>LIFT</span>
    </span>
  )
}
