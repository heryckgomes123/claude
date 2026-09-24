"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Hero number tile — for a single headline value, a chart would be noise. */
export function StatTile({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "green" | "red" | "default" }) {
  return (
    <div className="card min-w-0 p-4">
      <p className="truncate text-[12px] text-muted">{label}</p>
      <p className={cn("mt-1 truncate text-[22px] font-semibold tracking-tight tabular-nums", tone === "green" && "text-green", tone === "red" && "text-red")}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-faint">{hint}</p>}
    </div>
  );
}

/**
 * Single-series vertical bar chart (magnitude over categories/time).
 * One hue, thin bars with 4px rounded data-ends on the baseline, recessive axis,
 * per-bar hover tooltip, and a visually-hidden table for screen readers.
 */
export function BarChart({ data, format = (v) => v.toLocaleString("pt-BR"), height = 160, title }: { data: { label: string; value: number }[]; format?: (v: number) => string; height?: number; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure className="min-w-0">
      <div className="relative flex items-end gap-[2px] border-b border-line" style={{ height }} onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <div
            key={i}
            className="group relative flex h-full min-w-0 flex-1 cursor-default items-end justify-center"
            onMouseEnter={() => setHover(i)}
            onTouchStart={() => setHover(i)}
          >
            <div
              className={cn("w-full max-w-7 rounded-t-[4px] transition-colors", hover === i ? "bg-[#a98bff]" : "bg-violet/80")}
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 3 : 0 }}
            />
            {hover === i && (
              <div className="glass pointer-events-none absolute bottom-full z-10 mb-2 rounded-lg px-2 py-1 text-center text-[11px] whitespace-nowrap shadow-xl">
                <span className="block text-muted">{d.label}</span>
                <span className="font-semibold text-ink tabular-nums">{format(d.value)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[2px]">
        {data.map((d, i) => (
          <span key={i} className="min-w-0 flex-1 truncate text-center text-[10px] text-faint">
            {data.length <= 12 || i % Math.ceil(data.length / 8) === 0 ? d.label : ""}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <th>{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Ranked horizontal bars with direct labels — identity by label, magnitude by length. */
export function RankBars({ data, format = (v) => v.toLocaleString("pt-BR") }: { data: { label: string; value: number }[]; format?: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="grid gap-2.5">
      {data.map((d) => (
        <div key={d.label} className="grid gap-1">
          <div className="flex items-baseline justify-between gap-2 text-[13px]">
            <span className="truncate">{d.label}</span>
            <span className="shrink-0 text-muted tabular-nums">{format(d.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-violet/80" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
