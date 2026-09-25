import { m } from 'framer-motion'
import { Reveal } from '../components/Reveal'
import { SectionHeader } from '../components/SectionHeader'
import { SYSTEM_FLOW } from '../data/system-flow'

const EASE = [0.22, 1, 0.36, 1] as const

export function Systems() {
  return (
    <section aria-labelledby="systems-title" className="relative overflow-hidden border-t border-white/[0.06]">
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[520px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(201_164_92/0.07),transparent)]" />

      <div className="container-x py-24 md:py-36">
        <SectionHeader
          id="systems-title"
          eyebrow="Mais que serviços isolados"
          align="center"
          className="max-w-4xl!"
          title={
            <>
              Não entregamos apenas peças. <span className="serif-accent text-gold-soft">Construímos sistemas.</span>
            </>
          }
          description="A INTELRA pode atuar em uma necessidade pontual ou estruturar toda a sua operação digital. Em qualquer caso, cada entrega é pensada para se conectar às outras."
        />

        {/* Fluxo */}
        <div className="relative mx-auto mt-16 max-w-6xl md:mt-24">
          {/* Trilho horizontal (desktop) */}
          <div
            className="pointer-events-none absolute inset-x-[8%] top-[27px] hidden h-px overflow-hidden bg-white/10 md:block"
            aria-hidden="true"
          >
            <div className="absolute inset-0 animate-[travel-x_4.8s_cubic-bezier(0.45,0,0.2,1)_infinite]">
              <div className="h-px w-40 bg-gradient-to-r from-transparent via-gold to-transparent" />
            </div>
          </div>
          {/* Trilho vertical (mobile) */}
          <div
            className="pointer-events-none absolute bottom-[28px] left-[27px] top-[28px] w-px overflow-hidden bg-white/10 md:hidden"
            aria-hidden="true"
          >
            <div className="absolute inset-0 animate-[travel-y_4.8s_cubic-bezier(0.45,0,0.2,1)_infinite]">
              <div className="h-32 w-px bg-gradient-to-b from-transparent via-gold to-transparent" />
            </div>
          </div>

          <ol className="relative grid gap-7 md:grid-cols-6 md:gap-4">
            {SYSTEM_FLOW.map((node, i) => {
              const last = i === SYSTEM_FLOW.length - 1
              return (
                <m.li
                  key={node.label}
                  className="flex items-center gap-5 md:flex-col md:gap-6 md:text-center"
                  initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                  whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  viewport={{ once: true, margin: '0px 0px -15% 0px' }}
                  transition={{ duration: 0.8, ease: EASE, delay: i * 0.12 }}
                >
                  <span
                    className={`relative grid size-14 shrink-0 place-items-center rounded-full border backdrop-blur-sm ${
                      last ? 'border-gold/60 bg-gold/10 text-gold' : 'border-white/15 bg-ink-900 text-bone/80'
                    }`}
                  >
                    <span className="eyebrow">{String(i + 1).padStart(2, '0')}</span>
                    {last && (
                      <span className="absolute -inset-2 rounded-full border border-gold/20 motion-safe:animate-[pulse-dot_3s_ease-in-out_infinite]" />
                    )}
                  </span>
                  <span>
                    <span className={`block text-lg font-semibold tracking-[-0.02em] md:text-xl ${last ? 'text-gold-soft' : ''}`}>
                      {node.label}
                    </span>
                    <span className="mt-1 block text-sm text-mute">{node.note}</span>
                  </span>
                </m.li>
              )
            })}
          </ol>
        </div>

        {/* Pontual x integrado */}
        <div className="mx-auto mt-20 grid max-w-5xl gap-3 md:mt-28 md:grid-cols-2 md:gap-4">
          <Reveal>
            <div className="h-full rounded-[1.75rem] border border-white/[0.08] p-7 md:p-9">
              <p className="eyebrow text-mute">Necessidade pontual</p>
              <p className="mt-4 text-xl font-medium leading-snug tracking-[-0.02em] md:text-2xl">
                Um site, uma campanha, uma automação. Resolvido com profundidade — e pronto para crescer.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="h-full rounded-[1.75rem] border border-gold/25 bg-gradient-to-br from-gold/[0.08] to-transparent p-7 md:p-9">
              <p className="eyebrow text-gold">Estrutura completa</p>
              <p className="mt-4 text-xl font-medium leading-snug tracking-[-0.02em] md:text-2xl">
                Estratégia, marca, marketing, tecnologia e IA trabalhando como um único sistema.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
