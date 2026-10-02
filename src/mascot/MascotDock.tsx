import { AnimatePresence, m } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { CTA } from '../config/content'
import { projectCount, useProject } from '../state/project'
import { useUI } from '../state/ui'
import { ArrowRight, Close, Layers } from '../components/Icons'
import { Mascot } from './Mascot'
import { useMascotLine } from './useMascotLine'

/**
 * O anfitrião fora da abertura.
 * Desktop: acompanha discretamente a margem inferior esquerda, com fala recolhível.
 * Mobile: barra compacta com fala opcional, “Meu projeto” e acesso ao orçamento;
 * a página ganha um espaço inferior equivalente para nada ficar escondido atrás dela.
 */
export function MascotDock() {
  const ui = useUI()
  const { state } = useProject()
  const line = useMascotLine()
  const barRef = useRef<HTMLDivElement>(null)
  const count = projectCount(state)

  const inHero = ui.scene === 'inicio'
  const desktopVisible = !inHero && ui.scene !== 'fechamento'
  const collapsed = ui.mascotMinimized || ui.videoPlaying

  // Reserva espaço no fim da página para a barra mobile.
  useEffect(() => {
    const el = barRef.current
    if (!el) return
    const root = document.documentElement
    const update = () => root.style.setProperty('--dock-h', `${el.offsetHeight}px`)
    const mq = window.matchMedia('(min-width: 1024px)')
    const ro = new ResizeObserver(() => (mq.matches ? root.style.setProperty('--dock-h', '0px') : update()))
    ro.observe(el)
    const onMq = () => (mq.matches ? root.style.setProperty('--dock-h', '0px') : update())
    mq.addEventListener('change', onMq)
    onMq()
    return () => {
      ro.disconnect()
      mq.removeEventListener('change', onMq)
      root.style.removeProperty('--dock-h')
    }
  }, [])

  return (
    <>
      {/* Desktop */}
      <AnimatePresence>
        {desktopVisible && (
          <m.aside
            aria-label="Guia da página"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-5 left-5 z-40 hidden items-end gap-2 lg:flex"
          >
            <button
              type="button"
              onClick={() => ui.setMascotMinimized(!ui.mascotMinimized)}
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Mostrar a fala do robô guia' : 'Recolher a fala do robô guia'}
              className="rounded-2xl p-1 transition-transform hover:-translate-y-0.5"
            >
              <Mascot state={line.state} size={68} />
            </button>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <m.div
                  key="bubble"
                  initial={{ opacity: 0, scale: 0.92, x: -8 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.92, x: -8 }}
                  transition={{ duration: 0.22 }}
                  style={{ transformOrigin: 'left bottom' }}
                  className="glass chrome-edge mb-3 flex max-w-[270px] items-start gap-2 rounded-2xl rounded-bl-sm py-2.5 pl-3.5 pr-2 shadow-[0_24px_60px_-24px_rgb(0_0_0/0.9)]"
                >
                  <div className="min-w-0">
                    <p className="text-[0.88rem] leading-snug text-bone">{line.text}</p>
                    {line.action === 'quote' && (
                      <button
                        type="button"
                        onClick={() => ui.openQuote({ source: 'mascot_dock' })}
                        className="mt-1.5 inline-flex items-center gap-1 text-[0.82rem] font-semibold text-ion-300 hover:text-ion-200"
                      >
                        Organizar agora <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => ui.setMascotMinimized(true)}
                    aria-label="Minimizar falas do robô"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-mute hover:bg-white/10 hover:text-bone"
                  >
                    <Close size={14} />
                  </button>
                </m.div>
              )}
            </AnimatePresence>
          </m.aside>
        )}
      </AnimatePresence>

      {/* Mobile */}
      <div
        ref={barRef}
        className={`fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 ease-[var(--ease-premium)] lg:hidden ${
          inHero ? 'translate-y-full' : 'translate-y-0'
        }`}
        aria-hidden={inHero ? true : undefined}
        inert={inHero ? true : undefined}
      >
        <div className="border-t border-white/10 bg-ink-900/92 px-3 pt-2 backdrop-blur-xl [padding-bottom:max(0.6rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-xl items-center gap-2">
            <button
              type="button"
              onClick={() => ui.setMascotMinimized(!ui.mascotMinimized)}
              aria-expanded={!ui.mascotMinimized}
              aria-controls="dock-speech"
              aria-label={ui.mascotMinimized ? 'Mostrar a fala do robô guia' : 'Esconder a fala do robô guia'}
              className="shrink-0 rounded-xl p-0.5"
            >
              <Mascot state={line.state} size={40} shadow={false} float={false} />
            </button>
            {!ui.mascotMinimized ? (
              <p id="dock-speech" className="line-clamp-2 min-w-0 flex-1 text-[0.8rem] leading-snug text-bone/90">
                {line.text}
              </p>
            ) : (
              <span className="flex-1" />
            )}
            <button
              type="button"
              onClick={ui.openSummary}
              className="relative inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 text-[0.8rem] font-semibold text-bone"
              aria-label={`Meu projeto: ${count} ${count === 1 ? 'escolha' : 'escolhas'}`}
            >
              <Layers size={16} />
              <span className="tabular-nums">{count}</span>
            </button>
            <button type="button" onClick={() => ui.openQuote({ source: 'mobile_dock' })} className="btn btn-primary btn-sm h-11 shrink-0 px-3.5!">
              {ui.mascotMinimized ? CTA.primary : 'Orçamento'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
