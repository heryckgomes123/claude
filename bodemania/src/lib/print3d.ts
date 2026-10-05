/**
 * Orçamento instantâneo de impressão 3D (no estilo Craftcloud / Xometry):
 * lê o arquivo STL no próprio navegador, calcula volume e medidas e estima gramas, tempo e preço.
 */

export type MeshInfo = {
  volumeCm3: number
  size: [number, number, number]
  triangles: number
  /** amostra de triângulos (x,y,z × 3) para a prévia */
  preview: Float32Array
  min: [number, number, number]
}

const PREVIEW_MAX = 40000

export function parseSTL(buffer: ArrayBuffer): MeshInfo {
  const view = new DataView(buffer)
  const isBinary = buffer.byteLength >= 84 && 84 + view.getUint32(80, true) * 50 === buffer.byteLength
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  let volume = 0
  let triangles = 0
  const total = isBinary ? view.getUint32(80, true) : 0
  const step = total > PREVIEW_MAX ? total / PREVIEW_MAX : 1
  const preview: number[] = []
  let nextSample = 0

  const tri = (a: number[], b: number[], c: number[]) => {
    volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6
    for (const v of [a, b, c])
      for (let k = 0; k < 3; k++) {
        if (v[k] < min[k]) min[k] = v[k]
        if (v[k] > max[k]) max[k] = v[k]
      }
    if (triangles >= nextSample && preview.length < PREVIEW_MAX * 9) {
      preview.push(...a, ...b, ...c)
      nextSample += step
    }
    triangles++
  }

  if (isBinary) {
    const n = view.getUint32(80, true)
    for (let i = 0; i < n; i++) {
      const o = 84 + i * 50 + 12
      const v = (j: number) => [view.getFloat32(o + j * 12, true), view.getFloat32(o + j * 12 + 4, true), view.getFloat32(o + j * 12 + 8, true)]
      tri(v(0), v(1), v(2))
    }
  } else {
    const text = new TextDecoder().decode(buffer)
    const re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g
    const verts: number[][] = []
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) verts.push([Number(m[1]), Number(m[2]), Number(m[3])])
    for (let i = 0; i + 2 < verts.length; i += 3) tri(verts[i], verts[i + 1], verts[i + 2])
  }

  if (!triangles) throw new Error('Arquivo STL vazio ou inválido.')
  return {
    volumeCm3: Math.abs(volume) / 1000, // mm³ → cm³
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
    triangles,
    preview: new Float32Array(preview),
    min: [min[0], min[1], min[2]],
  }
}

/** Gera um STL binário de exemplo (vaso torcido) para quem quer testar sem ter um arquivo. */
export function sampleSTL(): ArrayBuffer {
  const sides = 6
  const rings = 24
  const height = 120
  const tris: number[][][] = []
  const ring = (j: number) => {
    const z = (j / rings) * height
    const r = 28 + 14 * Math.sin((j / rings) * Math.PI)
    const twist = (j / rings) * Math.PI * 0.9
    return Array.from({ length: sides }, (_, i) => {
      const a = (i / sides) * Math.PI * 2 + twist
      return [Math.cos(a) * r, Math.sin(a) * r, z]
    })
  }
  const rs = Array.from({ length: rings + 1 }, (_, j) => ring(j))
  for (let j = 0; j < rings; j++)
    for (let i = 0; i < sides; i++) {
      const a = rs[j][i]
      const b = rs[j][(i + 1) % sides]
      const c = rs[j + 1][(i + 1) % sides]
      const d = rs[j + 1][i]
      tris.push([a, b, c], [a, c, d])
    }
  const bottom = [0, 0, 0]
  const top = [0, 0, height]
  for (let i = 0; i < sides; i++) {
    tris.push([bottom, rs[0][(i + 1) % sides], rs[0][i]])
    tris.push([top, rs[rings][i], rs[rings][(i + 1) % sides]])
  }
  const buf = new ArrayBuffer(84 + tris.length * 50)
  const v = new DataView(buf)
  v.setUint32(80, tris.length, true)
  tris.forEach((t, k) => {
    const o = 84 + k * 50 + 12
    t.forEach((p, j) => p.forEach((n, m) => v.setFloat32(o + j * 12 + m * 4, n, true)))
  })
  return buf
}

