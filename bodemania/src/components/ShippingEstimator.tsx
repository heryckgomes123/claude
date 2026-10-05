import { useEffect, useState } from 'react'
import { addBusinessDays, money } from '../lib/format'
import { maskCEP } from '../lib/masks'
import { lookupCep, quoteShipping, type ShippingOption } from '../lib/shipping'
import { isCEP } from '../lib/validate'
import { prefsStore } from '../state/shop'
import { MapPin, Truck } from './Icons'

export function etaText(leadDays: number, days: number) {
  const d = addBusinessDays(new Date(), leadDays + days)
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

export default function ShippingEstimator({ weight, subtotal, leadDays, freeShippingCoupon = false }: { weight: number; subtotal: number; leadDays: number; freeShippingCoupon?: boolean }) {
  const saved = prefsStore.use((s) => s.cep)
  const [cep, setCep] = useState(saved ? maskCEP(saved) : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [place, setPlace] = useState<{ city?: string; uf: string } | null>(null)
  const [options, setOptions] = useState<ShippingOption[]>([])

  const run = async (value: string) => {
    if (!isCEP(value)) return setError('Digite um CEP com 8 números.')
    setError('')
    setLoading(true)
    const res = await lookupCep(value)
    setLoading(false)
    if (!res) {
      setOptions([])
      setPlace(null)
      return setError('CEP não encontrado. Confira os números.')
    }
    prefsStore.set({ cep: value.replace(/\D/g, '') })
    setPlace({ city: res.city, uf: res.uf })
    setOptions(quoteShipping(res.uf, weight, subtotal, freeShippingCoupon))
  }

  // recalcula quando o carrinho muda
  useEffect(() => {
    if (place) setOptions(quoteShipping(place.uf, weight, subtotal, freeShippingCoupon))
  }, [weight, subtotal, freeShippingCoupon])

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
            <MapPin size={14} /> {place.city ? `${place.city}/${place.uf}` : place.uf}
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
