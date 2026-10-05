import { ORIGIN_CEP, RULES } from '../config/store'
import { onlyDigits } from './format'

export type Address = {
  cep: string
  street: string
  number: string
  complement: string
  district: string
  city: string
  uf: string
}

export type ShippingOption = {
  id: 'pac' | 'sedex' | 'pickup' | 'digital'
  label: string
  detail: string
  price: number
  /** dias úteis de transporte (sem contar produção) */
  days: number
}

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

/** 0 = mesmo estado · 1 = mesma região/vizinha · 2 = média distância · 3 = longa distância */
function zone(destUf: string): 0 | 1 | 2 | 3 {
  const originUf = ufFromCep(ORIGIN_CEP) ?? 'SP'
  if (destUf === originUf) return 0
  const a = REGION[originUf]
  const b = REGION[destUf]
  if (a === b) return 1
  const near: Record<string, string[]> = { SE: ['S', 'CO'], S: ['SE', 'CO'], CO: ['SE', 'S', 'N'], NE: ['SE'], N: ['CO'] }
  if (near[a]?.includes(b)) return 2
  return 3
}

export function quoteShipping(uf: string, weightKg: number, subtotal: number, freeShippingCoupon = false): ShippingOption[] {
  const z = zone(uf)
  const extraKg = Math.max(0, Math.ceil(weightKg - 1))
  const pacBase = [18.9, 24.9, 32.9, 44.9][z] + extraKg * [3.5, 5, 7, 10][z]
  const sedexBase = pacBase * 1.85 + 6
  const free = subtotal >= RULES.freeShippingFrom || freeShippingCoupon
  const options: ShippingOption[] = [
    {
      id: 'pac',
      label: 'Correios PAC',
      detail: free ? 'Frete grátis' : 'Econômico',
      price: free ? 0 : round(pacBase),
      days: [3, 5, 8, 11][z],
    },
    { id: 'sedex', label: 'Correios SEDEX', detail: 'Mais rápido', price: round(sedexBase), days: [1, 2, 4, 6][z] },
  ]
  const originUf = ufFromCep(ORIGIN_CEP) ?? 'SP'
  if (uf === originUf) {
    options.push({ id: 'pickup', label: 'Retirar no ateliê', detail: 'São Paulo/SP · com hora marcada', price: 0, days: 0 })
  }
  return options
}

const round = (n: number) => Math.round(n * 10) / 10

/** Busca o endereço no ViaCEP. Se estiver offline, devolve só a UF deduzida pela faixa do CEP. */
export async function lookupCep(cep: string): Promise<Partial<Address> & { uf: string } | null> {
  const d = onlyDigits(cep)
  if (d.length !== 8) return null
  const uf = ufFromCep(d)
  try {
    const ctrl = new AbortController()
    const t = window.setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch(`https://viacep.com.br/ws/${d}/json/`, { signal: ctrl.signal })
    window.clearTimeout(t)
    if (!res.ok) throw new Error('viacep')
    const data = (await res.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string; complemento?: string }
    if (data.erro) return null
    return {
      cep: d,
      street: data.logradouro ?? '',
      district: data.bairro ?? '',
      city: data.localidade ?? '',
      uf: data.uf ?? uf ?? '',
    }
  } catch {
    return uf ? { cep: d, uf } : null
  }
}
