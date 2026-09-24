/**
 * Canvas Three.js genérico e econômico:
 * - DPR limitado por nível do dispositivo
 * - pausa quando fora da tela ou com a aba oculta
 * - respeita prefers-reduced-motion (renderiza sem animação contínua)
 * - libera toda a memória da GPU ao desmontar
 * Este módulo (e o three.js) só é carregado via React.lazy.
 */
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { GraphicsTier } from '@/services/device/capabilities'

export interface SceneHandle {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  update: (t: number, dt: number) => void
  onPointer?: (nx: number, ny: number, type: 'move' | 'down' | 'up' | 'leave') => void
  dispose?: () => void
}

export type SceneFactory = (ctx: { renderer: THREE.WebGLRenderer; tier: Exclude<GraphicsTier, 'off'> }) => SceneHandle

interface Props {
  factory: SceneFactory
  tier: Exclude<GraphicsTier, 'off'>
  className?: string
  interactive?: boolean
  label: string
}

function disposeScene(scene: THREE.Scene) {
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    mesh.geometry?.dispose()
    const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
    for (const m of mats) {
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose()
      m.dispose()
    }
  })
  if (scene.environment) scene.environment.dispose()
}

export default function ThreeCanvas({ factory, tier, className, interactive, label }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: tier === 'high', alpha: true, powerPreference: 'low-power' })
    } catch {
      return // sem WebGL: o wrapper já exibe fallback em SVG por baixo
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier === 'high' ? 2 : 1.25))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.setAttribute('aria-hidden', 'true')
    host.appendChild(renderer.domElement)

    const handle = factory({ renderer, tier })
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const resize = () => {
      const { width, height } = host.getBoundingClientRect()
      if (!width || !height) return
      renderer.setSize(width, height, false)
      handle.camera.aspect = width / height
      handle.camera.updateProjectionMatrix()
      renderer.render(handle.scene, handle.camera)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()

    let visible = true
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) loop()
    })
    io.observe(host)

    let raf = 0
    let last = performance.now()
    let t = 0
    const loop = () => {
      cancelAnimationFrame(raf)
      if (!visible || document.hidden) return
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += reduced ? 0 : dt
      handle.update(t, reduced ? 0 : dt)
      renderer.render(handle.scene, handle.camera)
      if (!reduced) raf = requestAnimationFrame(loop)
    }
    const onVis = () => {
      last = performance.now()
      if (!document.hidden) loop()
    }
    document.addEventListener('visibilitychange', onVis)
    // primeiro quadro (anima entradas mesmo com reduced motion desligado)
    handle.update(reduced ? 99 : 0, 0)
    loop()

    const el = renderer.domElement
    const toN = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      return [((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)] as const
    }
    const onMove = (e: PointerEvent) => handle.onPointer?.(...toN(e), 'move')
    const onDown = (e: PointerEvent) => {
      el.setPointerCapture?.(e.pointerId)
      handle.onPointer?.(...toN(e), 'down')
    }
    const onUp = (e: PointerEvent) => handle.onPointer?.(...toN(e), 'up')
    const onLeave = (e: PointerEvent) => handle.onPointer?.(...toN(e), 'leave')
    if (interactive && handle.onPointer) {
      el.style.touchAction = 'pan-y'
      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerdown', onDown)
      el.addEventListener('pointerup', onUp)
      el.addEventListener('pointerleave', onLeave)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointerleave', onLeave)
      handle.dispose?.()
      disposeScene(handle.scene)
      renderer.dispose()
      renderer.forceContextLoss()
      el.remove()
    }
  }, [factory, tier, interactive])

  return <div ref={hostRef} className={className} role="img" aria-label={label} />
}
