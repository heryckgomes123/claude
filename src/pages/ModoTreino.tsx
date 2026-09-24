import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronLeft, ChevronRight, List, SkipForward, Plus, X, Clock, Layers, Zap } from 'lucide-react'
import { workoutById } from '@/data/demo/workouts'
import { exerciseById } from '@/data/demo/exercises'
import { useAppStore } from '@/store/useAppStore'
import { XP_RULES } from '@/config/gamification.config'
import { Button } from '@/components/ui/Button'
import { Timer } from '@/components/ui/Timer'
import { Modal } from '@/components/ui/Modal'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ExerciseVisual } from '@/components/domain/ExerciseVisual'
import { celebrate } from '@/components/domain/Celebration'
import { SoundService } from '@/services/sound/SoundService'
import { fmtClock } from '@/lib/dates'
import { cn, vibrate } from '@/lib/utils'

function useElapsed(startIso: string | undefined) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return startIso ? (now - new Date(startIso).getTime()) / 1000 : 0
}

export default function ModoTreino() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const workout = workoutById(id)
  const active = useAppStore((s) => s.activeWorkout)
  const start = useAppStore((s) => s.startWorkout)
  const update = useAppStore((s) => s.updateActiveWorkout)
  const finish = useAppStore((s) => s.finishWorkout)
  const abandon = useAppStore((s) => s.abandonWorkout)
  const haptics = useAppStore((s) => s.settings.haptics)
  const [confirmExit, setConfirmExit] = useState(false)
  const [showList, setShowList] = useState(false)
  const [setFlash, setSetFlash] = useState(0)
  const [summary, setSummary] = useState<{ minutes: number; sets: number; xp: number } | null>(null)

  useEffect(() => {
    if (workout && (!active || active.workoutId !== workout.id) && !summary) start(workout.id)
  }, [workout, active, start, summary])

  const elapsed = useElapsed(active?.startedAt)
  const totalSets = useMemo(() => workout?.exercises.reduce((s, e) => s + e.sets, 0) ?? 0, [workout])

  const onRestDone = useCallback(() => {
    SoundService.play('restEnd')
    if (haptics) vibrate([30, 60, 30])
    update({ restEndsAt: null })
  }, [haptics, update])

  if (!workout) {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <p className="font-semibold">Treino não encontrado.</p>
          <Button className="mt-4" onClick={() => navigate('/treino')}>Voltar</Button>
        </div>
      </div>
    )
  }

  // ── Resumo final ─────────────────────────────────────────
  if (summary) {
    return (
      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-safe pb-[max(var(--safe-bottom),24px)]">
        <div className="absolute -top-20 left-1/2 size-[420px] -translate-x-1/2 rounded-full bg-lift/20 blur-[100px]" />
        <div className="relative flex flex-1 flex-col justify-center">
          <motion.p className="hud-label !text-lift-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {workout.code} · concluído
          </motion.p>
          <motion.h1 className="font-display-wide mt-3 text-[40px] leading-[0.98] font-black uppercase" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            Treino
            <br />
            concluído.
          </motion.h1>
          <p className="mt-3 text-[15px] text-ink-2">Estrutura. Consistência. Evolução. Mais um dia registrado.</p>
          <div className="mt-8 grid grid-cols-3 gap-2.5">
            {[
              { icon: Clock, v: `${summary.minutes}`, l: 'minutos' },
              { icon: Layers, v: `${summary.sets}`, l: 'séries' },
              { icon: Zap, v: `+${summary.xp}`, l: 'XP' },
            ].map(({ icon: Icon, v, l }, i) => (
              <motion.div key={l} className="card-surface p-4" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 + i * 0.08 }}>
                <Icon size={16} className="text-lift-2" />
                <p className="font-display-wide mt-2.5 text-2xl font-extrabold tabular">{v}</p>
                <p className="text-[11px] text-muted">{l}</p>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="relative space-y-2">
          <Button size="xl" block onClick={() => navigate('/progresso', { replace: true })}>
            Ver meu progresso
          </Button>
          <Button size="lg" variant="ghost" block onClick={() => navigate('/', { replace: true })}>
            Voltar para Home
          </Button>
        </div>
      </div>
    )
  }

  if (!active) return null

  const exIdx = Math.min(active.exerciseIndex, workout.exercises.length - 1)
  const we = workout.exercises[exIdx]
  const ex = exerciseById(we.exerciseId)!
  const doneSets = active.completedSets.length
  const resting = active.restEndsAt !== null && active.restEndsAt > Date.now() - 500
  const isLastSet = active.setIndex >= we.sets - 1
  const isLastExercise = exIdx >= workout.exercises.length - 1

  const completeSet = () => {
    const set = { exerciseId: we.exerciseId, setNumber: active.setIndex + 1, reps: we.reps, load: we.load, completedAt: new Date().toISOString() }
    const completedSets = [...active.completedSets, set]
    if (haptics) vibrate(18)
    SoundService.play('tap')
    setSetFlash((n) => n + 1)

    if (isLastSet && isLastExercise) {
      update({ completedSets })
      const xp = XP_RULES.workoutCompleted + completedSets.length * XP_RULES.setCompleted
      const session = finish(xp)
      setSummary({ minutes: session?.durationMinutes ?? Math.round(elapsed / 60), sets: completedSets.length, xp })
      celebrate({ title: 'Treino concluído', subtitle: `${workout.code} · ${workout.title}`, xp, sound: 'levelUp' })
      return
    }
    const restEndsAt = Date.now() + we.restSeconds * 1000
    const restTotal = we.restSeconds
    if (isLastSet) update({ completedSets, exerciseIndex: exIdx + 1, setIndex: 0, restEndsAt, restTotal })
    else update({ completedSets, setIndex: active.setIndex + 1, restEndsAt, restTotal })
  }

  const jumpTo = (i: number) => {
    update({ exerciseIndex: i, setIndex: 0, restEndsAt: null })
    setShowList(false)
  }

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col overflow-hidden">
      <div className="pointer-events-none absolute -top-32 left-1/2 size-[460px] -translate-x-1/2 rounded-full bg-lift/12 blur-[110px]" />

      {/* Barra superior */}
      <div className="pt-safe relative z-10 px-4">
        <div className="flex h-12 items-center justify-between">
          <button onClick={() => setConfirmExit(true)} className="grid size-10 place-items-center rounded-full bg-white/6 text-ink-2" aria-label="Sair do treino">
            <X size={20} />
          </button>
          <div className="text-center">
            <p className="hud-label !text-[9.5px]">{workout.code} · {workout.title}</p>
            <p className="font-display-wide text-[15px] font-bold tabular">{fmtClock(elapsed)}</p>
          </div>
          <button onClick={() => setShowList(true)} className="grid size-10 place-items-center rounded-full bg-white/6 text-ink-2" aria-label="Lista de exercícios">
            <List size={19} />
          </button>
        </div>
        <ProgressBar value={doneSets / totalSets} size="sm" className="mt-2" label="Progresso do treino" />
        <p className="mt-1.5 text-right text-[11px] text-muted tabular">
          {doneSets}/{totalSets} séries
        </p>
      </div>

      <div className="relative flex flex-1 flex-col px-5">
        <AnimatePresence mode="wait">
          {resting ? (
            <motion.div
              key="rest"
              className="flex flex-1 flex-col items-center justify-center"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
            >
              <Timer endsAt={active.restEndsAt!} totalSeconds={active.restTotal ?? we.restSeconds} onDone={onRestDone} size={236} />
              <div className="mt-8 flex gap-2">
                <Button variant="secondary" icon={<Plus size={16} />} onClick={() => update({ restEndsAt: (active.restEndsAt ?? Date.now()) + 15000, restTotal: (active.restTotal ?? we.restSeconds) + 15 })}>
                  15s
                </Button>
                <Button variant="secondary" icon={<SkipForward size={16} />} onClick={() => update({ restEndsAt: null })}>
                  Pular
                </Button>
              </div>
              <div className="card-surface mt-8 w-full p-4">
                  <p className="hud-label">A seguir</p>
                  <p className="mt-1.5 font-semibold">{ex.name}</p>
                  <p className="text-[12.5px] text-muted">
                    Série {active.setIndex + 1} de {we.sets} · {we.reps} {/^\d+$/.test(we.reps) ? 'reps' : ''}
                  </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`work-${exIdx}`}
              className="flex flex-1 flex-col pt-5"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="hud-label">Exercício atual · {exIdx + 1}/{workout.exercises.length}</p>
              <h1 className="title-fit mt-2 text-[clamp(24px,8.4vw,40px)] leading-[0.98] font-black uppercase">{ex.name}</h1>

              <ExerciseVisual exercise={ex} compact className="mt-5 h-36" />

              <div className="mt-6 grid grid-cols-2 gap-2.5">
                <div className="card-surface p-4">
                  <p className="hud-label">Série</p>
                  <p className="font-display-wide mt-1 text-[40px] leading-none font-black tabular">
                    {active.setIndex + 1}
                    <span className="text-xl text-muted"> / {we.sets}</span>
                  </p>
                </div>
                <div className="card-surface p-4">
                  <p className="hud-label">{/^\d+$/.test(we.reps) ? 'Reps' : 'Meta'}</p>
                  <p className="font-display-wide mt-1 text-[40px] leading-none font-black">{we.reps.replace(' por perna', '')}</p>
                  {we.reps.includes('por perna') && <p className="text-[11px] text-muted">por perna</p>}
                </div>
              </div>
              <div className="mt-2.5 flex gap-2 text-[12.5px] text-ink-2">
                {we.load && <span className="rounded-full bg-white/6 px-3 py-1.5">Carga: {we.load}</span>}
                <span className="rounded-full bg-white/6 px-3 py-1.5">Descanso: {we.restSeconds}s</span>
              </div>
              {(we.notes || ex.cues[0]) && <p className="mt-4 text-[13px] leading-relaxed text-muted">💡 {we.notes ?? ex.cues[0]}</p>}

              {/* séries em pontos */}
              <div className="mt-5 flex gap-1.5">
                {Array.from({ length: we.sets }, (_, i) => (
                  <motion.span
                    key={i + '-' + setFlash}
                    className={cn('h-1.5 flex-1 rounded-full', i < active.setIndex ? 'bg-ok' : i === active.setIndex ? 'bg-lift' : 'bg-white/10')}
                    initial={i === active.setIndex - 1 ? { scaleY: 3 } : false}
                    animate={{ scaleY: 1 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ações */}
      <div className="relative z-10 px-5 pt-4 pb-[max(var(--safe-bottom),20px)]">
        {!resting && (
          <div className="flex items-center gap-2.5">
            <Button variant="secondary" size="xl" className="!w-14 !px-0 shrink-0" disabled={exIdx === 0} onClick={() => jumpTo(exIdx - 1)} aria-label="Exercício anterior" icon={<ChevronLeft size={20} />} />
            <Button size="xl" className="min-w-0 flex-1" icon={<Check size={20} strokeWidth={3} />} onClick={completeSet}>
              {isLastSet && isLastExercise ? 'Finalizar treino' : 'Concluir série'}
            </Button>
            <Button variant="secondary" size="xl" className="!w-14 !px-0 shrink-0" disabled={isLastExercise} onClick={() => jumpTo(exIdx + 1)} aria-label="Próximo exercício" icon={<ChevronRight size={20} />} />
          </div>
        )}
        {/* feedback de série concluída */}
        <AnimatePresence>
          {setFlash > 0 && (
            <motion.span
              key={setFlash}
              className="font-display-wide pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded-full bg-ok/15 px-3 py-1 text-[13px] font-extrabold text-ok"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: [0, 1, 1, 0], y: [10, 0, -6, -16] }}
              transition={{ duration: 1.2 }}
            >
              +{XP_RULES.setCompleted} XP
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <Modal open={showList} onClose={() => setShowList(false)} title="Exercícios">
        <ol className="space-y-2 pb-3">
          {workout.exercises.map((w, i) => {
            const e = exerciseById(w.exerciseId)!
            const done = active.completedSets.filter((s) => s.exerciseId === w.exerciseId).length
            return (
              <li key={w.exerciseId}>
                <button onClick={() => jumpTo(i)} className={cn('flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left', i === exIdx ? 'border-lift/50 bg-lift/10' : 'border-line bg-surface-2')}>
                  <span className={cn('grid size-8 place-items-center rounded-lg text-[12px] font-bold', done >= w.sets ? 'bg-ok/15 text-ok' : 'bg-white/6 text-ink-2')}>
                    {done >= w.sets ? <Check size={15} /> : i + 1}
                  </span>
                  <span className="flex-1 text-[14px] font-semibold">{e.name}</span>
                  <span className="text-[12px] text-muted tabular">
                    {done}/{w.sets}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </Modal>

      <Modal open={confirmExit} onClose={() => setConfirmExit(false)} title="Sair do treino?" variant="center">
        <p className="text-[14px] leading-relaxed text-ink-2">Seu progresso fica salvo neste dispositivo e você pode retomar depois.</p>
        <div className="mt-5 mb-3 flex flex-col gap-2">
          <Button block onClick={() => navigate(-1)}>
            Pausar e sair
          </Button>
          <Button
            block
            variant="danger"
            onClick={() => {
              abandon()
              navigate('/treino', { replace: true })
            }}
          >
            Descartar treino
          </Button>
        </div>
      </Modal>
    </div>
  )
}
