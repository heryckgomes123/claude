/** Backend de produção: Supabase (login, banco, arquivos) + Edge Functions (pedido, pagamento, frete). */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/env'
import { catalogStore, type Product } from '../data/catalog'
import { getFile, deleteFile } from '../lib/blobStore'
import { resizeImage } from '../lib/image'
import { onlyDigits, uid } from '../lib/format'
import { dbStore, sessionStore, toast, type Order, type SavedAddress, type User } from '../state/stores'
import { addressFromRow, orderFromRow, productFromRow, productToRow, slugify, userFromRows } from './mapping'
import { tokenizeCard } from './mp'
import { UserFacingError, type AdminCoupon, type Backend } from './types'

let client: SupabaseClient | null = null
export const sb = (): SupabaseClient =>
  (client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }))

const ORDER_SELECT = '*, items:order_items(*), events:order_events(status,note,at)'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Chama uma Edge Function e converte os erros dela em mensagens para o cliente. */
async function callFn<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await sb().functions.invoke(name, { body: body as Record<string, unknown> })
  if (!error) return data as T
  const ctx = (error as { context?: Response }).context
  if (ctx && typeof ctx.json === 'function') {
    try {
      const j = (await ctx.json()) as { error?: { code?: string; message?: string; detail?: string } }
      if (j.error?.message) throw new UserFacingError(j.error.message, j.error.code, j.error.detail)
    } catch (e) {
      if (e instanceof UserFacingError) throw e
    }
  }
  throw new UserFacingError('Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.', 'network')
}

const authMessage = (e: { code?: string; message: string }) => {
  switch (e.code) {
    case 'invalid_credentials': return 'E-mail ou senha incorretos.'
    case 'email_not_confirmed': return 'Confirme seu e-mail antes de entrar: enviamos um link para a sua caixa de entrada.'
    case 'user_already_exists': case 'email_exists': return 'Já existe uma conta com este e-mail. Que tal entrar?'
    case 'weak_password': return 'Senha fraca. Use pelo menos 8 caracteres, com letras e números.'
    case 'over_request_rate_limit': case 'over_email_send_rate_limit': return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
    case 'same_password': return 'A nova senha precisa ser diferente da atual.'
    default: return 'Não foi possível concluir. Tente novamente.'
  }
}

async function loadProfile() {
  const { data: auth } = await sb().auth.getUser()
  const uidNow = auth.user?.id
  if (!uidNow) {
    dbStore.set({ users: [], orders: [] })
    sessionStore.set({ userId: '' })
    return
  }
  const [profile, addresses] = await Promise.all([
    sb().from('profiles').select('*').eq('id', uidNow).maybeSingle(),
    sb().from('addresses').select('*').eq('user_id', uidNow).order('created_at'),
  ])
  if (!profile.data) return
  const user = userFromRows(profile.data, addresses.data ?? [])
  dbStore.set((s) => ({ users: [user], orders: s.orders.filter((o) => o.userId === user.id) }))
  sessionStore.set({ userId: user.id })
}

async function signPhotos(rows: Record<string, any>[]) {
  const paths = rows.flatMap((r) => (r.items ?? []).map((i: any) => i.photo_path as string | null)).filter(Boolean) as string[]
  if (!paths.length) return {}
  const { data } = await sb().storage.from('order-uploads').createSignedUrls(paths, 3600)
  return Object.fromEntries((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path as string, d.signedUrl])) as Record<string, string>
}

async function fetchOrders(query: PromiseLike<{ data: Record<string, any>[] | null; error: unknown }>) {
  const { data, error } = await query
  if (error) throw new UserFacingError('Não foi possível carregar os pedidos. Tente de novo.')
  const rows = data ?? []
  const signed = await signPhotos(rows)
  const orders: Order[] = rows.map((r) => orderFromRow(r, signed))
  dbStore.set((s) => ({ orders: [...orders, ...s.orders.filter((o) => !orders.some((n) => n.id === o.id))].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }))
}

async function loadCatalog() {
  catalogStore.set({ status: 'loading' })
  const { data, error } = await sb().from('products').select('*').order('sort').order('name')
  if (error) return catalogStore.set({ status: 'error' })
  // a vitrine só mostra produtos ativos (administradores recebem também os inativos pelo RLS)
  catalogStore.set({ products: (data ?? []).map(productFromRow).filter((p) => p.active !== false), status: 'ready' })
}

async function upload(bucket: string, path: string, blob: Blob, contentType: string) {
  const { error } = await sb().storage.from(bucket).upload(path, blob, { contentType, upsert: false })
  if (error) throw new UserFacingError('Não foi possível enviar o arquivo. Verifique a conexão e tente de novo.', 'upload')
}

const dataUrlToBlob = async (url: string) => (await fetch(url)).blob()

