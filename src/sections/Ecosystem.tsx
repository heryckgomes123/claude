import { EcosystemGlyph } from '../components/EcosystemGlyph'
import { Reveal } from '../components/Reveal'
import { SectionHeader } from '../components/SectionHeader'
import { ECOSYSTEM } from '../data/ecosystem'
import type { EcosystemArea } from '../data/ecosystem'
import { useSpotlight } from '../hooks/useSpotlight'

const spans = ['md:col-span-3', 'md:col-span-3', 'md:col-span-2', 'md:col-span-2', 'md:col-span-2']

export function Ecosystem() {
  return (
    <section id="solucoes" aria-labelledby="ecosystem-title" className="relative">
      <div className="container-x py-24 md:py-36">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeader
            id="ecosystem-title"
            eyebrow="O ecossistema INTELRA"
            title={
              <>
                Cinco frentes. <span className="text-bone/40">Uma só direção.</span>
              </>
            }
          />
          <Reveal delay={0.15} className="max-w-sm">
            <p className="text-pretty leading-relaxed text-mute">
              Da estratégia ao código, cada frente foi pensada para funcionar sozinha — e ainda melhor em conjunto.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-3 md:mt-20 md:grid-cols-6 md:gap-4">
          {ECOSYSTEM.map((area, i) => (
            <Reveal key={area.id} delay={(i % 3) * 0.08} className={spans[i]}>
              <EcosystemCard area={area} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function EcosystemCard({ area }: { area: EcosystemArea }) {
  const onPointerMove = useSpotlight<HTMLElement>()
  return (
    <article
      onPointerMove={onPointerMove}
      className="spotlight group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-b from-ink-900 to-ink-950 p-6 transition-[transform,border-color,background-color,box-shadow] duration-700 ease-premium hover:-translate-y-1.5 hover:border-gold/30 hover:shadow-[0_30px_80px_-40px_rgb(201_164_92/0.35)] md:p-8"
    >
      <div className="flex items-start justify-between">
        <span className="eyebrow text-mute-600 transition-colors duration-500 group-hover:text-gold">{area.index}</span>
        <div className="-mr-2 -mt-2 opacity-90">
          <EcosystemGlyph type={area.glyph} />
        </div>
      </div>

      <h3 className="mt-6 text-[1.6rem] font-semibold tracking-[-0.035em] md:mt-10 md:text-[1.9rem]">{area.title}</h3>
      <p className="mt-3 max-w-md text-pretty leading-relaxed text-mute transition-colors duration-500 group-hover:text-bone/80">
        {area.summary}
      </p>

      <ul className="mt-7 flex flex-wrap gap-1.5 pt-1 md:mt-auto md:pt-10" aria-label={`Serviços de ${area.title}`}>
        {area.items.map((item) => (
          <li
            key={item}
            className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[0.8rem] text-bone/70 transition-colors duration-500 group-hover:border-white/15"
          >
            {item}
          </li>
        ))}
      </ul>
    </article>
  )
}
