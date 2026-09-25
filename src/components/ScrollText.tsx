import { m, useScroll, useTransform } from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import { useRef } from 'react'

interface ScrollTextProps {
  text: string
  /** Palavras (sem pontuação) que recebem destaque tipográfico. */
  highlight?: string[]
  className?: string
  dimClassName?: string
}

/** Texto que “acende” palavra por palavra conforme a rolagem. */
export function ScrollText({ text, highlight = [], className = '', dimClassName = 'opacity-15' }: ScrollTextProps) {
  const ref = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.45'] })
  const words = text.split(' ')

  return (
    <p ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => (
          <Word
            key={i}
            progress={scrollYProgress}
            range={[i / words.length, (i + 1) / words.length]}
            accent={highlight.includes(word.replace(/[.,]/g, ''))}
            dimClassName={dimClassName}
          >
            {word}
          </Word>
        ))}
      </span>
    </p>
  )
}

function Word({
  children,
  progress,
  range,
  accent,
  dimClassName,
}: {
  children: string
  progress: MotionValue<number>
  range: [number, number]
  accent: boolean
  dimClassName: string
}) {
  const opacity = useTransform(progress, range, [0, 1])
  return (
    <span className="relative mr-[0.22em] inline-block">
      <span className={dimClassName}>{children}</span>
      <m.span style={{ opacity }} className={`absolute inset-0 ${accent ? 'text-gold' : ''}`}>
        {children}
      </m.span>
    </span>
  )
}
