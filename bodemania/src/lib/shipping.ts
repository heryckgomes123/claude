import { ORIGIN_CEP, RULES } from '../config/store'
import { onlyDigits } from './format'
import { buildShippingOptions, heuristicQuote, ufFromCep } from '../../supabase/functions/_shared/shippingRules'
import type { Address, ShippingOption } from '../../supabase/functions/_shared/types'

export type { Address, ShippingOption }
export { ufFromCep }

/** Tabela de contingência (modo demonstração e fallback). A cotação real vem da função shipping-quote. */
export function quoteShipping(uf: string, weightKg: number, goods: number, freeShippingCoupon = false): ShippingOption[] {
  return buildShippingOptions(heuristicQuote(ORIGIN_CEP, uf, weightKg), { originCep: ORIGIN_CEP, destUf: uf, goods, freeShippingFrom: RULES.freeShippingFrom, freeShippingCoupon })
}

/** Busca o endereço no ViaCEP. Se estiver offline, devolve só a UF deduzida pela faixa do CEP. */
export async function lookupCep(cep: string): Promise<(Partial<Address> & { uf: string }) | null> {
  const d = onlyDigits(cep)
  if (d.length !== 8) return null
  const uf = ufFromCep(d)
  try {
    const ctrl = new AbortController()
    const t = window.setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch(`https://viacep.com.br/ws/${d}/json/`, { signal: ctrl.signal })
    window.clearTimeout(t)
    if (!res.ok) throw new Error('viacep')
    const data = (await res.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string }
    if (data.erro) return null
    return { cep: d, street: data.logradouro ?? '', district: data.bairro ?? '', city: data.localidade ?? '', uf: data.uf ?? uf ?? '' }
  } catch {
    return uf ? { cep: d, uf } : null
  }
}
