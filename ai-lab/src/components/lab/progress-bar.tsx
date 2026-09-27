export function ProgressBar({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 overflow-hidden rounded-full bg-bone/[0.06]"
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-gold-500 via-gold-300 to-gold-200 transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
