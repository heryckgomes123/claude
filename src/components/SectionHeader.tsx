import type { ReactNode } from 'react'
import { Reveal } from './Reveal'

interface SectionHeaderProps {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  tone?: 'dark' | 'gold'
  align?: 'left' | 'center'
  className?: string
  id?: string
}

export function SectionHeader({ eyebrow, title, description, tone = 'dark', align = 'left', className = '', id }: SectionHeaderProps) {
  const muted = tone === 'dark' ? 'text-mute' : 'text-ink-950/70'
  const dot = tone === 'dark' ? 'bg-gold-300 shadow-[0_0_12px_rgb(247_201_72/0.8)]' : 'bg-ink-950'
  const alignCls = align === 'center' ? 'mx-auto text-center items-center' : ''
  return (
    <div className={`flex max-w-4xl flex-col gap-5 ${alignCls} ${className}`}>
      <Reveal>
        <p className={`eyebrow flex items-center gap-2.5 ${muted}`}>
          <span className={`inline-block size-1.5 rounded-full ${dot}`} aria-hidden="true" />
          {eyebrow}
        </p>
      </Reveal>
      <Reveal delay={0.06}>
        <h2 id={id} className="poster text-balance text-[3.1rem] sm:text-[4.4rem] lg:text-[5.6rem]">
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
