import { Reveal } from '../components/Reveal'
import { ScrollText } from '../components/ScrollText'
import { PROBLEMS } from '../data/problems'

export function Problem() {
  return (
    <section aria-labelledby="problem-title" className="relative bg-bone text-ink-950">
      <div className="container-x py-24 md:py-36">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-32">
              <Reveal>
                <p className="eyebrow flex items-center gap-2.5 text-ink-950/55">
                  <span className="inline-block size-1.5 rounded-full bg-gold" aria-hidden="true" />O cenário
                </p>
              </Reveal>
              <Reveal delay={0.06}>
                <h2 id="problem-title" className="display mt-5 text-balance text-[2.35rem] sm:text-5xl lg:text-[3.6rem]">
                  Muitas empresas já estão no digital. <span className="text-ink-950/40">Poucas estão conectadas.</span>
                </h2>
              </Reveal>
              <Reveal delay={0.12}>
                <p className="mt-6 max-w-md text-pretty text-base leading-relaxed text-ink-950/60 md:text-lg">
                  Ferramentas, canais e iniciativas se acumulam. O resultado não acompanha.
                </p>
              </Reveal>
            </div>
          </div>

          <ol className="border-b border-ink-950/10 lg:col-span-7 lg:col-start-6">
            {PROBLEMS.map((problem, i) => (
              <Reveal as="li" key={problem} delay={i * 0.04} blur={false}>
                <div className="group flex items-baseline gap-6 border-t border-ink-950/10 py-6 transition-colors duration-500 md:gap-10 md:py-7">
                  <span className="eyebrow w-8 shrink-0 text-ink-950/35 transition-colors duration-500 group-hover:text-gold">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[1.35rem] font-medium leading-snug tracking-[-0.025em] transition-transform duration-700 ease-premium group-hover:translate-x-2 md:text-[1.9rem]">
                    {problem}
                  </span>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>

        <div className="mt-28 md:mt-44">
          <ScrollText
            text="Seu negócio não precisa de mais ferramentas. Precisa de uma estratégia que conecte tudo."
            highlight={['estratégia', 'tudo']}
            className="display max-w-6xl text-balance text-[2.3rem] leading-[1.02] sm:text-6xl lg:text-[5.4rem]"
            dimClassName="text-ink-950/12"
          />
        </div>
      </div>
    </section>
  )
}
