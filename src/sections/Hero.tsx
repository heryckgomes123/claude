import { m } from 'framer-motion'
import { useRef } from 'react'
import type { PointerEvent } from 'react'
import portal from '../assets/scene/portal.webp'
import portalMobile from '../assets/scene/portal-mobile.webp'
import { ArrowDown, ArrowRight } from '../components/Icons'
import { CTA, HERO, QUICK_CHOICES } from '../config/content'
import { track } from '../lib/analytics'
import { prefersReducedMotion, scrollToAnchor } from '../lib/scroll'
import { Mascot } from '../mascot/Mascot'
import { MASCOT_LINES } from '../config/mascot'
import { useProjectActions } from '../state/actions'
import { useProject } from '../state/project'
import { useUI } from '../state/ui'

const EASE = [0.22, 1, 0.36, 1] as const

export function Hero() {
  const ui = useUI()
  const { state } = useProject()
  const { chooseInterest } = useProjectActions()
  const sectionRef = useRef<HTMLElement>(null)

  // Profundidade discreta: a arte e o robô se deslocam em direções opostas com o ponteiro.
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse' || prefersReducedMotion()) return
    const el = sectionRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
    el.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
  }

  const heroLine = state.interest ? MASCOT_LINES.interest[state.interest] : HERO.question

  return (
    <section
      id="inicio"
      data-scene="inicio"
      ref={sectionRef}
      onPointerMove={onPointerMove}
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden lg:flex lg:min-h-[100svh] lg:items-center"
    >
      {/* Arte do portal (camada de abertura). Textos e botões são HTML real por cima. */}
      <div className="relative h-[46svh] min-h-[300px] max-h-[480px] overflow-hidden lg:absolute lg:inset-y-0 lg:right-0 lg:-z-10 lg:h-auto lg:max-h-none lg:w-[72%]">
        <picture>
          <source media="(max-width: 1023px)" srcSet={portalMobile} width={800} height={750} />
          <img
            src={portal}
            width={1672}
            height={941}
            fetchPriority="high"
            decoding="async"
            alt="Portal cromado com luz roxa e ciano; de dentro saem um monitor retrô, uma fita cassete, uma película de filme e um tênis."
            className="h-full w-full object-cover object-[50%_60%] lg:object-[78%_50%] lg:[transform:translate3d(calc(var(--px,0)*-14px),calc(var(--py,0)*-10px),0)_scale(1.04)] lg:transition-transform lg:duration-700 lg:ease-out"
          />
        </picture>
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-ink-950/60 via-transparent to-ink-950 lg:hidden" />
        <div
          aria-hidden="true"
          className="absolute inset-0 hidden bg-[linear-gradient(90deg,var(--color-ink-950)_0%,rgb(9_8_15/0.85)_22%,rgb(9_8_15/0.2)_48%,transparent_70%),linear-gradient(0deg,var(--color-ink-950)_0%,transparent_22%)] lg:block"
        />
        <p aria-hidden="true" className="eyebrow absolute bottom-6 right-6 hidden items-center gap-2 text-bone/55 lg:flex">
          <span className="h-2 w-2 rounded-full bg-coral-400" style={{ animation: 'blink-dot 1.6s steps(2) infinite' }} />
          Rec · INTELRA Lab · Cena 01
        </p>
      </div>

      <div className="container-x relative -mt-24 pb-14 lg:mt-0 lg:py-28">
        <div className="max-w-[40rem]">
          <m.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="eyebrow flex items-center gap-2 text-ion-300"
          >
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 bg-ion-300" />
            {HERO.eyebrow}
          </m.p>
          <m.h1
            id="hero-title"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.05 }}
            className="display mt-4 text-[2.55rem] text-bone sm:text-[3.4rem] lg:text-[4.1rem] xl:text-[4.5rem]"
          >
            Sua próxima ideia merece <span className="text-volt">sair do comum.</span>
          </m.h1>
          <m.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.12 }}
            className="mt-5 max-w-[34rem] text-[1.05rem] leading-relaxed text-mute md:text-lg"
          >
            {HERO.subtitle}
          </m.p>

          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.18 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                track('hero_cta_click', { cta: 'primary' })
                ui.openQuote({ source: 'hero' })
              }}
            >
              {CTA.primary}
              <ArrowRight size={18} />
            </button>
            <a
              href="#criacoes"
              className="btn btn-ghost"
              onClick={(e) => {
                e.preventDefault()
                track('hero_cta_click', { cta: 'explore' })
                scrollToAnchor('#criacoes')
              }}
            >
              {CTA.explore}
              <ArrowDown size={18} />
            </a>
          </m.div>

          {/* Anfitrião + escolhas rápidas */}
          <m.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.28 }}
            className="mt-10 lg:mt-12"
          >
            <div className="flex items-end gap-3 sm:gap-4">
              <div className="lg:[transform:translate3d(calc(var(--px,0)*10px),calc(var(--py,0)*6px),0)] lg:transition-transform lg:duration-700 lg:ease-out">
                <Mascot state={state.interest ? 'exploring' : 'welcome'} size={84} alt="Robô anfitrião da INTELRA" className="sm:h-24! sm:w-24!" />
              </div>
              <p
                className="glass chrome-edge relative mb-4 rounded-2xl rounded-bl-sm px-4 py-3 font-display text-[0.98rem] font-medium leading-snug text-bone sm:text-[1.05rem]"
                aria-live="polite"
              >
                {heroLine}
              </p>
            </div>
            <div role="group" aria-label="O que você quer criar?" className="mt-4 grid grid-cols-2 gap-2 sm:gap-2.5">
              {QUICK_CHOICES.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  aria-pressed={state.interest === choice.id}
                  onClick={() => chooseInterest(choice.id, choice.anchor)}
                  className="chip justify-between text-[0.86rem] sm:text-[0.92rem]"
                >
                  <span>{choice.label}</span>
                  <ArrowRight size={15} className="shrink-0 opacity-60" />
                </button>
              ))}
            </div>
          </m.div>
        </div>
      </div>
    </section>
  )
}
