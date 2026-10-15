// MIÚDA — splash v2 "O Corte de Luz"
// Cena 100% procedural (three.js). window.renderFrame(t) desenha o instante t (s) no canvas de saída.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const Q = new URLSearchParams(location.search);
const W = +Q.get('w') || 1080, H = +Q.get('h') || 2336, FPS = +Q.get('fps') || 30;
const DUR = 7.5;
const TEAL = new THREE.Color('#3dffc8');
const TEAL_DEEP = new THREE.Color('#0fa98a');

// ------------------------------------------------------------------ helpers
const clamp01 = x => Math.min(1, Math.max(0, x));
const lin = (t, a, b) => clamp01((t - a) / (b - a));
const mix = (a, b, k) => a + (b - a) * k;
const smooth = x => (x = clamp01(x), x * x * (3 - 2 * x));
const smoother = x => (x = clamp01(x), x * x * x * (x * (x * 6 - 15) + 10));
const easeOut = x => 1 - Math.pow(1 - clamp01(x), 3);
const easeOut5 = x => 1 - Math.pow(1 - clamp01(x), 5);
const easeIn = x => Math.pow(clamp01(x), 3);
const easeIO = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));
const easeOutBack = (x, s = 1.9) => { x = clamp01(x) - 1; return x * x * ((s + 1) * x + s) + 1; };
const pulse = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647, (seed - 1) / 2147483646); }
const R = rng(20251015);

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ------------------------------------------------------------------ renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.domElement.id = 'gl';
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const out = document.createElement('canvas'); out.width = W; out.height = H;
out.style.width = (W / 2) + 'px'; out.style.height = (H / 2) + 'px';
document.body.appendChild(out);
const octx = out.getContext('2d', { willReadFrequently: true });

const scene = new THREE.Scene();
scene.background = new THREE.Color('#010405');
scene.fog = new THREE.FogExp2('#010506', 0.055);
const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 80);

// ------------------------------------------------------------------ ambiente (estúdio escuro com softboxes teal)
{
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: '#020606', side: THREE.BackSide })));
  const box = (c, i, w, h, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  box('#ffffff', 2.2, 10, 3, 0, 9, 2);       // softbox superior
  box('#3dffc8', 2.5, 2, 14, -9, 0, 3);      // tira teal esquerda
  box('#3dffc8', 1.6, 2, 14, 9, 1, -2);      // tira teal direita
  box('#bfe', 1.2, 8, 1.2, 0, -3, 9);        // rebatedor frontal
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env, 0.02).texture;
}

scene.add(new THREE.AmbientLight('#0d2a26', 0.6));
const key = new THREE.DirectionalLight('#e8fff8', 1.6); key.position.set(-3, 5, 6); scene.add(key);
const rimL = new THREE.PointLight(TEAL, 30, 18, 2); rimL.position.set(-3, 2, -15); scene.add(rimL);
const rimR = new THREE.PointLight(TEAL, 22, 18, 2); rimR.position.set(3.5, -1, -14.5); scene.add(rimR);
const glint = new THREE.PointLight('#ffffff', 0, 6, 2); scene.add(glint);

// ------------------------------------------------------------------ texturas das cartas
const CW = 0.63, CH = 0.88, CR = 0.05, CD = 0.008;
const TW = 630, TH = 880;
const SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['A', 'K', 'Q', 'J'];
function mPath(ctx, cx, cy, s) {   // monograma M (mesma geometria do logo 3D)
  for (const poly of M_POLYS) {
    ctx.beginPath();
    poly.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](cx + (x - 0.5) * s, cy + (y - 0.5) * s * 0.91));
    ctx.closePath();
  }
}
// peças do M em coordenadas normalizadas (x→direita, y→baixo)
const M_POLYS = [
  [[0, 0], [0.12, 0], [0.72, 0.56], [0.60, 0.68], [0, 0.30]],                                  // faixa diagonal
  [[0, 0.37], [0.335, 0.595], [0.335, 0.675], [0, 1]],                                              // triângulo esquerdo
  [[0.605, 0.31], [0.93, 0], [1, 0.035], [1, 0.965], [0.955, 1], [0.655, 0.705], [0.77, 0.52]],     // peça direita
];

