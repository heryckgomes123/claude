/**
 * Estado da loja. Nesta primeira versão tudo é guardado no navegador (localStorage),
 * simulando o backend — por isso o protótipo funciona como um único arquivo HTML.
 * As funções abaixo são o "contrato" que a API real vai cumprir depois
 * (ver README → "Indo para produção").
 */
import { COUPONS, RULES } from '../config/store'
import { productById, type Product } from '../data/catalog'
import type { ArtKey } from '../components/ProductArt'
import { demoHash, uid } from '../lib/format'
import type { Address, ShippingOption } from '../lib/shipping'
import { createStore } from './createStore'

// ───────────────────────── Tipos ─────────────────────────

export type CartItem = {
  key: string
  productId: string
  qty: number
  options: Record<string, string>
  personalization?: string
  /** miniatura (dataURL) da foto enviada pelo cliente */
  photo?: string
  /** item de impressão 3D sob demanda (orçamento) */
  custom?: { title: string; details: string[]; unitPrice: number; weight: number; leadDays: number; color: string }
}

export type SavedAddress = Address & { id: string; label: string; recipient: string }

export type User = {
  id: string
  name: string
  email: string
  cpf: string
  phone: string
  passHash: string
  createdAt: string
  addresses: SavedAddress[]
  newsletter: boolean
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
}

export type PaymentMethod = 'pix' | 'card' | 'boleto'

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
  payment: { method: PaymentMethod; installments?: number; brand?: string; last4?: string; pixCode?: string; boletoLine?: string; paidAt?: string }
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
}

// ───────────────────────── Stores ─────────────────────────

export const cartStore = createStore({ items: [] as CartItem[], coupon: '' as string }, 'bm.cart')
export const dbStore = createStore({ users: [] as User[], orders: [] as Order[] }, 'bm.db')
export const sessionStore = createStore({ userId: '' as string }, 'bm.session')
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

// ───────────────────────── Carrinho ─────────────────────────

export function unitPrice(item: CartItem) {
  if (item.custom) return item.custom.unitPrice
  const p = productById(item.productId)
  if (!p) return 0
  let price = p.price
  for (const opt of p.options ?? []) {
    const v = opt.values.find((x) => x.id === item.options[opt.id])
    price += v?.priceDelta ?? 0
  }
  if (item.personalization && p.personalization) price += p.personalization.price
  return price
}

export function variantLabels(item: CartItem): string[] {
  if (item.custom) return item.custom.details
  const p = productById(item.productId)
  if (!p) return []
  return (p.options ?? []).map((opt) => `${opt.label}: ${opt.values.find((v) => v.id === item.options[opt.id])?.label ?? '—'}`)
}

export function itemColor(item: CartItem): string | undefined {
  if (item.custom) return item.custom.color
  const p = productById(item.productId)
  if (!p) return undefined
  const opt = p.options?.find((o) => o.affectsArt)
  return opt?.values.find((v) => v.id === item.options[opt.id])?.hex ?? p.tone
}

export function addToCart(input: Omit<CartItem, 'key'>) {
  const key = input.custom
    ? uid('c')
    : [input.productId, ...Object.entries(input.options).map(([k, v]) => `${k}=${v}`), input.personalization ?? '', input.photo ? uid() : ''].join('|')
  cartStore.set((s) => {
    const existing = s.items.find((i) => i.key === key)
    if (existing) return { items: s.items.map((i) => (i.key === key ? { ...i, qty: Math.min(99, i.qty + input.qty) } : i)) }
    return { items: [...s.items, { ...input, key }] }
  })
}

export const setQty = (key: string, qty: number) =>
  cartStore.set((s) => ({ items: qty <= 0 ? s.items.filter((i) => i.key !== key) : s.items.map((i) => (i.key === key ? { ...i, qty: Math.min(99, qty) } : i)) }))

export const removeFromCart = (key: string) => cartStore.set((s) => ({ items: s.items.filter((i) => i.key !== key) }))

export const clearCart = () => cartStore.set({ items: [], coupon: '' })

