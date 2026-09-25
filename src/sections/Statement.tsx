import { ConstellationCanvas } from '../components/ConstellationCanvas'
import { Reveal } from '../components/Reveal'
import { PRINCIPLES } from '../data/principles'

export function Statement() {
  return (
    <section id="sobre" aria-labelledby="statement-title" className="noise relative overflow-hidden bg-[#050505]">
      <div className="relative">
        <ConstellationCanvas className="absolute inset-0 size-full [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="container-x relative flex min-h-[78svh] flex-col items-center justify-center py-28 text-center md:min-h-[88vh]">
          <Reveal>
            <p className="eyebrow flex items-center gap-2.5 text-mute">
              <span className="inline-block size-1.5 rounded-full bg-gold" aria-hidden="true" />
              INTELRA em uma frase
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 id="statement-title" className="display mt-8 text-[3.4rem] sm:text-7xl md:text-[7.5rem] lg:text-[9rem]">
              Da ideia
              <br />à{' '}
              <span className="serif-accent bg-gradient-to-br from-bone via-gold-soft to-gold bg-clip-text pr-[0.06em] text-transparent">
                execução.
              </span>
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mx-auto mt-8 max-w-xl text-pretty text-lg leading-relaxed text-mute md:text-xl">
              Estratégia, criatividade e tecnologia trabalhando juntas para transformar negócios.
            </p>
          </Reveal>
        </div>
      </div>

      {/* Sobre */}
      <div className="container-x relative border-t border-white/[0.07] py-20 md:py-28">
        <div className="grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="eyebrow text-mute">Sobre a INTELRA</p>
            <p className="mt-6 text-pretty text-2xl font-medium leading-snug tracking-[-0.025em] md:text-[2rem]">
              Somos uma empresa de soluções digitais. Unimos estratégia, marketing, inteligência artificial e desenvolvimento para
              <span className="text-mute"> tornar negócios mais inteligentes, profissionais e eficientes.</span>
            </p>
          </Reveal>
          <ul className="grid gap-8 sm:grid-cols-3 lg:col-span-6 lg:col-start-7 lg:gap-6">
            {PRINCIPLES.map((p, i) => (
              <Reveal as="li" key={p.title} delay={0.08 + i * 0.08}>
                <span className="block h-px w-10 bg-gold" aria-hidden="true" />
                <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em]">{p.title}</h3>
                <p className="mt-2 text-pretty text-[0.95rem] leading-relaxed text-mute">{p.text}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
