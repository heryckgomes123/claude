import { BeforeAfter } from '../components/BeforeAfter'
import { ArrowRight } from '../components/Icons'
import { PieceCaption } from '../components/PieceCaption'
import { Reveal } from '../components/Reveal'
import { WORLDS } from '../config/content'
import { BEFORE_AFTER, PORTFOLIO_BY_ID } from '../config/portfolio'
import type { PortfolioItem } from '../config/portfolio'
import { SERVICE_BY_ID } from '../config/quote'
import { useProjectActions } from '../state/actions'
import { useProject } from '../state/project'

const W = WORLDS.images

function Print({ item, tilt, compact = false }: { item: PortfolioItem; tilt: string; compact?: boolean }) {
  const img = item.image!
  return (
    <figure className="group">
      <div
        className={`rounded-[6px] bg-white p-2 shadow-[0_40px_70px_-40px_rgb(22_19_31/0.55),0_2px_6px_rgb(22_19_31/0.08)] transition-transform duration-500 ease-[var(--ease-premium)] motion-safe:group-hover:rotate-0 ${tilt}`}
      >
        <div className="overflow-hidden rounded-[3px] bg-paper-300" style={{ aspectRatio: `${img.width} / ${img.height}` }}>
          <img
            src={img.src}
            width={img.width}
            height={img.height}
            alt={img.alt}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-premium)] motion-safe:group-hover:scale-[1.03]"
          />
        </div>
      </div>
      <PieceCaption item={item} tone="light" compact={compact} />
    </figure>
  )
}

export function WorldImages() {
  const { state } = useProject()
  const { startQuoteWith } = useProjectActions()
  const recommended = state.interest === 'images'
  const post = PORTFOLIO_BY_ID['post-intelra-trader']
  const flight = PORTFOLIO_BY_ID['still-voo']
  const landing = PORTFOLIO_BY_ID['still-pouso']

  return (
    <section
      id="imagens"
      data-scene="imagens"
      aria-labelledby="imagens-title"
      className="on-light relative isolate overflow-hidden bg-paper py-20 text-paper-ink md:py-28"
    >
      {/* Ciclorama de estúdio: luz de cima, chão em degradê */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_55%_at_70%_0%,#ffffff_0%,transparent_70%),linear-gradient(180deg,var(--color-paper)_0%,var(--color-paper)_62%,var(--color-paper-200)_100%)]"
      />
      <div aria-hidden="true" className="absolute right-[8%] top-0 -z-10 hidden h-[46%] w-px bg-gradient-to-b from-paper-ink/25 to-transparent lg:block" />

      <div className="container-x grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-6">
          <p className="eyebrow flex items-center gap-3 text-volt-700">
            <span className="text-paper-mute">{W.index}</span> {W.eyebrow}
            {recommended && <span className="rounded-full bg-paper-ink px-2 py-0.5 text-[0.65rem] text-bone">Para você</span>}
          </p>
          <h2 id="imagens-title" className="display mt-4 text-[2.2rem] md:text-[3.1rem]">
            {W.title}
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-paper-mute">{W.text}</p>
        </Reveal>
        <Reveal delay={0.06} className="lg:col-span-5 lg:col-start-8 lg:self-end">
          <ul className="flex flex-wrap gap-2">
            {SERVICE_BY_ID.images.deliverables.map((d) => (
              <li key={d} className="rounded-full border border-paper-ink/15 bg-white/60 px-3 py-1.5 text-[0.85rem] text-paper-ink">
                {d}
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-dark mt-6" onClick={() => startQuoteWith('images', 'world_images')}>
            {W.cta}
            <ArrowRight size={18} />
          </button>
        </Reveal>

        <Reveal delay={0.04} className="mt-4 lg:col-span-6">
          <Print item={post} tilt="-rotate-[1deg]" />
        </Reveal>
        <div className="grid grid-cols-2 gap-5 sm:gap-8 lg:col-span-6 lg:mt-4">
          <Reveal delay={0.1} className="lg:pt-28">
            <Print item={flight} tilt="rotate-[1.4deg]" compact />
          </Reveal>
          <Reveal delay={0.16} className="pt-10 lg:pt-0">
            <Print item={landing} tilt="-rotate-[0.8deg]" compact />
          </Reveal>
        </div>
      </div>

      {BEFORE_AFTER.length > 0 && (
        <div className="container-x mt-20">
          <h3 className="display text-2xl">Antes e depois</h3>
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            {BEFORE_AFTER.map((pair) => (
              <BeforeAfter key={pair.id} pair={pair} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
