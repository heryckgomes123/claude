import { Reveal } from '../components/Reveal'
import { SectionHeader } from '../components/SectionHeader'
import { AUDIENCE } from '../data/audience'

export function Audience() {
  return (
    <section aria-labelledby="audience-title" className="relative bg-bone text-ink-950">
      <div className="container-x py-24 md:py-36">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeader
            id="audience-title"
            tone="light"
            eyebrow="Para quem é"
            title={
              <>
                Soluções profissionais para negócios que <span className="serif-accent">querem evoluir.</span>
              </>
            }
          />
          <Reveal delay={0.15} className="max-w-sm">
            <p className="text-pretty leading-relaxed text-ink-950/60">
              Trabalhamos com quem entende que presença digital, tecnologia e estratégia fazem parte do negócio — não são detalhe.
            </p>
          </Reveal>
        </div>

        <ul className="mt-14 grid overflow-hidden rounded-[1.75rem] border border-ink-950/10 sm:grid-cols-2 md:mt-20 lg:grid-cols-4">
          {AUDIENCE.map((item, i) => (
            <li
              key={item.title}
              className="group relative -mb-px -mr-px border-b border-r border-ink-950/10 p-6 transition-colors duration-700 ease-premium hover:bg-ink-950 hover:text-bone md:p-8"
            >
              <Reveal delay={(i % 4) * 0.06} blur={false}>
                <span className="eyebrow text-ink-950/35 transition-colors duration-700 group-hover:text-gold">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-10 text-xl font-semibold tracking-[-0.03em] md:mt-14 md:text-[1.4rem]">{item.title}</h3>
                <p className="mt-2 text-pretty text-[0.95rem] leading-relaxed text-ink-950/55 transition-colors duration-700 group-hover:text-mute">
                  {item.text}
                </p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
