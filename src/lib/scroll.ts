export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Rola até uma âncora e move o foco para ela (sem sequestrar a rolagem). */
export function scrollToAnchor(hash: string): void {
  const el = document.querySelector<HTMLElement>(hash)
  if (!el) return
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
  el.focus({ preventScroll: true })
  try {
    history.replaceState(null, '', hash)
  } catch {
    // Alguns ambientes (iframes isolados) não permitem alterar a URL.
  }
}
