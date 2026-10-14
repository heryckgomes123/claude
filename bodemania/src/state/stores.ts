/**
 * Tipos e stores globais da loja (sem lógica de backend — ela mora em src/api).
 * Em modo local tudo é persistido no navegador; no modo Supabase só o carrinho, favoritos e preferências.
 */
import type { ArtKey } from '../components/ProductArt'
import type { Product } from '../data/catalog'
import type { Address, CouponInfo, PaymentMethod, ShippingOption } from '../../supabase/functions/_shared/types'
import { BACKEND } from '../config/env'
import { uid } from '../lib/format'
import { createStore } from './createStore'

export type { Address, CouponInfo, PaymentMethod, ShippingOption }

// ───────────────────────── Tipos ─────────────────────────

/** Parâmetros do orçamento de impressão 3D — o servidor recalcula o preço a partir deles. */
export type PrintParams = {
  fileName?: string
  manual?: { x: number; y: number; z: number; fill: number }
  scale: number
  material: string
  quality: string
  infill: number
  color: string
}

export type CartItem = {
  key: string
  productId: string
  qty: number
  options: Record<string, string>
  personalization?: string
  /** miniatura (dataURL) da foto enviada pelo cliente */
  photo?: string
  /** item de impressão 3D sob demanda (orçamento) */
  custom?: { title: string; details: string[]; unitPrice: number; weight: number; leadDays: number; color: string; print: PrintParams; hasFile?: boolean }
}

export type SavedAddress = Address & { id: string; label: string; recipient: string }

export type User = {
  id: string
  name: string
  email: string
  cpf: string
  phone: string
  /** só no modo demonstração */
  passHash?: string
  createdAt: string
  addresses: SavedAddress[]
  newsletter: boolean
  role: 'customer' | 'admin'
}

export type OrderStatus = 'aguardando' | 'pago' | 'producao' | 'enviado' | 'entregue' | 'cancelado'

export type OrderItem = {
  productId: string
  name: string
  art: ArtKey
  color?: string
  universe: 'maconaria' | '3d'
  kind: Product['kind']
  unitPrice: number
  qty: number
  variant: string[]
  personalization?: string
  photo?: string
  /** orçamento 3D: dados do arquivo (para a equipe imprimir) */
  print?: Record<string, unknown>
}

export type Order = {
  id: string
  userId: string
  createdAt: string
  items: OrderItem[]
  subtotal: number
  discount: number
  pixDiscount: number
  shipping: number
  total: number
  coupon?: string
  payment: {
    method: PaymentMethod
    installments?: number
    brand?: string
    last4?: string
    pixCode?: string
    boletoLine?: string
    boletoUrl?: string
    ticketUrl?: string
    paidAt?: string
  }
  customer: { name: string; email: string; cpf: string; phone: string }
  address?: SavedAddress
  shippingOption: ShippingOption
  leadDays: number
  estimate: string
  status: OrderStatus
  history: { status: OrderStatus; at: string; note: string }[]
  tracking?: string
  notes?: string
  digitalOnly: boolean
  expiresAt?: string
}

// ───────────────────────── Stores ─────────────────────────

const persistDb = BACKEND === 'local'

export const cartStore = createStore({ items: [] as CartItem[], coupon: '' as string, couponInfo: null as CouponInfo | null, couponError: '' as string }, 'bm.cart')
/** Modo demo: todos os usuários e pedidos. Modo Supabase: só o usuário logado e os pedidos que ele pode ver. */
export const dbStore = createStore({ users: [] as User[], orders: [] as Order[] }, persistDb ? 'bm.db' : undefined)
export const sessionStore = createStore({ userId: '' as string, ready: BACKEND === 'local' }, persistDb ? 'bm.session' : undefined)
export const favStore = createStore({ ids: [] as string[] }, 'bm.favs')
export const prefsStore = createStore({ cookies: '' as '' | 'all' | 'essential', cep: '' as string }, 'bm.prefs')
export const uiStore = createStore({ cartOpen: false, menuOpen: false, searchOpen: false, toasts: [] as { id: string; text: string; tone: 'ok' | 'err' | 'info' }[] })

// ───────────────────────── UI ─────────────────────────

export function toast(text: string, tone: 'ok' | 'err' | 'info' = 'ok') {
  const id = uid()
  uiStore.set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }))
  window.setTimeout(() => uiStore.set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3600)
}
export const openCart = () => uiStore.set({ cartOpen: true })
export const closeCart = () => uiStore.set({ cartOpen: false })
