import { Reveal } from '../components/Reveal'
import { PROCESS } from '../config/content'
import { FAQ } from '../config/faq'

export function Process() {
  return (
    <section id="como-funciona" data-scene="como-funciona" aria-labelledby="processo-title" className="relative bg-ink-900 py-20 md:py-28">
      <div className="container-x">
        <Reveal>
          <p className="eyebrow text-ion-300">{PROCESS.eyebrow}</p>
          <h2 id="processo-title" className="display mt-4 text-[2.2rem] text-bone md:text-[3.2rem]">
            {PROCESS.title}
          </h2>
        </Reveal>

        {/* Película: quatro quadros em sequência */}
        <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PROCESS.steps.map((step, i) => (
            <li key={step.title}>
              <Reveal delay={i * 0.06} className="relative h-full rounded-2xl border border-white/10 bg-ink-850 p-6 pt-9">
                <span aria-hidden="true" className="absolute inset-x-5 top-3 flex justify-between">
                  {Array.from({ length: 7 }, (_, k) => (
                    <span key={k} className="h-1.5 w-2.5 rounded-[2px] bg-white/10" />
                  ))}
                </span>
                <span className="eyebrow text-volt-300">Quadro {String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-3 font-display text-[1.2rem] font-semibold leading-snug text-bone">{step.title}</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-mute">{step.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>

        <div className="mt-20 grid grid-cols-1 gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <h2 id="faq-title" className="display text-[1.9rem] text-bone md:text-[2.4rem]">
              Perguntas frequentes
            </h2>
            <p className="mt-4 text-mute">Respostas diretas sobre materiais, processo, formatos, prazos e orçamento.</p>
          </Reveal>
          <div className="lg:col-span-8">
            <ul aria-labelledby="faq-title" className="divide-y divide-white/10 border-y border-white/10">
              {FAQ.map((item) => (
                <li key={item.q}>
                  <details className="group">
                    <summary className="flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-[1.05rem] font-semibold text-bone marker:hidden [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <span
                        aria-hidden="true"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 text-mute transition-transform duration-300 group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="max-w-2xl pb-5 leading-relaxed text-mute">{item.a}</p>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
