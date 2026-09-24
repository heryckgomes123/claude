import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'motion/react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'xl'

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconRight?: ReactNode
  loading?: boolean
  block?: boolean
  children?: ReactNode
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
}

const variants: Record<Variant, string> = {
  primary:
    'bg-lift text-white shadow-[0_8px_24px_-8px_rgb(47_107_255/0.7),inset_0_1px_0_rgb(255_255_255/0.22)] hover:bg-[#3b75ff]',
  secondary: 'bg-surface-3 text-ink hover:bg-[#222b39] border border-line',
  ghost: 'bg-transparent text-ink-2 hover:text-ink hover:bg-white/5',
  outline: 'bg-transparent text-ink border border-line-strong hover:border-lift-2/60',
  danger: 'bg-danger/12 text-danger border border-danger/25 hover:bg-danger/18',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] rounded-xl gap-1.5',
  md: 'h-11 px-4.5 text-sm rounded-2xl gap-2',
  lg: 'h-13 px-6 text-[15px] rounded-2xl gap-2',
  xl: 'h-15 px-7 text-base rounded-[20px] gap-2.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, iconRight, loading, block, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={{ scale: disabled ? 1 : 0.965 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex items-center justify-center font-semibold tracking-[0.01em] transition-colors select-none',
        'disabled:opacity-45 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
      ) : (
        icon
      )}
      {children && <span className="font-display-wide text-[0.9em] whitespace-nowrap uppercase tracking-[0.05em]">{children}</span>}
      {iconRight}
    </motion.button>
  )
})
