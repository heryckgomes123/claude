import { useMemo, useState, type ReactNode } from 'react'
import { CATEGORIES, UNIVERSES, categoryById, universeOf, useCatalogStatus, useProducts, type CategoryId, type Product, type Universe } from '../data/catalog'
import { navigate, useRoute } from '../router'
import { Filter, Search } from '../components/Icons'
import { CatalogPlaceholder } from '../components/CatalogStatus'
import ProductCard from '../components/ProductCard'
import { searchProducts } from '../components/SearchBox'
import { Breadcrumbs, Empty, Sheet } from '../components/ui'
import ProductArt from '../components/ProductArt'
import { plural } from '../lib/format'

const PRICE_RANGES = [
  { id: 'ate50', label: 'Até R$ 50', test: (p: number) => p <= 50 },
  { id: '50a150', label: 'R$ 50 a R$ 150', test: (p: number) => p > 50 && p <= 150 },
  { id: '150a300', label: 'R$ 150 a R$ 300', test: (p: number) => p > 150 && p <= 300 },
  { id: 'mais300', label: 'Acima de R$ 300', test: (p: number) => p > 300 },
]

const SORTS = [
  { id: 'relevancia', label: 'Relevância' },
  { id: 'populares', label: 'Mais vendidos' },
  { id: 'menor', label: 'Menor preço' },
  { id: 'maior', label: 'Maior preço' },
  { id: 'desconto', label: 'Maior desconto' },
]

