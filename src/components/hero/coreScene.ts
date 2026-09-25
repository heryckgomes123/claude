/**
 * Núcleo 3D do Hero — Three.js puro (sem React Three Fiber) para manter o bundle enxuto.
 * Carregado sob demanda (code splitting) depois da primeira pintura.
 *
 * Composição:
 *  - núcleo esférico preto metálico com verniz (clearcoat);
 *  - casca facetada de vidro com arestas finas;
 *  - módulos (instanced) distribuídos em esfera de Fibonacci que "respiram";
 *  - anéis orbitais finos, um deles dourado, com um satélite;
 *  - poeira de partículas.
 */
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  Points,
  PointsMaterial,
  Quaternion,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

export interface CoreSceneOptions {
  quality: 'high' | 'low'
  reducedMotion: boolean
}

export interface CoreSceneHandle {
  setPointer(x: number, y: number): void
  setActive(active: boolean): void
  dispose(): void
}

const GOLD = new Color('#c9a45c')

export function createCoreScene(canvas: HTMLCanvasElement, { quality, reducedMotion }: CoreSceneOptions): CoreSceneHandle {
  const high = quality === 'high'

  const renderer = new WebGLRenderer({ canvas, antialias: high, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 1.75 : 1.4))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.setClearColor(0x000000, 0)

  const scene = new Scene()
  const camera = new PerspectiveCamera(32, 1, 0.1, 100)
  camera.position.set(0, 0, 9.2)

  // Ambiente para reflexos realistas no metal e no vidro
  const pmrem = new PMREMGenerator(renderer)
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTexture
  pmrem.dispose()

  // Iluminação cinematográfica: key quente, rim frio, contraluz dourado
  const key = new DirectionalLight('#fff4e0', 2.4)
  key.position.set(4, 5, 6)
  const rim = new DirectionalLight('#cfd8ff', 1.2)
  rim.position.set(-6, 2, -4)
  const goldLight = new PointLight(GOLD, 14, 12, 2)
  goldLight.position.set(-2.4, -2.2, 2.6)
  scene.add(key, rim, goldLight)

  const root = new Group()
  scene.add(root)
  const disposables: { dispose(): void }[] = [envTexture]

  // Núcleo
  const coreGeo = new SphereGeometry(1, high ? 96 : 48, high ? 96 : 48)
  const coreMat = new MeshPhysicalMaterial({
    color: '#0b0b0b',
    metalness: 0.95,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.1,
  })
  const core = new Mesh(coreGeo, coreMat)
  root.add(core)
  disposables.push(coreGeo, coreMat)

  // Linha de "equador" dourada sobre o núcleo
  const seamGeo = new TorusGeometry(1.004, 0.004, 8, 160)
  const seamMat = new MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.85 })
  const seam = new Mesh(seamGeo, seamMat)
  seam.rotation.x = Math.PI / 2
  core.add(seam)
  disposables.push(seamGeo, seamMat)

  // Casca facetada de vidro
  const shell = new Group()
  const shellGeo = new IcosahedronGeometry(1.55, 1)
  const shellMat = new MeshPhysicalMaterial({
    color: '#1a1a1a',
    metalness: 0.1,
    roughness: 0.04,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    transparent: true,
    opacity: 0.2,
    side: DoubleSide,
    depthWrite: false,
    envMapIntensity: 1.6,
  })
  const shellMesh = new Mesh(shellGeo, shellMat)
  const edgesGeo = new EdgesGeometry(shellGeo)
  const edgesMat = new LineBasicMaterial({ color: '#f5f3ee', transparent: true, opacity: 0.16 })
  const edges = new LineSegments(edgesGeo, edgesMat)
  shell.add(shellMesh, edges)
  root.add(shell)
  disposables.push(shellGeo, shellMat, edgesGeo, edgesMat)

  // Módulos instanciados em esfera de Fibonacci
  const count = high ? 150 : 84
  const moduleGeo = new BoxGeometry(0.16, 0.16, 0.018)
  const moduleMat = new MeshStandardMaterial({ color: '#141414', metalness: 1, roughness: 0.28, envMapIntensity: 1.3 })
  const modules = new InstancedMesh(moduleGeo, moduleMat, count)
  const goldMat = new MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.25, emissive: GOLD, emissiveIntensity: 0.12 })
  const goldCount = Math.round(count * 0.08)
  const goldModules = new InstancedMesh(moduleGeo, goldMat, goldCount)
  root.add(modules, goldModules)
  disposables.push(moduleGeo, moduleMat, goldMat)

  interface ModuleData {
    dir: Vector3
    quat: Quaternion
    phase: number
    scale: number
    gold: boolean
    slot: number
  }
  const moduleData: ModuleData[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  const zAxis = new Vector3(0, 0, 1)
  let g = 0
  let n = 0
  for (let i = 0; i < count + goldCount; i++) {
    const y = 1 - (i / (count + goldCount - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = golden * i
    const dir = new Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).normalize()
    const quat = new Quaternion().setFromUnitVectors(zAxis, dir)
    const isGold = i % Math.round((count + goldCount) / goldCount) === 3 && g < goldCount
    moduleData.push({
      dir,
      quat,
      phase: Math.random() * Math.PI * 2,
      scale: 0.55 + Math.random() * 0.75,
      gold: isGold,
      slot: isGold ? g++ : n++,
    })
  }
  modules.count = n
  goldModules.count = g

  const m4 = new Matrix4()
  const pos = new Vector3()
  const scl = new Vector3()
  function updateModules(t: number) {
    for (const d of moduleData) {
      const breathe = Math.sin(t * 0.6 + d.phase)
      const radius = 2.02 + breathe * 0.09 + (d.gold ? 0.08 : 0)
      pos.copy(d.dir).multiplyScalar(radius)
      const s = d.scale * (0.85 + (breathe + 1) * 0.12)
      scl.set(s, s, 1)
      m4.compose(pos, d.quat, scl)
      ;(d.gold ? goldModules : modules).setMatrixAt(d.slot, m4)
    }
    modules.instanceMatrix.needsUpdate = true
    goldModules.instanceMatrix.needsUpdate = true
  }
  updateModules(0)

  // Anéis orbitais
  const rings = new Group()
  const ringGeoA = new TorusGeometry(2.75, 0.0045, 6, 240)
  const ringGeoB = new TorusGeometry(3.05, 0.003, 6, 240)
  const ringMatGold = new MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.7 })
  const ringMatBone = new MeshBasicMaterial({ color: '#f5f3ee', transparent: true, opacity: 0.18 })
  const ringA = new Mesh(ringGeoA, ringMatGold)
  const ringB = new Mesh(ringGeoB, ringMatBone)
  ringA.rotation.set(Math.PI / 2.3, 0.35, 0)
  ringB.rotation.set(Math.PI / 1.8, -0.5, 0.2)
  const satelliteGeo = new SphereGeometry(0.045, 16, 16)
  const satelliteMat = new MeshBasicMaterial({ color: '#f1d9a6' })
  const satellite = new Mesh(satelliteGeo, satelliteMat)
  const satellitePivot = new Object3D()
  satellite.position.x = 2.75
  satellitePivot.add(satellite)
  ringA.add(satellitePivot)
  rings.add(ringA, ringB)
  root.add(rings)
  disposables.push(ringGeoA, ringGeoB, ringMatGold, ringMatBone, satelliteGeo, satelliteMat)

  // Poeira de partículas
  const dustCount = high ? 420 : 180
  const dustPositions = new Float32Array(dustCount * 3)
  for (let i = 0; i < dustCount; i++) {
    const v = new Vector3().randomDirection().multiplyScalar(2.6 + Math.random() * 2.4)
    dustPositions.set([v.x, v.y, v.z], i * 3)
  }
  const dustGeo = new BufferGeometry()
  dustGeo.setAttribute('position', new BufferAttribute(dustPositions, 3))
  const dustMat = new PointsMaterial({
    color: '#e8dcc2',
    size: high ? 0.018 : 0.024,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: AdditiveBlending,
    sizeAttenuation: true,
  })
  const dust = new Points(dustGeo, dustMat)
  scene.add(dust)
  disposables.push(dustGeo, dustMat)

  // Estado / interação
  const pointer = { x: 0, y: 0 }
  const eased = { x: 0, y: 0 }
  let active = true
  let raf = 0
  let last = performance.now()
  let elapsed = 0

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // Afasta a câmera em telas estreitas para o objeto não cortar
    camera.position.z = w / h < 0.9 ? 10.8 : 9.2
    camera.updateProjectionMatrix()
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  resize()

  function render(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    elapsed += dt
    const t = elapsed

    eased.x = MathUtils.damp(eased.x, pointer.x, 2.2, dt)
    eased.y = MathUtils.damp(eased.y, pointer.y, 2.2, dt)

    root.rotation.y = t * 0.08 + eased.x * 0.45
    root.rotation.x = -eased.y * 0.3 + Math.sin(t * 0.25) * 0.05
    root.position.y = Math.sin(t * 0.5) * 0.06

    shell.rotation.y = -t * 0.05
    shell.rotation.z = t * 0.03
    core.rotation.y = t * 0.12
    rings.rotation.z = t * 0.04
    satellitePivot.rotation.z = t * 0.5
    dust.rotation.y = t * 0.015 + eased.x * 0.12
    dust.rotation.x = eased.y * 0.08

    goldLight.position.x = -2.4 + eased.x * 1.2
    goldLight.position.y = -2.2 - eased.y * 1.2

    updateModules(t)
    renderer.render(scene, camera)
  }

  // Qualidade adaptativa: se o dispositivo não sustentar a animação, reduz a resolução
  // e, em último caso, limita a taxa de quadros — o visual continua, sem travar a página.
  let sampleFrames = 0
  let sampleTime = 0
  let degraded = 0
  let minFrameMs = 0
  let lastRender = 0
  function adapt(dtMs: number) {
    if (degraded >= 2) return
    sampleFrames++
    sampleTime += dtMs
    if (sampleFrames < 60) return
    const avg = sampleTime / sampleFrames
    sampleFrames = 0
    sampleTime = 0
    if (avg > 1000 / 38) {
      degraded++
      if (degraded === 1) {
        renderer.setPixelRatio(1)
        resize()
      } else {
        minFrameMs = 1000 / 24
      }
    }
  }

  function loop(now: number) {
    raf = requestAnimationFrame(loop)
    if (minFrameMs && now - lastRender < minFrameMs) return
    adapt(now - (lastRender || now))
    lastRender = now
    render(now)
  }

  function start() {
    if (raf || reducedMotion) return
    last = performance.now()
    lastRender = 0
    raf = requestAnimationFrame(loop)
  }
  function stop() {
    cancelAnimationFrame(raf)
    raf = 0
  }

  const onVisibility = () => (document.hidden ? stop() : active && start())
  document.addEventListener('visibilitychange', onVisibility)

  // Primeiro quadro síncrono (também é o quadro estático no modo de movimento reduzido)
  render(performance.now())
  start()

  return {
    setPointer(x, y) {
      pointer.x = x
      pointer.y = y
    },
    setActive(value) {
      active = value
      if (value && !document.hidden) start()
      else stop()
    },
    dispose() {
      stop()
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      modules.dispose()
      goldModules.dispose()
      for (const d of disposables) d.dispose()
      renderer.dispose()
    },
  }
}
