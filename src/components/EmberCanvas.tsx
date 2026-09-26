import { useEffect, useRef } from 'react'

interface Ember {
  x: number
  y: number
  r: number
  vy: number
  vx: number
  life: number
  max: number
  hue: number
}

/** Faíscas douradas subindo (Canvas 2D, leve). Pausa fora da viewport e respeita movimento reduzido. */
export function EmberCanvas({ className = '', density = 1 }: { className?: string; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let w = 0
    let h = 0
    let embers: Ember[] = []
    let raf = 0
    let visible = false

    const spawn = (initial = false): Ember => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 10,
      r: 0.6 + Math.random() * 1.8,
      vy: 0.25 + Math.random() * 0.7,
      vx: (Math.random() - 0.5) * 0.25,
      life: 0,
      max: 280 + Math.random() * 380,
      hue: 38 + Math.random() * 12,
    })

    function resize() {
      w = canvas!.clientWidth
      h = canvas!.clientHeight
      canvas!.width = Math.round(w * dpr)
      canvas!.height = Math.round(h * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.min(90, Math.round(((w * h) / 16000) * density))
      embers = Array.from({ length: count }, () => spawn(true))
    }

    function frame() {
      ctx!.clearRect(0, 0, w, h)
      ctx!.globalCompositeOperation = 'lighter'
      for (let i = 0; i < embers.length; i++) {
        const e = embers[i]
        e.life++
        e.y -= e.vy
        e.x += e.vx + Math.sin((e.life + i * 13) * 0.02) * 0.2
        const t = e.life / e.max
        const alpha = Math.sin(Math.min(1, t) * Math.PI) * (0.55 + Math.random() * 0.25)
        if (t >= 1 || e.y < -10) {
          embers[i] = spawn()
          continue
        }
        const g = ctx!.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 4)
        g.addColorStop(0, `hsla(${e.hue}, 100%, 72%, ${alpha})`)
        g.addColorStop(1, `hsla(${e.hue}, 100%, 50%, 0)`)
        ctx!.fillStyle = g
        ctx!.beginPath()
        ctx!.arc(e.x, e.y, e.r * 4, 0, Math.PI * 2)
        ctx!.fill()
      }
      raf = requestAnimationFrame(frame)
    }

    const start = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame)
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
    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [density])

  return <canvas ref={ref} className={className} aria-hidden="true" />
}
