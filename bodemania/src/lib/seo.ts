/** Título, descrição, Open Graph e dados estruturados (JSON-LD) da página atual. */
import { STORE } from '../config/store'
import { ROUTER } from '../config/env'

const DEFAULT_TITLE = 'Bodemania — Artigos maçônicos & impressão 3D'
const DEFAULT_DESC = 'Aventais, paramentos, joias e presentes maçônicos + ateliê de impressão 3D com orçamento instantâneo. Frete grátis acima de R$ 299, 5% off no Pix e até 6x sem juros.'

function meta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

export function setPageMeta(opts: { title?: string; description?: string; image?: string; path?: string; jsonLd?: object | null }) {
  const title = opts.title ? `${opts.title} · Bodemania` : DEFAULT_TITLE
  const description = opts.description ?? DEFAULT_DESC
  document.title = title
  meta('name', 'description', description)
  meta('property', 'og:title', title)
  meta('property', 'og:description', description)
  meta('name', 'twitter:title', title)
  meta('name', 'twitter:description', description)
  if (opts.image) {
    meta('property', 'og:image', opts.image)
    meta('name', 'twitter:image', opts.image)
  }
  if (ROUTER === 'history') {
    const url = `${STORE.url.replace(/\/$/, '')}${opts.path ?? window.location.pathname}`
    meta('property', 'og:url', url)
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = url
  }
  document.head.querySelector('script#ld-page')?.remove()
  if (opts.jsonLd) {
    const s = document.createElement('script')
    s.type = 'application/ld+json'
    s.id = 'ld-page'
    s.textContent = JSON.stringify(opts.jsonLd)
    document.head.appendChild(s)
  }
}
