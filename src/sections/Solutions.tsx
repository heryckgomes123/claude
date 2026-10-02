import { Check, Plus } from '../components/Icons'
import { Reveal } from '../components/Reveal'
import { CTA, SOLUTIONS } from '../config/content'
import { SERVICES } from '../config/quote'
import { useProjectActions } from '../state/actions'
import { useProject } from '../state/project'
import { useUI } from '../state/ui'

const ACCENT = ['text-volt-300', 'text-ion-300', 'text-coral-300', 'text-bone'] as const

export function Solutions() {
  const { state } = useProject()
  const { toggleService } = useProjectActions()
  const ui = useUI()

  return (
    <section id="solucoes" data-scene="solucoes" aria-labelledby="solucoes-title" className="relative py-20 md:py-28">
      <div className="container-x">
        <Reveal className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="eyebrow text-volt-300">{SOLUTIONS.eyebrow}</p>
            <h2 id="solucoes-title" className="display mt-4 text-[2.2rem] text-bone md:text-[3.2rem]">
              {SOLUTIONS.title}
            </h2>
          </div>
          <p className="text-lg leading-relaxed text-mute lg:col-span-4 lg:col-start-9">{SOLUTIONS.text}</p>
        </Reveal>

        <ol className="mt-12 border-t border-white/10">
          {SERVICES.map((service, i) => {
            const included = state.services.includes(service.id)
            return (
              <li key={service.id} className="border-b border-white/10">
                <Reveal y={12} className="group grid grid-cols-1 gap-5 py-8 md:grid-cols-12 md:gap-8 md:py-10">
                  <div className="flex items-baseline gap-4 md:col-span-5">
                    <span className={`eyebrow ${ACCENT[i]}`}>{String(i + 1).padStart(2, '0')}</span>
                    <h3 className="display text-[1.7rem] text-bone md:text-[2.1rem]">{service.label}</h3>
                  </div>
                  <div className="md:col-span-4">
                    <p className="leading-relaxed text-mute">{service.summary}</p>
                    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.88rem] text-bone/80">
                      {service.deliverables.map((d) => (
                        <li key={d} className="flex items-center gap-1.5">
                          <span aria-hidden="true" className="h-1 w-1 bg-current opacity-60" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-wrap items-start gap-2 md:col-span-3 md:justify-end">
                    <button
                      type="button"
                      aria-pressed={included}
                      onClick={() => toggleService(service.id, 'solutions')}
                      className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[0.88rem] font-semibold transition-colors ${
                        included ? 'bg-ion-400 text-ink-950 hover:bg-ion-300' : 'border border-white/20 text-bone hover:border-volt-300 hover:bg-volt-600/25'
                      }`}
                    >
                      {included ? <Check size={16} strokeWidth={2.4} /> : <Plus size={16} />}
                      {included ? 'No meu projeto' : 'Incluir no projeto'}
                    </button>
                    {service.id !== 'custom' && (
                      <a href={service.anchor} className="inline-flex min-h-[44px] items-center rounded-full px-3 text-[0.88rem] text-mute underline-offset-4 hover:text-bone hover:underline">
                        Ver exemplos
                      </a>
                    )}
                  </div>
                </Reveal>
              </li>
            )
          })}
        </ol>

        <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <button type="button" className="btn btn-primary" onClick={() => ui.openQuote({ source: 'solutions' })}>
            {CTA.primary}
          </button>
          <p className="text-sm text-mute">Os serviços marcados já entram no orçamento.</p>
        </div>
      </div>
    </section>
  )
}
