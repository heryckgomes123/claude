import { m } from 'framer-motion'
import type { ReactNode } from 'react'
import { whatsappLink } from '../config/site'
import { useMagnetic } from '../hooks/useMagnetic'
import { ArrowRight, WhatsApp } from './Icons'

type Variant = 'gold' | 'outline' | 'dark' | 'light'

interface CtaButtonProps {
  children: ReactNode
  /** Link interno (#ancora). Se omitido, o botão abre o WhatsApp. */
  href?: string
  /** Mensagem pré-preenchida do WhatsApp. */
  message?: string
  variant?: Variant
  size?: 'md' | 'lg' | 'xl'
  icon?: 'arrow' | 'whatsapp' | 'none'
  className?: string
  magnetic?: boolean
  onClick?: () => void
}

const variants: Record<Variant, string> = {
  gold: 'btn-gold',
  outline:
    'text-bone bg-white/[0.03] ring-1 ring-inset ring-gold-300/35 hover:ring-gold-300/80 hover:bg-gold-300/[0.07] hover:text-gold-100 backdrop-blur-md',
  dark: 'bg-ink-950 text-bone hover:bg-ink-800 shadow-[0_14px_40px_-14px_rgb(7_7_7/0.7)]',
  light: 'bg-bone text-ink-950 hover:bg-white',
}

const sizes = {
  md: 'h-11 px-5 text-[0.82rem]',
  lg: 'h-14 px-7 text-[0.9rem]',
  xl: 'h-16 px-9 text-base md:h-[4.5rem] md:px-11 md:text-lg',
}

export function CtaButton({
  children,
  href,
  message,
  variant = 'gold',
  size = 'md',
  icon = 'arrow',
  className = '',
  magnetic = true,
  onClick,
}: CtaButtonProps) {
  const isWhatsApp = !href
  const url = href ?? whatsappLink(message)
  const mag = useMagnetic(magnetic ? 0.2 : 0)

  return (
    <m.a
      href={url}
      onClick={onClick}
      style={mag.style}
      onPointerMove={mag.onPointerMove}
      onPointerLeave={mag.onPointerLeave}
      {...(isWhatsApp ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={`group relative inline-flex select-none items-center justify-center gap-2.5 overflow-hidden rounded-full font-semibold uppercase tracking-[0.06em] transition-[background-color,box-shadow,color] duration-500 ease-premium active:scale-[0.97] ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {icon === 'whatsapp' && <WhatsApp className="size-[1.15em] shrink-0" />}
      <span className="relative">{children}</span>
      {icon !== 'none' && (
        <span className="relative -mr-1 inline-flex size-[1.05em] overflow-hidden">
          <ArrowRight className="size-full shrink-0 transition-transform duration-500 ease-premium group-hover:translate-x-[120%]" />
          <ArrowRight className="absolute size-full shrink-0 -translate-x-[120%] transition-transform duration-500 ease-premium group-hover:translate-x-0" />
        </span>
      )}
    </m.a>
  )
}
