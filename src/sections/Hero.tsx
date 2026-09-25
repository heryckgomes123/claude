import { m, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import type { ReactNode } from 'react'
import { CtaButton } from '../components/CtaButton'
import { HeroVisual } from '../components/hero/HeroVisual'

const EASE = [0.22, 1, 0.36, 1] as const
const CAPABILITIES = [
  'Estratégia',
  'Marketing',
  'Inteligência Artificial',
  'Desenvolvimento',
  'Automação',
  'Presença Digital',
  'Branding',
  'Sistemas',
]

function Line({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <m.span
        className="block"
        initial={{ y: '105%', filter: 'blur(10px)' }}
        animate={{ y: '0%', filter: 'blur(0px)' }}
        transition={{ duration: 1.2, ease: EASE, delay }}
      >
        {children}
      </m.span>
    </span>
  )
}

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const visualY = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])
  const visualOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0])
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '-12%'])

  return (
    <section
      ref={ref}
      id="inicio"
      aria-labelledby="hero-title"
      className="noise relative isolate flex min-h-[100svh] flex-col overflow-hidden"
    >
      {/* Fundo: grid editorial + luz */}
      <div className="editorial-grid pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[70vh] bg-[radial-gradient(60%_60%_at_70%_20%,rgb(245_243_238/0.06),transparent)]" />

      {/* Visual 3D */}
      <m.div
        style={{ y: visualY, opacity: visualOpacity }}
        className="pointer-events-none absolute left-1/2 top-[64px] -z-10 w-[132vw] max-w-[640px] -translate-x-1/2 sm:top-[40px] md:max-w-[720px] lg:left-auto lg:right-[-9vw] lg:top-1/2 lg:w-[min(60vw,880px)] lg:max-w-none lg:-translate-x-0 lg:-translate-y-1/2 3xl:right-[2vw]"
      >
        <m.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.8, ease: EASE, delay: 0.1 }}
        >
          <HeroVisual />
        </m.div>
      </m.div>
      {/* Garante leitura do texto sobre o visual no mobile */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[62%] bg-gradient-to-t from-ink-950 via-ink-950/85 to-transparent lg:hidden" />

      <m.div
        style={{ y: textY }}
        className="container-x relative flex flex-1 flex-col justify-end pb-10 pt-28 md:pb-14 lg:justify-center lg:pb-24 lg:pt-32"
      >
        <div className="max-w-[46rem] lg:max-w-[58rem]">
          <m.p
            className="eyebrow mb-7 inline-flex items-center gap-2.5 whitespace-nowrap rounded-full text-[0.62rem]! tracking-[0.1em]! sm:text-[0.72rem]! sm:tracking-[0.14em]! border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-bone/70 backdrop-blur-md"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-[pulse-dot_2.4s_ease-in-out_infinite] rounded-full bg-gold" />
            </span>
            Estratégia · Tecnologia · Crescimento
          </m.p>

          <h1
            id="hero-title"
            className="display text-[3.4rem] sm:text-[5rem] md:text-[6rem] lg:whitespace-nowrap lg:text-[6rem] xl:text-[7rem] 3xl:text-[8.4rem]"
          >
            <Line delay={0.25}>Seu negócio.</Line>
            <Line delay={0.38}>
              <span className="text-bone/55">Mais </span>
              <span className="serif-accent bg-gradient-to-br from-bone via-gold-soft to-gold bg-clip-text pr-[0.06em] text-transparent">
                inteligente.
              </span>
            </Line>
          </h1>

          <m.p
            className="mt-7 max-w-[34rem] text-pretty text-[1.02rem] leading-relaxed text-mute md:mt-9 md:text-lg"
            initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1, ease: EASE, delay: 0.6 }}
          >
            A INTELRA combina <span className="text-bone">marketing, inteligência artificial, tecnologia e presença digital</span> para
            criar soluções sob medida para empresas — da estratégia à execução.
          </m.p>

          <m.div
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-11"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.75 }}
          >
            <CtaButton size="lg" icon="whatsapp">
              Falar com a INTELRA
            </CtaButton>
            <CtaButton size="lg" variant="secondary" href="#solucoes">
              Explorar soluções
            </CtaButton>
          </m.div>
        </div>
      </m.div>

      {/* Faixa de capacidades */}
      <m.div
        className="relative border-t border-white/[0.07]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 1 }}
      >
        <div className="flex overflow-hidden py-4 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)] md:py-5">
          <ul
            className="flex shrink-0 animate-[marquee_48s_linear_infinite] items-center gap-10 pr-10 motion-reduce:animate-none"
            aria-label="Frentes de atuação"
          >
            {[...CAPABILITIES, ...CAPABILITIES].map((item, i) => (
              <li
                key={i}
                aria-hidden={i >= CAPABILITIES.length}
                className="eyebrow flex items-center gap-10 whitespace-nowrap text-bone/40"
              >
                {item}
                <span className="size-1 rounded-full bg-gold/60" />
              </li>
            ))}
          </ul>
        </div>
      </m.div>
    </section>
  )
}
