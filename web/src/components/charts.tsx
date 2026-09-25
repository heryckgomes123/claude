/**
 * Gráficos da Central de Comando — SVG leve, sem bibliotecas.
 * Regras: um eixo, marcas finas (barras com topo arredondado de 4px e 2px de
 * espaço), grade recessiva, tooltip em hover/foco, tabela acessível oculta.
 * Paleta categórica validada (daltonismo/contraste) sobre a superfície escura.
 */
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { fmt, shortDay } from '../lib/format';

export const SERIES = ['#c28526', '#3a8cc4', '#d14a22', '#9a7fd1'] as const;
const GRID = 'rgba(214,167,102,0.12)';

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

interface Point {
  label: string;
  value: number;
}

function Tip({ x, y, children, width }: { x: number; y: number; children: ReactNode; width: number }) {
  const left = Math.min(Math.max(x, 70), width - 70);
  return (
    <div className="chart-tip" style={{ left, top: y }}>
      {children}
    </div>
  );
}

function A11yTable({ data, unit }: { data: Point[]; unit: string }) {
  return (
    <table className="sr-only">
      <thead>
        <tr>
          <th>Dia</th>
          <th>{unit}</th>
        </tr>
      </thead>
      <tbody>
        {data.map((d) => (
          <tr key={d.label}>
            <td>{d.label}</td>
            <td>{d.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Barras verticais (série única, magnitude por dia). */
export function BarChart({ data, unit, color = SERIES[0], height = 180, days = true }: { data: Point[]; unit: string; color?: string; height?: number; days?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 600;
  const H = height;
  const pad = { l: 40, r: 8, t: 12, b: 22 };
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const bw = (W - pad.l - pad.r) / data.length;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, max / 2, max];
  return (
    <div className="chart" ref={ref} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${unit} por dia`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.l + i * bw + 1;
          const w = Math.max(2, bw - 2);
          const h = Math.max(0, y(0) - y(d.value));
          const r = Math.min(4, w / 2, h);
          const top = y(d.value);
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${d.label}: ${fmt(d.value)} ${unit}`}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x},${y(0)} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + w - r},${top} Q${x + w},${top} ${x + w},${top + r} L${x + w},${y(0)} Z`}
                  fill={color}
                  opacity={hover === null || hover === i ? 1 : 0.55}
                />
              )}
            </g>
          );
        })}
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="rgba(214,167,102,0.35)" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="chart-yaxis">
        {ticks
          .slice()
          .reverse()
          .map((t) => (
            <span key={t}>{fmt(t)}</span>
          ))}
      </div>
      <div className="chart-xaxis">
        {data.map((d, i) => (
          <span key={d.label} style={{ visibility: i % Math.ceil(data.length / 7) === 0 || i === data.length - 1 ? 'visible' : 'hidden' }}>
            {days ? shortDay(d.label) : d.label}
          </span>
        ))}
      </div>
      {hover !== null && ref.current && (
        <Tip x={((pad.l + (hover + 0.5) * bw) / W) * ref.current.clientWidth} y={(y(data[hover].value) / H) * ref.current.clientHeight} width={ref.current.clientWidth}>
          <b>{fmt(data[hover].value)}</b>
          <span>
            {unit} · {days ? shortDay(data[hover].label) : data[hover].label}
          </span>
        </Tip>
      )}
      <A11yTable data={data} unit={unit} />
    </div>
  );
}

/** Linha com área (série única) e crosshair. */
export function AreaChart({ data, unit, color = SERIES[0], height = 180 }: { data: Point[]; unit: string; color?: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 600;
  const H = height;
  const pad = { l: 40, r: 10, t: 12, b: 22 };
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, data.length - 1);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const path = useMemo(() => data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.value)}`).join(' '), [data, max]);
  const gid = useMemo(() => `ag${Math.random().toString(36).slice(2, 8)}`, []);
  const onMove = (e: React.PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };
  return (
    <div className="chart" ref={ref} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${unit} por dia`}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".35" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, max / 2, max].map((t) => (
          <line key={t} x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} vectorEffect="non-scaling-stroke" />
        ))}
        <path d={`${path} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#${gid})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} stroke="rgba(240,207,131,.5)" vectorEffect="non-scaling-stroke" />}
      </svg>
      {hover !== null && ref.current && <span className="chart-dot" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(data[hover].value) / H) * 100}%`, background: color }} />}
      <div className="chart-yaxis">
        {[max, max / 2, 0].map((t) => (
          <span key={t}>{fmt(t)}</span>
        ))}
      </div>
      <div className="chart-xaxis">
        {data.map((d, i) => (
          <span key={d.label} style={{ visibility: i % Math.ceil(data.length / 7) === 0 || i === data.length - 1 ? 'visible' : 'hidden' }}>
            {shortDay(d.label)}
          </span>
        ))}
      </div>
      {hover !== null && ref.current && (
        <Tip x={(x(hover) / W) * ref.current.clientWidth} y={(y(data[hover].value) / H) * ref.current.clientHeight} width={ref.current.clientWidth}>
          <b>{fmt(data[hover].value)}</b>
          <span>
            {unit} · {shortDay(data[hover].label)}
          </span>
        </Tip>
      )}
      <A11yTable data={data} unit={unit} />
    </div>
  );
}

/** Lista de barras horizontais (ranking de categorias, uma cor). */
export function BarList({ items, color = SERIES[0], format = fmt }: { items: { label: ReactNode; value: number; key: string; sub?: ReactNode }[]; color?: string; format?: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="barlist">
      {items.map((i) => (
        <li key={i.key} title={`${format(i.value)}`}>
          <div className="barlist-row">
            <span className="barlist-label truncate">{i.label}</span>
            <b className="t-num">{format(i.value)}</b>
          </div>
          <div className="barlist-track">
            <span style={{ width: `${(i.value / max) * 100}%`, background: color }} />
          </div>
          {i.sub && <span className="t-xs t-dim">{i.sub}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Barra empilhada de composição (≤ 4 partes), com legenda e rótulos. */
export function StackBar({ parts }: { parts: { label: string; value: number }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div className="stackbar">
      <div className="stackbar-track" role="img" aria-label={parts.map((p) => `${p.label}: ${fmt(p.value)}`).join(', ')}>
        {parts.map((p, i) =>
          p.value > 0 ? <span key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: SERIES[i % SERIES.length] }} title={`${p.label}: ${fmt(p.value)}`} /> : null,
        )}
      </div>
      <ul className="stackbar-legend">
        {parts.map((p, i) => (
          <li key={p.label}>
            <i style={{ background: SERIES[i % SERIES.length] }} />
            <span>{p.label}</span>
            <b className="t-num">{fmt(p.value)}</b>
            <span className="t-dim t-xs">{((p.value / total) * 100).toFixed(1).replace('.', ',')}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