function cardFace(ctx, w, h, suit, rank, emissive) {
  ctx.fillStyle = emissive ? '#000' : '#071311';
  ctx.fillRect(0, 0, w, h);
  if (!emissive) {
    const g = ctx.createRadialGradient(w * 0.35, h * 0.3, 10, w * 0.5, h * 0.5, h * 0.75);
    g.addColorStop(0, '#12302b'); g.addColorStop(1, '#030807');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { ctx.fillStyle = `rgba(160,255,230,${R() * 0.035})`; ctx.fillRect(R() * w, R() * h, 1.5, 1.5); }
  }
  const col = emissive ? '#3dffc8' : '#2fd9ac';
  ctx.strokeStyle = col; ctx.lineWidth = emissive ? 5 : 4;
  rr(ctx, 22, 22, w - 44, h - 44, 30); ctx.stroke();
  ctx.lineWidth = 1.5; ctx.globalAlpha = 0.5; rr(ctx, 34, 34, w - 68, h - 68, 22); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = emissive ? '#3dffc8' : '#e9fff8';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '700 84px Montserrat'; ctx.fillText(rank, 92, 100);
  ctx.font = '64px "DejaVu Sans", sans-serif'; ctx.fillText(suit, 92, 180);
  ctx.save(); ctx.translate(w - 92, h - 100); ctx.rotate(Math.PI);
  ctx.font = '700 84px Montserrat'; ctx.fillText(rank, 0, 0);
  ctx.font = '64px "DejaVu Sans", sans-serif'; ctx.fillText(suit, 0, -80); ctx.restore();
  ctx.save();
  ctx.shadowColor = '#3dffc8'; ctx.shadowBlur = emissive ? 18 : 0;
  ctx.fillStyle = emissive ? '#1a9e7c' : '#1de0a8';
  ctx.font = '330px "DejaVu Sans", sans-serif'; ctx.fillText(suit, w / 2, h / 2 + 10);
  ctx.restore();
}
function cardBack(ctx, w, h, emissive) {
  ctx.fillStyle = emissive ? '#000' : '#040b0a'; ctx.fillRect(0, 0, w, h);
  ctx.save(); rr(ctx, 30, 30, w - 60, h - 60, 24); ctx.clip();
  ctx.strokeStyle = emissive ? 'rgba(61,255,200,0.10)' : 'rgba(61,255,200,0.16)'; ctx.lineWidth = 2;
  for (let i = -h; i < w + h; i += 22) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - h, h); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = '#3dffc8'; ctx.lineWidth = 5; rr(ctx, 22, 22, w - 44, h - 44, 30); ctx.stroke();
  ctx.fillStyle = emissive ? '#3dffc8' : '#22c79c';
  ctx.save(); ctx.shadowColor = '#3dffc8'; ctx.shadowBlur = emissive ? 30 : 0;
  mPath(ctx, w / 2, h / 2, 250); ctx.restore();
  for (const poly of M_POLYS) {
    ctx.beginPath(); poly.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](w / 2 + (x - 0.5) * 250, h / 2 + (y - 0.5) * 227)); ctx.closePath(); ctx.fill();
  }
}

// ------------------------------------------------------------------ geometria das cartas
function roundedShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
const cardShape = roundedShape(CW, CH, CR);
const faceGeo = new THREE.ShapeGeometry(cardShape, 6);
{ const p = faceGeo.attributes.position, uv = faceGeo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / CW + 0.5, p.getY(i) / CH + 0.5); }
const edgeGeo = new THREE.ExtrudeGeometry(cardShape, { depth: CD, bevelEnabled: false, curveSegments: 6 });
edgeGeo.translate(0, 0, -CD / 2);

const faceTex = [], faceEmi = [];
for (let i = 0; i < 4; i++) {
  faceTex.push(canvasTex(TW, TH, (c, w, h) => cardFace(c, w, h, SUITS[i], RANKS[i], false)));
  faceEmi.push(canvasTex(TW, TH, (c, w, h) => cardFace(c, w, h, SUITS[i], RANKS[i], true)));
}
const backTex = canvasTex(TW, TH, (c, w, h) => cardBack(c, w, h, false));
const backEmi = canvasTex(TW, TH, (c, w, h) => cardBack(c, w, h, true));

