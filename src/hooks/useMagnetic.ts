import { useMotionValue, useSpring } from 'framer-motion'
import { useCallback } from 'react'
import type { PointerEvent } from 'react'

/** Efeito magnético sutil: o elemento acompanha levemente o cursor. */
export function useMagnetic(strength = 0.22) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.4 })

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'mouse') return
      const r = e.currentTarget.getBoundingClientRect()
      x.set((e.clientX - (r.left + r.width / 2)) * strength)
      y.set((e.clientY - (r.top + r.height / 2)) * strength)
    },
    [strength, x, y],
  )
  const onPointerLeave = useCallback(() => {
    x.set(0)
    y.set(0)
  }, [x, y])

  return { style: { x: sx, y: sy }, onPointerMove, onPointerLeave }
}
