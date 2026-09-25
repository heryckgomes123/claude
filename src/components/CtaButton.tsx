import type { ReactNode } from 'react'
import { whatsappLink } from '../config/site'
import { ArrowRight, WhatsApp } from './Icons'

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark'

interface CtaButtonProps {
  children: ReactNode
  /** Link interno (#ancora). Se omitido, o botão abre o WhatsApp. */
  href?: string
  /** Mensagem pré-preenchida do WhatsApp. */
  message?: string
  variant?: Variant
  size?: 'md' | 'lg'
  icon?: 'arrow' | 'whatsapp' | 'none'
  className?: string
  onClick?: () => void
}

const variants: Record<Variant, string> = {
  primary:
    'bg-bone text-ink-950 hover:bg-white shadow-[0_0_0_1px_rgb(245_243_238/0.2),0_10px_40px_-12px_rgb(201_164_92/0.45)] hover:shadow-[0_0_0_1px_rgb(201_164_92/0.6),0_18px_50px_-12px_rgb(201_164_92/0.55)]',
  secondary: 'bg-white/[0.03] text-bone ring-1 ring-inset ring-white/15 hover:ring-white/35 hover:bg-white/[0.06] backdrop-blur-md',
  ghost: 'text-bone/80 hover:text-bone',
  dark: 'bg-ink-950 text-bone hover:bg-ink-800 shadow-[0_10px_40px_-16px_rgb(8_8_8/0.6)]',
}

const sizes = {
  md: 'h-11 px-5 text-[0.9rem]',
  lg: 'h-13 px-7 text-[0.95rem] md:h-14 md:px-8',
}

export function CtaButton({
  children,
  href,
  message,
  variant = 'primary',
  size = 'md',
  icon = 'arrow',
  className = '',
  onClick,
}: CtaButtonProps) {
  const isWhatsApp = !href
  const url = href ?? whatsappLink(message)

  return (
    <a
      href={url}
      onClick={onClick}
      {...(isWhatsApp ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={`group relative inline-flex select-none items-center justify-center gap-2.5 overflow-hidden rounded-full font-medium tracking-[-0.01em] transition-[background-color,box-shadow,color,transform] duration-500 ease-premium active:scale-[0.97] ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {icon === 'whatsapp' && <WhatsApp className="size-4 shrink-0" />}
      <span className="relative">{children}</span>
      {icon === 'arrow' && (
        <span className="relative -mr-1 inline-flex size-4 overflow-hidden">
          <ArrowRight className="size-4 shrink-0 transition-transform duration-500 ease-premium group-hover:translate-x-4" />
          <ArrowRight className="absolute size-4 shrink-0 -translate-x-4 transition-transform duration-500 ease-premium group-hover:translate-x-0" />
        </span>
      )}
    </a>
  )
}
