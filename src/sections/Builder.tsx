import { AnimatePresence, animate, m, useMotionValue, useTransform } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import mark from '../assets/brand/mark.webp'
import { Burst } from '../components/Burst'
import { Check } from '../components/Check'
import { CtaButton } from '../components/CtaButton'
import { ArrowRight } from '../components/Icons'
import { SectionHeader } from '../components/SectionHeader'
import { BUILDER_OBJECTIVES, MOMENTS, SERVICES, composePlanMessage } from '../data/builder'
import type { Service } from '../data/builder'

const EASE = [0.22, 1, 0.36, 1] as const
const STEPS = ['Objetivo', 'Frentes', 'Momento'] as const
const LEVELS = ['Vamos começar', 'Boa escolha!', 'Quase lá…', 'Plano pronto!']

export function Builder() {
  const [step, setStep] = useState(0) // 0..2 passos, 3 = concluído
  const [objectiveId, setObjectiveId] = useState<string>()
  const [services, setServices] = useState<Service[]>([])
  const [momentId, setMomentId] = useState<string>()
  const [burstKey, setBurstKey] = useState<string>()

  const objective = BUILDER_OBJECTIVES.find((o) => o.id === objectiveId)
  const moment = MOMENTS.find((mo) => mo.id === momentId)
  const done = [!!objective, step >= 2 && services.length > 0, !!moment].filter(Boolean).length
  const complete = step === 3
  const message = useMemo(() => composePlanMessage(objective?.title, services, moment?.title), [objective, services, moment])

  const chooseObjective = (id: string) => {
    const o = BUILDER_OBJECTIVES.find((x) => x.id === id)!
    setObjectiveId(id)
    setServices(o.preset)
    setBurstKey(`o-${id}-${Date.now()}`)
    window.setTimeout(() => setStep(1), 420)
  }
  const toggleService = (s: Service) => {
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
    setBurstKey(`s-${s}-${Date.now()}`)
  }
  const chooseMoment = (id: string) => {
    setMomentId(id)
    setBurstKey(`m-${id}-${Date.now()}`)
    window.setTimeout(() => setStep(3), 420)
  }
  const reset = () => {
    setStep(0)
    setObjectiveId(undefined)
    setServices([])
    setMomentId(undefined)
  }

  return (
    <section id="monte" aria-labelledby="builder-title" className="grain relative overflow-hidden border-t border-gold-300/10">
      <div className="pointer-events-none absolute -right-40 top-1/3 size-[700px] rounded-full bg-[radial-gradient(closest-side,rgb(226_174_58/0.13),transparent)]" />
      <div className="pointer-events-none absolute -left-40 bottom-0 size-[500px] rounded-full bg-[radial-gradient(closest-side,rgb(60_255_143/0.05),transparent)]" />

      <div className="container-x relative py-24 md:py-36">
        <SectionHeader
          id="builder-title"
          eyebrow="Monte seu plano · 3 cliques"
          title={
            <>
              Monte sua <span className="slant text-gold-shine">estrutura.</span>
            </>
          }
          description="Escolha o objetivo, as frentes e o seu momento. Seu plano sai pronto para enviar no WhatsApp — a gente continua a conversa por lá."
        />

        <div className="mt-12 grid gap-4 md:mt-16 lg:grid-cols-12 lg:gap-6">
          {/* Painel de passos */}
          <div className="gold-edge relative rounded-[2rem] bg-ink-900/80 p-5 backdrop-blur-sm [--edge-opacity:0.45] sm:p-7 md:p-9 lg:col-span-7">
            <Progress done={complete ? 3 : done} step={step} onStep={(i) => i < step && !complete && setStep(i)} />

            <div className="relative mt-8 min-h-[360px]">
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <Panel key="s0" title="Qual é o seu objetivo principal?">
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {BUILDER_OBJECTIVES.map((o, i) => (
                        <Tile
                          key={o.id}
                          selected={objectiveId === o.id}
                          onClick={() => chooseObjective(o.id)}
                          burst={objectiveId === o.id ? burstKey : undefined}
                          className={i === BUILDER_OBJECTIVES.length - 1 ? 'sm:col-span-2' : ''}
                        >
                          <span className="poster block text-[1.45rem] leading-[1.02]">{o.title}</span>
                          <span className="mt-2 block text-[0.85rem] leading-snug text-mute">{o.description}</span>
                        </Tile>
                      ))}
                    </div>
                  </Panel>
                )}

                {step === 1 && (
                  <Panel
                    key="s1"
                    title="Quais frentes você quer ativar?"
                    hint="Já deixamos marcado o que costuma fazer sentido — ajuste como quiser."
                  >
                    <div className="flex flex-wrap gap-2">
                      {SERVICES.map((s) => {
                        const on = services.includes(s)
                        return (
                          <button
                            key={s}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleService(s)}
                            className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[0.88rem] font-medium transition-all duration-300 ease-premium active:scale-95 ${
                              on
                                ? 'bg-gold-metal text-ink-950 shadow-[0_8px_24px_-8px_rgb(247_201_72/0.7)]'
                                : 'bg-white/[0.04] text-bone/75 ring-1 ring-inset ring-white/10 hover:text-bone hover:ring-gold-300/40'
                            }`}
                          >
                            <span
                              className={`grid size-4 place-items-center rounded-full transition-all ${on ? 'bg-ink-950 text-gold-200' : 'ring-1 ring-white/25'}`}
                            >
                              {on && <Check className="size-3" />}
                            </span>
                            {s}
                            {on && burstKey?.startsWith(`s-${s}-`) && <Burst key={burstKey} />}
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-8 flex items-center justify-between gap-4">
                      <button type="button" onClick={() => setStep(0)} className="text-sm text-mute transition-colors hover:text-bone">
                        ← Voltar
                      </button>
                      <button
                        type="button"
                        disabled={!services.length}
                        onClick={() => setStep(2)}
                        className="btn-gold inline-flex h-12 items-center gap-2 rounded-full px-6 text-[0.82rem] font-semibold uppercase tracking-[0.06em] transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                      >
                        Continuar
                        <ArrowRight className="size-4" />
                      </button>
                    </div>
                  </Panel>
                )}

                {step === 2 && (
                  <Panel key="s2" title="Em que momento está o seu negócio?">
                    <div className="grid gap-2.5">
                      {MOMENTS.map((mo) => (
                        <Tile
                          key={mo.id}
                          selected={momentId === mo.id}
                          onClick={() => chooseMoment(mo.id)}
                          burst={momentId === mo.id ? burstKey : undefined}
                        >
                          <span className="poster block text-[1.45rem] leading-[1.02]">{mo.title}</span>
                          <span className="mt-2 block text-[0.85rem] text-mute">{mo.description}</span>
                        </Tile>
                      ))}
                    </div>
                    <button type="button" onClick={() => setStep(1)} className="mt-6 text-sm text-mute transition-colors hover:text-bone">
                      ← Voltar
                    </button>
                  </Panel>
                )}

                {step === 3 && (
                  <m.div
                    key="done"
                    className="flex min-h-[360px] flex-col items-start justify-center"
                    initial={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.6, ease: EASE }}
                  >
                    <span className="relative grid size-16 place-items-center rounded-full bg-neon/10 text-neon ring-1 ring-neon/50">
                      <Check className="size-7" />
                      <span className="absolute inset-0 animate-[ping-ring_1.6s_ease-out_infinite] rounded-full border border-neon/60" />
                      <Burst />
                    </span>
                    <p className="poster mt-6 text-[3rem] leading-none md:text-[4rem]">
                      <span className="slant text-gold-shine">Plano pronto!</span>
                    </p>
                    <p className="mt-3 max-w-md text-pretty text-mute">
                      Seu plano já está montado. Envie pelo WhatsApp e a INTELRA retorna com os próximos passos para o seu negócio.
                    </p>
                    <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                      <CtaButton size="lg" icon="whatsapp" message={message} className="w-full sm:w-auto">
                        Enviar meu plano
                      </CtaButton>
                      <button
                        type="button"
                        onClick={reset}
                        className="h-12 rounded-full px-5 text-sm text-mute transition-colors hover:text-bone"
                      >
                        Refazer
                      </button>
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Plano ao vivo */}
          <aside className="lg:col-span-5">
            <div className="relative overflow-hidden rounded-[2rem] border border-gold-300/25 bg-gradient-to-b from-ink-850 to-ink-950 p-6 shadow-[0_40px_100px_-50px_rgb(226_174_58/0.5)] sm:p-8 lg:sticky lg:top-28">
              <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[radial-gradient(closest-side,rgb(247_201_72/0.22),transparent)]" />
              <div className="relative flex items-center justify-between">
                <p className="poster text-[1.6rem]">Seu plano INTELRA</p>
                <img src={mark} alt="" className="h-10 w-auto drop-shadow-[0_0_10px_rgb(247_201_72/0.5)]" />
              </div>

              <dl className="relative mt-6 space-y-5">
                <PlanRow label="Objetivo" filled={!!objective}>
                  {objective?.title ?? 'Escolha seu objetivo'}
                </PlanRow>
                <PlanRow label="Frentes" filled={step >= 1 && services.length > 0}>
                  {step >= 1 && services.length ? (
                    <span className="flex flex-wrap gap-1.5">
                      <AnimatePresence initial={false}>
                        {services.map((s) => (
                          <m.span
                            key={s}
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                            className="rounded-full bg-gold-300/15 px-2.5 py-1 text-[0.78rem] text-gold-100 ring-1 ring-inset ring-gold-300/30"
                          >
                            {s}
                          </m.span>
                        ))}
                      </AnimatePresence>
                    </span>
                  ) : (
                    'Selecione as frentes'
                  )}
                </PlanRow>
                <PlanRow label="Momento" filled={!!moment}>
                  {moment?.title ?? 'Conte seu momento'}
                </PlanRow>
              </dl>

              <div className="relative mt-8 border-t border-white/10 pt-6">
                <CtaButton size="lg" icon="whatsapp" message={message} variant={complete ? 'gold' : 'outline'} className="w-full">
                  {complete ? 'Enviar meu plano' : 'Falar com a INTELRA'}
                </CtaButton>
                <p className="mt-3 text-center text-[0.78rem] text-mute-600">Abre o WhatsApp com o seu plano já escrito.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}

function Progress({ done, step, onStep }: { done: number; step: number; onStep: (i: number) => void }) {
  const pct = useMotionValue(0)
  const label = useTransform(pct, (v) => `${Math.round(v)}%`)
  const width = useTransform(pct, (v) => `${v}%`)
  useEffect(() => {
    const controls = animate(pct, (done / 3) * 100, { duration: 0.9, ease: EASE })
    return () => controls.stop()
  }, [done, pct])

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <ol className="flex gap-1.5 sm:gap-2">
          {STEPS.map((s, i) => {
            const active = step === i
            const passed = step > i
            return (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => onStep(i)}
                  disabled={!passed}
                  className={`eyebrow rounded-full px-2.5 py-1.5 text-[0.62rem]! transition-colors sm:px-3 sm:text-[0.68rem]! ${
                    active
                      ? 'bg-gold-300 text-ink-950'
                      : passed
                        ? 'bg-gold-300/15 text-gold-100 hover:bg-gold-300/25'
                        : 'bg-white/[0.04] text-mute-600'
                  }`}
                >
                  {i + 1}. {s}
                </button>
              </li>
            )
          })}
        </ol>
        <div className="text-right">
          <m.span className="poster block text-[1.9rem] leading-none text-gold-200">{label}</m.span>
        </div>
      </div>
      <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <m.div
          style={{ width }}
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold-600 via-gold-300 to-gold-100 shadow-[0_0_16px_rgb(247_201_72/0.8)]"
        />
      </div>
      <p className={`mt-2 text-[0.8rem] ${done === 3 ? 'text-neon' : 'text-mute'}`}>{LEVELS[done]}</p>
    </div>
  )
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0, x: 24, filter: 'blur(6px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: -24, filter: 'blur(6px)' }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <h3 className="text-xl font-semibold tracking-[-0.02em] md:text-2xl">{title}</h3>
      {hint && <p className="mt-1.5 text-sm text-mute">{hint}</p>}
      <div className="mt-6">{children}</div>
    </m.div>
  )
}

function Tile({
  selected,
  onClick,
  burst,
  className = '',
  children,
}: {
  selected: boolean
  onClick: () => void
  burst?: string
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-2xl p-5 text-left transition-all duration-500 ease-premium active:scale-[0.98] ${
        selected
          ? 'bg-gradient-to-br from-gold-300/25 to-gold-300/5 ring-2 ring-inset ring-gold-300 shadow-[0_16px_40px_-18px_rgb(247_201_72/0.8)]'
          : 'bg-white/[0.03] ring-1 ring-inset ring-white/10 hover:-translate-y-0.5 hover:bg-white/[0.05] hover:ring-gold-300/45'
      } ${className}`}
    >
      <span
        className={`absolute right-4 top-4 grid size-6 place-items-center rounded-full transition-all duration-300 ${
          selected ? 'scale-100 bg-gold-300 text-ink-950' : 'scale-90 ring-1 ring-white/20'
        }`}
      >
        {selected && <Check className="size-3.5" />}
        {burst && <Burst key={burst} />}
      </span>
      <span className="block pr-8">{children}</span>
    </button>
  )
}

function PlanRow({ label, filled, children }: { label: string; filled: boolean; children: ReactNode }) {
  return (
    <div className="flex gap-4">
      <span
        className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full transition-all duration-500 ${
          filled ? 'bg-neon/15 text-neon ring-1 ring-neon/50' : 'ring-1 ring-white/15'
        }`}
      >
        {filled && <Check className="size-3.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="eyebrow text-mute-600">{label}</dt>
        <dd className={`mt-1.5 text-[0.98rem] transition-colors duration-500 ${filled ? 'text-bone' : 'text-mute-600'}`}>{children}</dd>
      </div>
    </div>
  )
}
