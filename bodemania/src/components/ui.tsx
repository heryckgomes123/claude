import { AnimatePresence, m } from 'framer-motion'
import { useEffect, type InputHTMLAttributes, type ReactNode } from 'react'
import { Link } from '../router'
import { money } from '../lib/format'
import { ChevronRight, Minus, Plus, X } from './Icons'

export function Field({
  label,
  error,
  hint,
  className = '',
  right,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string; right?: ReactNode }) {
  const id = input.id ?? input.name
  return (
    <label className={`block ${className}`} htmlFor={id}>
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <span className="relative block">
        <input id={id} aria-invalid={error ? true : undefined} className="field" {...input} />
        {right && <span className="absolute inset-y-0 right-3 flex items-center">{right}</span>}
      </span>
      {error ? <span className="mt-1 block text-xs font-medium text-err">{error}</span> : hint ? <span className="mt-1 block text-xs text-mute">{hint}</span> : null}
    </label>
  )
}

export function QtyStepper({ value, onChange, min = 1, size = 'md' }: { value: number; onChange: (n: number) => void; min?: number; size?: 'sm' | 'md' }) {
  const h = size === 'sm' ? 'h-9' : 'h-12'
  const w = size === 'sm' ? 'w-9' : 'w-12'
  return (
    <div className={`inline-flex ${h} items-center rounded-full border border-line-2 bg-white`}>
      <button type="button" className={`${w} ${h} grid place-items-center rounded-full text-ink hover:bg-paper-2 disabled:opacity-40`} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Diminuir">
        <Minus size={16} />
      </button>
      <span className="min-w-7 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className={`${w} ${h} grid place-items-center rounded-full text-ink hover:bg-paper-2 disabled:opacity-40`} onClick={() => onChange(value + 1)} disabled={value >= 99} aria-label="Aumentar">
        <Plus size={16} />
      </button>
    </div>
  )
}

export function Price({ value, compareAt, from, size = 'md' }: { value: number; compareAt?: number; from?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const main = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-lg'
  const off = compareAt ? Math.round((1 - value / compareAt) * 100) : 0
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      {from && <span className="text-xs text-mute">a partir de</span>}
      <span className={`${main} font-bold tracking-tight tabular-nums`}>{money(value)}</span>
      {compareAt && (
        <>
          <span className="text-sm text-mute-2 line-through tabular-nums">{money(compareAt)}</span>
          <span className="rounded-full bg-ok-50 px-2 py-0.5 text-xs font-bold text-ok">-{off}%</span>
        </>
      )}
    </div>
  )
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Você está em" className="no-scrollbar flex items-center gap-1 overflow-x-auto py-4 text-xs text-mute">
      {items.map((it, i) => (
        <span key={i} className="flex shrink-0 items-center gap-1">
          {i > 0 && <ChevronRight size={14} className="text-mute-2" />}
          {it.to ? (
            <Link to={it.to} className="hover:text-ink hover:underline">
              {it.label}
            </Link>
          ) : (
            <span className="font-medium text-ink">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

/** Gaveta/folha: lateral no desktop, de baixo no celular quando side="bottom". */
export function Sheet({
  open,
  onClose,
  side = 'right',
  title,
  children,
  footer,
  wide,
}: {
  open: boolean
  onClose: () => void
  side?: 'right' | 'left' | 'bottom'
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  const pos =
    side === 'bottom'
      ? 'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl'
      : side === 'left'
        ? 'inset-y-0 left-0 w-[88vw] max-w-sm'
        : `inset-y-0 right-0 w-full ${wide ? 'sm:max-w-lg' : 'sm:max-w-md'}`
  const from = side === 'bottom' ? { y: '100%' } : side === 'left' ? { x: '-100%' } : { x: '100%' }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
          <m.div className="absolute inset-0 bg-navy-950/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <m.div
            className={`absolute flex flex-col bg-paper shadow-2xl ${pos}`}
            initial={from}
            animate={{ x: 0, y: 0 }}
            exit={from}
            transition={{ type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.38 }}
          >
            {side === 'bottom' && <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-line-2" />}
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
              <div className="text-lg font-semibold">{title}</div>
              <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full hover:bg-paper-2" aria-label="Fechar">
                <X />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
            {footer && <div className="safe-bottom border-t border-line bg-white px-5 pt-4 pb-4">{footer}</div>}
          </m.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-paper-2 text-navy-700">{icon}</div>
      <h3 className="display text-2xl font-semibold">{title}</h3>
      {text && <p className="mt-2 max-w-sm text-sm text-mute">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function SectionTitle({ eyebrow, title, action, light }: { eyebrow?: string; title: ReactNode; action?: ReactNode; light?: boolean }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 md:mb-8">
      <div>
        {eyebrow && <p className={`eyebrow mb-2 ${light ? 'text-gold-300' : 'text-gold-600'}`}>{eyebrow}</p>}
        <h2 className={`display text-[1.75rem] leading-tight font-semibold md:text-4xl ${light ? 'text-white' : ''}`}>{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function Badge({ children, tone = 'navy' }: { children: ReactNode; tone?: 'navy' | 'gold' | 'filament' | 'ok' }) {
  const tones = {
    navy: 'bg-navy-900 text-white',
    gold: 'bg-gold-100 text-gold-700',
    filament: 'bg-filament text-white',
    ok: 'bg-ok-50 text-ok',
  }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.68rem] font-bold tracking-wide uppercase ${tones[tone]}`}>{children}</span>
}