export const supabaseBackend: Backend = {
  mode: 'supabase',

  async init() {
    sb().auth.onAuthStateChange((event) => {
      // não chamar o Supabase direto aqui dentro (trava); agenda para depois
      setTimeout(() => {
        if (event === 'SIGNED_OUT') {
          dbStore.set({ users: [], orders: [] })
          sessionStore.set({ userId: '' })
        } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') void loadProfile()
      }, 0)
    })
    try {
      await Promise.all([loadCatalog(), loadProfile().catch(() => undefined)])
    } finally {
      sessionStore.set({ ready: true }) // mesmo se algo falhar, a interface não fica presa em "carregando"
    }
  },

  async reloadCatalog() {
    await loadCatalog()
  },

  auth: {
    async register(d) {
      const { data, error } = await sb().auth.signUp({
        email: d.email.trim().toLowerCase(),
        password: d.password,
        options: { data: { name: d.name.trim(), cpf: onlyDigits(d.cpf), phone: onlyDigits(d.phone), newsletter: d.newsletter }, emailRedirectTo: window.location.origin },
      })
      if (error) throw new UserFacingError(authMessage(error), error.code)
      // com confirmação de e-mail ligada, e-mail já cadastrado volta "sucesso" sem identidades (proteção contra enumeração)
      if (data.user && data.user.identities?.length === 0) throw new UserFacingError('Já existe uma conta com este e-mail. Que tal entrar?', 'user_already_exists')
      if (!data.session) return { needsConfirmation: true }
      await loadProfile()
      return { needsConfirmation: false }
    },
    async login(email, password) {
      const { error } = await sb().auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      if (error) throw new UserFacingError(authMessage(error), error.code)
      await loadProfile()
    },
    async logout() {
      await sb().auth.signOut()
      dbStore.set({ users: [], orders: [] })
      sessionStore.set({ userId: '' })
    },
    async resetPassword(email) {
      const { error } = await sb().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/redefinir-senha` })
      if (error) throw new UserFacingError(authMessage(error), error.code)
    },
    async updatePassword(password) {
      const { error } = await sb().auth.updateUser({ password })
      if (error) throw new UserFacingError(authMessage(error), error.code)
    },
    async updateProfile(p) {
      const id = sessionStore.get().userId
      const { error } = await sb().from('profiles').update({ name: p.name.trim(), cpf: onlyDigits(p.cpf), phone: onlyDigits(p.phone), newsletter: p.newsletter }).eq('id', id)
      if (error) throw new UserFacingError('Não foi possível salvar. Tente de novo.')
      await loadProfile()
    },
    async saveAddress(a) {
      const userId = sessionStore.get().userId
      const row = { user_id: userId, label: a.label, recipient: a.recipient, cep: onlyDigits(a.cep), street: a.street, number: a.number, complement: a.complement ?? '', district: a.district, city: a.city, uf: a.uf }
      const q = UUID.test(a.id) ? sb().from('addresses').update(row).eq('id', a.id).select().single() : sb().from('addresses').insert(row).select().single()
      const { data, error } = await q
      if (error || !data) throw new UserFacingError('Não foi possível salvar o endereço. Confira os campos.')
      await loadProfile()
      return addressFromRow(data) as SavedAddress
    },
    async removeAddress(id) {
      const { error } = await sb().from('addresses').delete().eq('id', id)
      if (error) throw new UserFacingError('Não foi possível remover o endereço.')
      await loadProfile()
    },
  },

  coupons: {
    async check(code, subtotal) {
      const { data, error } = await sb().rpc('check_coupon', { p_code: code, p_subtotal: subtotal })
      if (error || !data) return { ok: false, error: 'Não foi possível validar o cupom agora.' }
      return data.ok ? { ok: true, coupon: { code: data.code, label: data.label, percent: data.percent, amount: data.amount, freeShipping: data.freeShipping, min: data.min } } : { ok: false, error: data.error }
    },
  },

  shipping: {
    async quote({ cep, items, coupon }) {
      return callFn('shipping-quote', {
        cep,
        coupon: coupon?.code,
        items: items.map((i) => ({
          productId: i.productId,
          qty: i.qty,
          custom: i.custom ? { weight: i.custom.weight, lengthCm: 20, widthCm: 15, heightCm: 10, unitPrice: i.custom.unitPrice } : undefined,
        })),
      })
    },
  },

  orders: {
    async create(input) {
      const userId = sessionStore.get().userId
      if (!userId) throw new UserFacingError('Entre na sua conta para comprar.', 'unauthorized')

      // 1) arquivos do cliente (foto do lithophane, STL) vão para a pasta privada dele
      const lines = []
      for (const i of input.items) {
        let photoPath: string | undefined
        let filePath: string | undefined
        if (i.photo) {
          photoPath = `${userId}/fotos/${uid()}.jpg`
          await upload('order-uploads', photoPath, await dataUrlToBlob(i.photo), 'image/jpeg')
        }
        if (i.custom?.hasFile) {
          const file = await getFile(i.key)
          if (!file) throw new UserFacingError('Não encontramos o arquivo STL deste item. Remova-o do carrinho e envie o arquivo de novo.', 'file_missing')
          filePath = `${userId}/stl/${uid()}.stl`
          await upload('order-uploads', filePath, file, 'model/stl')
        }
        lines.push({
          productId: i.productId, qty: i.qty, options: i.options, personalization: i.personalization, photoPath,
          print: i.custom ? { ...i.custom.print, filePath, fileName: i.custom.print.fileName } : undefined,
        })
      }

      // 2) cartão: vira token no Mercado Pago (o número nunca passa pelo nosso servidor)
      let card
      let deviceId: string | undefined
      if (input.method === 'card') {
        if (!input.card) throw new UserFacingError('Preencha os dados do cartão.')
        const t = await tokenizeCard({ number: input.card.number, name: input.card.name, expiry: input.card.expiry, cvv: input.card.cvv, cpf: input.user.cpf })
        card = { token: t.token, installments: input.card.installments, paymentMethodId: t.paymentMethodId, issuerId: t.issuerId }
        deviceId = t.deviceId
      }

      // 3) o servidor recalcula tudo e cobra
      const res = await callFn<{ orderId: string }>('create-order', {
        idempotencyKey: input.idempotencyKey,
        lines,
        addressId: input.address?.id,
        shippingId: input.shipping.id,
        coupon: input.coupon?.code,
        notes: input.notes,
        expectedTotal: input.totals.total,
        payment: { method: input.method, card, deviceId },
      })
      await Promise.allSettled(input.items.filter((i) => i.custom?.hasFile).map((i) => deleteFile(i.key)))
      await this.refresh(res.orderId)
      return { orderId: res.orderId }
    },
    async refresh(id) {
      await fetchOrders(sb().from('orders').select(ORDER_SELECT).eq('id', id))
    },
    async loadMine() {
      await fetchOrders(sb().from('orders').select(ORDER_SELECT).order('created_at', { ascending: false }).limit(100))
    },
  },

  admin: {
    async loadOrders() {
      await fetchOrders(sb().from('orders').select(ORDER_SELECT).order('created_at', { ascending: false }).limit(300))
    },
    async setStatus(input) {
      await callFn('admin-order', input)
      await this.loadOrders()
    },
    async loadProducts() {
      const { data, error } = await sb().from('products').select('*').order('sort').order('name')
      if (error) throw new UserFacingError('Não foi possível carregar os produtos.')
      return (data ?? []).map(productFromRow)
    },
    async saveProduct(p) {
      const { id, ...rest } = p
      const { error } = await sb().from('products').update(productToRow(rest)).eq('id', id)
      if (error) throw new UserFacingError(error.code === '23505' ? 'Já existe um produto com este endereço (slug).' : 'Não foi possível salvar o produto.')
      await loadCatalog()
    },
    async createProduct(p) {
      const id = `p${Date.now().toString(36)}`
      const row = productToRow({ art: 'servico', kind: 'physical', weight: 0.3, leadDays: 3, active: false, ...p, slug: p.slug || `${slugify(p.name)}-${id.slice(-4)}` })
      const { data, error } = await sb().from('products').insert({ id, ...row }).select().single()
      if (error || !data) throw new UserFacingError('Não foi possível criar o produto. Confira os campos.')
      await loadCatalog()
      return productFromRow(data)
    },
    async uploadProductImages(productId, files) {
      const urls: string[] = []
      for (const f of files) {
        const dataUrl = await resizeImage(f, 1600)
        const path = `${productId}/${uid()}.jpg`
        await upload('product-images', path, await dataUrlToBlob(dataUrl), 'image/jpeg')
        urls.push(sb().storage.from('product-images').getPublicUrl(path).data.publicUrl)
      }
      return urls
    },
    async loadCoupons() {
      const { data, error } = await sb().from('coupons').select('*').order('created_at', { ascending: false })
      if (error) throw new UserFacingError('Não foi possível carregar os cupons.')
      return (data ?? []).map(
        (c): AdminCoupon => ({
          code: c.code, label: c.label, percent: c.percent != null ? Number(c.percent) : null, amount: c.amount != null ? Number(c.amount) : null, freeShipping: c.free_shipping,
          minSubtotal: c.min_subtotal != null ? Number(c.min_subtotal) : null, maxUses: c.max_uses, uses: c.uses, expiresAt: c.expires_at, active: c.active,
        }),
      )
    },
    async saveCoupon(c) {
      const { error } = await sb().from('coupons').upsert({
        code: c.code.trim().toUpperCase(), label: c.label, percent: c.percent, amount: c.amount, free_shipping: c.freeShipping, min_subtotal: c.minSubtotal, max_uses: c.maxUses, expires_at: c.expiresAt, active: c.active,
      })
      if (error) throw new UserFacingError('Não foi possível salvar o cupom. Informe desconto % ou valor, ou frete grátis.')
    },
    async signedUrl(path) {
      const { data, error } = await sb().storage.from('order-uploads').createSignedUrl(path, 600)
      if (error || !data) throw new UserFacingError('Não foi possível abrir o arquivo.')
      return data.signedUrl
    },
    async loadCustomers() {
      const { data, error } = await sb().from('profiles').select('id,name,email,phone,created_at').order('created_at', { ascending: false }).limit(500)
      if (error) throw new UserFacingError('Não foi possível carregar os clientes.')
      return (data ?? []).map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, createdAt: u.created_at }))
    },
  },
}

export type { Product, User }
void toast
