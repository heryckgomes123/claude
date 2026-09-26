import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

export const badgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-5 [&_svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-border bg-bone/[0.04] text-bone/80',
        gold: 'border-gold-300/25 bg-gold-300/10 text-gold-200',
        electric: 'border-electric/25 bg-electric/10 text-electric',
        success: 'border-success/25 bg-success/10 text-success',
        warning: 'border-warning/25 bg-warning/10 text-warning',
        danger: 'border-danger/25 bg-danger/10 text-danger',
        mono: 'border-border bg-transparent font-mono text-[10px] uppercase tracking-[0.14em] text-mute',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
