import { RULES } from '../config/store'
import { productById, universeOf } from '../data/catalog'
import { money } from '../lib/format'
import { Link, navigate } from '../router'
import { closeCart, itemColor, pixPrice, removeFromCart, setQty, uiStore, unitPrice, useCart, variantLabels, type CartItem } from '../state/shop'
import { Bag, Trash, Truck } from './Icons'
import ProductArt from './ProductArt'
import { Empty, QtyStepper, Sheet } from './ui'

export function CartLine({ item, compact }: { item: CartItem; compact?: boolean }) {
  const p = productById(item.productId)
  if (!p) return null
  const name = item.custom?.title ?? p.name
  return (
    <div className="flex gap-3 py-4">
      <Link to={item.custom ? '/orcamento-3d' : `/p/${p.slug}`} onClick={closeCart} className="relative shrink-0">
        {item.photo ? (
          <img src={item.photo} alt="" className="h-20 w-20 rounded-xl object-cover" />
        ) : (
          <ProductArt art={p.art} color={itemColor(item)} universe={universeOf(p)} className="h-20 w-20 rounded-xl" />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm leading-snug font-semibold">{name}</p>
          {!compact && (
            <button type="button" onClick={() => removeFromCart(item.key)} className="-mt-1 -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-mute hover:bg-err-50 hover:text-err" aria-label={`Remover ${name}`}>
              <Trash size={16} />
            </button>
          )}
        </div>
        <p className="mt-0.5 text-xs text-mute">{variantLabels(item).join(' · ')}</p>
        {item.personalization && <p className="mt-0.5 line-clamp-2 text-xs text-navy-700">“{item.personalization}”</p>}
        <div className="mt-2 flex items-center justify-between gap-2">
          {compact ? <span className="text-xs text-mute">Qtd: {item.qty}</span> : <QtyStepper size="sm" value={item.qty} onChange={(n) => setQty(item.key, n)} />}
          <span className="text-sm font-bold tabular-nums">{money(unitPrice(item) * item.qty)}</span>
        </div>
      </div>
    </div>
  )
}

export function FreeShippingBar({ subtotal }: { subtotal: number }) {
  const left = RULES.freeShippingFrom - subtotal
  const pct = Math.min(100, (subtotal / RULES.freeShippingFrom) * 100)
  return (
    <div className="rounded-2xl bg-white p-3.5 ring-1 ring-line">
      <p className="flex items-center gap-2 text-xs font-medium">
        <Truck size={16} className={left <= 0 ? 'text-ok' : 'text-navy-700'} />
        {left <= 0 ? (
          <span className="text-ok">Você ganhou frete grátis (PAC)! 🎉</span>
        ) : (
          <span>
            Faltam <b>{money(left)}</b> para o frete grátis
          </span>
        )}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-2">
        <div className={`h-full rounded-full transition-all duration-500 ${left <= 0 ? 'bg-ok' : 'bg-gold'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function CartDrawer() {
  const open = uiStore.use((s) => s.cartOpen)
  const { items, totals } = useCart()

  return (
    <Sheet
      open={open}
      onClose={closeCart}
      title={
        <span className="flex items-center gap-2">
          Seu carrinho <span className="rounded-full bg-paper-2 px-2 py-0.5 text-xs font-semibold text-mute">{totals.count}</span>
        </span>
      }
      footer={
        items.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-mute">Subtotal</span>
              <span className="text-xl font-bold tabular-nums">{money(totals.subtotal)}</span>
            </div>
            <p className="mt-0.5 text-right text-xs text-ok">ou {money(pixPrice(totals.subtotal))} no Pix</p>
            <button
              type="button"
              className="btn btn-primary mt-3 w-full"
              onClick={() => {
                closeCart()
                navigate('/checkout')
              }}
            >
              Finalizar compra
            </button>
            <button
              type="button"
              className="mt-2 w-full py-2 text-sm font-medium text-navy-700 hover:underline"
              onClick={() => {
                closeCart()
                navigate('/carrinho')
              }}
            >
              Ver carrinho completo e calcular frete
            </button>
            <button type="button" className="btn btn-ghost mt-1 w-full" onClick={closeCart}>
              Continuar comprando
            </button>
          </div>
        )
      }
    >
      {items.length === 0 ? (
        <Empty
          icon={<Bag size={28} />}
          title="Carrinho vazio"
          text="Que tal começar pelos mais vendidos? Tem avental, anel, vaso, dragão articulado…"
          action={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                closeCart()
                navigate('/loja')
              }}
            >
              Explorar a loja
            </button>
          }
        />
      ) : (
        <div className="px-5 pt-4">
          {!totals.digitalOnly && <FreeShippingBar subtotal={totals.subtotal} />}
          <div className="divide-y divide-line">
            {items.map((i) => (
              <CartLine key={i.key} item={i} />
            ))}
          </div>
        </div>
      )}
    </Sheet>
  )
}
