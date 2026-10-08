import { useEffect, useRef, useState, type ReactNode } from 'react'
import { api, UserFacingError } from '../api'
import { RULES, STORE } from '../config/store'
import { money, onlyDigits, uid } from '../lib/format'
import { maskCard, maskCPF, maskCVV, maskExpiry, maskPhone } from '../lib/masks'
import type { ShippingOption } from '../lib/shipping'
import { cardBrand, isCPF, isExpiryValid, isPhone, luhn } from '../lib/validate'
import { computeTotals } from '../../supabase/functions/_shared/totals'
import { Link, navigate } from '../router'
import { clearCart, logout, messageOf, saveAddress, toast, updateProfile, useCart, useSessionReady, useUser, type PaymentMethod, type SavedAddress } from '../state/shop'
import AddressForm, { AddressText } from '../components/AddressForm'
import { CartLine } from '../components/CartDrawer'
import { Barcode, Card, Check, ChevronDown, Edit, Lock, Pix, Plus, Shield } from '../components/Icons'
import { etaText } from '../components/ShippingEstimator'
import { CouponBox } from './CartPage'
import { AuthForms } from './Auth'
import { Field } from '../components/ui'

type Step = 1 | 2 | 3

function StepBox({ n, title, active, done, summary, onEdit, children }: { n: number; title: string; active: boolean; done: boolean; summary?: ReactNode; onEdit?: () => void; children: ReactNode }) {
  return (
    <section className={`rounded-3xl border bg-white transition ${active ? 'border-navy-900 shadow-[0_20px_50px_-30px_rgba(13,26,43,.6)]' : 'border-line'}`}>
      <header className="flex items-center gap-3 px-5 py-4 md:px-6">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? 'bg-ok text-white' : active ? 'bg-navy-900 text-white' : 'bg-paper-2 text-mute'}`}>
          {done ? <Check size={16} /> : n}
        </span>
        <h2 className={`flex-1 text-base font-semibold md:text-lg ${!active && !done ? 'text-mute' : ''}`}>{title}</h2>
        {done && !active && onEdit && (
          <button type="button" onClick={onEdit} className="flex items-center gap-1 text-sm font-semibold text-navy-700 hover:underline">
            <Edit size={15} /> Alterar
          </button>
        )}
      </header>
      {active ? <div className="px-5 pb-6 md:px-6">{children}</div> : done && summary ? <div className="-mt-1 px-5 pb-5 pl-16 text-sm text-mute md:px-6 md:pl-[68px]">{summary}</div> : null}
    </section>
  )
}

export default function Checkout() {
  const { items, coupon, couponInfo, totals } = useCart()
  const user = useUser()
  const ready = useSessionReady()
  const [step, setStep] = useState<Step>(() => (user ? (totals.digitalOnly ? 3 : 2) : 1))
  const [addressId, setAddressId] = useState<string>('')
  const [addingAddress, setAddingAddress] = useState(false)
  const [shipId, setShipId] = useState<ShippingOption['id'] | ''>('')
  const [method, setMethod] = useState<PaymentMethod>('pix')
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '', installments: 1 })
  const [cardTouched, setCardTouched] = useState(false)
  const [extra, setExtra] = useState({ cpf: '', phone: '' })
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [payError, setPayError] = useState('')
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [shippingState, setShippingState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [shippingError, setShippingError] = useState('')
  /** identifica esta tentativa de compra; trocada após qualquer erro para permitir nova cobrança */
  const attemptKey = useRef(uid('k') + uid())
  const shipSeq = useRef(0)

  const digitalOnly = totals.digitalOnly
  const address = user?.addresses.find((a) => a.id === addressId)

  // Seleciona o primeiro endereço salvo automaticamente
  useEffect(() => {
    if (user && !addressId && user.addresses[0]) setAddressId(user.addresses[0].id)
  }, [user, addressId])

  useEffect(() => {
    if (!user && step > 1) setStep(1)
  }, [user, step])

  // cotação de frete (Correios via servidor; tabela de contingência na demonstração)
  const shippingSignature = JSON.stringify([address?.cep, address?.uf, items.map((i) => [i.productId, i.qty, i.options, i.custom?.unitPrice]), Math.round((totals.subtotal - totals.discount) * 100), couponInfo?.code])
  useEffect(() => {
    if (!address || digitalOnly) return setShippingOptions([])
    const mine = ++shipSeq.current
    setShippingState('loading')
    setShippingError('')
    api.shipping
      .quote({ cep: address.cep, uf: address.uf, items, goods: totals.subtotal - totals.discount, weight: totals.weight, coupon: couponInfo })
      .then((r) => mine === shipSeq.current && (setShippingOptions(r.options), setShippingState('idle')))
      .catch((e) => mine === shipSeq.current && (setShippingOptions([]), setShippingState('error'), setShippingError(messageOf(e, 'Não foi possível calcular o frete.'))))
  }, [shippingSignature, digitalOnly]) // eslint-disable-line react-hooks/exhaustive-deps
  const ship: ShippingOption | undefined = digitalOnly
    ? { id: 'digital', label: 'Entrega digital', detail: 'Na sua conta e por e-mail', price: 0, days: 0 }
    : shippingOptions.find((o) => o.id === shipId)

  useEffect(() => {
    if (shippingOptions.length && !shippingOptions.some((o) => o.id === shipId)) setShipId(shippingOptions[0].id)
  }, [shippingOptions, shipId])

  const calc = computeTotals({ subtotal: totals.subtotal, coupon: couponInfo && !totals.couponError ? couponInfo : null, shipping: ship?.price ?? 0, pix: method === 'pix', pixRate: RULES.pixDiscount })
  const { pixDiscount, total } = calc
  const maxInst = Math.max(1, Math.min(RULES.maxInstallments, Math.floor(total / RULES.minInstallment)))

  if (!items.length)
    return (
      <div className="wrap py-20 text-center">
        <h1 className="display text-3xl font-semibold">Seu carrinho está vazio</h1>
        <Link to="/loja" className="btn btn-primary mt-6">
          Ir para a loja
        </Link>
      </div>
    )

  const needsProfile = !!user && (!isCPF(user.cpf) || !isPhone(user.phone))
  const brand = cardBrand(card.number)
  const cardErrors = {
    number: !luhn(card.number) ? 'Número de cartão inválido.' : '',
    name: card.name.trim().split(/\s+/).length < 2 ? 'Nome como está no cartão.' : '',
    expiry: !isExpiryValid(card.expiry) ? 'Validade inválida.' : '',
    cvv: onlyDigits(card.cvv).length < 3 ? 'CVV inválido.' : '',
  }
  const ce = (k: keyof typeof cardErrors) => (cardTouched ? cardErrors[k] : '')

  const finish = async () => {
    if (!user || !ship || processing) return
    setPayError('')
    if (method === 'card') {
      setCardTouched(true)
      if (Object.values(cardErrors).some(Boolean)) return
    }
    setProcessing(true)
    try {
      const { orderId } = await api.orders.create({
        idempotencyKey: attemptKey.current,
        items,
        user,
        address: digitalOnly ? undefined : address,
        shipping: ship,
        method,
        card: method === 'card' ? card : undefined,
        coupon: couponInfo && !totals.couponError ? couponInfo : null,
        notes: notes.trim() || undefined,
        totals: { subtotal: calc.subtotal, discount: calc.discount, pixDiscount: calc.pixDiscount, shipping: calc.shipping, total: calc.total },
        leadDays: totals.leadDays,
        digitalOnly,
      })
      clearCart()
      navigate(`/pedido/${orderId}?novo=1`, { replace: true })
    } catch (e) {
      attemptKey.current = uid('k') + uid() // nova tentativa = nova chave
      const err = e instanceof UserFacingError ? e : null
      if (err?.code === 'total_changed' || err?.code === 'out_of_stock' || err?.code === 'product_unavailable') void api.reloadCatalog()
      setPayError(messageOf(e, 'Não foi possível concluir o pagamento. Tente novamente.'))
    } finally {
      setProcessing(false)
    }
  }

  const summary = (
    <div className="space-y-4">
      <div className="max-h-[320px] divide-y divide-line overflow-y-auto pr-1">
        {items.map((i) => (
          <CartLine key={i.key} item={i} compact />
        ))}
      </div>
      <CouponBox />
      <dl className="space-y-2 border-t border-line pt-4 text-sm">
        <Row label="Subtotal" value={money(totals.subtotal)} />
        {totals.discount > 0 && <Row label={`Cupom ${coupon}`} value={`-${money(totals.discount)}`} green />}
        <Row label="Frete" value={digitalOnly ? 'Digital — grátis' : ship ? (ship.price === 0 ? 'Grátis' : money(ship.price)) : '—'} green={ship?.price === 0} />
        {pixDiscount > 0 && <Row label={`Desconto Pix (${RULES.pixDiscount * 100}%)`} value={`-${money(pixDiscount)}`} green />}
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <dt className="font-semibold">Total</dt>
          <dd className="text-2xl font-bold tabular-nums">{money(total)}</dd>
        </div>
        {method === 'card' && card.installments > 1 && <p className="text-right text-xs text-mute">{card.installments}x de {money(total / card.installments)} sem juros</p>}
      </dl>
    </div>
  )

  return (
    <div className="wrap pt-6 pb-16">
      {/* Resumo recolhível no celular */}
      <div className="mb-4 rounded-2xl border border-line bg-white lg:hidden">
        <button type="button" onClick={() => setSummaryOpen((s) => !s)} className="flex w-full items-center justify-between px-4 py-3.5 text-sm" aria-expanded={summaryOpen}>
          <span className="flex items-center gap-2 font-semibold text-navy-700">
            {summaryOpen ? 'Ocultar' : 'Ver'} resumo ({totals.count} {totals.count === 1 ? 'item' : 'itens'}) <ChevronDown size={16} className={summaryOpen ? 'rotate-180' : ''} />
          </span>
          <span className="text-base font-bold tabular-nums">{money(total)}</span>
        </button>
        {summaryOpen && <div className="border-t border-line px-4 py-4">{summary}</div>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-3">
          <h1 className="display mb-2 hidden text-3xl font-semibold lg:block">Finalizar compra</h1>

          {/* 1 · Identificação */}
          <StepBox
            n={1}
            title="Identificação"
            active={step === 1}
            done={!!user}
            onEdit={() => setStep(1)}
            summary={
              user && (
                <>
                  {user.name} · {user.email}
                </>
              )
            }
          >
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-paper p-4">
                  <div className="text-sm">
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-mute">{user.email}</p>
                  </div>
                  <button type="button" className="text-sm font-medium text-mute underline" onClick={logout}>
                    Não é você?
                  </button>
                </div>
                {needsProfile && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="CPF (para a nota fiscal)" inputMode="numeric" value={extra.cpf || user.cpf} onChange={(e) => setExtra((s) => ({ ...s, cpf: maskCPF(e.target.value) }))} />
                    <Field label="Celular" inputMode="tel" value={extra.phone || user.phone} onChange={(e) => setExtra((s) => ({ ...s, phone: maskPhone(e.target.value) }))} />
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn-primary w-full sm:w-auto"
                  onClick={async () => {
                    if (needsProfile) {
                      const cpf = extra.cpf || user.cpf
                      const phone = extra.phone || user.phone
                      if (!isCPF(cpf) || !isPhone(phone)) return toast('Confira CPF e celular.', 'err')
                      try {
                        await updateProfile({ name: user.name, cpf, phone, newsletter: user.newsletter })
                      } catch (e) {
                        return toast(messageOf(e), 'err')
                      }
                    }
                    setStep(digitalOnly ? 3 : 2)
                  }}
                >
                  Continuar
                </button>
              </div>
            ) : (
              <div className="max-w-md">
                {!ready && <p className="mb-4 rounded-2xl bg-paper px-4 py-4 text-sm text-mute" aria-busy="true">Verificando sua sessão…</p>}
                <p className="mb-4 text-sm text-mute">Entre ou crie sua conta em menos de 1 minuto para acompanhar seu pedido.</p>
                <AuthForms initial="register" onDone={() => setStep(digitalOnly ? 3 : 2)} />
              </div>
            )}
          </StepBox>

          {/* 2 · Entrega */}
          {!digitalOnly && (
            <StepBox
              n={2}
              title="Entrega"
              active={step === 2 && !!user}
              done={step > 2 && !!address && !!ship}
              onEdit={() => setStep(2)}
              summary={
                address &&
                ship && (
                  <>
                    {address.street}, {address.number} — {address.city}/{address.uf}
                    <br />
                    {ship.label} · {ship.price === 0 ? 'Grátis' : money(ship.price)} · {ship.id === 'pickup' ? `retirada a partir de ${etaText(totals.leadDays, 0)}` : `chega até ${etaText(totals.leadDays, ship.days)}`}
                  </>
                )
              }
            >
              {user && (
                <div className="space-y-5">
                  {user.addresses.length > 0 && !addingAddress && (
                    <div className="space-y-2" role="radiogroup" aria-label="Endereço de entrega">
                      {user.addresses.map((a) => (
                        <label key={a.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${addressId === a.id ? 'border-navy-900 bg-navy-100/40' : 'border-line hover:border-line-2'}`}>
                          <input type="radio" name="address" className="mt-1 h-5 w-5 accent-navy-900" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                          <AddressText a={a} />
                        </label>
                      ))}
                      <button type="button" onClick={() => setAddingAddress(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-2 p-3.5 text-sm font-semibold text-navy-700 hover:border-navy-700">
                        <Plus size={18} /> Novo endereço
                      </button>
                    </div>
                  )}
                  {(addingAddress || user.addresses.length === 0) && (
                    <AddressForm
                      recipient={user.name}
                      submitLabel="Usar este endereço"
                      onCancel={user.addresses.length ? () => setAddingAddress(false) : undefined}
                      onSave={async (a: SavedAddress) => {
                        try {
                          const saved = await saveAddress(a)
                          setAddressId(saved.id)
                          setAddingAddress(false)
                        } catch (e) {
                          toast(messageOf(e), 'err')
                        }
                      }}
                    />
                  )}
                  {address && !addingAddress && (
                    <div>
                      <p className="mb-2 text-sm font-semibold">Forma de entrega</p>
                      {shippingState === 'loading' && <p className="rounded-2xl bg-paper px-4 py-4 text-sm text-mute" aria-busy="true">Calculando frete e prazo…</p>}
                      {shippingState === 'error' && (
                        <p role="alert" className="rounded-2xl bg-err-50 px-4 py-3 text-sm font-medium text-err">
                          {shippingError} Confira o endereço ou tente de novo.
                        </p>
                      )}
                      <div className="space-y-2" role="radiogroup" aria-label="Forma de entrega">
                        {shippingState === 'idle' && shippingOptions.map((o) => (
                          <label key={o.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${shipId === o.id ? 'border-navy-900 bg-navy-100/40' : 'border-line hover:border-line-2'}`}>
                            <input type="radio" name="ship" className="h-5 w-5 accent-navy-900" checked={shipId === o.id} onChange={() => setShipId(o.id)} />
                            <span className="flex-1 text-sm">
                              <span className="block font-semibold">
                                {o.label} <span className="font-normal text-mute">· {o.detail}</span>
                              </span>
                              <span className="text-mute">{o.id === 'pickup' ? `Pronto a partir de ${etaText(totals.leadDays, 0)}` : `Chega até ${etaText(totals.leadDays, o.days)}`}</span>
                            </span>
                            <span className={`text-sm font-bold tabular-nums ${o.price === 0 ? 'text-ok' : ''}`}>{o.price === 0 ? 'Grátis' : money(o.price)}</span>
                          </label>
                        ))}
                      </div>
                      {totals.leadDays > 1 && <p className="mt-2 text-xs text-mute">Os prazos já incluem {totals.leadDays} dias úteis de produção dos itens feitos sob encomenda.</p>}
                      <button type="button" className="btn btn-primary mt-5 w-full sm:w-auto" disabled={!ship || shippingState !== 'idle'} onClick={() => setStep(3)}>
                        Continuar para o pagamento
                      </button>
                    </div>
                  )}
                </div>
              )}
            </StepBox>
          )}

          {/* 3 · Pagamento */}
          <StepBox n={digitalOnly ? 2 : 3} title="Pagamento" active={step === 3 && !!user && !!ship} done={false}>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Forma de pagamento">
              {(
                [
                  ['pix', 'Pix', Pix, `${RULES.pixDiscount * 100}% off`],
                  ['card', 'Cartão', Card, `até ${maxInst}x`],
                  ['boleto', 'Boleto', Barcode, '1–2 dias'],
                ] as const
              ).map(([id, label, Icon, hint]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={method === id}
                  onClick={() => {
                    setMethod(id)
                    setPayError('')
                  }}
                  className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-sm transition ${method === id ? 'border-navy-900 bg-navy-100/40' : 'border-line hover:border-line-2'}`}
                >
                  <Icon size={22} />
                  <span className="font-semibold">{label}</span>
                  <span className={`text-[0.7rem] ${id === 'pix' ? 'font-semibold text-ok' : 'text-mute'}`}>{hint}</span>
                </button>
              ))}
            </div>

            <div className="mt-5">
              {method === 'pix' && (
                <div className="rounded-2xl bg-ok-50 p-4 text-sm text-ink">
                  <p className="font-semibold text-ok">Você economiza {money(pixDiscount)} pagando com Pix.</p>
                  <p className="mt-1 text-mute">Ao confirmar, mostramos o QR Code e o código “copia e cola”. A aprovação é imediata e o pedido entra em produção na hora. O código vale por {RULES.pixExpiresMin} minutos.</p>
                </div>
              )}
              {method === 'boleto' && (
                <div className="rounded-2xl bg-paper p-4 text-sm text-mute">
                  O boleto vence em 2 dias úteis e a compensação leva até 2 dias úteis — o prazo de entrega começa a contar depois disso. Prefere agilidade? Use o Pix.
                </div>
              )}
              {method === 'card' && (
                <div className="space-y-4">
                  <Field
                    label="Número do cartão"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    value={card.number}
                    onChange={(e) => setCard((s) => ({ ...s, number: maskCard(e.target.value) }))}
                    error={ce('number')}
                    placeholder="0000 0000 0000 0000"
                    right={brand !== 'unknown' ? <span className="rounded bg-paper-2 px-2 py-1 text-[0.65rem] font-bold text-navy-700 uppercase">{brand}</span> : undefined}
                  />
                  <Field label="Nome impresso no cartão" autoComplete="cc-name" value={card.name} onChange={(e) => setCard((s) => ({ ...s, name: e.target.value.toUpperCase() }))} error={ce('name')} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Validade" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={card.expiry} onChange={(e) => setCard((s) => ({ ...s, expiry: maskExpiry(e.target.value) }))} error={ce('expiry')} />
                    <Field label="CVV" inputMode="numeric" autoComplete="cc-csc" placeholder="123" value={card.cvv} onChange={(e) => setCard((s) => ({ ...s, cvv: maskCVV(e.target.value) }))} error={ce('cvv')} />
                  </div>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Parcelas</span>
                    <select className="field" value={card.installments} onChange={(e) => setCard((s) => ({ ...s, installments: Number(e.target.value) }))}>
                      {Array.from({ length: maxInst }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}x de {money(total / n)} {n === 1 ? 'à vista' : 'sem juros'}
                        </option>
                      ))}
                    </select>
                  </label>
                  {STORE.demo && (
                    <p className="rounded-xl bg-gold-50 px-3 py-2 text-xs text-gold-700">
                      Demonstração: use <b>4111 1111 1111 1111</b> (aprovado) ou <b>4000 0000 0000 0002</b> (recusado), qualquer validade futura e CVV.
                    </p>
                  )}
                </div>
              )}
            </div>

            <label className="mt-5 block">
              <span className="mb-1.5 block text-sm font-medium">Observações do pedido (opcional)</span>
              <textarea className="field" rows={2} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: é para presente, não enviar nota com valores." />
            </label>

            {payError && <p className="mt-4 rounded-xl bg-err-50 px-3 py-2 text-sm font-medium text-err">{payError}</p>}

            <button type="button" className="btn btn-gold mt-5 w-full !min-h-14 text-base" disabled={processing} onClick={finish}>
              {processing ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-navy-950/30 border-t-navy-950" /> Processando…
                </>
              ) : (
                <>
                  <Lock size={18} /> {method === 'pix' ? 'Gerar Pix' : method === 'card' ? 'Pagar' : 'Gerar boleto'} · {money(total)}
                </>
              )}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-mute">
              <Shield size={14} /> Pagamento criptografado. Não armazenamos os dados do seu cartão.
            </p>
          </StepBox>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-3xl border border-line bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Resumo do pedido</h2>
            {summary}
          </div>
        </aside>
      </div>
    </div>
  )
}

function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${green ? 'text-ok' : ''}`}>
      <dt className={green ? '' : 'text-mute'}>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  )
}
