import { CtaButton } from '../components/CtaButton'
import { Reveal } from '../components/Reveal'
import { SectionHeader } from '../components/SectionHeader'
import { WHATSAPP_MESSAGES } from '../config/site'
import { AUDIENCE } from '../data/audience'

export function Audience() {
  return (
    <section aria-labelledby="audience-title" className="relative border-t border-gold-300/10">
      <div className="container-x py-24 md:py-36">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeader
            id="audience-title"
            eyebrow="Para quem é"
            title={
              <>
                Para negócios que
                <br />
                <span className="slant text-gold">querem evoluir.</span>
              </>
            }
          />
          <Reveal delay={0.15} className="max-w-sm">
            <p className="text-pretty leading-relaxed text-mute">
              Trabalhamos com quem entende que presença digital, tecnologia e estratégia fazem parte do negócio — não são detalhe.
            </p>
          </Reveal>
        </div>

        <ul className="mt-14 grid gap-3 sm:grid-cols-2 md:mt-20 lg:grid-cols-4">
          {AUDIENCE.map((item, i) => (
            <Reveal as="li" key={item.title} delay={(i % 4) * 0.06} blur={false}>
              <div className="group relative h-full overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-ink-900 p-6 transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-transparent hover:shadow-[0_30px_70px_-30px_rgb(226_174_58/0.7)] md:p-7">
                <div
                  className="bg-gold-metal absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  aria-hidden="true"
                />
                <div className="relative">
                  <span className="eyebrow text-mute-600 transition-colors duration-500 group-hover:text-ink-950/60">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="poster mt-10 text-[2rem] leading-none transition-colors duration-500 group-hover:text-ink-950 md:mt-14">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-pretty text-[0.95rem] leading-relaxed text-mute transition-colors duration-500 group-hover:text-ink-950/75">
                    {item.text}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </ul>

        <Reveal className="mt-14 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <CtaButton size="lg" icon="whatsapp" message={WHATSAPP_MESSAGES.audience}>
            Meu negócio é assim
          </CtaButton>
          <p className="text-sm text-mute">Vamos conversar sobre o seu momento.</p>
        </Reveal>
      </div>
    </section>
  )
}
