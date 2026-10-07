/**
 * Backend de demonstração: tudo no navegador (localStorage). É o que roda no arquivo único de testes
 * e sempre que VITE_SUPABASE_URL não está definida. Nada aqui é seguro nem compartilhado entre aparelhos.
 */
import { COUPONS, PIX_KEY, STORE } from '../config/store'
import { productById } from '../data/catalog'
import { demoHash, uid, onlyDigits } from '../lib/format'
import { pixPayload } from '../lib/pix'
import { universeOfCategory } from '../../supabase/functions/_shared/categories'
import { lookupCep, quoteShipping } from '../lib/shipping'
import { cardBrand } from '../lib/validate'
import { itemColor, unitPrice, variantLabels } from '../state/cart'
import { dbStore, sessionStore, toast, type Order, type OrderItem, type OrderStatus, type SavedAddress, type User } from '../state/stores'
import { UserFacingError, type Backend } from './types'

const NOTES: Record<OrderStatus, string> = {
  aguardando: 'Pedido recebido. Aguardando a confirmação do pagamento.',
  pago: 'Pagamento confirmado! Seu pedido já entrou na fila.',
  producao: 'Seu pedido está sendo produzido e conferido peça a peça.',
  enviado: 'Pedido despachado.',
  entregue: 'Pedido entregue. Obrigado por comprar na Bodemania!',
  cancelado: 'Pedido cancelado.',
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const me = () => dbStore.get().users.find((u) => u.id === sessionStore.get().userId)
const patchUser = (id: string, patch: Partial<User>) => dbStore.set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }))

