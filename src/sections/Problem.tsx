import { m } from 'framer-motion'
import { Check } from '../components/Check'
import { CtaButton } from '../components/CtaButton'
import { Reveal } from '../components/Reveal'
import { ScrollText } from '../components/ScrollText'
import { WHATSAPP_MESSAGES } from '../config/site'
import { PROBLEMS } from '../data/problems'

const EASE = [0.22, 1, 0.36, 1] as const

export function Problem() {
  return (
    <section aria-labelledby="problem-title" className="grain relative overflow-hidden">
      <div className="pointer-events-none absolute -left-40 top-40 size-[520px] rounded-full bg-[radial-gradient(closest-side,rgb(226_174_58/0.1),transparent)]" />
      <div className="container-x relative py-24 md:py-36">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-32">
              <Reveal>
                <p className="eyebrow flex items-center gap-2.5 text-mute">
                  <span
                    className="inline-block size-1.5 rounded-full bg-gold-300 shadow-[0_0_12px_rgb(247_201_72/0.8)]"
                    aria-hidden="true"
                  />
                  O cenário
                </p>
              </Reveal>
              <Reveal delay={0.06}>
                <h2 id="problem-title" className="poster mt-5 text-[3.2rem] sm:text-[4.6rem] lg:text-[5.4rem]">
                  Muita ferramenta.
                  <br />
                  <span className="slant text-gold">Pouco resultado.</span>
                </h2>
              </Reveal>
              <Reveal delay={0.12}>
                <p className="mt-6 max-w-md text-pretty text-base leading-relaxed text-mute md:text-lg">
                  Canais, apps e iniciativas se acumulam — e o negócio continua no mesmo lugar. É exatamente isso que a INTELRA resolve.
                </p>
              </Reveal>
            </div>
          </div>

          <ol className="border-b border-white/10 lg:col-span-7 lg:col-start-6">
            {PROBLEMS.map((problem, i) => (
              <m.li
                key={problem}
                className="group flex items-center gap-5 border-t border-white/10 py-5 md:gap-8 md:py-6"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '0px 0px -18% 0px' }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.04 * i }}
              >
                <span className="eyebrow w-7 shrink-0 text-mute-600">{String(i + 1).padStart(2, '0')}</span>
                <span className="flex-1 text-[1.25rem] font-medium leading-snug tracking-[-0.02em] text-bone/85 md:text-[1.7rem]">
                  <span className="relative inline-block">
                    {problem}
                    <m.span
                      aria-hidden="true"
                      className="absolute left-0 top-[55%] h-[3px] w-full origin-left rounded-full bg-gradient-to-r from-gold-600 via-gold-300 to-gold-100 shadow-[0_0_12px_rgb(247_201_72/0.6)]"
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true, margin: '0px 0px -30% 0px' }}
                      transition={{ duration: 0.8, ease: EASE, delay: 0.35 + 0.05 * i }}
                    />
                  </span>
                </span>
                <m.span
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-neon/10 text-neon ring-1 ring-neon/40"
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true, margin: '0px 0px -30% 0px' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.9 + 0.05 * i }}
                >
                  <Check className="size-4" />
                  <span className="sr-only">Resolvido pela INTELRA</span>
                </m.span>
              </m.li>
            ))}
          </ol>
        </div>

        <div className="mt-28 md:mt-40">
          <ScrollText
            text="Seu negócio não precisa de mais ferramentas. Precisa de uma estratégia que conecte tudo."
            highlight={['estratégia', 'conecte', 'tudo']}
            className="poster max-w-6xl text-[2.9rem] leading-[0.95] sm:text-[4.6rem] lg:text-[6.4rem]"
            dimClassName="text-bone/10"
          />
        </div>

        <Reveal className="mt-14 flex flex-col items-start gap-6 rounded-[2rem] border border-gold-300/20 bg-gradient-to-r from-gold-300/[0.09] via-transparent to-transparent p-7 md:mt-20 md:flex-row md:items-center md:justify-between md:p-10">
          <div>
            <p className="poster text-[2rem] md:text-[2.6rem]">Se identificou com algum?</p>
            <p className="mt-2 text-mute">Conte qual é o seu cenário — a gente mostra por onde começar.</p>
          </div>
          <CtaButton size="lg" icon="whatsapp" message={WHATSAPP_MESSAGES.problems} className="w-full md:w-auto">
            Resolver isso agora
          </CtaButton>
        </Reveal>
      </div>
    </section>
  )
}
