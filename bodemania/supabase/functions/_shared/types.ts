/** Tipos compartilhados entre o site (Vite) e as Edge Functions (Deno). Sem dependências de DOM/Deno. */

export type ProductKind = 'physical' | 'digital' | 'service'

export interface OptionValue {
  id: string
  label: string
  priceDelta?: number
  hex?: string
}
export interface ProductOption {
  id: string
  label: string
  type: 'chips' | 'color'
  values: OptionValue[]
  affectsArt?: boolean
}
export interface Personalization {
  label: string
  placeholder: string
  maxLength: number
  price: number
  required?: boolean
}

/** O que o servidor precisa saber de um produto para precificar e enviar. */
export interface CatalogProduct {
  id: string
  slug: string
  name: string
  price: number
  kind: ProductKind
  weight: number
  leadDays: number
  stock: number | null
  active: boolean
  options: ProductOption[]
  personalization: Personalization | null
  photoUpload: { label: string; required: boolean } | null
  art: string
  tone?: string | null
  universe: 'maconaria' | '3d'
  widthCm: number
  heightCm: number
  lengthCm: number
}

export type ShippingId = 'pac' | 'sedex' | 'pickup' | 'digital'

export interface ShippingOption {
  id: ShippingId
  label: string
  detail: string
  price: number
  /** dias úteis de transporte (sem a produção) */
  days: number
}

export interface CouponInfo {
  code: string
  label: string
  percent?: number | null
  amount?: number | null
  freeShipping?: boolean | null
  min?: number | null
}

export type PaymentMethod = 'pix' | 'card' | 'boleto'

export interface Address {
  cep: string
  street: string
  number: string
  complement: string
  district: string
  city: string
  uf: string
}

export interface Totals {
  subtotal: number
  discount: number
  goods: number
  pixDiscount: number
  shipping: number
  total: number
}
