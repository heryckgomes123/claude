/** Conversão entre as linhas do banco (snake_case) e os tipos do site. Funções puras, testadas em tests/unit/mapping.test.ts. */
import type { ArtKey } from '../components/ProductArt'
import type { Product } from '../data/catalog'
import { onlyDigits } from '../lib/format'
import { maskCPF, maskPhone } from '../lib/masks'
import type { Order, OrderItem, SavedAddress, User } from '../state/stores'

type Row = Record<string, any>

export function productFromRow(r: Row): Product {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    category: r.category,
    price: Number(r.price),
    compareAt: r.compare_at != null ? Number(r.compare_at) : undefined,
    short: r.short ?? '',
    description: r.description ?? [],
    highlights: r.highlights ?? [],
    specs: r.specs ?? [],
    art: (r.art ?? 'servico') as ArtKey,
    tone: r.tone ?? undefined,
    badge: r.badge ?? undefined,
    kind: r.kind,
    weight: Number(r.weight ?? 0),
    leadDays: r.lead_days ?? 1,
    stock: r.stock ?? undefined,
    options: r.options?.length ? r.options : undefined,
    personalization: r.personalization ?? undefined,
    photoUpload: r.photo_upload ?? undefined,
    tags: r.tags ?? [],
    href: r.href ?? undefined,
    priceFrom: r.price_from || undefined,
    images: r.images?.length ? r.images : undefined,
    active: r.active,
    dims: { widthCm: Number(r.width_cm ?? 16), heightCm: Number(r.height_cm ?? 6), lengthCm: Number(r.length_cm ?? 22) },
  }
}

/** Só inclui os campos informados (para `update` parcial). */
export function productToRow(p: Partial<Product>): Row {
  const m: Record<string, [string, (v: any) => unknown]> = {
    name: ['name', (v) => v], slug: ['slug', (v) => v], category: ['category', (v) => v], price: ['price', (v) => v],
    compareAt: ['compare_at', (v) => v ?? null], short: ['short', (v) => v ?? ''], description: ['description', (v) => v ?? []],
    highlights: ['highlights', (v) => v ?? []], specs: ['specs', (v) => v ?? []], art: ['art', (v) => v], tone: ['tone', (v) => v ?? null],
    badge: ['badge', (v) => v ?? null], kind: ['kind', (v) => v], weight: ['weight', (v) => v], leadDays: ['lead_days', (v) => v],
    stock: ['stock', (v) => v ?? null], options: ['options', (v) => v ?? []], personalization: ['personalization', (v) => v ?? null],
    photoUpload: ['photo_upload', (v) => v ?? null], tags: ['tags', (v) => v ?? []], href: ['href', (v) => v ?? null],
    priceFrom: ['price_from', (v) => !!v], images: ['images', (v) => v ?? []], active: ['active', (v) => !!v],
  }
  const row: Row = {}
  for (const [k, v] of Object.entries(p)) {
    if (k === 'dims' && v) {
      const d = v as NonNullable<Product['dims']>
      Object.assign(row, { width_cm: d.widthCm, height_cm: d.heightCm, length_cm: d.lengthCm })
    } else if (m[k]) row[m[k][0]] = m[k][1](v)
  }
  return row
}

export function slugify(name: string) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'produto'
}

export const addressFromRow = (r: Row): SavedAddress => ({
  id: r.id, label: r.label, recipient: r.recipient, cep: r.cep, street: r.street, number: r.number, complement: r.complement ?? '', district: r.district, city: r.city, uf: r.uf,
})

export function userFromRows(profile: Row, addresses: Row[]): User {
  return {
    id: profile.id, name: profile.name, email: profile.email, cpf: maskCPF(profile.cpf ?? ''), phone: maskPhone(profile.phone ?? ''), newsletter: profile.newsletter,
    createdAt: profile.created_at, role: profile.role, addresses: addresses.map(addressFromRow),
  }
}

export function orderFromRow(r: Row, signedPhotos: Record<string, string> = {}): Order {
  const events: Row[] = [...(r.events ?? [])].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  const pay = r.payment ?? {}
  const a = r.address as Row | null
  return {
    id: r.id,
    userId: r.user_id ?? '',
    createdAt: r.created_at,
    items: (r.items ?? []).map(
      (i: Row): OrderItem => ({
        productId: i.product_id, name: i.name, art: (i.art ?? 'servico') as ArtKey, color: i.color ?? undefined, universe: i.universe, kind: i.kind,
        unitPrice: Number(i.unit_price), qty: i.qty, variant: i.variant ?? [], personalization: i.personalization ?? undefined,
        photo: i.photo_path ? signedPhotos[i.photo_path] : undefined, print: i.print ?? undefined,
      }),
    ),
    subtotal: Number(r.subtotal),
    discount: Number(r.discount),
    pixDiscount: Number(r.pix_discount),
    shipping: Number(r.shipping),
    total: Number(r.total),
    coupon: r.coupon ?? undefined,
    payment: {
      method: pay.method, installments: pay.installments, pixCode: pay.pixCode, boletoLine: pay.boletoLine, boletoUrl: pay.boletoUrl, ticketUrl: pay.ticketUrl,
      paidAt: r.paid_at ?? undefined,
    },
    customer: { ...r.customer, cpf: maskCPF(r.customer?.cpf ?? ''), phone: maskPhone(r.customer?.phone ?? '') },
    address: a ? { id: '', label: a.label ?? '', recipient: a.recipient ?? r.customer?.name ?? '', cep: a.cep, street: a.street, number: a.number, complement: a.complement ?? '', district: a.district, city: a.city, uf: a.uf } : undefined,
    shippingOption: r.shipping_option,
    leadDays: r.lead_days ?? 0,
    estimate: r.estimate ?? r.created_at,
    status: r.status,
    history: events.map((e) => ({ status: e.status, at: e.at, note: e.note })),
    tracking: r.tracking ?? undefined,
    notes: r.notes ?? undefined,
    digitalOnly: !!r.digital_only,
    expiresAt: r.expires_at ?? undefined,
  }
}

export const digits = onlyDigits
