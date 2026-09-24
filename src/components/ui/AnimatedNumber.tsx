import { useEffect, useRef } from 'react'
import { animate, useInView } from 'motion/react'

/** Número que "conta" até o valor quando entra na tela. */
export function AnimatedNumber({ value, className, duration = 0.9 }: { value: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const fmt = new Intl.NumberFormat('pt-BR')
  useEffect(() => {
    const el = ref.current
    if (!el || !inView) return
    const from = Number(el.dataset.v ?? 0)
    const c = animate(from, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => (el.textContent = fmt.format(Math.round(v))),
    })
    el.dataset.v = String(value)
    return () => c.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView])
  return (
    <span ref={ref} className={className}>
      {fmt.format(inView ? 0 : value)}
    </span>
  )
}
