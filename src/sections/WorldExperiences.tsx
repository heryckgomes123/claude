import robotPurple from '../assets/brand/robot-purple.webp'
import { AddReferenceButton } from '../components/AddReferenceButton'
import { ArrowRight } from '../components/Icons'
import { Reveal } from '../components/Reveal'
import { WORLDS } from '../config/content'
import { KIND_LABEL, PORTFOLIO } from '../config/portfolio'
import { useProjectActions } from '../state/actions'
import { useProject } from '../state/project'

const W = WORLDS.experiences

/** Monitor retrô em CSS com interfaces “saindo” da tela em 3D. Ilustração, não um case. */
function MonitorScene() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-[84%] max-w-[480px] [perspective:1100px] lg:w-full">
      {/* Chão em grade */}
      <div className="absolute inset-x-[-20%] bottom-[-14%] h-[45%] [transform:rotateX(68deg)] [background-image:linear-gradient(rgb(152_115_255/0.35)_1px,transparent_1px),linear-gradient(90deg,rgb(152_115_255/0.35)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:linear-gradient(0deg,black,transparent)]" />

      <div className="relative [transform-style:preserve-3d] lg:[transform:rotateY(-14deg)_rotateX(4deg)]">
        {/* Gabinete */}
        <div className="relative rounded-[26px] bg-[linear-gradient(160deg,#f1ebdc_0%,#d9d0bb_55%,#bfb59d_100%)] p-[6%] pb-[9%] shadow-[inset_0_2px_0_rgb(255_255_255/0.7),inset_0_-6px_0_rgb(0_0_0/0.12),0_50px_80px_-30px_rgb(0_0_0/0.8)]">
          <div className="relative overflow-hidden rounded-[14px] bg-[#0c1426] p-[5%] shadow-[inset_0_0_0_6px_#2a2a30,inset_0_0_40px_rgb(34_230_246/0.25)]" style={{ aspectRatio: '4 / 3' }}>
            {/* Tela: miniatura desta página */}
            <div className="scanlines absolute inset-0 opacity-70" />
            <div className="relative flex h-full flex-col gap-[6%]">
              <div className="flex items-center justify-between">
                <span className="h-[7px] w-[22%] rounded-full bg-white/70" />
                <span className="h-[9px] w-[20%] rounded-full bg-volt-500" />
              </div>
              <div className="flex flex-1 items-center gap-[6%]">
                <div className="flex flex-1 flex-col gap-[10px]">
                  <span className="h-[10px] w-[90%] rounded bg-white/85" />
                  <span className="h-[10px] w-[70%] rounded bg-volt-300/90" />
                  <span className="h-[6px] w-[80%] rounded bg-white/30" />
                  <span className="mt-1 h-[14px] w-[46%] rounded-full bg-volt-500" />
                </div>
                <img src={robotPurple} alt="" width={480} height={480} className="w-[30%]" loading="lazy" decoding="async" />
              </div>
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(0_0_0/0.45))]" />
          </div>
          <span className="absolute bottom-[3.2%] right-[8%] h-2 w-2 rounded-full bg-ion-400 shadow-[0_0_8px_var(--color-ion-400)]" />
          <span className="eyebrow absolute bottom-[2.6%] left-[8%] text-[0.55rem] text-[#7d735d]">INTELRA · CRT</span>
        </div>
        <div className="mx-auto h-5 w-[30%] rounded-b-xl bg-[linear-gradient(180deg,#c9bfa8,#a89d84)]" />

        {/* Painéis saindo da tela */}
        <div
          className="glass chrome-edge absolute -left-[6%] top-[8%] w-[38%] rounded-xl p-3 [transform:translateZ(90px)]"
          style={{ animation: 'drift 7s ease-in-out infinite' }}
        >
          <span className="eyebrow text-[0.55rem] text-ion-300">Orçamento guiado</span>
          <div className="mt-2 flex gap-1.5">
            <span className="h-1.5 flex-1 rounded-full bg-ion-400" />
            <span className="h-1.5 flex-1 rounded-full bg-ion-400" />
            <span className="h-1.5 flex-1 rounded-full bg-white/20" />
            <span className="h-1.5 flex-1 rounded-full bg-white/20" />
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            <span className="h-5 rounded-md border border-volt-400 bg-volt-500/30" />
            <span className="h-5 rounded-md border border-white/15" />
          </div>
        </div>
        <div
          className="glass chrome-edge absolute -right-[8%] top-[30%] w-[34%] rounded-xl p-2.5 [transform:translateZ(140px)]"
          style={{ animation: 'drift 8s ease-in-out -2s infinite' }}
        >
          <span className="eyebrow text-[0.55rem] text-volt-300">Galeria</span>
          <div className="mt-2 grid grid-cols-3 gap-1">
            <span className="aspect-[3/4] rounded bg-gradient-to-br from-volt-400 to-volt-800" />
            <span className="aspect-[3/4] rounded bg-gradient-to-br from-ion-300 to-ion-700" />
            <span className="aspect-[3/4] rounded bg-gradient-to-br from-coral-300 to-coral-500" />
          </div>
        </div>
        <div
          className="glass absolute -bottom-[2%] left-[16%] flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[0.68rem] text-bone [transform:translateZ(110px)]"
          style={{ animation: 'drift 6s ease-in-out -1s infinite' }}
        >
          <span className="grid h-4 w-4 place-items-center rounded-full bg-ion-400 text-[0.55rem] text-ink-950">✓</span>
          Referência adicionada
        </div>
      </div>
    </div>
  )
}