export const MATERIALS = [
  { id: 'pla', name: 'PLA', desc: 'Versátil e ecológico. Ideal para decoração, miniaturas e protótipos.', density: 1.24, perGram: 0.19, rate: 12 },
  { id: 'petg', name: 'PETG', desc: 'Mais resistente a impacto e calor. Peças funcionais e uso externo.', density: 1.27, perGram: 0.24, rate: 10 },
  { id: 'abs', name: 'ABS', desc: 'Resistência térmica e mecânica. Peças técnicas e automotivas.', density: 1.04, perGram: 0.24, rate: 10 },
  { id: 'tpu', name: 'TPU flexível', desc: 'Borrachoso e flexível. Capinhas, amortecedores e vedações.', density: 1.21, perGram: 0.38, rate: 6 },
  { id: 'resina', name: 'Resina', desc: 'Detalhe altíssimo e acabamento liso. Joias, miniaturas e bustos.', density: 1.15, perGram: 0.7, rate: 9 },
] as const

export type MaterialId = (typeof MATERIALS)[number]['id']

export const QUALITIES = [
  { id: 'rascunho', name: 'Rascunho', layer: '0,28 mm', time: 0.75, price: 0.9 },
  { id: 'padrao', name: 'Padrão', layer: '0,20 mm', time: 1, price: 1 },
  { id: 'fino', name: 'Alta definição', layer: '0,12 mm', time: 1.6, price: 1.3 },
] as const

export type QualityId = (typeof QUALITIES)[number]['id']

export const INFILLS = [15, 25, 50, 100] as const

export type PrintQuote = { grams: number; hours: number; unit: number; total: number; fits: boolean }

/** Volume máximo da impressora (mm). */
export const BUILD_VOLUME: [number, number, number] = [256, 256, 256]

export function quotePrint(opts: {
  volumeCm3: number
  size: [number, number, number]
  scale: number
  material: MaterialId
  quality: QualityId
  infill: number
  qty: number
}): PrintQuote {
  const mat = MATERIALS.find((m) => m.id === opts.material)!
  const q = QUALITIES.find((x) => x.id === opts.quality)!
  const s = opts.scale / 100
  const vol = opts.volumeCm3 * s ** 3
  const solidity = opts.material === 'resina' ? 0.7 : 0.28 + 0.72 * (opts.infill / 100)
  const grams = Math.max(2, vol * mat.density * solidity * 1.08) // +8% suportes/purga
  const hours = (grams / mat.rate) * q.time + 0.25
  const unit = Math.max(29, 12 + grams * mat.perGram * q.price + hours * 3.2)
  const dims = opts.size.map((d) => d * s).sort((a, b) => a - b)
  const bed = [...BUILD_VOLUME].sort((a, b) => a - b)
  const fits = dims.every((d, i) => d <= bed[i])
  // Desconto progressivo por quantidade
  const tier = opts.qty >= 20 ? 0.8 : opts.qty >= 10 ? 0.87 : opts.qty >= 5 ? 0.93 : 1
  return { grams, hours, unit: round(unit * tier), total: round(unit * tier) * opts.qty, fits }
}

const round = (n: number) => Math.round(n * 100) / 100

export const FILAMENT_COLORS = [
  { id: 'preto', name: 'Preto', hex: '#1d1f24' },
  { id: 'branco', name: 'Branco', hex: '#f4f4f1' },
  { id: 'cinza', name: 'Cinza', hex: '#8b9099' },
  { id: 'dourado', name: 'Dourado seda', hex: '#c9a14a' },
  { id: 'prata', name: 'Prata seda', hex: '#c4c8ce' },
  { id: 'azul', name: 'Azul royal', hex: '#2348a8' },
  { id: 'vermelho', name: 'Vermelho', hex: '#d1312a' },
  { id: 'laranja', name: 'Laranja', hex: '#ff6a2b' },
  { id: 'verde', name: 'Verde', hex: '#1f9d55' },
  { id: 'roxo', name: 'Roxo', hex: '#6a3fb5' },
  { id: 'madeira', name: 'Madeira', hex: '#a5774a' },
  { id: 'transparente', name: 'Translúcido', hex: '#dfe9ee' },
] as const