export default function Catalog({ category }: { category?: CategoryId }) {
  const { query } = useRoute()
  const products = useProducts()
  const status = useCatalogStatus()
  const q = query.get('q') ?? ''
  const cat = category ? categoryById(category) : undefined
  const universe = (cat?.universe ?? query.get('u') ?? '') as Universe | ''
  const sort = query.get('sort') ?? 'relevancia'
  const [price, setPrice] = useState<string[]>([])
  const [onlyCustom, setOnlyCustom] = useState(false)
  const [onlySale, setOnlySale] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(query)
    if (value) params.set(key, value)
    else params.delete(key)
    const base = category ? `/c/${category}` : '/loja'
    const qs = params.toString()
    navigate(base + (qs ? `?${qs}` : ''), { replace: true })
  }

  const list = useMemo(() => {
    let items: Product[] = q ? searchProducts(q, products) : products
    if (category) items = items.filter((p) => p.category === category)
    else if (universe) items = items.filter((p) => universeOf(p) === universe)
    if (price.length) items = items.filter((p) => PRICE_RANGES.some((r) => price.includes(r.id) && r.test(p.price)))
    if (onlyCustom) items = items.filter((p) => p.personalization || p.photoUpload || p.options?.some((o) => o.affectsArt))
    if (onlySale) items = items.filter((p) => p.compareAt)
    const sorted = [...items]
    if (sort === 'menor') sorted.sort((a, b) => a.price - b.price)
    if (sort === 'maior') sorted.sort((a, b) => b.price - a.price)
    if (sort === 'desconto') sorted.sort((a, b) => (b.compareAt ? 1 - b.price / b.compareAt : 0) - (a.compareAt ? 1 - a.price / a.compareAt : 0))
    if (sort === 'populares') sorted.sort((a, b) => Number(b.badge === 'Mais vendido') - Number(a.badge === 'Mais vendido'))
    return sorted
  }, [products, q, category, universe, price, onlyCustom, onlySale, sort])

  const title = q ? `Resultados para “${q}”` : cat ? cat.name : universe ? UNIVERSES[universe].name : 'Toda a loja'
  const subtitle = q ? undefined : cat ? cat.blurb : universe ? UNIVERSES[universe].blurb : 'Artigos maçônicos e impressão 3D em um só lugar.'
  const activeCount = price.length + Number(onlyCustom) + Number(onlySale)

  const filters = (
    <div className="space-y-7">
      {!category && (
        <FilterGroup title="Universo">
          <div className="flex flex-wrap gap-2">
            {(['', 'maconaria', '3d'] as const).map((u) => (
              <button key={u || 'all'} type="button" className="chip" aria-pressed={universe === u} onClick={() => setParam('u', u)}>
                {u ? UNIVERSES[u].name : 'Todos'}
              </button>
            ))}
          </div>
        </FilterGroup>
      )}
      <FilterGroup title="Categorias">
        <div className="space-y-1">
          {CATEGORIES.filter((c) => !universe || c.universe === universe).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setFiltersOpen(false)
                navigate(category === c.id ? '/loja' : `/c/${c.id}${q ? `?q=${encodeURIComponent(q)}` : ''}`)
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm ${category === c.id ? 'bg-navy-900 font-semibold text-white' : 'hover:bg-paper-2'}`}
            >
              <ProductArt art={c.art} color={c.tone} universe={c.universe} className="h-8 w-8 rounded-lg" />
              {c.name}
            </button>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Preço">
        <div className="space-y-2">
          {PRICE_RANGES.map((r) => (
            <label key={r.id} className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="h-5 w-5 accent-navy-900"
                checked={price.includes(r.id)}
                onChange={(e) => setPrice((s) => (e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id)))}
              />
              {r.label}
            </label>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Destaques">
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-navy-900" checked={onlyCustom} onChange={(e) => setOnlyCustom(e.target.checked)} />
            Personalizáveis
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-navy-900" checked={onlySale} onChange={(e) => setOnlySale(e.target.checked)} />
            Em promoção
          </label>
        </div>
      </FilterGroup>
      {activeCount > 0 && (
        <button
          type="button"
          className="text-sm font-semibold text-filament underline"
          onClick={() => {
            setPrice([])
            setOnlyCustom(false)
            setOnlySale(false)
          }}
        >
          Limpar filtros
        </button>
      )}
    </div>
  )

  return (
    <div className="wrap">
      <Breadcrumbs
        items={[
          { label: 'Início', to: '/' },
          ...(cat ? [{ label: UNIVERSES[cat.universe].name, to: `/loja?u=${cat.universe}` }, { label: cat.name }] : [{ label: title }]),
        ]}
      />
      <header className="mb-6 md:mb-8">
        <h1 className="display text-3xl font-semibold md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-mute">{subtitle}</p>}
      </header>

      <div className="lg:grid lg:grid-cols-[250px_1fr] lg:gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-36">{filters}</div>
        </aside>
        <div>
          <div className="sticky top-[119px] z-20 -mx-4 mb-5 flex items-center justify-between gap-3 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0">
            <button type="button" className="chip lg:hidden" onClick={() => setFiltersOpen(true)}>
              <Filter size={16} /> Filtrar {activeCount > 0 && <span className="grid h-5 w-5 place-items-center rounded-full bg-gold text-[11px] font-bold text-navy-950">{activeCount}</span>}
            </button>
            <p className="hidden text-sm text-mute lg:block">{plural(list.length, 'produto', 'produtos')}</p>
            <label className="flex items-center gap-2 text-sm">
              <span className="hidden text-mute sm:inline">Ordenar por</span>
              <select value={sort} onChange={(e) => setParam('sort', e.target.value)} className="h-[38px] rounded-full border border-line-2 bg-white px-3 text-sm font-medium" aria-label="Ordenar por">
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!products.length && status !== 'ready' ? (
            <CatalogPlaceholder status={status} />
          ) : list.length ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3">
              {list.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          ) : (
            <Empty
              icon={<Search size={28} />}
              title="Nada por aqui… ainda"
              text="Não encontramos produtos com esses filtros. Se for algo para imprimir, a gente faz sob medida!"
              action={
                <button type="button" className="btn btn-filament" onClick={() => navigate('/orcamento-3d')}>
                  Pedir orçamento 3D
                </button>
              }
            />
          )}
        </div>
      </div>

      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        side="bottom"
        title="Filtrar"
        footer={
          <button type="button" className="btn btn-primary w-full" onClick={() => setFiltersOpen(false)}>
            Ver {plural(list.length, 'produto', 'produtos')}
          </button>
        }
      >
        <div className="p-5">{filters}</div>
      </Sheet>
    </div>
  )
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-xs font-bold tracking-wider text-mute uppercase">{title}</p>
      {children}
    </div>
  )
}
