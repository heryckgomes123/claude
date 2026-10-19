/**
 * Gráficos em SVG puro. Série única em dourado (a cor da marca), marcas finas,
 * grade recessiva, rótulos em tokens de texto e tooltip no hover.
 */
import { useEffect, useRef, useState } from 'react'
import { formatNumber } from '../lib/util'

const SERIES = 'var(--color-gold)'

function niceMax(value: number): number {
  if (value <= 5) return 5
  const pow = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= value / 4)! * pow
  return Math.ceil(value / step) * step
}

function compact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace('.0', '')}K` : String(n)
}

export interface ColumnDatum {
  label: string
  value: number
  detail?: string
}

/** Colunas com eixo Y, tooltip por coluna e tabela acessível. */
export function ColumnChart({ data, height = 220, unit }: { data: ColumnDatum[]; height?: number; unit: string }) {
  const [hover, setHover] = useState<number | null>(null)
  // Desenha na largura real do contêiner para manter o texto legível no celular.
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const pad = { top: 16, right: 8, bottom: 28, left: 36 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)))
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max]
  const band = innerW / data.length
  const barW = Math.min(24, band * 0.62)
  const y = (v: number) => pad.top + innerH - (v / max) * innerH

  return (
    <div ref={box} className="relative">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block" role="img" aria-label={`Gráfico de colunas: ${unit} por dia`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--color-ink-800)" strokeWidth={1} />
            <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--color-mute-600)">
              {compact(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.left + band * i + (band - barW) / 2
          const h = Math.max(0, y(0) - y(d.value))
          const r = Math.min(4, h)
          return (
            <g key={d.label}>
              {h > 0 && (
                <path
                  d={`M${x},${y(0)} v${-(h - r)} q0,${-r} ${r},${-r} h${barW - 2 * r} q${r},0 ${r},${r} v${h - r} z`}
                  fill={SERIES}
                  opacity={hover === null || hover === i ? 1 : 0.35}
                />
              )}
              {(band >= 34 || i % 2 === (data.length - 1) % 2) && (
                <text x={pad.left + band * i + band / 2} y={height - 8} textAnchor="middle" fontSize={11} fill="var(--color-mute-600)">
                  {d.label}
                </text>
              )}
              <rect
                x={pad.left + band * i}
                y={pad.top}
                width={band}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${d.label}: ${d.value} ${unit}`}
              />
            </g>
          )
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-[12px] shadow-xl"
          style={{ left: `${((pad.left + band * hover + band / 2) / width) * 100}%` }}
        >
          <div className="text-mute">{data[hover].detail ?? data[hover].label}</div>
          <div className="mt-0.5 flex items-center gap-1.5 font-semibold text-bone">
            <span className="inline-block size-2 rounded-sm" style={{ background: SERIES }} />
            {formatNumber(data[hover].value)} {unit}
          </div>
        </div>
      )}
      <table className="sr-only">
        <caption>{unit} por dia</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th>{d.detail ?? d.label}</th>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Barras horizontais com rótulo à esquerda e valor na ponta. */
export function BarList({ data, format = formatNumber }: { data: { label: string; value: number; hint?: string }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[minmax(84px,30%)_1fr] items-center gap-3 text-[13px]" title={d.hint}>
          <span className="truncate text-mute">{d.label}</span>
          <span className="flex items-center gap-2">
            <span className="h-3 rounded-r-[4px]" style={{ width: `${Math.max(1.5, (d.value / max) * 82)}%`, background: SERIES }} />
            <span className="whitespace-nowrap tabular-nums text-bone">{format(d.value)}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