export function WorldExperiences() {
  const { state } = useProject()
  const { startQuoteWith } = useProjectActions()
  const recommended = state.interest === 'site'
  const items = PORTFOLIO.filter((p) => p.world === 'experiences')
  const [live, ...capabilities] = items

  return (
    <section
      id="experiencias"
      data-scene="experiencias"
      aria-labelledby="experiencias-title"
      className="relative isolate overflow-hidden bg-[linear-gradient(180deg,var(--color-ink-950)_0%,#120d2a_55%,var(--color-ink-950)_100%)] py-20 md:py-28"
    >
      <div aria-hidden="true" className="absolute left-[-10%] top-[20%] -z-10 h-[480px] w-[480px] rounded-full bg-volt-600/20 blur-[130px]" />
      <div className="container-x grid grid-cols-1 gap-14 lg:grid-cols-12 lg:items-center">
        <Reveal className="order-2 lg:order-1 lg:col-span-6">
          <MonitorScene />
        </Reveal>

        <Reveal delay={0.08} className="order-1 lg:order-2 lg:col-span-6">
          <p className="eyebrow flex items-center gap-3 text-volt-300">
            <span className="text-mute-600">{W.index}</span> {W.eyebrow}
            {recommended && <span className="rounded-full bg-ion-400 px-2 py-0.5 text-[0.65rem] text-ink-950">Para você</span>}
          </p>
          <h2 id="experiencias-title" className="display mt-4 text-[2.2rem] text-bone md:text-[3.1rem]">
            {W.title}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-mute">{W.text}</p>

          <article className="chrome-edge mt-8 rounded-2xl bg-gradient-to-br from-volt-700/40 to-ink-850 p-5">
            <p className="eyebrow text-ion-300">{KIND_LABEL[live.kind]} · Case vivo</p>
            <h3 className="mt-2 font-display text-xl font-semibold text-bone">{live.title}</h3>
            <p className="mt-1.5 text-[0.95rem] leading-relaxed text-mute">{live.description}</p>
            <AddReferenceButton id={live.id} title={live.title} className="mt-4" />
          </article>

          <ul className="mt-3 divide-y divide-white/[0.08] rounded-2xl border border-white/10">
            {capabilities.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="eyebrow text-mute-600">{KIND_LABEL[item.kind]}</p>
                  <h3 className="mt-1 font-display text-[1.05rem] font-semibold text-bone">{item.title}</h3>
                  <p className="mt-1 text-[0.9rem] leading-relaxed text-mute">{item.description}</p>
                </div>
                <AddReferenceButton id={item.id} title={item.title} className="shrink-0 self-start sm:self-center" />
              </li>
            ))}
          </ul>

          <button type="button" className="btn btn-primary mt-8" onClick={() => startQuoteWith('site', 'world_experiences')}>
            {W.cta}
            <ArrowRight size={18} />
          </button>
        </Reveal>
      </div>
    </section>
  )
}
