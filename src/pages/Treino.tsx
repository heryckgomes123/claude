import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, Clock, Dumbbell, Info, Layers, Play, Timer as TimerIcon, Weight } from 'lucide-react'
import { Header } from '@/components/ui/Header'
import { Card, SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, LoadingState } from '@/components/ui/States'
import { WorkoutCard } from '@/components/domain/WorkoutCard'
import { ExerciseVisual } from '@/components/domain/ExerciseVisual'
import { liftApi } from '@/services/api/liftApi'
import { useResource } from '@/hooks/useResource'
import { exerciseById } from '@/data/demo/exercises'
import { todaysWorkout } from '@/data/demo/workouts'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

export function TreinoList() {
  const navigate = useNavigate()
  const { data, loading } = useResource(() => liftApi.listWorkouts())
  const today = todaysWorkout()
  const active = useAppStore((s) => s.activeWorkout)

  return (
    <div>
      <Header title="Treinos" subtitle="Seu plano" />
      <div className="space-y-3 px-4">
        {active && (
          <Card glow className="flex items-center justify-between gap-3">
            <div>
              <p className="hud-label !text-lift-2">Em andamento</p>
              <p className="mt-1 font-semibold">{data?.find((w) => w.id === active.workoutId)?.title ?? 'Treino'}</p>
            </div>
            <Button size="sm" icon={<Play size={14} fill="currentColor" />} onClick={() => navigate(`/treino/${active.workoutId}/modo`)}>
              Retomar
            </Button>
          </Card>
        )}
        {loading && <LoadingState rows={4} />}
        {data?.map((w, i) => (
          <motion.div key={w.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <WorkoutCard workout={w} today={w.id === today?.id} onClick={() => navigate(`/treino/${w.id}`)} />
          </motion.div>
        ))}
        {data && data.length === 0 && <EmptyState icon={<Dumbbell />} title="Nenhum treino ainda" body="Seu coach vai liberar seu plano de treino por aqui." />}
        <p className="px-1 pt-2 text-center text-[11.5px] text-muted">Treinos de demonstração. Em produção, serão prescritos pela equipe LIFT.</p>
      </div>
    </div>
  )
}

export function TreinoDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: workout, loading } = useResource(() => liftApi.getWorkout(id), [id])
  const [open, setOpen] = useState<number | null>(0)

  if (loading) return <div className="px-4 pt-20"><LoadingState rows={5} /></div>
  if (!workout)
    return (
      <div className="px-4">
        <Header title="Treino" back="/treino" />
        <EmptyState title="Treino não encontrado" />
      </div>
    )

  const totalSets = workout.exercises.reduce((s, e) => s + e.sets, 0)

  return (
    <div className="pb-28">
      <Header title={workout.title} subtitle={`${workout.code} · ${workout.modality}`} back="/treino" />
      <div className="px-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Clock, v: `${workout.estimatedMinutes}`, l: 'min' },
            { icon: Dumbbell, v: `${workout.exercises.length}`, l: 'exercícios' },
            { icon: Layers, v: `${totalSets}`, l: 'séries' },
          ].map(({ icon: Icon, v, l }) => (
            <div key={l} className="card-surface p-3.5">
              <Icon size={16} className="text-lift-2" />
              <p className="font-display-wide mt-2 text-xl font-bold">{v}</p>
              <p className="text-[11px] text-muted">{l}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="lift">{workout.focus}</Badge>
          <Badge className="capitalize">{workout.level}</Badge>
          <Badge>{workout.coachName}</Badge>
        </div>

        {workout.notes && (
          <div className="mt-4 flex gap-2.5 rounded-2xl border border-line bg-surface-2 p-3.5 text-[13px] leading-relaxed text-ink-2">
            <Info size={16} className="mt-0.5 shrink-0 text-lift-2" />
            {workout.notes}
          </div>
        )}

        <SectionTitle title="Exercícios" className="mt-7" />
        <ol className="space-y-2.5">
          {workout.exercises.map((we, i) => {
            const ex = exerciseById(we.exerciseId)
            if (!ex) return null
            const isOpen = open === i
            return (
              <li key={we.exerciseId} className="card-surface overflow-hidden">
                <button className="flex w-full items-center gap-3.5 p-4 text-left" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen}>
                  <span className="font-display-wide grid size-9 shrink-0 place-items-center rounded-xl bg-surface-3 text-sm font-bold text-ink-2">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{ex.name}</p>
                    <p className="mt-0.5 text-[12.5px] text-muted">
                      {we.sets} × {we.reps}
                      {we.load ? ` · ${we.load}` : ''}
                    </p>
                  </div>
                  <ChevronDown size={18} className={cn('text-muted transition-transform', isOpen && 'rotate-180')} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                      <div className="space-y-3.5 border-t border-line p-4">
                        <ExerciseVisual exercise={ex} className="h-40" />
                        <div className="grid grid-cols-4 gap-2 text-center">
                          {[
                            { l: 'Séries', v: we.sets },
                            { l: 'Reps', v: we.reps },
                            { l: 'Carga', v: we.load ?? '—' },
                            { l: 'Descanso', v: `${we.restSeconds}s` },
                          ].map((s) => (
                            <div key={s.l} className="rounded-xl bg-surface-2 px-1 py-2.5">
                              <p className="text-[10px] tracking-wide text-muted uppercase">{s.l}</p>
                              <p className="mt-0.5 text-[13px] leading-tight font-semibold">{s.v}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-[13.5px] leading-relaxed text-ink-2">{ex.description}</p>
                        <ul className="space-y-1.5">
                          {ex.cues.map((c) => (
                            <li key={c} className="flex gap-2 text-[13px] text-ink-2">
                              <span className="mt-2 size-1 shrink-0 rounded-full bg-lift" /> {c}
                            </li>
                          ))}
                        </ul>
                        {we.notes && (
                          <p className="rounded-xl bg-lift/8 px-3 py-2.5 text-[12.5px] text-lift-3">
                            <strong>Obs. do coach:</strong> {we.notes}
                          </p>
                        )}
                        {ex.equipment.length > 0 && (
                          <p className="flex items-center gap-1.5 text-[12px] text-muted">
                            <Weight size={13} /> {ex.equipment.join(' · ')}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pt-8 pb-[calc(var(--nav-h)+var(--safe-bottom)+22px)]">
        <Button size="xl" block icon={<TimerIcon size={18} />} onClick={() => navigate(`/treino/${workout.id}/modo`)}>
          Começar treino
        </Button>
      </div>
    </div>
  )
}
