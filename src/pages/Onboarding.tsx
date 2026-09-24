import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Flame, Timer as TimerIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LiftWordmark } from '@/components/brand/LiftLogo'
import { MedalBadge } from '@/components/three'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

/* Ilustrações das etapas: construídas com a própria UI do app (sem imagens pesadas). */

function VisualWorkout() {
  return (
    <div className="relative w-64">
      <motion.div
        className="card-surface p-4"
        initial={{ y: 20, opacity: 0, rotate: -4 }}
        animate={{ y: 0, opacity: 1, rotate: -4 }}
        transition={{ delay: 0.1 }}
      >
        <p className="hud-label !text-lift-2">Treino de hoje</p>
        <p className="font-display-wide mt-1 text-2xl font-extrabold uppercase">Performance</p>
        <div className="mt-3 space-y-2">
          {['Agachamento · 4×10', 'Box Jump · 4×6', 'Kettlebell Swing · 3×15'].map((t, i) => (
            <motion.div
              key={t}
              className="flex items-center gap-2 rounded-xl bg-white/4 px-3 py-2 text-[12px] text-ink-2"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              <span className="size-1.5 rounded-full bg-lift" />
              {t}
            </motion.div>
          ))}
        </div>
      </motion.div>
      <motion.div
        className="absolute -right-6 -bottom-6 flex items-center gap-2 rounded-2xl border border-lift/40 bg-lift px-3.5 py-2.5 text-sm font-bold shadow-[0_10px_40px_-10px_rgb(47_107_255/0.8)]"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, type: 'spring' }}
      >
        <TimerIcon size={16} /> 00:42
      </motion.div>
    </div>
  )
}

function VisualStreak() {
  const days = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
  return (
    <div className="flex flex-col items-center">
      <motion.div
        className="grid size-36 place-items-center rounded-full border border-lift/30 bg-lift/10"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        <div className="text-center">
          <Flame className="mx-auto text-lift-2" size={30} />
          <p className="font-display-wide mt-1 text-4xl font-black">12</p>
          <p className="hud-label !text-[9px]">dias</p>
        </div>
      </motion.div>
      <div className="mt-6 flex gap-2">
        {days.map((d, i) => (
          <motion.div
            key={i}
            className={cn('grid size-8 place-items-center rounded-lg text-[11px] font-bold', i < 5 ? 'bg-lift text-white' : 'bg-white/6 text-muted')}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.06 }}
          >
            {d}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function VisualAchievements() {
  const medals = [
    { icon: '🔥', tier: 'bronze' as const },
    { icon: '⚡', tier: 'silver' as const },
    { icon: '🏆', tier: 'gold' as const },
    { icon: '📍', tier: 'lift' as const },
  ]
  return (
    <div className="grid grid-cols-2 gap-5">
      {medals.map((m, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1 + i * 0.1, type: 'spring', stiffness: 260, damping: 16 }}
        >
          <MedalBadge icon={m.icon} tier={m.tier} locked={false} size={84} />
        </motion.div>
      ))}
    </div>
  )
}

function VisualDigital() {
  const bars = [30, 45, 38, 60, 52, 74, 88]
  return (
    <div className="card-surface w-64 p-5">
      <p className="hud-label">Evolução</p>
      <p className="font-display-wide mt-1 text-3xl font-black">
        +32<span className="text-lg text-muted">%</span>
      </p>
      <p className="text-[11px] text-muted">Exemplo ilustrativo</p>
      <div className="mt-4 flex h-24 items-end gap-2">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            className={cn('flex-1 rounded-t-[4px]', i === bars.length - 1 ? 'bg-lift' : 'bg-lift/35')}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ delay: 0.15 + i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>
    </div>
  )
}

const STEPS: { title: string; body: string; visual: ReactNode }[] = [
  { title: 'Seu treino começa aqui.', body: 'Treinos, séries, descanso e orientações do coach — organizados na palma da mão.', visual: <VisualWorkout /> },
  { title: 'Evolua com consistência.', body: 'Check-ins, sequência de dias e metas que transformam disciplina em hábito.', visual: <VisualStreak /> },
  { title: 'Acompanhe cada conquista.', body: 'Desafios, XP, níveis e medalhas para celebrar cada passo da sua jornada.', visual: <VisualAchievements /> },
  { title: 'Sua evolução. Agora digital.', body: 'Dados claros sobre sua frequência e progresso, com a LIFT AI para ajudar a interpretar.', visual: <VisualDigital /> },
]

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const navigate = useNavigate()
  const complete = useAppStore((s) => s.completeOnboarding)
  const last = step === STEPS.length - 1

  const go = (n: number) => {
    if (n < 0 || n >= STEPS.length) return
    setDir(n > step ? 1 : -1)
    setStep(n)
  }
  const finish = () => {
    complete()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col overflow-hidden px-6 pt-safe pb-[max(var(--safe-bottom),24px)]">
      <div className="absolute -top-40 left-1/2 size-[480px] -translate-x-1/2 rounded-full bg-lift/15 blur-[110px]" />
      <div className="relative flex h-12 items-center justify-between">
        <LiftWordmark size="sm" />
        {!last && (
          <button onClick={finish} className="text-[13px] font-semibold text-muted hover:text-ink">
            Pular
          </button>
        )}
      </div>

      <div className="relative flex flex-1 flex-col">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(step + 1)
              else if (info.offset.x > 60) go(step - 1)
            }}
            className="flex flex-1 flex-col"
          >
            <div className="grid min-h-[340px] flex-1 place-items-center py-6">{STEPS[step].visual}</div>
            <div>
              <p className="hud-label !text-lift-2">
                {String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
              </p>
              <h1 className="title-fit mt-3 text-[clamp(28px,8.8vw,38px)] leading-[1.02] font-extrabold uppercase">{STEPS[step].title}</h1>
              <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-ink-2">{STEPS[step].body}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative mt-8 flex items-center justify-between gap-4">
        <div className="flex gap-1.5" role="tablist" aria-label="Etapas">
          {STEPS.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === step}
              aria-label={`Etapa ${i + 1}`}
              onClick={() => go(i)}
              className={cn('h-1.5 rounded-full transition-all duration-300', i === step ? 'w-7 bg-lift' : 'w-1.5 bg-white/20')}
            />
          ))}
        </div>
        {last ? (
          <Button size="lg" onClick={finish} iconRight={<ArrowRight size={18} />}>
            Começar
          </Button>
        ) : (
          <Button size="lg" variant="secondary" onClick={() => go(step + 1)} aria-label="Próximo" icon={<ArrowRight size={20} />} className="!px-4" />
        )}
      </div>
    </div>
  )
}
