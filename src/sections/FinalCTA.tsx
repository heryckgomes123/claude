import { Check } from '../components/Check'
import { CtaButton } from '../components/CtaButton'
import { EmberCanvas } from '../components/EmberCanvas'
import { Emblem } from '../components/Emblem'
import { Reveal } from '../components/Reveal'
import { WHATSAPP_MESSAGES } from '../config/site'

export function FinalCTA() {
  return (
    <section id="contato" aria-labelledby="final-title" className="grain relative overflow-hidden border-t border-gold-300/10">
      <EmberCanvas className="pointer-events-none absolute inset-0 size-full" density={1.3} />
      <div className="pointer-events-none absolute left-1/2 top-full size-[1100px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(226_174_58/0.3),transparent)]" />

      <div className="container-x relative flex flex-col items-center py-24 text-center md:py-36">
        <Reveal className="mb-14 md:mb-12">
          <Emblem className="w-[200px] md:w-[280px]" interactive={false} />
        </Reveal>
        <Reveal delay={0.08}>
          <h2 id="final-title" className="poster mt-2 max-w-5xl text-[3.6rem] sm:text-[5.6rem] md:text-[7rem] lg:text-[8.4rem]">
            Seu próximo passo
            <br />
            <span className="slant text-gold-shine">começa aqui.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-7 max-w-xl text-pretty text-lg leading-relaxed text-mute">
            Conte o que você quer construir, melhorar ou transformar. A INTELRA encontra a melhor estrutura para tirar isso do papel.
          </p>
        </Reveal>
        <Reveal delay={0.24} className="mt-10 flex w-full flex-col items-center gap-5">
          <div className="relative w-full sm:w-auto">
            <span
              className="absolute inset-0 animate-[ping-ring_2.4s_ease-out_infinite] rounded-full border-2 border-gold-300/60"
              aria-hidden="true"
            />
            <CtaButton size="xl" icon="whatsapp" message={WHATSAPP_MESSAGES.final} className="w-full sm:w-auto">
              Falar com a INTELRA
            </CtaButton>
          </div>
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-bone/65">
            {['Atendimento inicial pelo WhatsApp', 'Sem compromisso', 'Proposta sob medida'].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="size-3.5 text-neon" />
                {t}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
