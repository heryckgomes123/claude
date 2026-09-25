import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  gold: boolean
}

/** Partículas leves conectadas por linhas (Canvas 2D). Pausa fora da viewport. */
export function ConstellationCanvas({ className = '', tone = 'dark' }: { className?: string; tone?: 'dark' | 'gold' }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let width = 0
    let height = 0
    let particles: Particle[] = []
    let raf = 0
    let visible = false
    const pointer = { x: -9999, y: -9999 }
    const LINK = 130

    function seed() {
      const count = Math.min(90, Math.round((width * height) / 15000))
      particles = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        gold: i % 9 === 0,
      }))
    }

    function resize() {
      if (!canvas) return
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
      draw()
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height)
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 < LINK * LINK) {
            const alpha = (1 - Math.sqrt(d2) / LINK) * 0.16
            ctx!.strokeStyle =
              tone === 'gold'
                ? `rgba(20,14,4,${alpha * 2.2})`
                : a.gold || b.gold
                  ? `rgba(247,201,72,${alpha * 1.8})`
                  : `rgba(244,240,230,${alpha})`
            ctx!.lineWidth = 1
            ctx!.beginPath()
            ctx!.moveTo(a.x, a.y)
            ctx!.lineTo(b.x, b.y)
            ctx!.stroke()
          }
        }
      }
      for (const p of particles) {
        ctx!.fillStyle =
          tone === 'gold'
            ? p.gold
              ? 'rgba(255,255,255,0.9)'
              : 'rgba(20,14,4,0.5)'
            : p.gold
              ? 'rgba(247,201,72,0.95)'
              : 'rgba(244,240,230,0.45)'
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.gold ? 1.8 : 1.1, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    function step() {
      for (const p of particles) {
        const dx = p.x - pointer.x
        const dy = p.y - pointer.y
        const d2 = dx * dx + dy * dy
        if (d2 < 140 * 140) {
          const f = (1 - Math.sqrt(d2) / 140) * 0.04
          p.vx += dx * f * 0.02
          p.vy += dy * f * 0.02
        }
        p.vx *= 0.985
        p.vy *= 0.985
        p.vx += (Math.random() - 0.5) * 0.006
        p.vy += (Math.random() - 0.5) * 0.006
        p.x += p.vx
        p.y += p.vy
        if (p.x < -10) p.x = width + 10
        if (p.x > width + 10) p.x = -10
        if (p.y < -10) p.y = height + 10
        if (p.y > height + 10) p.y = -10
      }
      draw()
      raf = requestAnimationFrame(step)
    }

    const start = () => {
      if (!raf && !reduced && visible && !document.hidden) raf = requestAnimationFrame(step)
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start()
      else stop()
    })
    io.observe(canvas)

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer.x = e.clientX - rect.left
      pointer.y = e.clientY - rect.top
    }
    const onLeave = () => {
      pointer.x = -9999
      pointer.y = -9999
    }
    const onVisibility = () => (document.hidden ? stop() : start())
    const host = canvas.parentElement
    host?.addEventListener('pointermove', onMove)
    host?.addEventListener('pointerleave', onLeave)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      host?.removeEventListener('pointermove', onMove)
      host?.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [tone])

  return <canvas ref={ref} className={className} aria-hidden="true" />
}
