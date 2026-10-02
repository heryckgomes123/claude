import { AnimatePresence, m } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Logo } from '../components/Logo'
import { Close, Layers, Menu } from '../components/Icons'
import { CTA, NAV_LINKS } from '../config/content'
import { track } from '../lib/analytics'
import { projectCount, useProject } from '../state/project'
import { useUI } from '../state/ui'

export function Header() {
  const ui = useUI()
  const { state } = useProject()
  const count = projectCount(state)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const startQuote = () => {
    setMenuOpen(false)
    track('hero_cta_click', { cta: 'header_primary' })
    ui.openQuote({ source: 'header' })
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`transition-[background-color,border-color] duration-300 ${
          scrolled || menuOpen ? 'border-b border-white/[0.08] bg-ink-950/85 backdrop-blur-xl' : 'border-b border-transparent'
        }`}
      >
        <nav aria-label="Principal" className="container-x flex h-16 items-center justify-between gap-4 md:h-[72px]">
          <a href="#inicio" className="shrink-0 rounded-lg" aria-label="INTELRA — voltar ao início" onClick={() => setMenuOpen(false)}>
            <Logo className="h-8 w-auto md:h-9" />
          </a>

          <ul className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="rounded-full px-4 py-2 text-[0.9rem] text-bone/75 transition-colors hover:bg-white/[0.06] hover:text-bone">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={ui.openSummary}
              className="hidden h-10 items-center gap-2 rounded-full border border-white/15 bg-ink-950/60 px-3.5 backdrop-blur-md text-[0.85rem] font-medium text-bone/90 transition-colors hover:border-white/35 hover:text-bone lg:inline-flex"
            >
              <Layers size={16} />
              Meu projeto
              <span
                className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[0.72rem] font-bold tabular-nums ${
                  count ? 'bg-ion-400 text-ink-950' : 'bg-white/10 text-mute'
                }`}
              >
                {count}
              </span>
            </button>
            <button type="button" onClick={startQuote} className="btn btn-primary btn-sm hidden sm:inline-flex">
              {CTA.primary}
            </button>
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-ink-950/60 text-bone backdrop-blur-md lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <Close size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {menuOpen && (
            <m.div
              id="mobile-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden lg:hidden"
            >
              <div className="container-x flex flex-col gap-1 pb-5 pt-1">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-3 py-3 font-display text-lg font-semibold text-bone hover:bg-white/5"
                  >
                    {link.label}
                  </a>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    ui.openSummary()
                  }}
                  className="flex items-center justify-between rounded-xl px-3 py-3 text-left font-display text-lg font-semibold text-bone hover:bg-white/5"
                >
                  Meu projeto
                  <span className="text-sm font-medium text-mute">
                    {count} {count === 1 ? 'escolha' : 'escolhas'}
                  </span>
                </button>
                <button type="button" onClick={startQuote} className="btn btn-primary mt-2 w-full">
                  {CTA.primary}
                </button>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
