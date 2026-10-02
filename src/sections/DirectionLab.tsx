import { AnimatePresence, m } from 'framer-motion'
import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import robotCyan from '../assets/brand/robot-cyan.webp'
import robotPurple from '../assets/brand/robot-purple.webp'
import { Check } from '../components/Icons'
import { Reveal } from '../components/Reveal'
import { DIRECTION_LAB } from '../config/content'
import { DIRECTION_IDS, DIRECTION_LABELS } from '../config/quote'
import type { DirectionId } from '../config/quote'
import { useProjectActions } from '../state/actions'
import { useProject } from '../state/project'

const NOTES: Record<DirectionId, string> = {
  'retro-pop': 'Cores chapadas, retícula, tipografia gorda e humor de embalagem anos 80.',
  'chrome-future': 'Preto profundo, metal líquido, horizonte em grade e luz ciano.',
  editorial: 'Papel claro, serifa elegante, muito respiro e o produto como protagonista.',
}

/* As três composições usam o mesmo tema e o mascote oficial sem alterações. */

function RetroPop() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#ffd447] text-[#1a1033]">
      <div className="absolute inset-0 [background:repeating-conic-gradient(from_0deg_at_70%_62%,#ff8763_0deg_10deg,#ffd447_10deg_20deg)] opacity-80" />
      <div className="absolute inset-0 [background-image:radial-gradient(#1a1033_1.2px,transparent_1.3px)] [background-size:12px_12px] opacity-20" />
      <div className="absolute bottom-0 left-0 right-0 h-[22%] bg-[#1a1033]" />
      <div className="absolute bottom-[22%] left-0 right-0 h-2 bg-[#22e6f6]" />
      <img src={robotPurple} alt="" width={480} height={480} className="absolute bottom-[14%] right-[6%] w-[46%] drop-shadow-[10px_10px_0_#1a1033]" />
      <div className="absolute left-[6%] top-[8%] max-w-[60%]">
        <p className="inline-block -rotate-3 bg-[#1a1033] px-2 py-1 font-pixel text-[clamp(0.55rem,1.4vw,0.8rem)] text-[#ffd447]">Novo no bairro!</p>
        <p className="mt-3 font-display text-[clamp(1.6rem,5vw,3.4rem)] font-extrabold italic leading-[0.95] tracking-tight [text-shadow:3px_3px_0_#fff]">
          OI, EU SOU O ROBÔ.
        </p>
      </div>
      <span className="absolute left-[8%] top-[56%] grid h-[18%] w-[18%] max-h-24 max-w-24 rotate-12 place-items-center rounded-full bg-[#22e6f6] text-center font-pixel text-[clamp(0.45rem,1.1vw,0.7rem)] leading-tight text-[#1a1033] ring-4 ring-[#1a1033]">
        100% pixel
      </span>
      <p className="absolute bottom-[7%] left-[6%] font-pixel text-[clamp(0.5rem,1.2vw,0.75rem)] text-[#ffd447]">INTELRA ▸ lado A</p>
    </div>
  )
}

function ChromeFuture() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#04050c] text-white">
      <div className="absolute inset-x-[-30%] bottom-[-10%] h-[55%] [transform:perspective(500px)_rotateX(62deg)] [background-image:linear-gradient(rgb(34_230_246/0.55)_1px,transparent_1px),linear-gradient(90deg,rgb(34_230_246/0.55)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:linear-gradient(0deg,black_20%,transparent)]" />
      <div className="absolute left-1/2 top-[44%] aspect-square w-[52%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-ion-300/70 shadow-[0_0_60px_rgb(34_230_246/0.6),inset_0_0_60px_rgb(34_230_246/0.35)]" />
      <div className="absolute left-1/2 top-[44%] aspect-square w-[64%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
      <img src={robotCyan} alt="" width={480} height={480} className="absolute left-1/2 top-[44%] w-[34%] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_30px_rgb(34_230_246/0.6)]" />
      <p className="text-chrome absolute left-[6%] top-[7%] font-display text-[clamp(1.5rem,4.6vw,3.2rem)] font-bold leading-none tracking-[-0.04em]">
        ANFITRIÃO/01
      </p>
      <div className="glass absolute bottom-[8%] right-[6%] rounded-lg px-3 py-2 font-pixel text-[clamp(0.45rem,1vw,0.65rem)] leading-relaxed text-ion-200">
        <p>Modelo: INTELRA</p>
        <p>Status: online</p>
      </div>
    </div>
  )
}

