/**
 * Roteador com dois modos (VITE_ROUTER):
 *  · history → /loja, /p/avental  (site publicado: URLs limpas para Google e WhatsApp)
 *  · hash    → #/loja             (arquivo único aberto direto do disco, sem servidor)
 */
import { useEffect, useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'
import { ROUTER } from './config/env'

function read() {
  let raw: string
  if (ROUTER === 'hash') {
    // aceita também âncoras simples (#admin, #loja) — é o formato que links externos preservam
    const hash = window.location.hash.replace(/^#/, '')
    raw = hash ? (hash.startsWith('/') ? hash : '/' + hash) : '/'
  } else {
    raw = window.location.pathname + window.location.search
  }
  const [path, qs = ''] = raw.split('?')
  return { path: path.replace(/\/+$/, '') || '/', query: new URLSearchParams(qs), raw }
}

let current = read()
const listeners = new Set<() => void>()
const sync = () => {
  const next = read()
  if (next.raw === current.raw) return
  current = next
  listeners.forEach((l) => l())
}
window.addEventListener(ROUTER === 'hash' ? 'hashchange' : 'popstate', sync)

export function useRoute() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (ROUTER === 'hash') {
    if (opts.replace) window.location.replace('#' + to)
    else window.location.hash = to
    return
  }
  if (opts.replace) window.history.replaceState(null, '', to)
  else window.history.pushState(null, '', to)
  sync()
}

/** Compara o caminho atual com um padrão do tipo "/p/:slug". */
export function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean)
  const b = path.split('/').filter(Boolean)
  if (a.length !== b.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i])
    else if (a[i] !== b[i]) return null
  }
  return params
}

export const hrefFor = (to: string) => (ROUTER === 'hash' ? '#' + to : to)

export function Link({ to, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  return (
    <a
      href={hrefFor(to)}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e)
        if (ROUTER === 'hash' || e.defaultPrevented) return
        // deixa o navegador cuidar de Ctrl/Cmd+clique, botão do meio e "abrir em nova aba"
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || rest.target === '_blank') return
        e.preventDefault()
        navigate(to)
      }}
      {...rest}
    />
  )
}

/** Volta ao topo a cada troca de página. */
export function useScrollTop(key: string) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [key])
}
