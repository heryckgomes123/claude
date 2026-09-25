import { useEffect, useRef, useState } from 'react'
import type { CoreSceneHandle } from './coreScene'

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function shouldUseLightMode(): boolean {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number }
  if (nav.connection?.saveData) return true
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 2) return true
  return false
}

/**
 * Elemento visual do Hero.
 * Renderiza imediatamente uma versão leve em CSS e, após a primeira pintura,
 * carrega o núcleo 3D (Three.js) em um chunk separado e faz o crossfade.
 */
export function HeroVisual() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    if (!supportsWebGL() || shouldUseLightMode()) return

    let handle: CoreSceneHandle | null = null
    let cancelled = false
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const finePointer = window.matchMedia('(pointer: fine)').matches
    const small = window.matchMedia('(max-width: 767px)').matches
    const cores = navigator.hardwareConcurrency ?? 4
    const quality = small || cores <= 4 ? 'low' : 'high'

    const onPointer = (e: PointerEvent) => {
      handle?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
    }

    const observer = new IntersectionObserver(([entry]) => handle?.setActive(entry.isIntersecting), { threshold: 0 })

    const boot = () => {
      import('./coreScene')
        .then(({ createCoreScene }) => {
          if (cancelled) return
          handle = createCoreScene(canvas, { quality, reducedMotion })
          observer.observe(wrap)
          if (finePointer) window.addEventListener('pointermove', onPointer, { passive: true })
          requestAnimationFrame(() => setReady(true))
        })
        .catch(() => {
          /* Mantém o fallback em CSS */
        })
    }

    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }
    const idle = w.requestIdleCallback ? w.requestIdleCallback(boot, { timeout: 1200 }) : window.setTimeout(boot, 300)

    return () => {
      cancelled = true
      if (typeof idle === 'number') {
        const wc = window as Window & { cancelIdleCallback?: (id: number) => void }
        wc.cancelIdleCallback?.(idle)
        window.clearTimeout(idle)
      }
      observer.disconnect()
      window.removeEventListener('pointermove', onPointer)
      handle?.dispose()
    }
  }, [])

  return (
    <div ref={wrapRef} className="relative aspect-square w-full" aria-hidden="true">
      {/* Halo de luz */}
      <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle_at_50%_55%,rgb(201_164_92/0.16),transparent_62%)] blur-2xl" />

      {/* Fallback leve em CSS (também é o estado inicial enquanto o 3D carrega) */}
      <div
        className={`absolute inset-0 transition-[opacity,filter,transform] duration-[1400ms] ease-premium ${
          ready ? 'scale-95 opacity-0 blur-md' : 'opacity-100'
        }`}
      >
        <CssCore />
      </div>

      <canvas
        ref={canvasRef}
        className={`absolute inset-0 size-full transition-[opacity,filter,transform] duration-[1600ms] ease-premium ${
          ready ? 'scale-100 opacity-100 blur-0' : 'scale-[1.04] opacity-0 blur-sm'
        }`}
      />
    </div>
  )
}

function CssCore() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="relative aspect-square w-[46%]">
        {/* Anéis */}
        <div className="absolute -inset-[62%] rounded-full border border-gold/50 [transform:rotateX(68deg)_rotateZ(20deg)] motion-safe:animate-[spin-slow_40s_linear_infinite]" />
        <div className="absolute -inset-[80%] rounded-full border border-bone/10 [transform:rotateX(58deg)_rotateZ(-30deg)]" />
        {/* Casca */}
        <div className="absolute -inset-[34%] rounded-full border border-bone/10 bg-[radial-gradient(circle_at_30%_25%,rgb(245_243_238/0.06),transparent_55%)]" />
        {/* Núcleo */}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_28%,#3a3a3a_0%,#141414_38%,#050505_70%)] shadow-[inset_-18px_-24px_40px_rgb(0_0_0/0.8),inset_10px_12px_30px_rgb(245_243_238/0.08),0_40px_80px_-20px_rgb(0_0_0/0.9)]" />
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-gold/80 to-transparent" />
        <div className="absolute left-[22%] top-[16%] h-[18%] w-[26%] rounded-full bg-white/20 blur-md" />
      </div>
    </div>
  )
}
