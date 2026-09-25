import type { ReactNode } from 'react'
import { Reveal } from './Reveal'

interface SectionHeaderProps {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  tone?: 'dark' | 'light'
  align?: 'left' | 'center'
  className?: string
  id?: string
}

export function SectionHeader({ eyebrow, title, description, tone = 'dark', align = 'left', className = '', id }: SectionHeaderProps) {
  const muted = tone === 'dark' ? 'text-mute' : 'text-ink-950/60'
  const alignCls = align === 'center' ? 'mx-auto text-center items-center' : ''
  return (
    <div className={`flex max-w-3xl flex-col gap-5 ${alignCls} ${className}`}>
      <Reveal>
        <p className={`eyebrow flex items-center gap-2.5 ${muted}`}>
          <span className="inline-block size-1.5 rounded-full bg-gold" aria-hidden="true" />
          {eyebrow}
        </p>
      </Reveal>
      <Reveal delay={0.06}>
        <h2 id={id} className="display text-balance text-[2.35rem] sm:text-5xl lg:text-[4rem]">
          {title}
        </h2>
      </Reveal>
      {description && (
        <Reveal delay={0.12}>
          <p className={`max-w-xl text-pretty text-base leading-relaxed md:text-lg ${muted}`}>{description}</p>
        </Reveal>
      )}
    </div>
  )
}
