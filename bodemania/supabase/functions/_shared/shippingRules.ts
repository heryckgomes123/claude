import { onlyDigits, round2 } from './money.ts'
import type { ShippingOption } from './types.ts'

const RANGES: [number, number, string][] = [
  [1000, 19999, 'SP'], [20000, 28999, 'RJ'], [29000, 29999, 'ES'], [30000, 39999, 'MG'],
  [40000, 48999, 'BA'], [49000, 49999, 'SE'], [50000, 56999, 'PE'], [57000, 57999, 'AL'],
  [58000, 58999, 'PB'], [59000, 59999, 'RN'], [60000, 63999, 'CE'], [64000, 64999, 'PI'],
  [65000, 65999, 'MA'], [66000, 68899, 'PA'], [68900, 68999, 'AP'], [69000, 69299, 'AM'],
  [69300, 69399, 'RR'], [69400, 69899, 'AM'], [69900, 69999, 'AC'], [70000, 72799, 'DF'],
  [72800, 72999, 'GO'], [73000, 73699, 'DF'], [73700, 76799, 'GO'], [76800, 76999, 'RO'],
  [77000, 77999, 'TO'], [78000, 78899, 'MT'], [79000, 79999, 'MS'], [80000, 87999, 'PR'],
  [88000, 89999, 'SC'], [90000, 99999, 'RS'],
]

/** UF aproximada pela faixa do CEP (usada só quando não há consulta ao ViaCEP). */
export function ufFromCep(cep: string): string | null {
  const n = Number(onlyDigits(cep).slice(0, 5))
  const hit = RANGES.find(([a, b]) => n >= a && n <= b)
  return hit ? hit[2] : null
}

const REGION: Record<string, 'SE' | 'S' | 'CO' | 'NE' | 'N'> = {
  SP: 'SE', RJ: 'SE', ES: 'SE', MG: 'SE', PR: 'S', SC: 'S', RS: 'S', DF: 'CO', GO: 'CO', MT: 'CO', MS: 'CO',
  BA: 'NE', SE: 'NE', AL: 'NE', PE: 'NE', PB: 'NE', RN: 'NE', CE: 'NE', PI: 'NE', MA: 'NE',
  PA: 'N', AP: 'N', AM: 'N', RR: 'N', AC: 'N', RO: 'N', TO: 'N',
}

/** 0 = mesmo estado · 1 = mesma região · 2 = região vizinha · 3 = longa distância */
function zone(originUf: string, destUf: string): 0 | 1 | 2 | 3 {
  if (destUf === originUf) return 0
  const a = REGION[originUf]
  const b = REGION[destUf]
  if (a === b) return 1
  const near: Record<string, string[]> = { SE: ['S', 'CO'], S: ['SE', 'CO'], CO: ['SE', 'S', 'N'], NE: ['SE'], N: ['CO'] }
  return near[a]?.includes(b) ? 2 : 3
}

export interface RawQuote {
  id: 'pac' | 'sedex'
  price: number
  days: number
}

/** Tabela de contingência quando a cotação dos Correios (Melhor Envio) não está disponível. */
export function heuristicQuote(originCep: string, destUf: string, weightKg: number): RawQuote[] {
  const z = zone(ufFromCep(originCep) ?? 'SP', destUf)
  const extraKg = Math.max(0, Math.ceil(weightKg - 1))
  const pac = [18.9, 24.9, 32.9, 44.9][z] + extraKg * [3.5, 5, 7, 10][z]
  return [
    { id: 'pac', price: round2(pac), days: [3, 5, 8, 11][z] },
    { id: 'sedex', price: round2(pac * 1.85 + 6), days: [1, 2, 4, 6][z] },
  ]
}

/** Monta as opções finais: rótulos, frete grátis no PAC e retirada no ateliê (mesmo estado da origem). */
export function buildShippingOptions(
  raw: RawQuote[],
  opts: { originCep: string; destUf: string; goods: number; freeShippingFrom: number; freeShippingCoupon: boolean },
): ShippingOption[] {
  const free = opts.goods >= opts.freeShippingFrom || opts.freeShippingCoupon
  const out: ShippingOption[] = []
  const pac = raw.find((r) => r.id === 'pac')
  const sedex = raw.find((r) => r.id === 'sedex')
  if (pac) out.push({ id: 'pac', label: 'Correios PAC', detail: free ? 'Frete grátis' : 'Econômico', price: free ? 0 : round2(pac.price), days: pac.days })
  if (sedex) out.push({ id: 'sedex', label: 'Correios SEDEX', detail: 'Mais rápido', price: round2(sedex.price), days: sedex.days })
  const originUf = ufFromCep(opts.originCep) ?? 'SP'
  if (opts.destUf === originUf) out.push({ id: 'pickup', label: 'Retirar no ateliê', detail: 'São Paulo/SP · com hora marcada', price: 0, days: 0 })
  return out
}

export const DIGITAL_SHIPPING: ShippingOption = { id: 'digital', label: 'Entrega digital', detail: 'Na sua conta e por e-mail', price: 0, days: 0 }

/** Resposta da API do Melhor Envio → cotações no nosso formato (só PAC=1 e SEDEX=2). */
export function parseMelhorEnvio(data: unknown): RawQuote[] {
  if (!Array.isArray(data)) return []
  const out: RawQuote[] = []
  for (const s of data as Record<string, unknown>[]) {
    if (s.error || (s.id !== 1 && s.id !== 2)) continue
    const price = Number(s.custom_price ?? s.price)
    const days = Number(s.custom_delivery_time ?? s.delivery_time)
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(days)) continue
    out.push({ id: s.id === 1 ? 'pac' : 'sedex', price: round2(price), days })
  }
  return out
}

export interface PackageLine {
  id: string
  qty: number
  weight: number
  widthCm: number
  heightCm: number
  lengthCm: number
  unitPrice: number
}

/** Corpo da cotação do Melhor Envio. Limites mínimos dos Correios: 11×2×16 cm e 0,1 kg. */
export function melhorEnvioBody(originCep: string, destCep: string, lines: PackageLine[]) {
  return {
    from: { postal_code: onlyDigits(originCep) },
    to: { postal_code: onlyDigits(destCep) },
    products: lines.map((l) => ({
      id: l.id,
      width: Math.max(11, Math.ceil(l.widthCm)),
      height: Math.max(2, Math.ceil(l.heightCm)),
      length: Math.max(16, Math.ceil(l.lengthCm)),
      weight: Math.max(0.1, round2(l.weight)),
      insurance_value: round2(l.unitPrice),
      quantity: l.qty,
    })),
    options: { receipt: false, own_hand: false },
    services: '1,2',
  }
}
