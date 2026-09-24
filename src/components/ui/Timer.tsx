import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { fmtClock } from '@/lib/dates'
import { cn } from '@/lib/utils'

interface TimerProps {
  /** Timestamp (ms) de término */
  endsAt: number
  totalSeconds: number
  onDone?: () => void
  size?: number
  label?: string
  className?: string
}

/** Contagem regressiva circular (descanso entre séries). Baseada em timestamp: resiste a abas em segundo plano. */
export function Timer({ endsAt, totalSeconds, onDone, size = 220, label = 'Descanso', className }: TimerProps) {
  const [now, setNow] = useState(() => Date.now())
  const doneRef = useRef(false)
  useEffect(() => {
    doneRef.current = false
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [endsAt])
  const remaining = Math.max(0, (endsAt - now) / 1000)
  useEffect(() => {
    if (remaining <= 0 && !doneRef.current) {
      doneRef.current = true
      onDone?.()
    }
  }, [remaining, onDone])

  const r = size / 2 - 10
  const c = 2 * Math.PI * r
  const frac = totalSeconds > 0 ? remaining / totalSeconds : 0
  const urgent = remaining <= 5

  return (
    <div className={cn('relative grid place-items-center', className)} style={{ width: size, height: size }} role="timer" aria-live="off">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth={6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={urgent ? 'var(--color-warn)' : 'var(--color-lift)'}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.3s' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="hud-label">{label}</span>
        <motion.span
          key={urgent ? 'u' : 'n'}
          initial={{ scale: 0.96 }}
          animate={{ scale: 1 }}
          className={cn('font-display-wide mt-1 text-[52px] leading-none font-extrabold tabular', urgent && 'text-warn')}
        >
          {fmtClock(Math.ceil(remaining))}
        </motion.span>
      </div>
    </div>
  )
}
