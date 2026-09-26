import { m } from 'framer-motion'
import type { ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  as?: 'div' | 'li' | 'span' | 'p' | 'h2' | 'h3'
  blur?: boolean
}

const EASE = [0.22, 1, 0.36, 1] as const

/** Entrada suave (fade + translate + blur) quando o elemento entra na viewport. */
export function Reveal({ children, delay = 0, y = 24, className, as = 'div', blur = true }: RevealProps) {
  const Component = m[as]
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y, filter: blur ? 'blur(8px)' : 'blur(0px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </Component>
  )
}