export type Totals = {
  count: number
  subtotal: number
  discount: number
  couponLabel?: string
  couponError?: string
  freeShippingCoupon: boolean
  weight: number
  leadDays: number
  digitalOnly: boolean
}

export function cartTotals(items: CartItem[], coupon: string): Totals {
  let subtotal = 0
  let weight = 0
  let leadDays = 0
  let count = 0
  let digitalOnly = items.length > 0
  for (const i of items) {
    const p = productById(i.productId)
    subtotal += unitPrice(i) * i.qty
    count += i.qty
    weight += (i.custom?.weight ?? p?.weight ?? 0) * i.qty
    leadDays = Math.max(leadDays, i.custom?.leadDays ?? p?.leadDays ?? 0)
    if (i.custom || p?.kind === 'physical') digitalOnly = false
  }
  const c = coupon ? COUPONS[coupon] : undefined
  let discount = 0
  let couponError: string | undefined
  if (coupon && !c) couponError = 'Cupom inválido ou expirado.'
  else if (c && c.min && subtotal < c.min) couponError = `Válido para pedidos a partir de R$ ${c.min}.`
  else if (c) discount = c.percent ? subtotal * c.percent : (c.amount ?? 0)
  return {
    count,
    subtotal,
    discount: Math.round(discount * 100) / 100,
    couponLabel: c && !couponError ? c.label : undefined,
    couponError,
    freeShippingCoupon: !!(c?.freeShipping && !couponError),
    weight,
    leadDays,
    digitalOnly,
  }
}

export function useCart() {
  const { items, coupon } = cartStore.use()
  return { items, coupon, totals: cartTotals(items, coupon) }
}

// ───────────────────────── Favoritos ─────────────────────────

export function toggleFav(id: string) {
  const has = favStore.get().ids.includes(id)
  favStore.set((s) => ({ ids: has ? s.ids.filter((x) => x !== id) : [...s.ids, id] }))
  toast(has ? 'Removido dos favoritos' : 'Salvo nos favoritos ♥', 'info')
}

// ───────────────────────── Contas ─────────────────────────

export function useUser() {
  const userId = sessionStore.use((s) => s.userId)
  const users = dbStore.use((s) => s.users)
  return users.find((u) => u.id === userId) ?? null
}
export const currentUser = () => dbStore.get().users.find((u) => u.id === sessionStore.get().userId) ?? null

export function register(data: { name: string; email: string; cpf: string; phone: string; password: string; newsletter: boolean }) {
  const email = data.email.trim().toLowerCase()
  if (dbStore.get().users.some((u) => u.email === email)) throw new Error('Já existe uma conta com este e-mail. Que tal entrar?')
  const user: User = {
    id: uid('u'),
    name: data.name.trim(),
    email,
    cpf: data.cpf,
    phone: data.phone,
    passHash: demoHash(email + ':' + data.password),
    createdAt: new Date().toISOString(),
    addresses: [],
    newsletter: data.newsletter,
  }
  dbStore.set((s) => ({ users: [...s.users, user] }))
  sessionStore.set({ userId: user.id })
  return user
}

export function login(emailRaw: string, password: string) {
  const email = emailRaw.trim().toLowerCase()
  const user = dbStore.get().users.find((u) => u.email === email)
  if (!user || user.passHash !== demoHash(email + ':' + password)) throw new Error('E-mail ou senha incorretos.')
  sessionStore.set({ userId: user.id })
  return user
}

export function logout() {
  sessionStore.set({ userId: '' })
  toast('Você saiu da sua conta.', 'info')
}

export function updateUser(id: string, patch: Partial<User>) {
  dbStore.set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }))
}

export function saveAddress(userId: string, address: SavedAddress) {
  dbStore.set((s) => ({
    users: s.users.map((u) => {
      if (u.id !== userId) return u
      const exists = u.addresses.some((a) => a.id === address.id)
      return { ...u, addresses: exists ? u.addresses.map((a) => (a.id === address.id ? address : a)) : [...u.addresses, address] }
    }),
  }))
}

export function removeAddress(userId: string, addressId: string) {
  dbStore.set((s) => ({ users: s.users.map((u) => (u.id === userId ? { ...u, addresses: u.addresses.filter((a) => a.id !== addressId) } : u)) }))
}