const NC = 37;
const cards = [];
for (let i = 0; i < NC; i++) {
  const g = new THREE.Group();
  const s = i % 4;
  const mk = (map, emi) => new THREE.MeshPhysicalMaterial({
    map, emissiveMap: emi, emissive: '#ffffff', emissiveIntensity: 0.55, roughness: 0.32, metalness: 0.15,
    clearcoat: 1, clearcoatRoughness: 0.06, transparent: true, envMapIntensity: 1.2,
  });
  const front = new THREE.Mesh(faceGeo, mk(faceTex[s], faceEmi[s])); front.position.z = CD / 2 + 0.0004;
  const back = new THREE.Mesh(faceGeo, mk(backTex, backEmi)); back.position.z = -CD / 2 - 0.0004; back.rotation.y = Math.PI;
  const edgeMat = new THREE.MeshBasicMaterial({ color: TEAL.clone().multiplyScalar(1.4), transparent: true });
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  const edge = new THREE.Mesh(edgeGeo, [hidden, edgeMat]);
  g.add(front, back, edge);
  g.userData = { front, back, edge, mats: [front.material, back.material, edgeMat] };
  scene.add(g);
  cards.push(g);
}
function setCardOpacity(c, o) { for (const m of c.userData.mats) m.opacity = o; c.visible = o > 0.002; }

// ------------------------------------------------------------------ logo M 3D
const M_Z = -13, MW = 0.95, MH = 0.866;
const toW = ([x, y]) => new THREE.Vector2((x - 0.5) * MW, (0.5 - y) * MH);
const faceGrad = canvasTex(512, 512, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#8fffe0'); g.addColorStop(0.4, '#2ee0b0'); g.addColorStop(1, '#0a7a5f');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) { c.fillStyle = `rgba(255,255,255,${R() * 0.06})`; c.fillRect(R() * w, R() * h, 2, 2); }
});
faceGrad.repeat.set(1 / MW, 1 / MH); faceGrad.offset.set(0.5, 0.5);
const shardFace = new THREE.MeshPhysicalMaterial({
  map: faceGrad, color: '#d8fff4', emissive: TEAL_DEEP, emissiveIntensity: 0.12, roughness: 0.22, metalness: 0.0,
  clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.9, sheen: 0.5, sheenColor: TEAL,
});
const shardSide = new THREE.MeshPhysicalMaterial({ color: '#2a3332', metalness: 1, roughness: 0.22, envMapIntensity: 1.6, clearcoat: 0.6 });
const logo = new THREE.Group(); logo.position.set(0, 0, M_Z); scene.add(logo);
const shards = M_POLYS.map((poly, i) => {
  const pts = poly.map(toW);
  // insetar 0.012 para dar espaço ao bisel e manter o "gap" entre as peças
  const shape = new THREE.Shape(pts);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.012, bevelSegments: 4, curveSegments: 1 });
  geo.translate(0, 0, -0.1);
  const faceM = shardFace.clone(); const sideM = shardSide.clone();
  const m = new THREE.Mesh(geo, [faceM, sideM]);
  const c = pts.reduce((a, p) => a.add(p), new THREE.Vector2()).multiplyScalar(1 / pts.length);
  m.userData = { centroid: c, faceM, sideM };
  logo.add(m);
  return m;
});

// chão reflexivo
const floorY = -MH / 2 - 0.03;
const reflector = new Reflector(new THREE.PlaneGeometry(40, 40), { textureWidth: W / 2, textureHeight: H / 2, color: '#33504b', clipBias: 0.003 });
reflector.rotation.x = -Math.PI / 2; reflector.position.set(0, floorY, M_Z); scene.add(reflector);
const floorFade = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({
  color: '#010405', transparent: true, depthWrite: false,
  alphaMap: canvasTex(512, 512, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#c4c4c4'); g.addColorStop(0.08, '#d6d6d6'); g.addColorStop(0.3, '#fff'); g.addColorStop(1, '#fff');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }, false),
}));
floorFade.rotation.x = -Math.PI / 2; floorFade.position.set(0, floorY + 0.002, M_Z); scene.add(floorFade);

// ------------------------------------------------------------------ efeitos aditivos
const add = (tex, color = '#ffffff') => new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false });
const ringTex = canvasTex(512, 512, (c, w, h) => {
  const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.78, 'rgba(0,0,0,0)'); g.addColorStop(0.9, 'rgba(160,255,230,1)');
  g.addColorStop(0.94, 'rgba(61,255,200,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});
const glowTex = canvasTex(256, 256, (c, w, h) => {
  const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(120,255,220,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});
const streakTex = canvasTex(1024, 64, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  const v = c.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)');
  c.globalCompositeOperation = 'destination-out'; c.fillStyle = v; c.fillRect(0, 0, w, h);
});
const beamTex = canvasTex(256, 1024, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(120,255,220,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  const v = c.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, 'rgba(0,0,0,0.0)'); v.addColorStop(1, 'rgba(0,0,0,1)');
  c.globalCompositeOperation = 'destination-out'; c.fillStyle = v; c.fillRect(0, 0, w, h);
});
const dotTex = canvasTex(64, 64, (c, w, h) => {
  const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});

