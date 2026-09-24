/**
 * Medalha 3D de conquista — arraste para girar.
 * Tier define o metal; conquistas bloqueadas aparecem em grafite fosco.
 */
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { SceneFactory } from '../ThreeCanvas'
import type { AchievementTier } from '@/types/models'

const METALS: Record<AchievementTier, { color: string; accent: string }> = {
  bronze: { color: '#b87a4b', accent: '#e0a878' },
  silver: { color: '#c9d1dc', accent: '#ffffff' },
  gold: { color: '#e2b957', accent: '#fff0b8' },
  lift: { color: '#2f6bff', accent: '#9db8ff' },
}

function faceTexture(icon: string, accent: string, locked: boolean, back = false) {
  const size = 512
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(size / 2, size / 2, 40, size / 2, size / 2, size / 2)
  grd.addColorStop(0, locked ? '#1b2230' : '#10172a')
  grd.addColorStop(1, locked ? '#0c1018' : '#070b16')
  g.fillStyle = grd
  g.fillRect(0, 0, size, size)
  g.strokeStyle = locked ? '#3a4458' : accent
  g.globalAlpha = 0.5
  g.lineWidth = 6
  g.beginPath()
  g.arc(size / 2, size / 2, size / 2 - 40, 0, Math.PI * 2)
  g.stroke()
  g.globalAlpha = 1
  if (back) {
    g.fillStyle = locked ? '#4a5568' : '#ffffff'
    g.font = '800 120px "Archivo Variable", system-ui, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('LIFT', size / 2, size / 2 + 6)
  } else {
    g.font = '220px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    if (locked) g.filter = 'grayscale(1) brightness(0.55)'
    g.fillText(icon, size / 2, size / 2 + 14)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export const createMedal =
  ({ icon, tier, locked }: { icon: string; tier: AchievementTier; locked: boolean }): SceneFactory =>
  ({ renderer, tier: gfx }) => {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50)
    camera.position.set(0, 0, 5.2)

    // Reflexos: ambiente procedural (sem arquivos HDR), gerado uma vez
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

    const metal = METALS[tier]
    const metalMat = new THREE.MeshStandardMaterial({
      color: locked ? '#2a3140' : metal.color,
      metalness: locked ? 0.3 : 1,
      roughness: locked ? 0.7 : 0.26,
      envMapIntensity: 1.1,
    })

    // Perfil do disco com borda chanfrada, gerado por revolução (Lathe)
    const T = 0.2
    const profile = [
      new THREE.Vector2(0, -T / 2),
      new THREE.Vector2(1.02, -T / 2),
      new THREE.Vector2(1.1, -T / 2 + 0.05),
      new THREE.Vector2(1.1, T / 2 - 0.05),
      new THREE.Vector2(1.02, T / 2),
      new THREE.Vector2(0.9, T / 2),
      new THREE.Vector2(0.9, T / 2 - 0.03),
      new THREE.Vector2(0, T / 2 - 0.03),
    ]
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, gfx === 'high' ? 72 : 40), metalMat)
    body.rotation.x = Math.PI / 2

    const medal = new THREE.Group()
    medal.add(body)

    const faceGeo = new THREE.CircleGeometry(0.9, gfx === 'high' ? 64 : 36)
    const front = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ map: faceTexture(icon, metal.accent, locked), roughness: 0.45, metalness: 0.2 }))
    front.position.z = T / 2 - 0.028
    medal.add(front)
    const back = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ map: faceTexture(icon, metal.accent, locked, true), roughness: 0.45, metalness: 0.2 }))
    back.position.z = -T / 2 - 0.001
    back.rotation.y = Math.PI
    medal.add(back)
    scene.add(medal)

    scene.add(new THREE.AmbientLight('#ffffff', 0.35))
    const key = new THREE.DirectionalLight('#ffffff', 2.4)
    key.position.set(2, 3, 4)
    scene.add(key)
    const rim = new THREE.PointLight('#2f6bff', 14, 8)
    rim.position.set(-2, -1.5, 1)
    scene.add(rim)

    let vel = 0.6
    let dragging = false
    let lastX = 0
    let rotY = -0.6

    return {
      scene,
      camera,
      update(t, dt) {
        if (!dragging) {
          vel += (0.5 - vel) * Math.min(1, dt * 1.5)
          rotY += vel * dt
        }
        medal.rotation.y = rotY
        medal.position.y = Math.sin(t * 1.6) * 0.05
        medal.rotation.x = Math.sin(t * 0.9) * 0.08
        const intro = Math.min(1, t / 0.7)
        medal.scale.setScalar(0.6 + 0.4 * (1 - Math.pow(1 - intro, 3)))
      },
      onPointer(nx, _ny, type) {
        if (type === 'down') {
          dragging = true
          lastX = nx
        } else if (type === 'move' && dragging) {
          const d = (nx - lastX) * 3
          rotY += d
          vel = d * 30
          lastX = nx
        } else if (type === 'up' || type === 'leave') dragging = false
      },
      dispose() {
        pmrem.dispose()
      },
    }
  }
