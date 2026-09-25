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
              className="flex h-14 items-center justify-between gap-3 rounded-full border border-white/10 bg-ink-900/85 pl-2 pr-5 shadow-[0_20px_50px_-15px_rgb(0_0_0/0.8)] backdrop-blur-xl active:scale-[0.98]"
            >
              <span className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-bone text-ink-950">
                  <WhatsApp className="size-[18px]" />
                </span>
                <span className="text-[0.95rem] font-medium">Falar com a INTELRA</span>
              </span>
              <ArrowRight className="size-4 text-gold" />
            </a>
          </m.div>

          {/* Desktop */}
          <m.a
            key="desktop"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Falar com a INTELRA pelo WhatsApp"
            className="group fixed bottom-6 right-6 z-40 hidden h-14 items-center gap-0 overflow-hidden rounded-full border border-white/10 bg-ink-900/85 p-1.5 shadow-[0_20px_50px_-15px_rgb(0_0_0/0.8)] backdrop-blur-xl transition-[border-color] duration-500 hover:border-gold/40 md:flex"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-bone text-ink-950">
              <WhatsApp className="size-5" />
            </span>
            <span className="max-w-0 whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-500 ease-premium group-hover:max-w-48 group-hover:px-4 group-hover:opacity-100">
              Falar com a INTELRA
            </span>
          </m.a>
        </>
      )}
    </AnimatePresence>
  )
}