const shock = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), add(ringTex, TEAL)); shock.position.set(0, 0, M_Z + 0.15); scene.add(shock);
const shockFloor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), add(ringTex, TEAL)); shockFloor.rotation.x = -Math.PI / 2; shockFloor.position.set(0, floorY + 0.01, M_Z); scene.add(shockFloor);
const coreGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), add(glowTex, '#c8fff0')); coreGlow.position.set(0, 0, M_Z + 0.3); scene.add(coreGlow);
const streak = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), add(streakTex, '#7dffe0')); streak.position.set(0, 0, M_Z + 0.35); scene.add(streak);
const beams = [];
for (let i = 0; i < 4; i++) {
  const b = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 9), add(beamTex, TEAL));
  b.position.set((i - 1.5) * 0.7, 2.4, M_Z - 2.2); b.rotation.z = (i - 1.5) * 0.22;
  scene.add(b); beams.push(b);
}

// poeira
const ND = 700;
const dust = { p0: new Float32Array(ND * 3), v: new Float32Array(ND * 3) };
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ND * 3), 3));
dustGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(ND * 3), 3));
for (let i = 0; i < ND; i++) {
  dust.p0.set([(R() - 0.5) * 7, (R() - 0.5) * 9, mix(-17, 2.5, R())], i * 3);
  dust.v.set([(R() - 0.5) * 0.08, 0.04 + R() * 0.12, (R() - 0.5) * 0.05], i * 3);
  const b = 0.25 + R() * 0.75;
  dustGeo.attributes.color.setXYZ(i, TEAL.r * b, TEAL.g * b, TEAL.b * b);
}
const dustPts = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: dotTex, size: 0.035, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
scene.add(dustPts);

// faíscas do impacto
const NS = 260;
const sparks = { d: [], sp: [], life: [] };
const sparkGeo = new THREE.BufferGeometry();
sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NS * 3), 3));
sparkGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(NS * 3), 3));
for (let i = 0; i < NS; i++) {
  const a = R() * Math.PI * 2, z = (R() - 0.3) * 0.7;
  sparks.d.push(new THREE.Vector3(Math.cos(a), Math.sin(a) * 0.9, z).normalize());
  sparks.sp.push(0.8 + R() * 2.6);
  sparks.life.push(0.5 + R() * 1.1);
}
const sparkPts = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ map: dotTex, size: 0.03, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }));
scene.add(sparkPts);

