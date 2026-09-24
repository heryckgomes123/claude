import type { HTMLAttributes, ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  interactive?: boolean
  glow?: boolean
  padded?: boolean
}

export function Card({ children, className, interactive, glow, padded = true, onClick, ...rest }: CardProps) {
  const cls = cn(
    'card-surface relative overflow-hidden',
    padded && 'p-4.5',
    interactive && 'cursor-pointer transition-colors hover:border-line-strong',
    glow && 'shadow-[0_0_0_1px_rgb(47_107_255/0.25),0_20px_60px_-30px_rgb(47_107_255/0.6)]',
    className,
  )
  if (interactive || onClick) {
    return (
      <motion.div
        whileTap={{ scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className={cls}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick(e as never) : undefined}
        {...(rest as object)}
      >
        {children}
      </motion.div>
    )
  }
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  )
}

export function SectionTitle({ title, action, className }: { title: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3 flex items-end justify-between px-0.5', className)}>
      <h2 className="hud-label">{title}</h2>
      {action}
    </div>
  )
}
