import { Reveal } from '../components/Reveal'
import { WORLDS, WORLDS_INTRO } from '../config/content'
import type { InterestId } from '../config/quote'
import { useProject } from '../state/project'

const LINKS: { href: string; world: keyof typeof WORLDS; interest: InterestId; label: string }[] = [
  { href: '#imagens', world: 'images', interest: 'images', label: 'Imagens' },
  { href: '#videos', world: 'motion', interest: 'video', label: 'Movimento' },
  { href: '#experiencias', world: 'experiences', interest: 'site', label: 'Experiências' },
]

export function WorldsIntro() {
  const { state } = useProject()
  return (
    <section id="criacoes" data-scene="criacoes" aria-labelledby="criacoes-title" className="relative pb-16 pt-20 md:pb-20 md:pt-28">
      <div className="container-x grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-end">
        <Reveal className="lg:col-span-7">
          <p className="eyebrow text-volt-300">{WORLDS_INTRO.eyebrow}</p>
          <h2 id="criacoes-title" className="display mt-4 text-[2.2rem] text-bone md:text-[3.2rem]">
            {WORLDS_INTRO.title}
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-mute">{WORLDS_INTRO.text}</p>
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-5">
          <nav aria-label="Mundos da INTELRA">
            <ol className="grid gap-2">
              {LINKS.map((link) => {
                const recommended = state.interest === link.interest
                return (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className={`group flex items-center gap-4 rounded-2xl border px-4 py-3.5 transition-colors ${
                        recommended ? 'border-ion-400/70 bg-ion-400/[0.07]' : 'border-white/10 hover:border-white/25 hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className="eyebrow text-mute-600">{WORLDS[link.world].index}</span>
                      <span className="font-display text-lg font-semibold text-bone">{link.label}</span>
                      {recommended && (
                        <span className="ml-auto rounded-full bg-ion-400 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-ink-950">
                          Para você
                        </span>
                      )}
                      <span aria-hidden="true" className={`${recommended ? '' : 'ml-auto'} text-mute transition-transform group-hover:translate-x-1`}>
                        →
                      </span>
                    </a>
                  </li>
                )
              })}
            </ol>
          </nav>
        </Reveal>
      </div>
    </section>
  )
}