// ------------------------------------------------------------------ pós-processamento
const composer = new EffectComposer(renderer);
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.5, 0.5, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uFlash: { value: 0 }, uFade: { value: 1 }, uCA: { value: 0.0015 }, uAspect: { value: W / H } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uFlash, uFade, uCA, uAspect; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 c = vUv - 0.5;
      vec2 off = c * uCA * (1.0 + 4.0*uFlash);
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      vec2 q = c * vec2(1.0, 1.0/uAspect) * vec2(1.0, uAspect*0.95);
      float vig = smoothstep(0.95, 0.25, length(c * vec2(1.25, 0.95)));
      col *= mix(0.35, 1.0, vig);
      col += uFlash * vec3(0.55, 1.0, 0.88) * (0.65 + 0.35*vig);
      float g = h(vUv*vec2(1080.,2336.) + fract(uTime*7.13)*100.) - 0.5;
      col += g * 0.035 * (1.0 - dot(col, vec3(0.3,0.59,0.11)));
      col = pow(max(col, 0.0), vec3(1.0)) * uFade;
      gl_FragColor = vec4(col, 1.0);
    }`,
});
composer.addPass(grade);

// ------------------------------------------------------------------ layout do túnel
const tunnel = [];
for (let k = 0; k < 6; k++) for (let j = 0; j < 6; j++) {
  const a = j * Math.PI / 3 + k * 0.52;
  tunnel.push({ k, a, z: -1.0 - k * 1.6, roll: R() * Math.PI * 2, spinAxis: new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(), spin: 4 + R() * 6 });
}
// cartas que viram o logo: 3 por peça (anel 5 + metade do anel 4)
const chosen = [];
{ const pool = tunnel.map((p, i) => i + 1).filter(i => tunnel[i - 1].k >= 4).slice(0, 9);
  pool.forEach((ci, n) => chosen[ci] = { piece: n % 3, n: Math.floor(n / 3) }); }
const PIECE_T = [4.05, 4.22, 4.40];

const tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpV = new THREE.Vector3(), tmpO = new THREE.Object3D();
function tunnelPose(i, t) {
  const p = tunnel[i - 1];
  const a = p.a + 0.35 * Math.max(0, t - 1.45);
  const pos = new THREE.Vector3(0.78 * Math.cos(a), 1.35 * Math.sin(a), p.z);
  tmpO.position.copy(pos); tmpO.up.set(Math.cos(a), Math.sin(a), 0); tmpO.lookAt(0, 0, p.z + 2.6);
  tmpO.rotateZ(p.roll * 0.15);
  return { pos, q: tmpO.quaternion.clone() };
}

// ------------------------------------------------------------------ câmera
function cameraAt(t) {
  let z, x = 0, y = 0, roll = 0, fov = 40, tx = 0, ty = 0, tz;
  if (t < 4.45) {
    if (t < 0.75) z = 2.2;
    else if (t < 1.45) z = mix(2.2, 1.85, easeIO(lin(t, 0.75, 1.45)));
    else if (t < 2.3) z = mix(1.85, 3.0, easeOut(lin(t, 1.45, 2.3)));
    else z = mix(3.0, M_Z + 4.8, smoother(lin(t, 2.3, 4.45)));
    tz = z - 5;
    roll = 0.9 * Math.sin(Math.PI * smooth(lin(t, 2.2, 4.45))) * (1 - 0.0);
    fov = 40 + 14 * Math.sin(Math.PI * smooth(lin(t, 2.4, 4.3)));
    x = 0.05 * Math.sin(t * 1.7); y = 0.04 * Math.sin(t * 1.3);
    if (t >= 4.1) tz = mix(z - 5, M_Z, smooth(lin(t, 4.1, 4.45)));
  } else {
    const a = easeIO(lin(t, 4.45, 6.0)), b = easeOut5(lin(t, 5.85, 7.25));
    const yaw = -0.3 * Math.sin(Math.PI * easeIO(lin(t, 4.45, 7.0)));
    const d = mix(mix(4.8, 5.2, a), 5.7, b);
    const ey = mix(mix(0.05, 0.22, a), 0.42, b);
    x = Math.sin(yaw) * d; z = M_Z + Math.cos(yaw) * d; y = ey;
    tx = 0; ty = mix(0, -0.56, b); tz = M_Z;
    fov = 40;
  }
  // tremida do impacto
  const sh = pulse(t, 4.48, 0.12) * 0.03;
  x += sh * Math.sin(t * 91); y += sh * Math.cos(t * 77);
  camera.position.set(x, y, z);
  camera.up.set(Math.sin(roll), Math.cos(roll), 0);
  camera.lookAt(tx, ty, tz ?? z - 5);
  camera.fov = fov; camera.updateProjectionMatrix();
}

// ------------------------------------------------------------------ estado da cena em t
function sceneAt(t) {
  cameraAt(t);
  // carta herói (0): linha de luz -> vira de frente -> passa pela câmera
  const hero = cards[0];
  {
    const draw = easeOut(lin(t, 0.2, 0.75));
    const flip = easeIO(lin(t, 0.75, 1.45));
    hero.position.set(0, 0, 0);
    hero.scale.set(Math.max(0.001, draw), 1, 1);
    tmpE.set(mix(Math.PI / 2, 0, flip), mix(-0.35, 0, flip), 0); hero.quaternion.setFromEuler(tmpE);
    const f = lin(t, 1.45, 1.95);
    if (f > 0) {
      const e = easeIn(f);
      hero.position.set(mix(0, 1.2, e), mix(0, 0.45, e), mix(0, 3.2, e));
      tmpE.set(-0.4 * e, 1.6 * e, -0.5 * e); tmpQ.setFromEuler(tmpE); hero.quaternion.copy(tmpQ);
    }
    setCardOpacity(hero, t < 1.95 ? 1 : 0);
    hero.userData.mats[2].color.copy(TEAL).multiplyScalar(mix(2.4, 1.4, lin(t, 0.75, 1.2)));
  }
  // baralho -> túnel -> dispersão / logo
  for (let i = 1; i < NC; i++) {
    const c = cards[i], p = tunnel[i - 1], ch = chosen[i];
    if (t < 1.45) { setCardOpacity(c, 0); continue; }
    const st = 1.45 + i * 0.012;
    const e = easeOut(lin(t, st, st + 0.85));
    const tp = tunnelPose(i, t);
    const pos = new THREE.Vector3(0, 0, -i * 0.004).lerp(tp.pos, e);
    pos.x += Math.sin(Math.PI * e) * Math.cos(p.a) * 0.6; pos.y += Math.sin(Math.PI * e) * Math.sin(p.a) * 0.6;
    const q = new THREE.Quaternion().slerp(tp.q, e);
    tmpQ2.setFromAxisAngle(p.spinAxis, Math.sin(Math.PI * e) * p.spin); q.multiply(tmpQ2);
    let op = 1, sc = 1;
    if (ch) {
      const ta = PIECE_T[ch.piece] - 0.08 * (2 - ch.n), t0 = ta - 0.6;
      const f = lin(t, t0, ta);
      if (f > 0) {
        const ef = easeIn(f) * 0.6 + smooth(f) * 0.4;
        const sh = shards[ch.piece].userData.centroid;
        const target = new THREE.Vector3(sh.x + (ch.n - 1) * 0.03, sh.y + (ch.n - 1) * 0.02, M_Z + 0.25 + ch.n * 0.02);
        pos.lerp(target, ef);
        tmpE.set(0, 0, [-0.8, 0.55, 0.25][ch.piece] + (ch.n - 1) * 0.12); tmpQ2.setFromEuler(tmpE);
        q.slerp(tmpQ2, smooth(f));
        sc = mix(1, 0.32, ef);
      }
      op = 1 - lin(t, ta - 0.02, ta + 0.05);
    } else {
      const f = easeIn(lin(t, 3.4 + (p.k * 0.05), 4.3));
      pos.x += Math.cos(p.a) * f * 3; pos.y += Math.sin(p.a) * f * 3; pos.z += f * 2;
      op = 1 - smooth(lin(t, 3.9, 4.35));
    }
    c.position.copy(pos); c.quaternion.copy(q); c.scale.setScalar(sc);
    setCardOpacity(c, op);
    const flash = ch ? pulse(t, PIECE_T[ch.piece] - 0.05, 0.12) : 0;
    c.userData.mats[2].color.copy(TEAL).multiplyScalar(1.4 + flash * 3);
    c.userData.mats[0].emissiveIntensity = c.userData.mats[1].emissiveIntensity = 0.55 + flash * 2;
  }
  // peças do logo
  let snapE = 0;
  shards.forEach((s, i) => {
    const ta = PIECE_T[i];
    const f = lin(t, ta - 0.03, ta + 0.32);
    s.visible = t >= ta - 0.03;
    const k = easeOutBack(f, 2.2);
    s.scale.set(mix(1.12, 1, smooth(f)), mix(1.12, 1, smooth(f)), Math.max(0.02, k));
    const em = pulse(t, ta + 0.02, 0.18) * (i === 2 ? 3 : 2) + 0.14 + 0.04 * Math.sin(t * 3 + i);
    s.userData.faceM.emissiveIntensity = em;
    snapE += pulse(t, ta, 0.1) * (i === 2 ? 1 : 0.35);
  });
  logo.rotation.set(0.0, 0.0, 0);
  logo.position.y = 0.012 * Math.sin(t * 2.0) * lin(t, 4.6, 5.2);
  // luzes
  const showFloor = t > 4.0;
  reflector.visible = floorFade.visible = showFloor;
  glint.position.set(mix(-1.2, 1.4, easeIO(lin(t, 0.8, 1.5))), mix(0.7, -0.6, easeIO(lin(t, 0.8, 1.5))), 0.6);
  glint.intensity = 6 * Math.sin(Math.PI * lin(t, 0.8, 1.5));
  if (t > 4.6) {
    const g = easeIO(lin(t, 4.9, 6.1));
    glint.position.set(mix(-1.6, 1.6, g), mix(1.2, -0.4, g), M_Z + 1.0);
    glint.intensity = 4 * Math.sin(Math.PI * lin(t, 4.9, 6.1));
  }
  rimL.intensity = 30 * smooth(lin(t, 3.6, 4.4)); rimR.intensity = 22 * smooth(lin(t, 3.6, 4.4));
  // efeitos do impacto
  const sf = lin(t, 4.40, 5.15);
  shock.visible = sf > 0 && sf < 1; shock.scale.setScalar(mix(0.4, 6, easeOut(sf))); shock.material.opacity = Math.pow(1 - sf, 2) * 0.6;
  const ff = lin(t, 4.42, 5.4);
  shockFloor.visible = ff > 0 && ff < 1; shockFloor.scale.setScalar(mix(0.5, 10, easeOut(ff))); shockFloor.material.opacity = Math.pow(1 - ff, 1.5) * 0.7;
  coreGlow.scale.setScalar(mix(0.8, 2.4, snapE)); coreGlow.material.opacity = snapE * 0.45;
  coreGlow.visible = snapE > 0.01;
  streak.scale.set(9, 0.05 + 0.05 * snapE, 1); streak.material.opacity = snapE * 0.8; streak.visible = snapE > 0.01;
  beams.forEach((b, i) => { b.material.opacity = 0.075 * smooth(lin(t, 4.4, 5.4)) * (0.8 + 0.2 * Math.sin(t * 1.3 + i * 1.7)); b.rotation.z = (i - 1.5) * 0.22 + 0.04 * Math.sin(t * 0.7 + i); });
  // poeira
  const dp = dustGeo.attributes.position;
  for (let i = 0; i < ND; i++) {
    let x = dust.p0[i * 3] + dust.v[i * 3] * t, y = dust.p0[i * 3 + 1] + dust.v[i * 3 + 1] * t, z = dust.p0[i * 3 + 2] + dust.v[i * 3 + 2] * t;
    y = ((y + 4.5) % 9 + 9) % 9 - 4.5;
    dp.setXYZ(i, x, y, z);
  }
  dp.needsUpdate = true;
  dustPts.material.opacity = smooth(lin(t, 0.3, 1.5)) * 0.9;
  // faíscas
  const sp = sparkGeo.attributes.position, sc = sparkGeo.attributes.color;
  for (let i = 0; i < NS; i++) {
    const dt = t - 4.40;
    if (dt < 0) { sp.setXYZ(i, 0, 0, -999); continue; }
    const drag = (1 - Math.exp(-2.6 * dt)) / 2.6;
    const d = sparks.d[i], s = sparks.sp[i];
    sp.setXYZ(i, d.x * s * drag, d.y * s * drag - 0.9 * dt * dt, M_Z + 0.2 + d.z * s * drag);
    const l = Math.max(0, 1 - dt / sparks.life[i]);
    const b = l * l * 1.4;
    sc.setXYZ(i, mix(1, TEAL.r, 1 - l) * b, b, mix(1, TEAL.b, 1 - l) * b);
  }
  sp.needsUpdate = true; sc.needsUpdate = true;
  // pós
  bloom.strength = 0.42 + 0.45 * snapE + 0.35 * pulse(t, 0.55, 0.25);
  bloom.threshold = 0.82;
  grade.uniforms.uTime.value = t;
  grade.uniforms.uFlash.value = 0.22 * pulse(t, 4.41, 0.05) + 0.05 * pulse(t, 4.05, 0.04) + 0.05 * pulse(t, 4.22, 0.04);
  grade.uniforms.uFade.value = smooth(lin(t, 0.0, 0.35)) * 0.9 + 0.1 * smooth(lin(t, 0, 0.8));
  grade.uniforms.uCA.value = 0.0012 + 0.006 * Math.sin(Math.PI * smooth(lin(t, 2.4, 4.3)));
}

// ------------------------------------------------------------------ tipografia (sobreposição 2D)
function drawType(t) {
  const U = W / 1080, cx = W / 2, y0 = H * 0.585;
  octx.save(); octx.scale(U, U); drawTypeU(t, cx / U, y0 / U); octx.restore();
}
function drawTypeU(t, cx, y0) {
  // MIÚDA: tracking fecha + desfoque some
  const p = lin(t, 6.0, 6.85);
  if (p > 0) {
    const e = easeOut5(p);
    const track = mix(120, 14, e);
    const size = 168;
    octx.save();
    octx.font = `900 ${size}px Montserrat`; octx.textBaseline = 'alphabetic';
    const letters = ['M', 'I', 'Ú', 'D', 'A'];
    const widths = letters.map(l => octx.measureText(l).width);
    const total = widths.reduce((a, b) => a + b, 0) + track * (letters.length - 1);
    let x = cx - total / 2;
    letters.forEach((l, i) => {
      const li = lin(t, 6.0 + i * 0.06, 6.55 + i * 0.06);
      const a = smooth(li);
      octx.globalAlpha = a;
      octx.filter = `blur(${(1 - easeOut(li)) * 14}px)`;
      octx.shadowColor = 'rgba(61,255,200,0.75)'; octx.shadowBlur = 40 * (1 - smooth(lin(t, 6.5, 7.2))) + 8;
      octx.fillStyle = '#f4fffb';
      octx.fillText(l, x, y0 + (1 - easeOut(li)) * 30);
      x += widths[i] + track;
    });
    octx.restore();
    // brilho que corre pelas letras
    const g = lin(t, 6.55, 7.05);
    if (g > 0 && g < 1) {
      octx.save();
      octx.globalCompositeOperation = 'lighter';
      const gx = mix(cx - total / 2 - 150, cx + total / 2 + 150, easeIO(g));
      const grd = octx.createLinearGradient(gx - 90, 0, gx + 90, 0);
      grd.addColorStop(0, 'rgba(61,255,200,0)'); grd.addColorStop(0.5, 'rgba(160,255,230,0.55)'); grd.addColorStop(1, 'rgba(61,255,200,0)');
      octx.fillStyle = grd;
      octx.font = `900 ${size}px Montserrat`;
      let xx = cx - total / 2;
      letters.forEach((l, i) => { octx.fillText(l, xx, y0); xx += widths[i] + track; });
      octx.restore();
    }
  }
  // slogan
  const s = smooth(lin(t, 6.45, 7.0));
  if (s > 0) {
    octx.save();
    octx.globalAlpha = s * 0.85;
    octx.font = '500 40px Montserrat';
    octx.fillStyle = '#b9cfd0';
    const txt = 'CADA VIDA CONTA.';
    const tr = mix(26, 15, easeOut(lin(t, 6.45, 7.1)));
    const ws = [...txt].map(ch => octx.measureText(ch).width);
    const tot = ws.reduce((a, b) => a + b, 0) + tr * (txt.length - 1);
    let x = cx - tot / 2;
    [...txt].forEach((ch, i) => { octx.fillText(ch, x, y0 + 92); x += ws[i] + tr; });
    octx.restore();
  }
  // loader ///
  for (let i = 0; i < 3; i++) {
    const st = 6.85 + i * 0.12;
    let a = smooth(lin(t, st, st + 0.12));
    if (a <= 0) continue;
    a *= 0.75 + 0.25 * Math.cos((t - 7.25 - i * 0.1) * 9) * lin(t, 7.2, 7.3);
    const bx = cx - 66 + i * 46, by = y0 + 210;
    octx.save();
    octx.globalAlpha = a;
    octx.fillStyle = '#3dffc8'; octx.shadowColor = '#3dffc8'; octx.shadowBlur = 24 + 40 * pulse(t, st + 0.12, 0.1);
    octx.beginPath(); octx.moveTo(bx + 14, by - 24); octx.lineTo(bx + 34, by - 24); octx.lineTo(bx + 14, by + 24); octx.lineTo(bx - 6, by + 24); octx.closePath(); octx.fill();
    octx.restore();
  }
}

// ------------------------------------------------------------------ API
function subSamples(t) {
  // motion blur (média de sub-quadros) nos trechos rápidos
  if ((t > 1.45 && t < 2.0) || (t > 2.5 && t < 4.5)) return 5;
  return 1;
}
window.renderFrame = (t) => {
  const n = subSamples(t), shutter = 0.5 / FPS;
  for (let i = 0; i < n; i++) {
    const ts = n === 1 ? t : t - shutter / 2 + shutter * (i / (n - 1));
    sceneAt(ts);
    composer.render();
    octx.globalAlpha = 1 / (i + 1);
    octx.drawImage(renderer.domElement, 0, 0);
  }
  octx.globalAlpha = 1;
  drawType(t);
  return true;
};
window.grabFrame = () => {
  const d = octx.getImageData(0, 0, W, H).data;
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < d.length; i += CH) s += String.fromCharCode.apply(null, d.subarray(i, i + CH));
  return btoa(s);
};
await document.fonts.load('900 100px Montserrat');
await document.fonts.load('500 40px Montserrat');
await document.fonts.load('700 84px Montserrat');
// re-desenha texturas que usam a fonte (carregada agora)
for (let i = 0; i < 4; i++) {
  for (const [tex, emi] of [[faceTex[i], false], [faceEmi[i], true]]) {
    const c = tex.image; cardFace(c.getContext('2d'), c.width, c.height, SUITS[i], RANKS[i], emi); tex.needsUpdate = true;
  }
}
window.ready = true;
if (Q.get('preview')) {
  const t0 = performance.now();
  const loop = () => { const t = ((performance.now() - t0) / 1000) % DUR; window.renderFrame(t); requestAnimationFrame(loop); };
  loop();
}