function Editorial() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f3efe7] text-[#1b1820]">
      <div className="absolute inset-x-[6%] top-[7%] flex justify-between border-b border-[#1b1820]/30 pb-2 text-[clamp(0.5rem,1.1vw,0.72rem)] uppercase tracking-[0.2em]">
        <span>Edição nº 01</span>
        <span>INTELRA</span>
      </div>
      <p className="absolute left-[6%] top-[17%] max-w-[55%] font-serif text-[clamp(2rem,6.4vw,4.6rem)] italic leading-[0.92]">O anfitrião.</p>
      <p className="absolute bottom-[10%] left-[6%] max-w-[38%] font-serif text-[clamp(0.7rem,1.4vw,1rem)] leading-snug text-[#1b1820]/80">
        Um guia discreto para uma marca que gosta de receber bem.
      </p>
      <div className="absolute bottom-[12%] right-[10%] w-[36%]">
        <img src={robotPurple} alt="" width={480} height={480} className="relative z-10 w-full" />
        <div className="mx-auto -mt-[6%] h-[18px] w-[90%] rounded-[50%] bg-[#1b1820]/15 blur-[6px]" />
        <div className="mx-auto mt-1 h-[10px] w-[70%] bg-[#d9d2c3]" />
      </div>
      <span className="absolute right-[6%] top-[17%] h-[38%] w-px bg-[#1b1820]/25" />
    </div>
  )
}

const SCENES: Record<DirectionId, () => React.JSX.Element> = {
  'retro-pop': RetroPop,
  'chrome-future': ChromeFuture,
  editorial: Editorial,
}

export function DirectionLab() {
  const { state } = useProject()
  const { chooseDirection } = useProjectActions()
  const [active, setActive] = useState<DirectionId>(state.direction ?? 'retro-pop')
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const Scene = SCENES[active]
  const saved = state.direction === active

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = DIRECTION_IDS.length - 1
    let next = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = index === last ? 0 : index + 1
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = index === 0 ? last : index - 1
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = last
    if (next < 0) return
    e.preventDefault()
    setActive(DIRECTION_IDS[next])
    tabRefs.current[next]?.focus()
  }

  return (
    <section id="direcao" data-scene="direcao" aria-labelledby="direcao-title" className="relative isolate overflow-hidden bg-volt-700 py-20 md:py-28">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_100%_0%,var(--color-volt-500),transparent_60%),radial-gradient(ellipse_60%_50%_at_0%_100%,var(--color-volt-800),transparent_70%)]" />
      <div className="container-x grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
        <Reveal className="lg:col-span-4">
          <p className="eyebrow text-volt-100">{DIRECTION_LAB.eyebrow}</p>
          <h2 id="direcao-title" className="display mt-4 text-[2.3rem] text-white md:text-[3.2rem]">
            {DIRECTION_LAB.title}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-volt-100">{DIRECTION_LAB.text}</p>

          <div role="tablist" aria-label="Direções de arte" className="mt-8 grid gap-2">
            {DIRECTION_IDS.map((id, i) => {
              const selected = active === id
              return (
                <button
                  key={id}
                  ref={(el) => {
                    tabRefs.current[i] = el
                  }}
                  role="tab"
                  id={`dir-tab-${id}`}
                  aria-selected={selected}
                  aria-controls="dir-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(id)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                    selected ? 'border-white bg-white text-volt-800' : 'border-white/25 text-white hover:border-white/60 hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center justify-between font-display text-lg font-semibold">
                    {DIRECTION_LABELS[id]}
                    {state.direction === id && (
                      <span className="inline-flex items-center gap-1 text-[0.75rem] font-semibold">
                        <Check size={14} strokeWidth={2.6} /> no projeto
                      </span>
                    )}
                  </span>
                  <span className={`mt-0.5 block text-[0.88rem] leading-snug ${selected ? 'text-volt-800/80' : 'text-volt-100/85'}`}>{NOTES[id]}</span>
                </button>
              )
            })}
          </div>
        </Reveal>

        <Reveal delay={0.08} className="lg:col-span-8">
          <div id="dir-panel" role="tabpanel" aria-labelledby={`dir-tab-${active}`}>
            <figure>
              <div className="relative overflow-hidden rounded-[22px] bg-ink-950 shadow-[0_60px_100px_-40px_rgb(10_4_40/0.9)] ring-1 ring-white/20" style={{ aspectRatio: '16 / 11' }}>
                <AnimatePresence initial={false} mode="popLayout">
                  <m.div
                    key={active}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Scene />
                  </m.div>
                </AnimatePresence>
              </div>
              <figcaption className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-md text-[0.85rem] leading-snug text-volt-100">
                  <span className="font-semibold text-white">Exemplo visual: {DIRECTION_LABELS[active]}.</span> {DIRECTION_LAB.disclaimer}
                </p>
                <button
                  type="button"
                  onClick={() => chooseDirection(saved ? null : active)}
                  aria-pressed={saved}
                  className={`btn shrink-0 ${saved ? 'bg-ion-400 text-ink-950 hover:bg-ion-300' : 'bg-white text-volt-800 hover:bg-volt-100'}`}
                >
                  {saved ? (
                    <>
                      <Check size={18} strokeWidth={2.4} /> Direção no seu projeto
                    </>
                  ) : (
                    DIRECTION_LAB.cta
                  )}
                </button>
              </figcaption>
            </figure>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
