import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import type { Channel } from '../lib/types'
import { CHANNEL_LABEL } from '../lib/audience'
import { Icon, type IconName } from './Icon'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-navy text-white font-medium shadow-[0_1px_2px_rgb(8_27_46/0.2),inset_0_1px_0_rgb(255_255_255/0.08)] hover:bg-navy-700',
  secondary: 'border border-line bg-surface text-fg font-medium shadow-xs hover:border-line-strong hover:bg-sunken',
  ghost: 'text-muted hover:bg-subtle hover:text-fg',
  danger: 'border border-danger/25 bg-surface text-danger font-medium shadow-xs hover:bg-danger/5',
}

export function Button({
  variant = 'secondary',
  icon,
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: IconName; size?: 'sm' | 'md' }) {
  const sizing = size === 'sm' ? 'h-8 px-3 text-[13px] gap-1.5 rounded-lg' : 'h-9 px-3.5 text-[13.5px] gap-2 rounded-[10px]'
  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap transition disabled:opacity-40 ${sizing} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  )
}

export function IconButton({ icon, label, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-subtle hover:text-fg disabled:opacity-40 ${className}`}
      {...props}
    >
      <Icon name={icon} size={16} />
    </button>
  )
}

export function Badge({ children, tone = 'default', className = '' }: { children: ReactNode; tone?: 'default' | 'brand' | 'success' | 'danger' | 'info'; className?: string }) {
  const tones = {
    default: 'border-line bg-sunken text-muted',
    brand: 'border-brand/30 bg-brand-100 text-accent',
    success: 'border-success/20 bg-success/8 text-success',
    danger: 'border-danger/20 bg-danger/8 text-danger',
    info: 'border-info/20 bg-info/8 text-info',
  }
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${tones[tone]} ${className}`}>{children}</span>
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className={`relative h-5 w-9 shrink-0 rounded-full border transition ${checked ? 'border-success bg-success' : 'border-line-strong bg-subtle'}`}
    >
      <span className={`absolute top-[2px] size-3.5 rounded-full bg-white shadow-[0_1px_2px_rgb(8_27_46/0.25)] transition-all ${checked ? 'left-[18px]' : 'left-[2px]'}`} />
    </button>
  )
}

const CHANNEL_ICON: Record<Channel, IconName> = {
  instagram: 'instagram',
  whatsapp: 'whatsapp',
  messenger: 'messenger',
  telegram: 'telegram',
  web: 'globe',
}

export const CHANNEL_COLOR: Record<Channel, string> = {
  instagram: '#d6297a',
  whatsapp: '#16a34a',
  messenger: '#2f6feb',
  telegram: '#1c93d1',
  web: '#007a8d',
}

export function ChannelIcon({ channel, size = 14 }: { channel: Channel; size?: number }) {
  return (
    <span style={{ color: CHANNEL_COLOR[channel] }} title={CHANNEL_LABEL[channel]}>
      <Icon name={CHANNEL_ICON[channel]} size={size} />
    </span>
  )
}

export function ChannelBadge({ channel }: { channel: Channel }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
      <ChannelIcon channel={channel} />
      {CHANNEL_LABEL[channel]}
    </span>
  )
}

