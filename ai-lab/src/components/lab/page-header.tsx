import { cn } from '@/lib/utils'

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex flex-col gap-5 md:flex-row md:items-end md:justify-between', className)}>
      <div className="max-w-2xl animate-fade-up">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        {description && <p className="mt-3 text-[15px] leading-relaxed text-mute">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
    </header>
  )
}

export function SectionHeader({
  title,
  description,
  action,
  id,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  id?: string
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-mute">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-2xl border border-dashed border-bone/10 px-6 py-14 text-center',
        className,
      )}
    >
      {icon && <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-bone/[0.04] text-gold-300">{icon}</div>}
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1.5 max-w-md text-sm leading-relaxed text-mute">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Faixa curta "como usar" — o produto ensina enquanto é usado. */
export function HowTo({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-mute">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded-full border border-gold-300/30 font-mono text-[10px] text-gold-200">
            {i + 1}
          </span>
          {s}
        </li>
      ))}
    </ol>
  )
}
