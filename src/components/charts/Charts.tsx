/**
 * Gráficos leves em SVG (sem biblioteca) — série única em azul LIFT,
 * marcas finas, pontas arredondadas, grade recessiva e tooltip ao tocar/passar.
 */
import { useId, useState } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

// ── Barras ───────────────────────────────────────────────────
export interface BarDatum {
  label: string
  value: number
  tooltip: string
  highlight?: boolean
}

export function BarChart({ data, height = 132, className, ariaLabel }: { data: BarDatum[]; height?: number; className?: string; ariaLabel: string }) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.value))
  const shown = active ?? data.findIndex((d) => d.highlight)
  return (
    <div className={cn('relative', className)} role="img" aria-label={ariaLabel}>
      <div className="flex items-end gap-2" style={{ height }} onMouseLeave={() => setActive(null)}>
        {data.map((d, i) => {
          const h = Math.max(4, (d.value / max) * (height - 26))
          const on = shown === i
          return (
            <button
              key={i}
              type="button"
              className="group relative flex h-full flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              aria-label={d.tooltip}
            >
              {on && (
                <span className="absolute -top-0.5 z-10 rounded-md border border-line-strong bg-surface-3 px-1.5 py-0.5 text-[10.5px] font-semibold whitespace-nowrap text-ink tabular">
                  {d.value}
                </span>
              )}
              <motion.span
                className={cn('w-full max-w-[26px] rounded-t-[4px] rounded-b-[2px]', on || d.highlight ? 'bg-lift' : 'bg-lift/35 group-hover:bg-lift/55')}
                initial={{ height: 0 }}
                animate={{ height: h }}
                transition={{ delay: 0.03 * i, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex gap-2 border-t border-line pt-2">
        {data.map((d, i) => (
          <span key={i} className={cn('flex-1 text-center text-[10px] font-medium text-muted capitalize', shown === i && 'text-ink')}>
            {d.label}
          </span>
        ))}
      </div>
      {shown !== null && shown >= 0 && <p className="sr-only">{data[shown].tooltip}</p>}
    </div>
  )
}

// ── Área (linha única) ───────────────────────────────────────
export interface LinePoint {
  label: string
  value: number
}

export function AreaChart({
  data,
  height = 150,
  className,
  ariaLabel,
  format = (v: number) => String(v),
}: {
  data: LinePoint[]
  height?: number
  className?: string
  ariaLabel: string
  format?: (v: number) => string
}) {
  const id = useId().replace(/:/g, '')
  const [active, setActive] = useState<number | null>(null)
  const W = 320
  const H = height
  const pad = { t: 14, b: 8 }
  const vals = data.map((d) => d.value)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = Math.max(1, max - min)
  const x = (i: number) => (i / Math.max(1, data.length - 1)) * W
  const y = (v: number) => pad.t + (1 - (v - min) / span) * (H - pad.t - pad.b)
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  const idx = active ?? data.length - 1
  const pt = data[idx]

  const onMove = (clientX: number, rect: DOMRect) => {
    const rel = (clientX - rect.left) / rect.width
    setActive(Math.round(rel * (data.length - 1)))
  }

  return (
    <div className={cn('relative', className)} role="img" aria-label={ariaLabel}>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[12px] text-muted">{pt.label}</span>
        <span className="font-display-wide text-sm font-bold tabular">{format(pt.value)}</span>
      </div>
      <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full touch-pan-y"
        style={{ height: H }}
        onPointerMove={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerDown={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-lift)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-lift)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="rgb(255 255 255 / 0.05)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        <motion.path d={area} fill={`url(#g${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
        <motion.path
          d={line}
          fill="none"
          stroke="var(--color-lift-2)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
        <line x1={x(idx)} x2={x(idx)} y1={0} y2={H} stroke="rgb(255 255 255 / 0.18)" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray="3 3" />
      </svg>
      {/* marcador fora do SVG escalado para manter o círculo redondo */}
      <span
        className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-lift-2"
        style={{ left: `${(x(idx) / W) * 100}%`, top: y(pt.value) }}
      />
      </div>
    </div>
  )
}

// ── Anel ─────────────────────────────────────────────────────
export function RingProgress({
  value,
  size = 64,
  stroke = 6,
  children,
  tone = 'lift',
}: {
  value: number
  size?: number
  stroke?: number
  children?: React.ReactNode
  tone?: 'lift' | 'ok' | 'gold'
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const color = tone === 'ok' ? 'var(--color-ok)' : tone === 'gold' ? 'var(--color-gold)' : 'var(--color-lift)'
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.min(1, Math.max(0, value))) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

// ── Mapa de consistência ─────────────────────────────────────
export interface HeatCell {
  date: Date
  minutes: number
  active: boolean
  future: boolean
}

export function ConsistencyMap({ cells, className }: { cells: HeatCell[]; className?: string }) {
  const [active, setActive] = useState<number | null>(null)
  const weeks = Math.ceil(cells.length / 7)
  const level = (m: number) => (m === 0 ? 0.28 : m < 30 ? 0.5 : m < 50 ? 0.75 : 1)
  const fmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', weekday: 'short' })
  const sel = active !== null ? cells[active] : null
  return (
    <div className={className}>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`, gridAutoFlow: 'column', gridTemplateRows: 'repeat(7, minmax(0,1fr))' }}>
        {cells.map((c, i) => (
          <button
            key={i}
            type="button"
            disabled={c.future}
            onMouseEnter={() => setActive(i)}
            onClick={() => setActive(i)}
            aria-label={`${fmt.format(c.date)}: ${c.active ? `${c.minutes || 'check-in'} ${c.minutes ? 'min' : ''}` : 'sem atividade'}`}
            className={cn('aspect-square rounded-[3px]', c.future ? 'bg-transparent' : c.active ? 'bg-lift' : 'bg-white/6', active === i && 'ring-1 ring-ink')}
            style={c.active && !c.future ? { opacity: level(c.minutes) } : undefined}
          />
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted">
        <span>{sel ? `${fmt.format(sel.date)} · ${sel.active ? (sel.minutes ? `${sel.minutes} min` : 'check-in') : 'sem atividade'}` : 'Últimas 16 semanas'}</span>
        <span className="flex items-center gap-1">
          menos
          {[0, 0.5, 0.75, 1].map((o) => (
            <span key={o} className={cn('size-2.5 rounded-[2px]', o === 0 ? 'bg-white/6' : 'bg-lift')} style={o ? { opacity: o } : undefined} />
          ))}
          mais
        </span>
      </div>
    </div>
  )
}
