import { useCallback } from 'react'
import type { PointerEvent } from 'react'

/** Atualiza --mx / --my no elemento para o efeito de spotlight que segue o cursor. */
export function useSpotlight<T extends HTMLElement>() {
  return useCallback((event: PointerEvent<T>) => {
    if (event.pointerType !== 'mouse') return
    const el = event.currentTarget
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${event.clientX - rect.left}px`)
    el.style.setProperty('--my', `${event.clientY - rect.top}px`)
  }, [])
}
