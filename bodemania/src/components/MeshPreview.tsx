import { useEffect, useRef } from 'react'
import type { MeshInfo } from '../lib/print3d'

/** Prévia 3D leve em Canvas 2D (sem WebGL): gira sozinha e com o dedo/mouse. */
export default function MeshPreview({ mesh, color, scale = 100 }: { mesh: MeshInfo; color: string; scale?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const yaw = useRef(0.6)
  const drag = useRef<{ x: number; yaw: number } | null>(null)

  useEffect(() => {
    const el = canvas.current!
    const ctx = el.getContext('2d')!
    const pts = mesh.preview
    const stride = Math.max(1, Math.floor(pts.length / 9 / 12000))
    const n = Math.floor(pts.length / 9 / stride)
    const cx = mesh.min[0] + mesh.size[0] / 2
    const cy = mesh.min[1] + mesh.size[1] / 2
    const cz = mesh.min[2] + mesh.size[2] / 2
    const maxDim = Math.max(...mesh.size) || 1
    // clareia cores muito escuras (ex.: filamento preto) para continuarem visíveis no fundo escuro
    const rgb = [1, 3, 5].map((i) => 70 + parseInt(color.slice(i, i + 2), 16) * 0.75)
    const pitch = 0.5
    const cp = Math.cos(pitch)
    const sp = Math.sin(pitch)
    const order = new Uint32Array(n)
    const depth = new Float32Array(n)
    const proj = new Float32Array(n * 6)
    const shadeArr = new Float32Array(n)
    let raf = 0
    let last = performance.now()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const render = (t: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const W = el.clientWidth
      const H = el.clientHeight
      if (el.width !== W * dpr) {
        el.width = W * dpr
        el.height = H * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      if (!drag.current && !reduce) yaw.current += (t - last) * 0.00035
      last = t
      const s = ((Math.min(W, H) * 0.62) / maxDim) * Math.min(1.25, Math.max(0.6, scale / 100))
      const cyw = Math.cos(yaw.current)
      const syw = Math.sin(yaw.current)

      for (let i = 0; i < n; i++) {
        const o = i * stride * 9
        let dsum = 0
        const r: number[] = []
        for (let v = 0; v < 3; v++) {
          const x = pts[o + v * 3] - cx
          const y = pts[o + v * 3 + 1] - cy
          const z = pts[o + v * 3 + 2] - cz
          const x1 = x * cyw - y * syw
          const y1 = x * syw + y * cyw
          const y2 = y1 * cp - z * sp
          const z2 = y1 * sp + z * cp
          proj[i * 6 + v * 2] = W / 2 + x1 * s
          proj[i * 6 + v * 2 + 1] = H / 2 - z2 * s
          dsum += y2
          r.push(x1, y2, z2)
        }
        depth[i] = dsum
        order[i] = i
        // normal no espaço da câmera
        const ux = r[3] - r[0], uy = r[4] - r[1], uz = r[5] - r[2]
        const vx = r[6] - r[0], vy = r[7] - r[1], vz = r[8] - r[2]
        const nx = uy * vz - uz * vy
        const ny = uz * vx - ux * vz
        const nz = ux * vy - uy * vx
        const len = Math.hypot(nx, ny, nz) || 1
        shadeArr[i] = Math.min(1, 0.32 + 0.55 * Math.abs(ny / len) + 0.25 * Math.max(0, nz / len) + 0.1 * Math.max(0, -nx / len))
      }
      order.sort((a, b) => depth[b] - depth[a])
      for (let k = 0; k < n; k++) {
        const i = order[k]
        const l = shadeArr[i]
        ctx.fillStyle = `rgb(${rgb[0] * l | 0},${rgb[1] * l | 0},${rgb[2] * l | 0})`
        ctx.beginPath()
        ctx.moveTo(proj[i * 6], proj[i * 6 + 1])
        ctx.lineTo(proj[i * 6 + 2], proj[i * 6 + 3])
        ctx.lineTo(proj[i * 6 + 4], proj[i * 6 + 5])
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = ctx.fillStyle
        ctx.lineWidth = 0.6
        ctx.stroke()
      }
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    return () => cancelAnimationFrame(raf)
  }, [mesh, color, scale])

  return (
    <canvas
      ref={canvas}
      className="h-full w-full cursor-grab touch-pan-y active:cursor-grabbing"
      aria-label="Prévia 3D do arquivo — arraste para girar"
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, yaw: yaw.current }
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (drag.current) yaw.current = drag.current.yaw + (e.clientX - drag.current.x) * 0.01
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    />
  )
}
