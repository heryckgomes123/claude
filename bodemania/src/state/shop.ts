/**
 * Fachada do estado da loja: o que os componentes importam.
 *  · stores e tipos           → ./stores
 *  · carrinho                 → ./cart
 *  · contas, pedidos, cupom   → chamadas ao backend ativo (src/api): Supabase em produção, navegador na demonstração
 */
import { RULES } from '../config/store'
import { api, UserFacingError } from '../api'
import { cartTotals } from './cart'
import { cartStore, dbStore, favStore, sessionStore, toast, type Order, type OrderStatus, type User } from './stores'

export * from './stores'
export * from './cart'

// ───────────────────────── Favoritos ─────────────────────────

export function toggleFav(id: string) {
  const has = favStore.get().ids.includes(id)
  favStore.set((s) => ({ ids: has ? s.ids.filter((x) => x !== id) : [...s.ids, id] }))
  toast(has ? 'Removido dos favoritos' : 'Salvo nos favoritos ♥', 'info')
}

// ───────────────────────── Contas ─────────────────────────

export function useUser(): User | null {
  const userId = sessionStore.use((s) => s.userId)
  const users = dbStore.use((s) => s.users)
  return users.find((u) => u.id === userId) ?? null
}
export const useSessionReady = () => sessionStore.use((s) => s.ready)
export const currentUser = () => dbStore.get().users.find((u) => u.id === sessionStore.get().userId) ?? null
export const isAdmin = (u: User | null) => u?.role === 'admin'

export const messageOf = (e: unknown, fallback = 'Algo deu errado. Tente novamente.') => (e instanceof UserFacingError ? e.message : e instanceof Error && e.message ? e.message : fallback)

export const register = (data: Parameters<typeof api.auth.register>[0]) => api.auth.register(data)
export const login = (email: string, password: string) => api.auth.login(email, password)
export async function logout() {
  await api.auth.logout()
  toast('Você saiu da sua conta.', 'info')
}
export const updateProfile = (patch: Parameters<typeof api.auth.updateProfile>[0]) => api.auth.updateProfile(patch)
export const saveAddress = (address: Parameters<typeof api.auth.saveAddress>[0]) => api.auth.saveAddress(address)
export const removeAddress = (id: string) => api.auth.removeAddress(id)

// ───────────────────────── Cupom ─────────────────────────

/** Valida o cupom no servidor e guarda no carrinho. Devolve a mensagem de erro, se houver. */
export async function applyCoupon(codeRaw: string): Promise<string | null> {
  const code = codeRaw.trim().toUpperCase()
  if (!code) {
    cartStore.set({ coupon: '', couponInfo: null, couponError: '' })
    return null
  }
  const { items } = cartStore.get()
  const subtotal = cartTotals(items, null).subtotal
  const r = await api.coupons.check(code, subtotal)
  if (r.ok) {
    cartStore.set({ coupon: r.coupon.code, couponInfo: r.coupon, couponError: '' })
    toast(`Cupom ${r.coupon.code} aplicado!`)
    return null
  }
  cartStore.set({ coupon: code, couponInfo: null, couponError: r.error })
  return r.error
}

export const removeCoupon = () => cartStore.set({ coupon: '', couponInfo: null, couponError: '' })

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

export const pixPrice = (total: number) => Math.round(total * (1 - RULES.pixDiscount) * 100) / 100

export { api }