export function Avatar({ name, hue, size = 36, isTest = false }: { name: string; hue: number; size?: number; isTest?: boolean }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        color: isTest ? '#ffffff' : `hsl(${hue} 45% 30%)`,
        background: isTest ? 'linear-gradient(135deg,#18385a,#081b2e)' : `hsl(${hue} 70% 92%)`,
        boxShadow: isTest ? undefined : `inset 0 0 0 1px hsl(${hue} 50% 84%)`,
      }}
    >
      {isTest ? <Icon name="bot" size={size * 0.5} /> : initials || '?'}
    </span>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-poster text-[24px] leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-[13.5px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Empty({ icon, title, text, action }: { icon: IconName; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 grid size-12 place-items-center rounded-xl border border-line bg-sunken text-navy-600">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] text-muted">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`pop-in flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-line bg-surface shadow-pop sm:rounded-2xl ${wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-subtle px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <IconButton icon="x" label="Fechar" onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-subtle px-5 py-4">{footer}</div>}
      </div>
    </div>
  )
}

export function Stat({ label, value, hint, icon, tone = 'brand' }: { label: string; value: string; hint?: string; icon: IconName; tone?: 'brand' | 'success' | 'info' }) {
  const color = tone === 'success' ? 'bg-success/8 text-success' : tone === 'info' ? 'bg-info/8 text-info' : 'bg-brand-100 text-accent'
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        <span className={`grid size-7 place-items-center rounded-lg ${color}`}>
          <Icon name={icon} size={15} />
        </span>
      </div>
      <div className="mt-3 font-poster text-[28px] leading-none">{value}</div>
      {hint && <div className="mt-2 text-[12.5px] text-faint">{hint}</div>}
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string; count?: number }[] }) {
  return (
    <div className="flex gap-0.5 overflow-x-auto rounded-[10px] bg-subtle p-[3px]">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-[8px] px-3 py-1 text-[13px] font-medium transition ${value === o.id ? 'bg-surface text-fg shadow-[0_1px_2px_rgb(8_27_46/0.08)]' : 'text-muted hover:text-fg'}`}
        >
          {o.label}
          {o.count !== undefined && <span className="text-[11px] text-faint">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

/** Campo de lista de palavras/tags: Enter ou vírgula adiciona. */
export function ChipInput({ values, onChange, placeholder, suggestions = [] }: { values: string[]; onChange: (v: string[]) => void; placeholder?: string; suggestions?: string[] }) {
  const [draft, setDraft] = useState('')
  const listId = useRef(`chips-${Math.random().toString(36).slice(2)}`).current
  const add = (raw: string) => {
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    const next = [...values]
    for (const p of parts) if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p)
    onChange(next)
    setDraft('')
  }
  return (
    <div className="field flex min-h-10 flex-wrap items-center gap-1.5 !py-1.5">
      {values.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-md border border-line bg-sunken py-0.5 pl-2 pr-1 text-[12px]">
          {v}
          <button type="button" aria-label={`Remover ${v}`} className="rounded text-muted hover:text-fg" onClick={() => onChange(values.filter((x) => x !== v))}>
            <Icon name="x" size={12} />
          </button>
        </span>
      ))}
      <input
        list={suggestions.length ? listId : undefined}
        value={draft}
        onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (draft.trim()) add(draft)
          } else if (e.key === 'Backspace' && !draft && values.length) onChange(values.slice(0, -1))
        }}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={values.length ? '' : placeholder}
        className="min-w-[90px] flex-1 bg-transparent py-0.5 text-[13px] outline-none placeholder:text-faint"
      />
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  )
}

/* ───────────── Toasts ───────────── */

type ToastItem = { id: number; text: string; tone: 'ok' | 'error' }
let pushToast: ((t: ToastItem) => void) | null = null
let toastId = 0

export function toast(text: string, tone: 'ok' | 'error' = 'ok'): void {
  pushToast?.({ id: ++toastId, text, tone })
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])
  useEffect(() => {
    pushToast = (t) => {
      setItems((list) => [...list, t])
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== t.id)), 3200)
    }
    return () => {
      pushToast = null
    }
  }, [])
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="pop-in flex items-center gap-2.5 rounded-xl bg-navy px-4 py-3 text-[13px] text-white shadow-pop">
          <span className={t.tone === 'ok' ? 'text-brand' : 'text-[#ff8a8a]'}>
            <Icon name={t.tone === 'ok' ? 'check' : 'alert'} size={16} />
          </span>
          {t.text}
        </div>
      ))}
    </div>
  )
}

export function download(filename: string, content: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function copyText(text: string, label = 'Copiado!'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    toast(label)
  } catch {
    toast('Não foi possível copiar.', 'error')
  }
}
