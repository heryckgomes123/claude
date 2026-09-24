import { Users, Zap, CheckCircle2 } from 'lucide-react'
import type { Challenge } from '@/types/models'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { cn, pct } from '@/lib/utils'
import { daysBetween } from '@/lib/dates'

const ACCENT = {
  lift: { ring: 'from-lift/35 via-lift/5', tone: 'lift' as const, text: 'text-lift-2' },
  gold: { ring: 'from-gold/30 via-gold/5', tone: 'gold' as const, text: 'text-gold' },
  ok: { ring: 'from-ok/30 via-ok/5', tone: 'ok' as const, text: 'text-ok' },
}

const METRIC_UNIT: Record<string, string> = { workouts: 'treinos', checkins: 'check-ins', minutes: 'min', streak: 'dias', classes: 'aulas' }

export function ChallengeCard({ challenge: c, compact, onToggle }: { challenge: Challenge; compact?: boolean; onToggle?: (joined: boolean) => void }) {
  const a = ACCENT[c.accent]
  const p = pct(c.progress, c.target)
  const done = c.progress >= c.target
  const daysLeft = Math.max(0, daysBetween(new Date(), new Date(c.endsAt)))
  return (
    <div className={cn('relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br to-transparent p-px', a.ring)}>
      <div className="relative overflow-hidden rounded-[calc(var(--radius-card)-1px)] bg-surface p-4.5">
        <div className="hud-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:linear-gradient(to_left,black,transparent_70%)]" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn('hud-label !text-[10px]', a.text)}>{done ? 'Concluído' : `${daysLeft} ${daysLeft === 1 ? 'dia restante' : 'dias restantes'}`}</p>
            <h3 className="font-display-wide mt-1 text-lg leading-tight font-extrabold uppercase">{c.title}</h3>
            {!compact && <p className="mt-1 text-[13px] text-muted">{c.description}</p>}
          </div>
          <div className="text-right">
            <p className="font-display-wide text-[26px] leading-none font-extrabold tabular">
              {c.progress}
              <span className="text-base text-muted">/{c.target}</span>
            </p>
            <p className="mt-1 text-[11px] text-muted">{METRIC_UNIT[c.metric]}</p>
          </div>
        </div>
        <ProgressBar value={p} tone={a.tone} className="relative mt-4" segments={c.target <= 12 ? c.target : undefined} label={c.title} />
        <div className="relative mt-3 flex items-center justify-between text-[12px] text-ink-2">
          <span className="flex items-center gap-3">
            <span className="font-semibold tabular">{Math.round(p * 100)}%</span>
            <span className="flex items-center gap-1 text-muted">
              <Users size={13} /> {c.participants}
            </span>
            <span className="flex items-center gap-1 text-muted">
              <Zap size={13} /> {c.xpReward} XP
            </span>
          </span>
          {onToggle &&
            (done ? (
              <span className="flex items-center gap-1 font-semibold text-ok">
                <CheckCircle2 size={14} /> Completo
              </span>
            ) : c.joined ? (
              <button onClick={() => onToggle(false)} className="text-[12px] text-muted underline-offset-2 hover:underline">
                Sair
              </button>
            ) : (
              <Button size="sm" onClick={() => onToggle(true)}>
                Participar
              </Button>
            ))}
        </div>
      </div>
    </div>
  )
}
