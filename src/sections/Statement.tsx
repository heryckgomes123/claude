import { ConstellationCanvas } from '../components/ConstellationCanvas'
import { CtaButton } from '../components/CtaButton'
import { Reveal } from '../components/Reveal'
import { WHATSAPP_MESSAGES } from '../config/site'
import { PRINCIPLES } from '../data/principles'

export function Statement() {
  return (
    <section id="sobre" aria-labelledby="statement-title" className="relative overflow-hidden">
      {/* Bloco dourado */}
      <div className="grain bg-gold-metal relative text-ink-950">
        <ConstellationCanvas
          tone="gold"
          className="absolute inset-0 size-full [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]"
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,rgb(255_255_255/0.35),transparent_70%)] mix-blend-soft-light" />
        <div className="container-x relative flex min-h-[80svh] flex-col items-center justify-center py-28 text-center md:min-h-[90vh]">
          <Reveal>
            <p className="eyebrow flex items-center gap-2.5 text-ink-950/70">
              <span className="inline-block size-1.5 rounded-full bg-ink-950" aria-hidden="true" />
              INTELRA em uma frase
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 id="statement-title" className="poster mt-7 text-[4.4rem] leading-[1] sm:text-[7rem] md:text-[9rem] lg:text-[11rem]">
              Da ideia
              <br />
              <span className="slant">à execução.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mx-auto mt-10 max-w-xl text-pretty text-lg font-medium leading-relaxed text-ink-950/75 md:text-xl">
              Estratégia, criatividade e tecnologia trabalhando juntas para transformar negócios.
            </p>
          </Reveal>
          <Reveal delay={0.24} className="mt-10">
            <CtaButton size="lg" variant="dark" icon="whatsapp" message={WHATSAPP_MESSAGES.idea}>
              Tirar minha ideia do papel
            </CtaButton>
          </Reveal>
        </div>
      </div>

      {/* Sobre */}
      <div className="grain relative">
        <div className="container-x relative py-20 md:py-28">
          <div className="grid gap-12 lg:grid-cols-12">
            <Reveal className="lg:col-span-5">
              <p className="eyebrow text-mute">Sobre a INTELRA</p>
              <p className="mt-6 text-pretty text-2xl font-medium leading-snug tracking-[-0.025em] md:text-[2rem]">
                Somos uma empresa de soluções digitais. Unimos estratégia, conteúdo, tráfego, inteligência artificial e desenvolvimento para
                <span className="text-gold"> tornar negócios mais inteligentes, profissionais e lucrativos.</span>
              </p>
            </Reveal>
            <ul className="grid gap-8 sm:grid-cols-3 lg:col-span-6 lg:col-start-7 lg:gap-6">
              {PRINCIPLES.map((p, i) => (
                <Reveal as="li" key={p.title} delay={0.08 + i * 0.08}>
                  <span
                    className="block h-[3px] w-12 rounded-full bg-gradient-to-r from-gold-300 to-gold-600 shadow-[0_0_10px_rgb(247_201_72/0.6)]"
                    aria-hidden="true"
                  />
                  <h3 className="poster mt-5 text-[1.7rem] leading-[1.05]">{p.title}</h3>
                  <p className="mt-3 text-pretty text-[0.95rem] leading-relaxed text-mute">{p.text}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
