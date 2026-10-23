import { useSyncExternalStore } from 'react'

/** Store mínima (estilo zustand) com persistência opcional em localStorage. */
export function createStore<T>(initial: T, persistKey?: string) {
  let state = initial
  if (persistKey) {
    try {
      const raw = localStorage.getItem(persistKey)
      if (raw) state = { ...initial, ...JSON.parse(raw) }
    } catch {
      /* navegação privada / storage bloqueado — segue em memória */
    }
  }
  const listeners = new Set<() => void>()

  const get = () => state
  const set = (next: Partial<T> | ((s: T) => Partial<T>)) => {
    const patch = typeof next === 'function' ? (next as (s: T) => Partial<T>)(state) : next
    state = { ...state, ...patch }
    if (persistKey) {
      try {
        localStorage.setItem(persistKey, JSON.stringify(state))
      } catch {
        /* cota cheia ou storage bloqueado */
      }
    }
    listeners.forEach((l) => l())
  }
  const subscribe = (l: () => void) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }
  function use(): T
  function use<S>(selector: (s: T) => S): S
  function use<S>(selector?: (s: T) => S) {
    return useSyncExternalStore(subscribe, () => (selector ? selector(state) : state))
  }

  // Mantém abas abertas sincronizadas
  if (persistKey && typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== persistKey || !e.newValue) return
      try {
        state = { ...initial, ...JSON.parse(e.newValue) }
        listeners.forEach((l) => l())
      } catch {
        /* ignora */
      }
    })
  }

  return { get, set, subscribe, use }
}
