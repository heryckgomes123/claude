import { m } from 'framer-motion'
import { CtaButton } from '../components/CtaButton'
import { Reveal } from '../components/Reveal'
import { SectionHeader } from '../components/SectionHeader'
import { WHATSAPP_MESSAGES } from '../config/site'
import { SYSTEM_FLOW } from '../data/system-flow'

const EASE = [0.22, 1, 0.36, 1] as const

export function Systems() {
  return (
    <section aria-labelledby="systems-title" className="grain relative overflow-hidden border-t border-gold-300/10">
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[600px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(226_174_58/0.12),transparent)]" />

      <div className="container-x relative py-24 md:py-36">
        <SectionHeader
          id="systems-title"
          eyebrow="Mais que serviços isolados"
          align="center"
          className="max-w-5xl!"
          title={
            <>
              Não entregamos peças.
              <br />
              <span className="slant text-gold-shine">Construímos sistemas.</span>
            </>
          }
          description="Da necessidade pontual à estrutura digital completa: cada entrega é pensada para se conectar às outras e empurrar o negócio na mesma direção."
        />

        <div className="relative mx-auto mt-16 max-w-6xl md:mt-24">
          <div
            className="pointer-events-none absolute inset-x-[8%] top-[31px] hidden h-[2px] overflow-hidden bg-gold-300/15 md:block"
            aria-hidden="true"
          >
            <div className="absolute inset-0 animate-[travel-x_3.8s_cubic-bezier(0.45,0,0.2,1)_infinite]">
              <div className="h-[2px] w-48 bg-gradient-to-r from-transparent via-gold-100 to-transparent shadow-[0_0_14px_rgb(247_201_72)]" />
            </div>
          </div>
          <div
            className="pointer-events-none absolute bottom-[32px] left-[31px] top-[32px] w-[2px] overflow-hidden bg-gold-300/15 md:hidden"
            aria-hidden="true"
          >
            <div className="absolute inset-0 animate-[travel-y_3.8s_cubic-bezier(0.45,0,0.2,1)_infinite]">
              <div className="h-36 w-[2px] bg-gradient-to-b from-transparent via-gold-100 to-transparent" />
            </div>
          </div>

          <ol className="relative grid gap-7 md:grid-cols-6 md:gap-4">
            {SYSTEM_FLOW.map((node, i) => {
              const last = i === SYSTEM_FLOW.length - 1
              return (
                <m.li
                  key={node.label}
                  className="flex items-center gap-5 md:flex-col md:gap-6 md:text-center"
                  initial={{ opacity: 0, y: 16, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: '0px 0px -15% 0px' }}
                  transition={{ duration: 0.7, ease: EASE, delay: i * 0.12 }}
                >
                  <span
                    className={`relative grid size-16 shrink-0 place-items-center rounded-full border ${
                      last
                        ? 'border-neon/70 bg-neon/10 text-neon shadow-[0_0_30px_rgb(60_255_143/0.35)]'
                        : 'border-gold-300/40 bg-ink-900 text-gold-200 shadow-[0_0_24px_-6px_rgb(247_201_72/0.5)]'
                    }`}
                  >
                    <span className="poster text-xl">{String(i + 1).padStart(2, '0')}</span>
                    {last && (
                      <span className="absolute inset-0 animate-[ping-ring_2s_ease-out_infinite] rounded-full border border-neon/50" />
                    )}
                  </span>
                  <span>
                    <span className={`poster block text-[1.6rem] md:text-[1.8rem] ${last ? 'text-neon' : ''}`}>{node.label}</span>
                    <span className="mt-1 block text-sm text-mute">{node.note}</span>
                  </span>
                </m.li>
              )
            })}
          </ol>
        </div>

        <div className="mx-auto mt-20 grid max-w-5xl gap-3 md:mt-28 md:grid-cols-2 md:gap-4">
          <Reveal>
            <div className="h-full rounded-[1.75rem] border border-white/10 bg-ink-900/60 p-7 md:p-9">
              <p className="eyebrow text-mute">Necessidade pontual</p>
              <p className="mt-4 text-xl font-medium leading-snug tracking-[-0.02em] md:text-2xl">
                Um site, uma campanha, uma automação. Resolvido com profundidade — e pronto para crescer.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="gold-edge h-full rounded-[1.75rem] bg-gradient-to-br from-gold-300/[0.14] to-transparent p-7 [--edge-opacity:0.9] md:p-9">
              <p className="eyebrow text-gold-200">Estrutura completa</p>
              <p className="mt-4 text-xl font-medium leading-snug tracking-[-0.02em] md:text-2xl">
                Estratégia, marca, marketing, tecnologia e IA trabalhando como um único sistema.
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal className="mt-12 flex justify-center">
          <CtaButton size="lg" icon="whatsapp" message={WHATSAPP_MESSAGES.system}>
            Quero uma estrutura completa
          </CtaButton>
        </Reveal>
      </div>
    </section>
  )
}
