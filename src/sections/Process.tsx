import { m, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { SectionHeader } from '../components/SectionHeader'
import { PROCESS } from '../data/process'

const EASE = [0.22, 1, 0.36, 1] as const

export function Process() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.55'] })
  const progress = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section id="como-funciona" aria-labelledby="process-title" className="relative">
      <div className="container-x py-24 md:py-36">
        <SectionHeader
          id="process-title"
          eyebrow="Como funciona"
          title={
            <>
              Simples de começar. <span className="text-bone/40">Claro do início ao fim.</span>
            </>
          }
        />

        <div ref={ref} className="relative mt-16 pl-12 md:mt-24 md:pl-0">
          {/* Linha base + progresso: vertical no mobile, horizontal no desktop */}
          <div
            className="absolute bottom-2 left-[7px] top-2 w-px bg-white/10 md:bottom-auto md:left-0 md:right-0 md:top-[7px] md:h-px md:w-auto"
            aria-hidden="true"
          >
            <m.div style={{ scaleY: progress }} className="absolute inset-0 origin-top bg-gradient-to-b from-gold to-gold/40 md:hidden" />
            <m.div
              style={{ scaleX: progress }}
              className="absolute inset-0 hidden origin-left bg-gradient-to-r from-gold/40 to-gold md:block"
            />
          </div>

          <ol className="grid gap-12 md:grid-cols-4 md:gap-8">
            {PROCESS.map((item, i) => (
              <m.li
                key={item.step}
                className="relative md:pt-14"
                initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, margin: '0px 0px -15% 0px' }}
                transition={{ duration: 0.9, ease: EASE, delay: i * 0.12 }}
              >
                <span
                  className="absolute -left-12 top-1 grid size-[15px] place-items-center rounded-full border border-gold/60 bg-ink-950 md:left-0 md:top-0"
                  aria-hidden="true"
                >
                  <span className="size-[5px] rounded-full bg-gold" />
                </span>
                <p className="eyebrow text-gold">{item.step}</p>
                <h3 className="mt-3 text-[1.75rem] font-semibold tracking-[-0.035em] md:text-3xl">{item.title}</h3>
                <p className="mt-3 max-w-xs text-pretty leading-relaxed text-mute">{item.text}</p>
              </m.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
