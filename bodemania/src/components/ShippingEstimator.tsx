import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { addBusinessDays, money } from '../lib/format'
import { maskCEP } from '../lib/masks'
import { lookupCep, type ShippingOption } from '../lib/shipping'
import { isCEP } from '../lib/validate'
import { messageOf, prefsStore, type CartItem, type CouponInfo } from '../state/shop'
import { MapPin, Truck } from './Icons'

export function etaText(leadDays: number, days: number) {
  const d = addBusinessDays(new Date(), leadDays + days)
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

export default function ShippingEstimator({ items, goods, weight, leadDays, coupon = null }: { items: CartItem[]; goods: number; weight: number; leadDays: number; coupon?: CouponInfo | null }) {
  const saved = prefsStore.use((s) => s.cep)
  const [cep, setCep] = useState(saved ? maskCEP(saved) : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [place, setPlace] = useState<{ city?: string; uf?: string } | null>(null)
  const [options, setOptions] = useState<ShippingOption[]>([])
  const seq = useRef(0)
  const signature = JSON.stringify([items.map((i) => [i.productId, i.qty, i.options, i.custom?.unitPrice]), Math.round(goods * 100), coupon?.code])

  const run = async (value: string, quiet = false) => {
    if (!isCEP(value)) return setError('Digite um CEP com 8 números.')
    const mine = ++seq.current
    setError('')
    if (!quiet) setLoading(true)
    try {
      const [quote, where] = await Promise.all([api.shipping.quote({ cep: value, items, goods, weight, coupon }), lookupCep(value).catch(() => null)])
      if (mine !== seq.current) return
      prefsStore.set({ cep: value.replace(/\D/g, '') })
      setPlace({ city: where?.city, uf: where?.uf })
      setOptions(quote.options)
    } catch (e) {
      if (mine !== seq.current) return
      setOptions([])
      setPlace(null)
      setError(messageOf(e, 'Não foi possível calcular o frete agora.'))
    } finally {
      if (mine === seq.current) setLoading(false)
    }
  }

  // recalcula quando o carrinho muda (com uma pequena espera para não chamar o servidor a cada clique)
  useEffect(() => {
    if (!place) return
    const t = window.setTimeout(() => run(cep, true), 450)
    return () => window.clearTimeout(t)
  }, [signature])

  useEffect(() => {
    if (saved && isCEP(saved)) run(saved)
  }, [])

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Truck size={18} /> Calcular frete e prazo
      </p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          run(cep)
        }}
      >
        <input
          inputMode="numeric"
          autoComplete="postal-code"
          value={cep}
          onChange={(e) => setCep(maskCEP(e.target.value))}
          placeholder="00000-000"
          aria-label="CEP"
          className="field !min-h-11 flex-1"
        />
        <button className="btn btn-ghost btn-sm !min-h-11" disabled={loading}>
          {loading ? '…' : 'Calcular'}
        </button>
      </form>
      <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-xs text-mute underline">
        Não sei meu CEP
      </a>
      {error && <p className="mt-2 text-xs font-medium text-err">{error}</p>}
      {place && options.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs text-mute">
            <MapPin size={14} /> {place.city ? `${place.city}/${place.uf}` : place.uf ?? `CEP ${cep}`}
          </p>
          <ul className="divide-y divide-line rounded-xl border border-line text-sm">
            {options.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span>
                  <span className="block font-medium">{o.label}</span>
                  <span className="text-xs text-mute">{o.id === 'pickup' ? `Pronto a partir de ${etaText(leadDays, 0)}` : `Chega até ${etaText(leadDays, o.days)}`}</span>
                </span>
                <span className={`font-semibold tabular-nums ${o.price === 0 ? 'text-ok' : ''}`}>{o.price === 0 ? 'Grátis' : money(o.price)}</span>
              </li>
            ))}
          </ul>
          {leadDays > 1 && <p className="mt-2 text-xs text-mute">Prazo inclui {leadDays} dias úteis de produção.</p>}
        </div>
      )}
    </div>
  )
}