// ───────────────────────── Pedidos ─────────────────────────

export const STATUS_FLOW: OrderStatus[] = ['aguardando', 'pago', 'producao', 'enviado', 'entregue']

export const STATUS_INFO: Record<OrderStatus, { label: string; short: string; tone: string }> = {
  aguardando: { label: 'Aguardando pagamento', short: 'Aguardando', tone: 'bg-gold-100 text-gold-700' },
  pago: { label: 'Pagamento aprovado', short: 'Pago', tone: 'bg-navy-100 text-navy-700' },
  producao: { label: 'Em produção / separação', short: 'Em produção', tone: 'bg-filament-50 text-filament-600' },
  enviado: { label: 'Enviado', short: 'Enviado', tone: 'bg-navy-100 text-navy-700' },
  entregue: { label: 'Entregue', short: 'Entregue', tone: 'bg-ok-50 text-ok' },
  cancelado: { label: 'Cancelado', short: 'Cancelado', tone: 'bg-err-50 text-err' },
}

export function statusLabel(order: Order, status: OrderStatus) {
  if (order.digitalOnly) {
    if (status === 'producao') return 'Em desenvolvimento'
    if (status === 'enviado') return 'Prévia enviada para aprovação'
    if (status === 'entregue') return 'Arquivos entregues'
  }
  if (status === 'enviado' && order.shippingOption.id === 'pickup') return 'Pronto para retirada'
  if (status === 'entregue' && order.shippingOption.id === 'pickup') return 'Retirado'
  return STATUS_INFO[status].label
}

const NOTES: Record<OrderStatus, string> = {
  aguardando: 'Pedido recebido. Aguardando a confirmação do pagamento.',
  pago: 'Pagamento confirmado! Seu pedido já entrou na fila.',
  producao: 'Seu pedido está sendo produzido e conferido peça a peça.',
  enviado: 'Pedido despachado.',
  entregue: 'Pedido entregue. Obrigado por comprar na Bodemania!',
  cancelado: 'Pedido cancelado.',
}

function newOrderId() {
  const n = dbStore.get().orders.length + 1
  return `BM-${(1040 + n).toString()}${Math.floor(Math.random() * 9)}`
}

export function placeOrder(order: Omit<Order, 'id' | 'createdAt' | 'status' | 'history'>, paidNow: boolean) {
  const now = new Date().toISOString()
  const full: Order = {
    ...order,
    id: newOrderId(),
    createdAt: now,
    status: paidNow ? 'pago' : 'aguardando',
    history: [{ status: 'aguardando', at: now, note: NOTES.aguardando }, ...(paidNow ? [{ status: 'pago' as const, at: now, note: NOTES.pago }] : [])],
  }
  if (paidNow) full.payment = { ...full.payment, paidAt: now }
  dbStore.set((s) => ({ orders: [full, ...s.orders] }))
  return full
}

export function setOrderStatus(id: string, status: OrderStatus, note?: string) {
  const at = new Date().toISOString()
  dbStore.set((s) => ({
    orders: s.orders.map((o) => {
      if (o.id !== id) return o
      const patch: Partial<Order> = { status, history: [...o.history, { status, at, note: note ?? NOTES[status] }] }
      if (status === 'pago') patch.payment = { ...o.payment, paidAt: at }
      if (status === 'enviado' && !o.digitalOnly && o.shippingOption.id !== 'pickup' && !o.tracking)
        patch.tracking = `${o.shippingOption.id === 'sedex' ? 'SX' : 'PC'}${Math.floor(100000000 + Math.random() * 899999999)}BR`
      return { ...o, ...patch }
    }),
  }))
}

export function advanceOrder(id: string) {
  const o = dbStore.get().orders.find((x) => x.id === id)
  if (!o) return
  const i = STATUS_FLOW.indexOf(o.status)
  if (i >= 0 && i < STATUS_FLOW.length - 1) setOrderStatus(id, STATUS_FLOW[i + 1])
}

export const pixPrice = (total: number) => Math.round(total * (1 - RULES.pixDiscount) * 100) / 100
