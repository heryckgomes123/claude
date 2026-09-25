import { m, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import type { ReactNode } from 'react'
import { Check } from '../components/Check'
import { CtaButton } from '../components/CtaButton'
import { EmberCanvas } from '../components/EmberCanvas'
import { Emblem } from '../components/Emblem'
import { SITE, WHATSAPP_MESSAGES } from '../config/site'

const EASE = [0.22, 1, 0.36, 1] as const
const TRUST = ['Atendimento pelo WhatsApp', 'Proposta sob medida', 'Do pontual ao completo']

function Line({ children, delay, className = '' }: { children: ReactNode; delay: number; className?: string }) {
  return (
    <span className={`-mt-[0.16em] block overflow-hidden pb-[0.04em] pt-[0.16em] ${className}`}>
      <m.span
        className="block"
        initial={{ y: '110%', filter: 'blur(12px)' }}
        animate={{ y: '0%', filter: 'blur(0px)' }}
        transition={{ duration: 1.1, ease: EASE, delay }}
      >
        {children}
      </m.span>
    </span>
  )
}

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const visualY = useTransform(scrollYProgress, [0, 1], ['0%', '22%'])
  const visualScale = useTransform(scrollYProgress, [0, 1], [1, 0.86])
  const visualOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0])
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '-10%'])

  return (
    <section
      ref={ref}
      id="inicio"
      aria-labelledby="hero-title"
      className="grain relative isolate flex min-h-[100svh] flex-col overflow-hidden"
    >
      {/* Fundo: vinheta + luz dourada */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_72%_42%,rgb(226_174_58/0.16),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_50%_0%,transparent_55%,rgb(0_0_0/0.85))]" />
      <EmberCanvas className="pointer-events-none absolute inset-0 -z-10 size-full" />

      {/* Emblema */}
      <m.div
        style={{ y: visualY, scale: visualScale, opacity: visualOpacity }}
        className="pointer-events-none absolute right-[3vw] top-1/2 -z-10 hidden w-[min(46vw,640px)] -translate-y-1/2 lg:block 3xl:right-[8vw]"
      >
        <m.div
          initial={{ opacity: 0, scale: 0.8, filter: 'blur(20px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1.6, ease: EASE, delay: 0.1 }}
        >
          <Emblem priority />
        </m.div>
      </m.div>

      <m.div
        style={{ y: textY }}
        className="container-x relative z-10 flex flex-1 flex-col justify-end pb-10 pt-20 md:pb-14 md:pt-24 lg:justify-center lg:pb-20 lg:pt-32"
      >
        <div className="max-w-[44rem]">
          {/* Emblema no fluxo (mobile/tablet), acima do texto */}
          <m.div
            className="pointer-events-none mx-auto mb-9 w-[54vw] max-w-[300px] lg:hidden"
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(16px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1.4, ease: EASE, delay: 0.05 }}
          >
            <Emblem interactive={false} priority />
          </m.div>
          <m.p
            className="eyebrow mb-6 inline-flex items-center gap-2.5 whitespace-nowrap rounded-full border border-neon/25 bg-neon/[0.06] px-3.5 py-1.5 text-[0.62rem]! tracking-[0.12em]! text-bone/80 backdrop-blur-md sm:text-[0.7rem]!"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-[ping-ring_1.8s_ease-out_infinite] rounded-full bg-neon" />
              <span className="relative inline-flex size-2 rounded-full bg-neon" />
            </span>
            {SITE.pillars.join(' • ')}
          </m.p>

          <h1
            id="hero-title"
            className="poster text-[4.1rem] sm:text-[6.2rem] md:text-[7rem] lg:text-[7.4rem] xl:text-[8.6rem] 3xl:text-[9.6rem]"
          >
            <Line delay={0.22}>Seu negócio.</Line>
            <Line delay={0.34} className="text-bone/45">
              Mais
            </Line>
            <Line delay={0.46} className="text-[1.12em]">
              <span className="slant text-gold-shine pr-[0.08em]">Inteligente.</span>
            </Line>
          </h1>

          <m.p
            className="mt-6 max-w-[33rem] text-pretty text-[1.02rem] leading-relaxed text-mute md:mt-8 md:text-lg"
            initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1, ease: EASE, delay: 0.62 }}
          >
            A INTELRA une <span className="text-bone">marketing, conteúdo, tráfego, inteligência artificial e tecnologia</span> em uma
            estrutura sob medida para o seu negócio vender mais e crescer com método.
          </m.p>

          <m.div
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.76 }}
          >
            <CtaButton size="lg" icon="whatsapp" message={WHATSAPP_MESSAGES.grow}>
              Quero crescer agora
            </CtaButton>
            <CtaButton size="lg" variant="outline" href="#monte">
              Montar meu plano
            </CtaButton>
          </m.div>

          <m.ul
            className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[0.82rem] text-bone/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
          >
            {TRUST.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="size-3.5 text-neon" />
                {item}
              </li>
            ))}
          </m.ul>
        </div>
      </m.div>
    </section>
  )
}
