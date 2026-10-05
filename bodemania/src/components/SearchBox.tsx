import { useMemo, useRef, useState } from 'react'
import { PRODUCTS, categoryById, universeOf } from '../data/catalog'
import { money, normalize } from '../lib/format'
import { navigate } from '../router'
import { Search } from './Icons'
import ProductArt from './ProductArt'

export function searchProducts(q: string) {
  const terms = normalize(q).split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  return PRODUCTS.map((p) => {
    const hay = normalize([p.name, p.short, categoryById(p.category)?.name, ...p.tags].join(' '))
    const score = terms.reduce((s, t) => s + (hay.includes(t) ? (normalize(p.name).includes(t) ? 3 : 1) : -10), 0)
    return { p, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p)
}

export default function SearchBox({ autoFocus, onDone }: { autoFocus?: boolean; onDone?: () => void }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const results = useMemo(() => searchProducts(q).slice(0, 5), [q])
  const box = useRef<HTMLFormElement>(null)

  const go = (to: string) => {
    setOpen(false)
    setQ('')
    onDone?.()
    navigate(to)
  }

  return (
    <form
      ref={box}
      role="search"
      className="relative w-full"
      onSubmit={(e) => {
        e.preventDefault()
        if (q.trim()) go(`/loja?q=${encodeURIComponent(q.trim())}`)
      }}
      onBlur={(e) => {
        if (!box.current?.contains(e.relatedTarget as Node)) setOpen(false)
      }}
    >
      <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-mute" />
      <input
        type="search"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar avental, anel, vaso, chaveiro…"
        aria-label="Buscar produtos"
        className="h-11 w-full rounded-full border border-line-2 bg-white pr-4 pl-11 text-base placeholder:text-mute-2 focus:border-navy-700 focus:ring-4 focus:ring-navy-700/10 focus:outline-none"
      />
      {open && q.trim().length > 1 && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
          {results.length ? (
            <>
              {results.map((p) => (
                <button key={p.id} type="button" onClick={() => go(p.href ?? `/p/${p.slug}`)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-paper">
                  <ProductArt art={p.art} color={p.tone} universe={universeOf(p)} className="h-11 w-11 shrink-0 rounded-lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-mute">{categoryById(p.category)?.name}</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{money(p.price)}</span>
                </button>
              ))}
              <button type="submit" className="w-full border-t border-line px-4 py-3 text-left text-sm font-semibold text-navy-700 hover:bg-paper">
                Ver todos os resultados para “{q.trim()}”
              </button>
            </>
          ) : (
            <p className="px-4 py-4 text-sm text-mute">
              Nada encontrado para “{q.trim()}”. Que tal um <button type="button" className="font-semibold text-filament underline" onClick={() => go('/orcamento-3d')}>orçamento 3D sob medida</button>?
            </p>
          )}
        </div>
      )}
    </form>
  )
}
