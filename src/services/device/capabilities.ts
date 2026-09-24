/**
 * Detecção de capacidade do dispositivo para decidir o nível do 3D.
 *   high → cena completa (DPR até 2, reflexos)
 *   low  → cena simplificada (DPR ~1.25, menos geometria)
 *   off  → sem WebGL, usa fallback em SVG/CSS
 */
import type { GraphicsMode } from '@/store/useAppStore'

export type GraphicsTier = 'high' | 'low' | 'off'

let cachedWebGL: boolean | null = null
function supportsWebGL() {
  if (cachedWebGL !== null) return cachedWebGL
  try {
    const c = document.createElement('canvas')
    cachedWebGL = !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    cachedWebGL = false
  }
  return cachedWebGL
}

export function detectGraphicsTier(mode: GraphicsMode = 'auto'): GraphicsTier {
  if (typeof window === 'undefined' || !supportsWebGL()) return 'off'
  if (mode === 'off') return 'off'
  if (mode === 'high' || mode === 'low') return mode
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (nav.connection?.saveData) return 'off'
  const mem = nav.deviceMemory ?? 4
  const cores = nav.hardwareConcurrency ?? 4
  if (reduced || mem <= 2 || cores <= 2) return 'low'
  if (mem >= 4 && cores >= 6) return 'high'
  return 'low'
}
