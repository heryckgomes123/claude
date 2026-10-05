import { RULES } from '../config/store'
import { categoryById, universeOf, type Product } from '../data/catalog'
import { money } from '../lib/format'
import { Link, navigate } from '../router'
import { addToCart, favStore, openCart, pixPrice, toast, toggleFav } from '../state/shop'
import { Bag, Heart } from './Icons'
import ProductArt from './ProductArt'
import { Badge } from './ui'

export function defaultOptions(p: Product) {
  return Object.fromEntries((p.options ?? []).map((o) => [o.id, o.values[0].id]))
}

export const needsChoice = (p: Product) =>
  !!p.href || !!p.photoUpload || !!p.personalization?.required || (p.options ?? []).some((o) => o.values.length > 1 && !o.affectsArt)

export function installmentsText(price: number) {
  const n = Math.max(1, Math.min(RULES.maxInstallments, Math.floor(price / RULES.minInstallment)))
  return n > 1 ? `${n}x de ${money(price / n)} sem juros` : null
}

export default function ProductCard({ p }: { p: Product }) {
  const fav = favStore.use((s) => s.ids.includes(p.id))
  const universe = universeOf(p)
  const to = p.href ?? `/p/${p.slug}`
  const inst = installmentsText(p.price)
  const badgeTone = p.badge === 'Mais vendido' ? 'gold' : p.badge === 'Novo' ? 'filament' : 'navy'

  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden rounded-[22px] bg-paper-2">
        <Link to={to} aria-label={p.name} className="block aspect-square">
          <ProductArt art={p.art} color={p.tone} universe={universe} label={p.name} className="h-full w-full transition duration-700 ease-out group-hover:scale-[1.04]" />
        </Link>
        <div className="pointer-events-none absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {p.badge && <Badge tone={badgeTone}>{p.badge}</Badge>}
          {p.compareAt && <Badge tone="ok">-{Math.round((1 - p.price / p.compareAt) * 100)}%</Badge>}
        </div>
        <button
          type="button"
          onClick={() => toggleFav(p.id)}
          className={`absolute top-2.5 right-2.5 grid h-10 w-10 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-105 ${fav ? 'text-filament' : 'text-ink'}`}
          aria-label={fav ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
          aria-pressed={fav}
        >
          <Heart size={19} filled={fav} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (needsChoice(p)) return navigate(to)
            addToCart({ productId: p.id, qty: 1, options: defaultOptions(p) })
            toast(`${p.name} foi para o carrinho`)
            openCart()
          }}
          className="absolute right-2.5 bottom-2.5 flex h-10 items-center gap-2 rounded-full bg-navy-900 px-3.5 text-xs font-semibold text-white shadow-lg transition md:translate-y-2 md:opacity-0 md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100 md:group-hover:translate-y-0 md:group-hover:opacity-100"
          aria-label={needsChoice(p) ? `Escolher opções de ${p.name}` : `Adicionar ${p.name} ao carrinho`}
        >
          <Bag size={16} />
          <span className="hidden sm:inline">{needsChoice(p) ? (p.href ? 'Orçar' : 'Escolher') : 'Adicionar'}</span>
        </button>
      </div>
      <div className="flex flex-1 flex-col px-1 pt-3">
        <p className="text-[0.7rem] font-semibold tracking-wide text-mute uppercase">{categoryById(p.category)?.name}</p>
        <h3 className="mt-1 line-clamp-2 text-[0.95rem] leading-snug font-medium">
          <Link to={to} className="hover:underline">
            {p.name}
          </Link>
        </h3>
        <div className="mt-auto pt-2">
          {p.compareAt && <span className="mr-1.5 text-xs text-mute-2 line-through">{money(p.compareAt)}</span>}
          <span className="text-[1.05rem] font-bold tabular-nums">
            {p.priceFrom && <span className="mr-1 text-xs font-normal text-mute">a partir de</span>}
            {money(p.price)}
          </span>
          {!p.priceFrom && (
            <p className="text-xs text-ok">
              {money(pixPrice(p.price))} no Pix{inst && <span className="hidden text-mute xs:inline"> · ou {inst}</span>}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}
