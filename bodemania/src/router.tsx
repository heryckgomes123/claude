/**
 * Roteador por hash (#/loja, #/p/slug…). Funciona abrindo o HTML direto do disco
 * (file://), em qualquer hospedagem estática e sem configuração de servidor.
 */
import { useEffect, useSyncExternalStore, type AnchorHTMLAttributes } from 'react'

function read() {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [path, qs = ''] = raw.split('?')
  return { path: path.replace(/\/+$/, '') || '/', query: new URLSearchParams(qs), raw }
}

let current = read()
const listeners = new Set<() => void>()
window.addEventListener('hashchange', () => {
  current = read()
  listeners.forEach((l) => l())
})

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
  const target = '#' + to
  if (opts.replace) window.location.replace(target)
  else window.location.hash = to
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

export function Link({ to, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  return <a href={'#' + to} {...rest} />
}

/** Volta ao topo a cada troca de página. */
export function useScrollTop(key: string) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [key])
}
