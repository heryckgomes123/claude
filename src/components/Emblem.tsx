import { m, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import mark from '../assets/brand/mark.webp'

interface EmblemProps {
  className?: string
  /** Reage ao cursor com inclinação 3D. */
  interactive?: boolean
  priority?: boolean
}

/**
 * Emblema dourado da INTELRA em cena: raios de luz, anéis orbitais em 3D,
 * brilho que atravessa o metal e inclinação que acompanha o cursor.
 */
export function Emblem({ className = '', interactive = true, priority = false }: EmblemProps) {
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const rx = useSpring(useTransform(py, [-1, 1], [14, -14]), { stiffness: 80, damping: 16 })
  const ry = useSpring(useTransform(px, [-1, 1], [-18, 18]), { stiffness: 80, damping: 16 })
  const glowX = useTransform(px, [-1, 1], ['35%', '65%'])

  useEffect(() => {
    if (!interactive || !window.matchMedia('(pointer: fine)').matches) return
    const onMove = (e: PointerEvent) => {
      px.set((e.clientX / window.innerWidth) * 2 - 1)
      py.set((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [interactive, px, py])

  return (
    <div className={`relative aspect-square [perspective:1200px] ${className}`} aria-hidden="true">
      {/* Raios e halo */}
      <div className="god-rays absolute inset-[-18%] rounded-full" />
      <m.div
        style={{ left: glowX }}
        className="absolute top-1/2 size-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(247_201_72/0.32),rgb(226_174_58/0.08)_55%,transparent)] blur-2xl"
      />

      <m.div style={{ rotateX: rx, rotateY: ry }} className="absolute inset-0 [transform-style:preserve-3d]">
        {/* Anéis orbitais */}
        <div className="absolute inset-[6%] [transform-style:preserve-3d] [transform:rotateX(74deg)]">
          <div className="absolute inset-0 rounded-full border border-gold-300/45 shadow-[0_0_30px_rgb(247_201_72/0.25)] motion-safe:animate-[spin-slow_18s_linear_infinite]">
            <span className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rounded-full bg-gold-100 shadow-[0_0_16px_4px_rgb(247_201_72/0.9)]" />
          </div>
        </div>
        <div className="absolute inset-[-2%] [transform:rotateX(68deg)_rotateY(-22deg)]">
          <div className="absolute inset-0 rounded-full border border-bone/10 motion-safe:animate-[spin-slow_32s_linear_infinite_reverse]">
            <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-neon shadow-[0_0_14px_3px_rgb(60_255_143/0.7)]" />
          </div>
        </div>

        {/* Emblema flutuando */}
        <div className="absolute inset-0 grid place-items-center [transform:translateZ(60px)]">
          <div className="relative h-[74%] motion-safe:animate-[float-y_7s_ease-in-out_infinite]">
            <img
              src={mark}
              alt=""
              width={400}
              height={610}
              fetchPriority={priority ? 'high' : 'auto'}
              className="h-full w-auto drop-shadow-[0_0_28px_rgb(247_201_72/0.45)] drop-shadow-[0_30px_40px_rgb(0_0_0/0.8)]"
            />
            {/* Brilho atravessando o metal (máscara no formato do emblema) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                maskImage: `url(${mark})`,
                WebkitMaskImage: `url(${mark})`,
                maskSize: '100% 100%',
                WebkitMaskSize: '100% 100%',
              }}
            >
              <div className="absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-white/70 to-transparent mix-blend-overlay motion-safe:animate-[emblem-sheen_5s_var(--ease-premium)_infinite]" />
            </div>
          </div>
        </div>
      </m.div>
    </div>
  )
}
