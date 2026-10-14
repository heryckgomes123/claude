import { useState } from 'react'
import { money } from '../lib/format'
import { Link, navigate } from '../router'
import { applyCoupon, pixPrice, removeCoupon, useCart } from '../state/shop'
import { CartLine, FreeShippingBar } from '../components/CartDrawer'
import { Bag, ChevronLeft, Home, Lock, Pix } from '../components/Icons'
import ShippingEstimator from '../components/ShippingEstimator'
import { Breadcrumbs, Empty } from '../components/ui'

export function CouponBox() {
  const { coupon, totals } = useCart()
  const [code, setCode] = useState(coupon)
  const [busy, setBusy] = useState(false)
  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          try {
            await applyCoupon(code)
          } finally {
            setBusy(false)
          }
        }}
      >
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Cupom de desconto" aria-label="Cupom de desconto" className="field !min-h-11 flex-1 uppercase" />
        <button className="btn btn-ghost btn-sm !min-h-11" disabled={busy}>
          {busy ? '…' : 'Aplicar'}
        </button>
      </form>
      {coupon && (
        <p className={`mt-1.5 flex items-center justify-between text-xs font-medium ${totals.couponError ? 'text-err' : 'text-ok'}`} role="status">
          <span>{totals.couponError ?? `${coupon}: ${totals.couponLabel}`}</span>
          <button
            type="button"
            className="text-mute underline"
            onClick={() => {
              removeCoupon()
              setCode('')
            }}
          >
            remover
          </button>
        </p>
      )}
    </div>
  )
}

export default function CartPage() {
  const { items, totals, couponInfo } = useCart()
  const total = totals.subtotal - totals.discount

  if (!items.length)
    return (
      <div className="wrap">
        <Empty
          icon={<Bag size={28} />}
          title="Seu carrinho está vazio"
          text="Explore os artigos maçônicos e o universo 3D — tem presente para todo mundo."
          action={
            <Link to="/loja" className="btn btn-primary">
              Ir para a loja
            </Link>
          }
        />
      </div>
    )

  return (
    <div className="wrap pb-10">
      <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Carrinho' }]} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="display text-3xl font-semibold md:text-4xl">Carrinho</h1>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => (window.history.length > 1 ? window.history.back() : navigate('/loja'))}>
            <ChevronLeft size={16} /> Voltar
          </button>
          <Link to="/" className="btn btn-ghost btn-sm">
            <Home size={16} /> Início
          </Link>
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          {!totals.digitalOnly && <FreeShippingBar subtotal={totals.subtotal} />}
          <div className="mt-4 divide-y divide-line rounded-3xl border border-line bg-white px-4 md:px-6">
            {items.map((i) => (
              <CartLine key={i.key} item={i} />
            ))}
          </div>
          <Link to="/loja" className="mt-4 inline-block text-sm font-semibold text-navy-700 hover:underline">
            ← Continuar comprando
          </Link>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
          {!totals.digitalOnly && <ShippingEstimator items={items} goods={totals.subtotal - totals.discount} weight={totals.weight} leadDays={totals.leadDays} coupon={couponInfo} />}
          <div className="rounded-3xl border border-line bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold">Resumo</h2>
            <CouponBox />
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-mute">Subtotal ({totals.count} itens)</dt>
                <dd className="tabular-nums">{money(totals.subtotal)}</dd>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-ok">
                  <dt>Desconto</dt>
                  <dd className="tabular-nums">-{money(totals.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-mute">Frete</dt>
                <dd className="text-mute">{totals.digitalOnly ? 'Entrega digital' : 'calculado no checkout'}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
                <dt>Total</dt>
                <dd className="tabular-nums">{money(total)}</dd>
              </div>
              <p className="flex items-center justify-end gap-1 text-xs font-medium text-ok">
                <Pix size={14} /> {money(pixPrice(total))} no Pix
              </p>
            </dl>
            <button type="button" className="btn btn-primary mt-5 w-full" onClick={() => navigate('/checkout')}>
              <Lock size={18} /> Finalizar compra
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
