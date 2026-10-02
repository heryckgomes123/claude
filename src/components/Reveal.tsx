import { m } from 'framer-motion'
import type { ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}

const EASE = [0.22, 1, 0.36, 1] as const

/** Entrada curta (opacidade + deslocamento) ao entrar na viewport. Desligada com movimento reduzido. */
export function Reveal({ children, delay = 0, y = 20, className }: RevealProps) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </m.div>
  )
}