function setOrderStatus(id: string, status: OrderStatus, note?: string) {
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

export const localBackend: Backend = {
  mode: 'local',
  async init() {},
  async reloadCatalog() {},

  auth: {
    async register(data) {
      const email = data.email.trim().toLowerCase()
      if (dbStore.get().users.some((u) => u.email === email)) throw new UserFacingError('Já existe uma conta com este e-mail. Que tal entrar?')
      const user: User = {
        id: uid('u'), name: data.name.trim(), email, cpf: data.cpf, phone: data.phone, passHash: demoHash(email + ':' + data.password),
        createdAt: new Date().toISOString(), addresses: [], newsletter: data.newsletter, role: 'customer',
      }
      dbStore.set((s) => ({ users: [...s.users, user] }))
      sessionStore.set({ userId: user.id })
      return { needsConfirmation: false }
    },
    async login(emailRaw, password) {
      const email = emailRaw.trim().toLowerCase()
      const user = dbStore.get().users.find((u) => u.email === email)
      if (!user || user.passHash !== demoHash(email + ':' + password)) throw new UserFacingError('E-mail ou senha incorretos.')
      sessionStore.set({ userId: user.id })
    },
    async logout() {
      sessionStore.set({ userId: '' })
    },
    async resetPassword() {
      toast('Na versão final, enviaremos um link de redefinição para o seu e-mail.', 'info')
    },
    async updatePassword() {},
    async updateProfile(patch) {
      const u = me()
      if (u) patchUser(u.id, patch)
    },
    async saveAddress(address) {
      const u = me()
      if (!u) throw new UserFacingError('Entre na sua conta.')
      const exists = u.addresses.some((a) => a.id === address.id)
      patchUser(u.id, { addresses: exists ? u.addresses.map((a) => (a.id === address.id ? address : a)) : [...u.addresses, address] })
      return address
    },
    async removeAddress(id) {
      const u = me()
      if (u) patchUser(u.id, { addresses: u.addresses.filter((a) => a.id !== id) })
    },
  },

  coupons: {
    async check(codeRaw, subtotal) {
      const code = codeRaw.trim().toUpperCase()
      const c = COUPONS[code]
      if (!c) return { ok: false, error: 'Cupom inválido ou expirado.' }
      if (c.min && subtotal < c.min) return { ok: false, error: `Válido para pedidos a partir de R$ ${c.min}.` }
      return { ok: true, coupon: { code, label: c.label, percent: c.percent ?? null, amount: c.amount ?? null, freeShipping: !!c.freeShipping, min: c.min ?? null } }
    },
  },

  shipping: {
    async quote({ cep, uf, goods, weight, coupon }) {
      const dest = uf ?? (await lookupCep(cep))?.uf
      if (!dest) throw new UserFacingError('CEP não encontrado. Confira os números.')
      return { options: quoteShipping(dest, weight, goods, !!coupon?.freeShipping), source: 'tabela' }
    },
  },

  orders: {
    async create(input) {
      const { method, totals } = input
      await sleep(method === 'card' ? 1600 : 700)
      if (method === 'card' && onlyDigits(input.card?.number ?? '').endsWith('0002')) {
        throw new UserFacingError('Pagamento recusado pela operadora. Confira os dados ou tente outro cartão / Pix.', 'card_rejected')
      }
      const now = new Date().toISOString()
      const n = dbStore.get().orders.length + 1
      const id = `BM-${(1040 + n).toString()}${Math.floor(Math.random() * 9)}`
      const items: OrderItem[] = input.items.map((i) => {
        const p = productById(i.productId)
        return {
          productId: i.productId, name: i.custom?.title ?? p?.name ?? 'Produto', art: p?.art ?? 'servico', color: itemColor(i), universe: p ? universeOfCategory(p.category) : '3d',
          kind: i.custom ? 'physical' : (p?.kind ?? 'physical'), unitPrice: unitPrice(i), qty: i.qty, variant: variantLabels(i), personalization: i.personalization, photo: i.photo,
        }
      })
      const paid = method === 'card'
      const estimate = new Date(Date.now() + (input.leadDays + input.shipping.days + (method === 'boleto' ? 2 : 0)) * 1.4 * 86_400_000).toISOString()
      const order: Order = {
        id, userId: input.user.id, createdAt: now, items, subtotal: totals.subtotal, discount: totals.discount, pixDiscount: totals.pixDiscount, shipping: totals.shipping, total: totals.total,
        coupon: input.coupon?.code,
        payment:
          method === 'pix' ? { method, pixCode: pixPayload({ key: PIX_KEY, name: STORE.name, city: 'SAO PAULO', amount: totals.total, txid: id.replace('-', '') }) }
          : method === 'card' ? { method, installments: input.card?.installments, brand: cardBrand(input.card?.number ?? ''), last4: onlyDigits(input.card?.number ?? '').slice(-4), paidAt: now }
          : { method, boletoLine: `34191.${uid().slice(0, 5)} 12345.678901 12345.678901 1 ${String(Math.round(totals.total * 100)).padStart(14, '0')}` },
        customer: { name: input.user.name, email: input.user.email, cpf: input.user.cpf, phone: input.user.phone },
        address: input.address, shippingOption: input.shipping, leadDays: input.leadDays, estimate, status: paid ? 'pago' : 'aguardando',
        history: [{ status: 'aguardando', at: now, note: NOTES.aguardando }, ...(paid ? [{ status: 'pago' as const, at: now, note: NOTES.pago }] : [])],
        notes: input.notes, digitalOnly: input.digitalOnly,
      }
      dbStore.set((s) => ({ orders: [order, ...s.orders] }))
      return { orderId: id }
    },
    async refresh() {},
    async loadMine() {},
  },

  admin: {
    async loadOrders() {},
    async setStatus({ orderId, status, note }) {
      setOrderStatus(orderId, status, note)
    },
    async loadProducts() {
      return []
    },
    async saveProduct() {
      throw new UserFacingError('Edição de produtos só está disponível com o banco de dados ligado.')
    },
    async createProduct() {
      throw new UserFacingError('Cadastro de produtos só está disponível com o banco de dados ligado.')
    },
    async uploadProductImages() {
      return []
    },
    async loadCoupons() {
      return []
    },
    async saveCoupon() {},
    async signedUrl() {
      throw new UserFacingError('Arquivos de clientes só existem com o banco de dados ligado.')
    },
    async loadCustomers() {
      return dbStore.get().users.map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, createdAt: u.createdAt }))
    },
  },
}

export type { SavedAddress }
