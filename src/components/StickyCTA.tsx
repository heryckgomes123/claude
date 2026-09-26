import { AnimatePresence, m } from 'framer-motion'
import { useEffect, useState } from 'react'
import { whatsappLink } from '../config/site'
import { ArrowRight, WhatsApp } from './Icons'

const EASE = [0.22, 1, 0.36, 1] as const

/**
 * CTA persistente: barra inferior no mobile e botão flutuante de WhatsApp no desktop.
 * Aparece depois do Hero e some quando o CTA final está visível.
 */
export function StickyCTA() {
  const [pastHero, setPastHero] = useState(false)
  const [finalVisible, setFinalVisible] = useState(false)

  useEffect(() => {
    const hero = document.getElementById('inicio')
    const final = document.getElementById('contato')
    const observers: IntersectionObserver[] = []
    if (hero) {
      const io = new IntersectionObserver(([e]) => setPastHero(!e.isIntersecting), { rootMargin: '-35% 0px 0px 0px' })
      io.observe(hero)
      observers.push(io)
    }
    if (final) {
      const io = new IntersectionObserver(([e]) => setFinalVisible(e.isIntersecting), { threshold: 0.15 })
      io.observe(final)
      observers.push(io)
    }
    return () => observers.forEach((o) => o.disconnect())
  }, [])

  const show = pastHero && !finalVisible
  const href = whatsappLink()

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Mobile */}
          <m.div
            key="mobile"
            className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
            initial={{ y: '120%' }}
            animate={{ y: 0 }}
            exit={{ y: '120%' }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold flex h-14 items-center justify-between gap-3 rounded-full pl-2 pr-5 active:scale-[0.98]"
            >
              <span className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-ink-950 text-gold-200">
                  <WhatsApp className="size-[18px]" />
                </span>
                <span className="text-[0.85rem] font-semibold uppercase tracking-[0.06em]">Falar com a INTELRA</span>
              </span>
              <ArrowRight className="size-4" />
            </a>
          </m.div>

          {/* Desktop */}
          <m.a
            key="desktop"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Falar com a INTELRA pelo WhatsApp"
            className="btn-gold group fixed bottom-6 right-6 z-40 hidden h-16 items-center gap-0 overflow-visible rounded-full p-1.5 md:flex"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <span
              className="absolute inset-0 -z-10 animate-[ping-ring_2.2s_ease-out_infinite] rounded-full border-2 border-gold-300/70"
              aria-hidden="true"
            />
            <span className="grid size-[52px] shrink-0 place-items-center rounded-full bg-ink-950 text-gold-200">
              <WhatsApp className="size-6" />
            </span>
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold uppercase tracking-[0.06em] opacity-0 transition-all duration-500 ease-premium group-hover:max-w-56 group-hover:px-4 group-hover:opacity-100">
              Falar com a INTELRA
            </span>
          </m.a>
        </>
      )}
    </AnimatePresence>
  )
}
