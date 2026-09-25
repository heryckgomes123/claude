import { m, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { CtaButton } from '../components/CtaButton'
import { Reveal } from '../components/Reveal'
import { SectionHeader } from '../components/SectionHeader'
import { WHATSAPP_MESSAGES } from '../config/site'
import { PROCESS } from '../data/process'

const EASE = [0.22, 1, 0.36, 1] as const

export function Process() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.55'] })
  const progress = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section id="como-funciona" aria-labelledby="process-title" className="relative border-t border-gold-300/10">
      <div className="container-x py-24 md:py-36">
        <SectionHeader
          id="process-title"
          eyebrow="Como funciona"
          title={
            <>
              Simples de começar.
              <br />
              <span className="slant text-gold">Claro até o fim.</span>
            </>
          }
        />

        <div ref={ref} className="relative mt-16 pl-12 md:mt-24 md:pl-0">
          <div
            className="absolute bottom-2 left-[9px] top-2 w-[2px] bg-white/10 md:bottom-auto md:left-0 md:right-0 md:top-[9px] md:h-[2px] md:w-auto"
            aria-hidden="true"
          >
            <m.div
              style={{ scaleY: progress }}
              className="absolute inset-0 origin-top bg-gradient-to-b from-gold-100 to-gold-500 shadow-[0_0_12px_rgb(247_201_72/0.7)] md:hidden"
            />
            <m.div
              style={{ scaleX: progress }}
              className="absolute inset-0 hidden origin-left bg-gradient-to-r from-gold-500 to-gold-100 shadow-[0_0_12px_rgb(247_201_72/0.7)] md:block"
            />
          </div>

          <ol className="grid gap-12 md:grid-cols-4 md:gap-8">
            {PROCESS.map((item, i) => (
              <m.li
                key={item.step}
                className="group relative md:pt-14"
                initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, margin: '0px 0px -15% 0px' }}
                transition={{ duration: 0.9, ease: EASE, delay: i * 0.12 }}
              >
                <span
                  className="absolute -left-12 top-1 grid size-5 place-items-center rounded-full border border-gold-300/70 bg-ink-950 shadow-[0_0_14px_rgb(247_201_72/0.5)] md:left-0 md:top-0"
                  aria-hidden="true"
                >
                  <span className="size-2 rounded-full bg-gold-300" />
                </span>
                <p className="poster text-outline-gold text-[5rem] leading-none transition-all duration-700 group-hover:text-gold-300 md:text-[6rem]">
                  {item.step}
                </p>
                <h3 className="poster mt-3 text-[2.2rem] leading-none">{item.title}</h3>
                <p className="mt-3 max-w-xs text-pretty leading-relaxed text-mute">{item.text}</p>
              </m.li>
            ))}
          </ol>
        </div>

        <Reveal className="mt-16 flex flex-col items-start gap-4 sm:flex-row sm:items-center md:mt-20">
          <CtaButton size="lg" icon="whatsapp" message={WHATSAPP_MESSAGES.diagnosis}>
            Começar pelo diagnóstico
          </CtaButton>
          <p className="text-sm text-mute">O primeiro passo é uma conversa pelo WhatsApp.</p>
        </Reveal>
      </div>
    </section>
  )
}
