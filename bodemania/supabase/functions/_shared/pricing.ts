import { round2 } from './money.ts'
import type { Personalization, ProductOption } from './types.ts'

export interface PricingProduct {
  price: number
  options?: ProductOption[] | null
  personalization?: Pick<Personalization, 'price'> | null
}

/** Preço de uma unidade: base + acréscimo das opções escolhidas + personalização (se preenchida). */
export function unitPriceOf(p: PricingProduct, options: Record<string, string>, personalization?: string): number {
  let price = p.price
  for (const opt of p.options ?? []) {
    price += opt.values.find((v) => v.id === options[opt.id])?.priceDelta ?? 0
  }
  if (personalization?.trim() && p.personalization) price += p.personalization.price
  return round2(price)
}

/** Confere se a escolha do cliente é possível para o produto. Devolve a mensagem de erro, ou null. */
export function selectionError(
  p: { name: string; options?: ProductOption[] | null; personalization?: Personalization | null; photoUpload?: { label: string; required: boolean } | null },
  options: Record<string, string>,
  personalization: string | undefined,
  hasPhoto: boolean,
): string | null {
  for (const opt of p.options ?? []) {
    const chosen = options?.[opt.id]
    if (!chosen || !opt.values.some((v) => v.id === chosen)) return `Escolha ${opt.label.toLowerCase()} em “${p.name}”.`
  }
  const text = personalization?.trim() ?? ''
  if (p.personalization) {
    if (p.personalization.required && !text) return `Preencha “${p.personalization.label}” em “${p.name}”.`
    if (text.length > p.personalization.maxLength) return `O texto de “${p.name}” passa de ${p.personalization.maxLength} caracteres.`
  } else if (text) {
    return `“${p.name}” não aceita personalização.`
  }
  if (p.photoUpload?.required && !hasPhoto) return `Envie a foto para “${p.name}”.`
  return null
}
