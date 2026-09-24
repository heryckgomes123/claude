import type { AchievementState } from '@/services/progress'
import { MedalBadge } from '@/components/three'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { fmtDay } from '@/lib/dates'
import { cn, pct } from '@/lib/utils'

export function AchievementCard({ a, onClick }: { a: AchievementState; onClick?: () => void }) {
  const unlocked = !!a.unlockedAt
  return (
    <button
      onClick={onClick}
      className={cn(
        'card-surface flex flex-col items-center p-4 text-center transition-colors hover:border-line-strong active:scale-[0.98]',
        !unlocked && 'opacity-90',
      )}
    >
      <MedalBadge icon={a.icon} tier={a.tier} locked={!unlocked} size={60} />
      <h3 className={cn('mt-3 text-[13px] leading-tight font-bold', !unlocked && 'text-ink-2')}>{a.name}</h3>
      {unlocked ? (
        <p className="mt-1.5 text-[11px] text-muted">{fmtDay(a.unlockedAt!)}</p>
      ) : (
        <div className="mt-2.5 w-full">
          <ProgressBar value={pct(a.progress, a.target)} size="sm" />
          <p className="mt-1.5 text-[11px] text-muted tabular">
            {a.progress.toLocaleString('pt-BR')}/{a.target.toLocaleString('pt-BR')}
          </p>
        </div>
      )}
    </button>
  )
}
