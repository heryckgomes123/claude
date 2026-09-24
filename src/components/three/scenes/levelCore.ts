/**
 * "Núcleo de Evolução" — representação 3D do nível do aluno.
 * - anel externo = trilha do nível; arco azul = progresso até o próximo nível
 * - marcações = 40 segmentos (HUD), acesas até o progresso
 * - núcleo facetado = o aluno; gira mais rápido quanto maior a sequência
 * Geometria mínima (poucos milhares de triângulos).
 */
import * as THREE from 'three'
import type { SceneFactory } from '../ThreeCanvas'

export interface LevelCoreOptions {
  progress: number // 0..1
  streak: number
}

const BLUE = new THREE.Color('#2f6bff')
const BLUE_LIGHT = new THREE.Color('#7ea3ff')

export const createLevelCore =
  ({ progress, streak }: LevelCoreOptions): SceneFactory =>
  ({ tier }) => {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50)
    camera.position.set(0, 0, 6.2)

    const rig = new THREE.Group()
    rig.rotation.x = -0.5
    scene.add(rig)

    // Trilha
    const R = 1.5
    const track = new THREE.Mesh(
      new THREE.TorusGeometry(R, 0.028, 8, 128),
      new THREE.MeshStandardMaterial({ color: '#232b3a', roughness: 0.6, metalness: 0.4 }),
    )
    rig.add(track)

    // Arco de progresso (TubeGeometry: índices percorrem o caminho → drawRange anima o arco)
    const curve = new THREE.EllipseCurve(0, 0, R, R, Math.PI / 2, Math.PI / 2 - Math.PI * 2, true)
    const pts = curve.getPoints(160).map((p) => new THREE.Vector3(p.x, p.y, 0))
    const path = new THREE.CatmullRomCurve3(pts)
    const tubular = 160
    const radial = tier === 'high' ? 10 : 6
    const arcGeo = new THREE.TubeGeometry(path, tubular, 0.065, radial, false)
    const arcMat = new THREE.MeshStandardMaterial({
      color: BLUE,
      emissive: BLUE,
      emissiveIntensity: 1.1,
      roughness: 0.3,
      metalness: 0.2,
    })
    const arc = new THREE.Mesh(arcGeo, arcMat)
    rig.add(arc)
    const totalIdx = arcGeo.index!.count
    const idxPerSeg = radial * 6
    arcGeo.setDrawRange(0, 0)

    // Marcações HUD (InstancedMesh = 1 draw call)
    const ticks = tier === 'high' ? 40 : 24
    const tickMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.02, 0.12, 0.02),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 }),
      ticks,
    )
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const zAxis = new THREE.Vector3(0, 0, 1)
    for (let i = 0; i < ticks; i++) {
      const a = Math.PI / 2 - (i / ticks) * Math.PI * 2
      q.setFromAxisAngle(zAxis, a - Math.PI / 2)
      m.compose(new THREE.Vector3(Math.cos(a) * (R + 0.22), Math.sin(a) * (R + 0.22), 0), q, new THREE.Vector3(1, 1, 1))
      tickMesh.setMatrixAt(i, m)
      tickMesh.setColorAt(i, new THREE.Color('#2a3345'))
    }
    rig.add(tickMesh)

    // Núcleo
    const coreGeo = new THREE.IcosahedronGeometry(0.62, tier === 'high' ? 1 : 0)
    const core = new THREE.Mesh(
      coreGeo,
      new THREE.MeshStandardMaterial({ color: '#33415e', emissive: '#0c1a3d', roughness: 0.32, metalness: 0.55, flatShading: true }),
    )
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(coreGeo, 1),
      new THREE.LineBasicMaterial({ color: BLUE_LIGHT, transparent: true, opacity: 0.55 }),
    )
    core.add(edges)
    scene.add(core)

    // Luz
    scene.add(new THREE.AmbientLight('#b8c8ff', 0.35))
    const key = new THREE.DirectionalLight('#ffffff', 2.2)
    key.position.set(2.5, 3, 4)
    scene.add(key)
    const rim = new THREE.PointLight(BLUE, 18, 8)
    rim.position.set(-1.5, -1, 1.5)
    scene.add(rim)

    const target = { x: 0, y: 0 }
    const spin = 0.25 + Math.min(streak, 30) * 0.02
    const litTicks = Math.round(progress * ticks)
    let appliedTicks = -1

    return {
      scene,
      camera,
      update(t) {
        // enquadra o anel (raio ~1.8) em qualquer proporção do container
        const halfFov = THREE.MathUtils.degToRad(camera.fov / 2)
        camera.position.z = Math.max(5.2, 1.95 / (Math.tan(halfFov) * Math.min(1, camera.aspect)))
        // entrada: arco cresce até o progresso em ~1.4s
        const k = Math.min(1, t / 1.4)
        const ease = 1 - Math.pow(1 - k, 4)
        const segs = Math.round(progress * tubular * ease)
        arcGeo.setDrawRange(0, Math.min(totalIdx, segs * idxPerSeg))
        const lit = Math.round(litTicks * ease)
        if (lit !== appliedTicks) {
          for (let i = 0; i < ticks; i++) tickMesh.setColorAt(i, i < lit ? BLUE_LIGHT : new THREE.Color('#2a3345'))
          tickMesh.instanceColor!.needsUpdate = true
          appliedTicks = lit
        }
        core.rotation.y = t * spin
        core.rotation.x = Math.sin(t * 0.6) * 0.25
        const s = 1 + Math.sin(t * 2.2) * 0.025
        core.scale.setScalar(s)
        arcMat.emissiveIntensity = 1 + Math.sin(t * 2) * 0.15
        rig.rotation.y += (target.x * 0.35 - rig.rotation.y) * 0.06
        rig.rotation.x += (-0.5 + target.y * 0.25 - rig.rotation.x) * 0.06
      },
      onPointer(nx, ny, type) {
        if (type === 'leave') {
          target.x = 0
          target.y = 0
        } else {
          target.x = nx
          target.y = ny
        }
      },
    }
  }
