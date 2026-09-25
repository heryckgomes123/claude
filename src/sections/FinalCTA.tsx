import { CtaButton } from '../components/CtaButton'
import { Reveal } from '../components/Reveal'
import { WHATSAPP_MESSAGES } from '../config/site'

export function FinalCTA() {
  return (
    <section id="contato" aria-labelledby="final-title" className="noise relative overflow-hidden">
      <div className="editorial-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <div className="pointer-events-none absolute left-1/2 top-full size-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(201_164_92/0.2),transparent)]" />

      <div className="container-x relative flex flex-col items-center py-28 text-center md:py-44">
        <Reveal>
          <p className="eyebrow flex items-center gap-2.5 text-mute">
            <span className="inline-block size-1.5 rounded-full bg-gold" aria-hidden="true" />
            Próximo passo
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 id="final-title" className="display mt-7 max-w-5xl text-balance text-[2.9rem] sm:text-6xl md:text-7xl lg:text-[6.2rem]">
            Seu próximo passo pode <span className="serif-accent text-gold-soft">começar aqui.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-8 max-w-xl text-pretty text-lg leading-relaxed text-mute">
            Conte o que você quer construir, melhorar ou transformar. A INTELRA encontra a melhor estrutura para tirar isso do papel.
          </p>
        </Reveal>
        <Reveal delay={0.24} className="mt-11 flex flex-col items-center gap-4">
          <CtaButton size="lg" message={WHATSAPP_MESSAGES.final}>
            Falar com a INTELRA
          </CtaButton>
          <p className="flex items-center gap-2 text-sm text-mute">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-[pulse-dot_2.4s_ease-in-out_infinite] rounded-full bg-emerald-400/80" />
            </span>
            Atendimento inicial pelo WhatsApp.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
