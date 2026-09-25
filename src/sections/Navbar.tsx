import { AnimatePresence, m, useScroll, useSpring } from 'framer-motion'
import { useEffect, useState } from 'react'
import { CtaButton } from '../components/CtaButton'
import { Logo } from '../components/Logo'
import { NAV_LINKS } from '../data/navigation'
import { useScrolled } from '../hooks/useScrolled'
import { ArrowUpRight } from '../components/Icons'

const EASE = [0.22, 1, 0.36, 1] as const

export function Navbar() {
  const scrolled = useScrolled(16)
  const [open, setOpen] = useState(false)
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 })

  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : ''
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`relative transition-[background-color,border-color,backdrop-filter] duration-500 ease-premium ${
          scrolled || open
            ? 'border-b border-white/[0.07] bg-ink-950/85 backdrop-blur-xl backdrop-saturate-150'
            : 'border-b border-transparent'
        }`}
      >
        <nav
          aria-label="Principal"
          className="container-x grid h-16 grid-cols-[1fr_auto] items-center md:h-[72px] lg:grid-cols-[1fr_auto_1fr]"
        >
          <a href="#inicio" aria-label="INTELRA — início" className="relative z-10 justify-self-start" onClick={() => setOpen(false)}>
            <Logo size="sm" />
          </a>

          <ul className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-full px-3.5 py-2 text-[0.85rem] text-bone/65 transition-colors duration-300 hover:bg-gold-300/[0.08] hover:text-gold-100 xl:px-4"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-self-end gap-2">
            <span className="hidden sm:block">
              <CtaButton className="h-10! px-4! text-[0.72rem]!" icon="whatsapp">
                Falar com a INTELRA
              </CtaButton>
            </span>
            <button
              type="button"
              className="relative z-10 grid size-10 place-items-center rounded-full ring-1 ring-inset ring-white/15 transition-colors hover:ring-white/30 lg:hidden"
              aria-label={open ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="relative block h-2.5 w-4">
                <span
                  className={`absolute left-0 h-px w-full bg-bone transition-all duration-500 ease-premium ${open ? 'top-1/2 rotate-45' : 'top-0'}`}
                />
                <span
                  className={`absolute left-0 h-px w-full bg-bone transition-all duration-500 ease-premium ${open ? 'top-1/2 -rotate-45' : 'top-full'}`}
                />
              </span>
            </button>
          </div>
        </nav>
        {/* Barra de progresso da leitura */}
        <m.div
          style={{ scaleX: progress }}
          className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-gradient-to-r from-gold-600 via-gold-300 to-gold-100"
        />
      </div>

      <AnimatePresence>
        {open && (
          <m.div
            id="mobile-menu"
            className="grain fixed inset-0 top-16 z-40 flex flex-col bg-ink-950/95 backdrop-blur-2xl lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <ul className="container-x flex flex-1 flex-col justify-center gap-1 pb-10">
              {NAV_LINKS.map((link, i) => (
                <m.li
                  key={link.href}
                  initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.05 + i * 0.05 }}
                >
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="poster group flex items-center justify-between border-b border-white/[0.07] py-4 text-[2.4rem] text-bone/85 hover:text-gold-200"
                  >
                    {link.label}
                    <ArrowUpRight className="size-5 text-mute transition-transform duration-500 group-hover:rotate-45 group-hover:text-gold-300" />
                  </a>
                </m.li>
              ))}
            </ul>
            <m.div
              className="container-x pb-[max(2rem,env(safe-area-inset-bottom))]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.35 }}
            >
              <CtaButton size="lg" icon="whatsapp" className="w-full" onClick={() => setOpen(false)}>
                Falar com a INTELRA
              </CtaButton>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </header>
  )
}
