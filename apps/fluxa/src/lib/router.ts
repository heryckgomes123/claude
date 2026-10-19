import { useSyncExternalStore } from 'react'

/** Roteamento por hash (#/automacoes/abc), sem dependências e compatível com hospedagem estática. */
function read(): string[] {
  return window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
}

let cache = read()
let cacheHash = window.location.hash

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

function snapshot(): string[] {
  if (window.location.hash !== cacheHash) {
    cacheHash = window.location.hash
    cache = read()
  }
  return cache
}

export function useRoute(): string[] {
  return useSyncExternalStore(subscribe, snapshot)
}

export function navigate(path: string): void {
  window.location.hash = path.startsWith('/') ? path : `/${path}`
}
