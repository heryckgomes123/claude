import { EcosystemGlyph } from '../components/EcosystemGlyph'
import { ArrowUpRight, WhatsApp } from '../components/Icons'
import { Reveal } from '../components/Reveal'
import { SectionHeader } from '../components/SectionHeader'
import { whatsappLink } from '../config/site'
import { ECOSYSTEM } from '../data/ecosystem'
import type { EcosystemArea } from '../data/ecosystem'
import { useSpotlight } from '../hooks/useSpotlight'

const spans = ['md:col-span-3', 'md:col-span-3', 'md:col-span-2', 'md:col-span-2', 'md:col-span-2']

export function Ecosystem() {
  return (
    <section id="solucoes" aria-labelledby="ecosystem-title" className="relative">
      <div className="pointer-events-none absolute right-0 top-20 size-[600px] rounded-full bg-[radial-gradient(closest-side,rgb(226_174_58/0.08),transparent)]" />
      <div className="container-x relative py-24 md:py-36">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeader
            id="ecosystem-title"
            eyebrow="O ecossistema INTELRA"
            title={
              <>
                Cinco frentes.
                <br />
                <span className="slant text-gold">Um só resultado.</span>
              </>
            }
          />
          <Reveal delay={0.15} className="max-w-sm">
            <p className="text-pretty leading-relaxed text-mute">
              Da estratégia ao código: cada frente funciona sozinha — e fica muito mais forte quando trabalha em conjunto.
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
      className="gold-edge spotlight group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-ink-850 to-ink-950 p-6 transition-[transform,box-shadow] duration-700 ease-premium [--edge-opacity:0.35] hover:-translate-y-2 hover:shadow-[0_40px_90px_-40px_rgb(226_174_58/0.55)] md:p-8"
    >
      <span
        className="poster text-outline-gold pointer-events-none absolute right-6 top-5 text-[5.5rem] leading-none opacity-40 md:right-8 md:top-7 transition-opacity duration-700 group-hover:opacity-90"
        aria-hidden="true"
      >
        {area.index}
      </span>
      <div className="relative -ml-2 -mt-2 w-fit">
        <EcosystemGlyph type={area.glyph} />
      </div>

      <h3 className="poster relative mt-5 text-[2.3rem] leading-[1] transition-colors duration-500 group-hover:text-gold-100 md:text-[2.8rem]">
        {area.title}
      </h3>
      <p className="relative mt-3 max-w-md text-pretty leading-relaxed text-mute transition-colors duration-500 group-hover:text-bone/85">
        {area.summary}
      </p>

      <ul className="relative mt-6 flex flex-wrap gap-1.5" aria-label={`Serviços de ${area.title}`}>
        {area.items.map((item) => (
          <li
            key={item}
            className="rounded-full border border-white/[0.09] bg-white/[0.03] px-3 py-1.5 text-[0.8rem] text-bone/75 transition-colors duration-500 group-hover:border-gold-300/25"
          >
            {item}
          </li>
        ))}
      </ul>

      <a
        href={whatsappLink(area.message)}
        target="_blank"
        rel="noopener noreferrer"
        className="relative mt-7 flex items-center justify-between gap-3 rounded-full border border-gold-300/25 bg-gold-300/[0.06] py-2 pl-4 pr-2 text-[0.78rem] font-semibold uppercase tracking-[0.06em] text-gold-100 transition-all duration-500 ease-premium hover:border-gold-300/70 hover:bg-gold-300 hover:text-ink-950 md:mt-auto"
      >
        <span className="flex items-center gap-2">
          <WhatsApp className="size-4" />
          {area.cta}
        </span>
        <span className="grid size-8 place-items-center rounded-full bg-gold-300 text-ink-950 transition-colors duration-500">
          <ArrowUpRight className="size-4" />
        </span>
      </a>
    </article>
  )
}
