import { Clock, Dumbbell, Play } from 'lucide-react'
import type { Workout } from '@/types/models'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

export function WorkoutCard({ workout, onClick, today, className }: { workout: Workout; onClick?: () => void; today?: boolean; className?: string }) {
  return (
    <Card onClick={onClick} className={cn('flex items-center gap-4', className)} glow={today}>
      <div
        className={cn(
          'grid size-14 shrink-0 place-items-center rounded-2xl font-display-wide text-lg font-extrabold',
          today ? 'bg-lift text-white' : 'bg-surface-3 text-ink-2',
        )}
      >
        {workout.code.replace('Treino ', '')}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-display-wide truncate text-[15px] font-bold uppercase">{workout.title}</h3>
          {today && <Badge tone="lift">Hoje</Badge>}
        </div>
        <p className="mt-0.5 truncate text-[13px] text-muted">{workout.focus}</p>
        <div className="mt-2 flex items-center gap-3 text-[12px] text-ink-2">
          <span className="flex items-center gap-1">
            <Clock size={13} /> {workout.estimatedMinutes} min
          </span>
          <span className="flex items-center gap-1">
            <Dumbbell size={13} /> {workout.exercises.length} exercícios
          </span>
        </div>
      </div>
      <div className="grid size-9 place-items-center rounded-full bg-white/5 text-ink-2">
        <Play size={15} fill="currentColor" />
      </div>
    </Card>
  )
}
