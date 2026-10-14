/** Google Analytics 4 — só carrega se houver VITE_GA_ID e o cliente aceitou os cookies de medição. */
import { GA_ID } from '../config/env'
import { prefsStore, type Order } from '../state/stores'

type Gtag = (...args: unknown[]) => void
declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
  }
}

let loaded = false

function load() {
  if (loaded || !GA_ID || prefsStore.get().cookies !== 'all') return
  loaded = true
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, { anonymize_ip: true, send_page_view: false })
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`
  document.head.appendChild(s)
}

export function initAnalytics() {
  prefsStore.subscribe(load)
  load()
}

export const trackPage = (path: string) => loaded && window.gtag?.('event', 'page_view', { page_path: path })

/** Registra a compra uma única vez por pedido (mesmo se a página for recarregada). */
export function trackPurchase(order: Order) {
  if (!loaded) return
  const key = `bm.ga.${order.id}`
  try {
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    /* sem sessionStorage: aceita o risco de contar duas vezes */
  }
  window.gtag?.('event', 'purchase', {
    transaction_id: order.id,
    value: order.total,
    currency: 'BRL',
    shipping: order.shipping,
    coupon: order.coupon,
    items: order.items.map((i) => ({ item_id: i.productId, item_name: i.name, price: i.unitPrice, quantity: i.qty })),
  })
}
