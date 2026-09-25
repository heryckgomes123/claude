import { AnimatePresence, m } from 'framer-motion'
import { useState } from 'react'
import { CtaButton } from '../components/CtaButton'
import { WHATSAPP_MESSAGES } from '../config/site'
import { ArrowRight, Plus } from '../components/Icons'
import { Reveal } from '../components/Reveal'
import { SectionHeader } from '../components/SectionHeader'
import { OBJECTIVES } from '../data/objectives'
import type { Objective } from '../data/objectives'

const EASE = [0.22, 1, 0.36, 1] as const

export function Objectives() {
  const [active, setActive] = useState(0)
  const current = OBJECTIVES[active]

  return (
    <section id="objetivos" aria-labelledby="objectives-title" className="relative bg-bone text-ink-950">
      <div className="container-x py-24 md:py-36">
        <SectionHeader
          id="objectives-title"
          tone="light"
          eyebrow="Soluções por objetivo"
          title={
            <>
              Comece pelo que você <span className="serif-accent">quer alcançar.</span>
            </>
          }
          description="Escolha o seu objetivo. A INTELRA monta a estrutura certa para chegar lá."
        />

        <div className="mt-14 grid gap-10 md:mt-20 lg:grid-cols-12 lg:gap-12">
          {/* Lista de objetivos */}
          <div className="border-b border-ink-950/10 lg:col-span-6" role="tablist" aria-label="Objetivos" aria-orientation="vertical">
            {OBJECTIVES.map((objective, i) => {
              const selected = i === active
              return (
                <Reveal key={objective.id} delay={i * 0.05} blur={false}>
                  <div className="border-t border-ink-950/10">
                    <button
                      type="button"
                      role="tab"
                      id={`tab-${objective.id}`}
                      aria-selected={selected}
                      aria-controls={`panel-${objective.id}`}
                      onClick={() => setActive(i)}
                      className="group flex w-full items-center justify-between gap-6 py-6 text-left md:py-7"
                    >
                      <span className="flex items-baseline gap-5">
                        <span className={`eyebrow transition-colors duration-500 ${selected ? 'text-gold' : 'text-ink-950/35'}`}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span
                          className={`text-[1.3rem] font-medium leading-tight tracking-[-0.03em] transition-[color,transform] duration-700 ease-premium md:text-[1.75rem] ${
                            selected ? 'text-ink-950 lg:translate-x-2' : 'text-ink-950/45 group-hover:text-ink-950/80'
                          }`}
                        >
                          {objective.title}
                        </span>
                      </span>
                      <span
                        className={`grid size-9 shrink-0 place-items-center rounded-full transition-all duration-500 ease-premium ${
                          selected ? 'bg-ink-950 text-bone' : 'bg-ink-950/[0.05] text-ink-950/60 group-hover:bg-ink-950/10'
                        }`}
                      >
                        <ArrowRight className={`hidden size-4 lg:block ${selected ? '' : 'opacity-60'}`} />
                        <Plus className={`size-4 transition-transform duration-500 lg:hidden ${selected ? 'rotate-45' : ''}`} />
                      </span>
                    </button>

                    {/* Painel inline (mobile/tablet) */}
                    <AnimatePresence initial={false}>
                      {selected && (
                        <m.div
                          className="overflow-hidden lg:hidden"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.6, ease: EASE }}
                        >
                          <div className="pb-8">
                            <ObjectivePanel objective={objective} compact />
                          </div>
                        </m.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Reveal>
              )
            })}
          </div>

          {/* Painel lateral (desktop) */}
          <div className="hidden lg:col-span-6 lg:block">
            <div className="sticky top-28">
              <AnimatePresence mode="wait">
                <m.div
                  key={current.id}
                  initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <ObjectivePanel objective={current} />
                </m.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <Reveal className="mt-16 flex flex-col items-start justify-between gap-6 rounded-[1.75rem] bg-ink-950 p-7 text-bone md:mt-24 md:flex-row md:items-center md:p-10">
          <div>
            <p className="text-xl font-medium tracking-[-0.02em] md:text-2xl">Não sabe por onde começar?</p>
            <p className="mt-2 text-mute">Um diagnóstico inicial mostra o que faz mais sentido para o seu momento.</p>
          </div>
          <CtaButton
            size="lg"
            icon="whatsapp"
            message={WHATSAPP_MESSAGES.diagnosis}
            className="h-auto! min-h-13 w-full py-3.5 text-center leading-snug md:w-auto"
          >
            Descobrir o que minha empresa precisa
          </CtaButton>
        </Reveal>
      </div>
    </section>
  )
}

function ObjectivePanel({ objective, compact = false }: { objective: Objective; compact?: boolean }) {
  return (
    <div
      id={compact ? undefined : `panel-${objective.id}`}
      role={compact ? undefined : 'tabpanel'}
      aria-labelledby={compact ? undefined : `tab-${objective.id}`}
      className={
        compact
          ? ''
          : 'relative overflow-hidden rounded-[2rem] bg-ink-950 p-10 text-bone shadow-[0_40px_100px_-50px_rgb(8_8_8/0.7)] xl:p-12'
      }
    >
      {!compact && (
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[radial-gradient(closest-side,rgb(201_164_92/0.18),transparent)]" />
      )}
      <p className={`max-w-md text-pretty leading-relaxed ${compact ? 'text-ink-950/65' : 'text-lg text-mute'}`}>{objective.description}</p>

      <ul className={`grid gap-2 ${compact ? 'mt-5 grid-cols-2' : 'mt-10 grid-cols-2'}`}>
        {objective.items.map((item) => (
          <li
            key={item}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-[0.95rem] ${
              compact ? 'bg-ink-950/[0.04] text-ink-950' : 'border border-white/[0.08] bg-white/[0.02] text-bone/90'
            }`}
          >
            <span className="size-1.5 shrink-0 rounded-full bg-gold" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>

      <div className={compact ? 'mt-6' : 'mt-12'}>
        <CtaButton
          variant={compact ? 'dark' : 'primary'}
          icon="whatsapp"
          message={objective.message}
          className={compact ? 'h-auto! min-h-11 w-full py-3 text-center leading-snug sm:w-auto' : ''}
        >
          Descobrir o que minha empresa precisa
        </CtaButton>
      </div>
    </div>
  )
}
