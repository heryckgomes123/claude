import { useEffect, useState } from 'react'
import { RULES, STORE, whatsappLink } from '../config/store'
import { formatDate, money } from '../lib/format'
import { Link, useRoute } from '../router'
import { STATUS_FLOW, STATUS_INFO, dbStore, setOrderStatus, statusLabel, toast, useUser, type Order } from '../state/shop'
import { AddressText } from '../components/AddressForm'
import { Barcode, Box, Card, Check, Clock, Copy, Home, Pix, Truck, Upload, Whatsapp } from '../components/Icons'
import QR from '../components/QR'
import { Breadcrumbs } from '../components/ui'
import { AuthForms } from './Auth'
import ProductImage from '../components/ProductImage'

export function StatusPill({ order }: { order: Order }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_INFO[order.status].tone}`}>{statusLabel(order, order.status)}</span>
}

export function Timeline({ order }: { order: Order }) {
  const current = STATUS_FLOW.indexOf(order.status)
  const icons = [Clock, Check, order.digitalOnly ? Upload : Box, Truck, Check]
  if (order.status === 'cancelado') return <p className="rounded-xl bg-err-50 px-4 py-3 text-sm font-medium text-err">Este pedido foi cancelado.</p>
  return (
    <ol className="relative">
      {STATUS_FLOW.map((s, i) => {
        const h = [...order.history].reverse().find((x) => x.status === s)
        const done = i <= current
        const Icon = icons[i]
        return (
          <li key={s} className="relative flex gap-4 pb-6 last:pb-0">
            {i < STATUS_FLOW.length - 1 && <span className={`absolute top-9 left-[17px] h-[calc(100%-36px)] w-0.5 ${i < current ? 'bg-ok' : 'bg-line'}`} />}
            <span className={`relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full ${done ? (i === current ? 'bg-navy-900 text-white ring-4 ring-navy-100' : 'bg-ok text-white') : 'bg-paper-2 text-mute-2'}`}>
              <Icon size={17} />
            </span>
            <div className="pt-1.5">
              <p className={`text-sm font-semibold ${done ? '' : 'text-mute-2'}`}>{statusLabel(order, s)}</p>
              {h && (
                <p className="text-xs text-mute">
                  {formatDate(h.at, true)} · {h.note}
                </p>
              )}
              {s === 'enviado' && order.tracking && done && (
                <a href={`https://rastreamento.correios.com.br/app/index.php?objeto=${order.tracking}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-navy-700 underline">
                  Rastreio: {order.tracking}
                </a>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function copy(text: string, label: string) {
  navigator.clipboard?.writeText(text).then(
    () => toast(`${label} copiado!`),
    () => toast('Não foi possível copiar — selecione e copie manualmente.', 'err'),
  )
}

function PixBox({ order }: { order: Order }) {
  const expires = new Date(order.createdAt).getTime() + RULES.pixExpiresMin * 60_000
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  const left = Math.max(0, expires - now)
  const mm = String(Math.floor(left / 60000)).padStart(2, '0')
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0')
  const code = order.payment.pixCode ?? ''

  return (
    <div className="rounded-3xl border-2 border-ok/30 bg-white p-5 md:p-6">
      <div className="flex items-center gap-2 text-ok">
        <Pix size={22} />
        <h2 className="text-lg font-semibold">Pague com Pix para confirmar</h2>
      </div>
      <div className="mt-4 grid items-center gap-5 sm:grid-cols-[auto_1fr]">
        <div className="mx-auto rounded-2xl border border-line p-2">
          <QR value={code} size={200} />
        </div>
        <div>
          <p className="text-sm text-mute">Valor</p>
          <p className="text-3xl font-bold tabular-nums">{money(order.total)}</p>
          <p className="mt-2 flex items-center gap-1.5 text-sm">
            <Clock size={16} className="text-gold-700" />
            {left > 0 ? (
              <>
                Expira em{' '}
                <b className="tabular-nums">
                  {mm}:{ss}
                </b>
              </>
            ) : (
              <b className="text-err">Código expirado — fale conosco para gerar outro.</b>
            )}
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-mute">
            <li>Abra o app do seu banco e escolha Pix</li>
            <li>Escaneie o QR Code ou use o “copia e cola”</li>
            <li>Confirme — a aprovação é automática</li>
          </ol>
        </div>
      </div>
      <div className="mt-4">
        <p className="mb-1.5 text-xs font-semibold text-mute uppercase">Pix copia e cola</p>
        <div className="flex gap-2">
          <input readOnly value={code} className="field !min-h-11 flex-1 truncate font-mono text-xs" onFocus={(e) => e.target.select()} aria-label="Código Pix copia e cola" />
          <button type="button" className="btn btn-primary btn-sm !min-h-11" onClick={() => copy(code, 'Código Pix')}>
            <Copy size={16} /> Copiar
          </button>
        </div>
      </div>
      {STORE.demo && (
        <button type="button" className="mt-4 w-full rounded-xl border border-dashed border-gold-300 bg-gold-50 py-3 text-sm font-semibold text-gold-700" onClick={() => setOrderStatus(order.id, 'pago', 'Pix recebido e confirmado automaticamente.')}>
          Demonstração: simular pagamento recebido
        </button>
      )}
    </div>
  )
}

function BoletoBox({ order }: { order: Order }) {
  const line = order.payment.boletoLine ?? ''
  return (
    <div className="rounded-3xl border-2 border-gold-300 bg-white p-5 md:p-6">
      <div className="flex items-center gap-2 text-gold-700">
        <Barcode size={22} />
        <h2 className="text-lg font-semibold">Boleto gerado</h2>
      </div>
      <p className="mt-2 text-sm text-mute">Vencimento em 2 dias úteis. Pague pelo app do banco usando a linha digitável:</p>
      <div className="mt-3 flex gap-2">
        <input readOnly value={line} className="field !min-h-11 flex-1 font-mono text-xs" onFocus={(e) => e.target.select()} aria-label="Linha digitável" />
        <button type="button" className="btn btn-primary btn-sm !min-h-11" onClick={() => copy(line.replace(/\D/g, ''), 'Linha digitável')}>
          <Copy size={16} /> Copiar
        </button>
      </div>
      {STORE.demo && (
        <button type="button" className="mt-4 w-full rounded-xl border border-dashed border-gold-300 bg-gold-50 py-3 text-sm font-semibold text-gold-700" onClick={() => setOrderStatus(order.id, 'pago', 'Boleto compensado.')}>
          Demonstração: simular compensação do boleto
        </button>
      )}
    </div>
  )
}

function downloadDeliverable(order: Order) {
  const text = `Bodemania — Pedido ${order.id}\n\nEste é o pacote de entrega do seu serviço digital.\nNa versão final, aqui ficam os arquivos STL/3MF/STEP e o render aprovado.\n\nItens:\n${order.items.map((i) => `- ${i.name} (${i.variant.join(', ')})`).join('\n')}\n`
  const blob = new Blob([text], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `bodemania-${order.id}-arquivos.txt`
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function OrderPage({ id }: { id: string }) {
  const { query } = useRoute()
  const order = dbStore.use((s) => s.orders.find((o) => o.id === id))
  const user = useUser()
  const isNew = query.get('novo') === '1'
  const viaTracking = query.get('email') && order && query.get('email')!.toLowerCase() === order.customer.email

  if (!order)
    return (
      <div className="wrap py-20 text-center">
        <h1 className="display text-3xl font-semibold">Pedido não encontrado</h1>
        <p className="mt-2 text-mute">Confira o número do pedido ou acesse a sua conta.</p>
        <Link to="/rastreio" className="btn btn-primary mt-6">
          Rastrear outro pedido
        </Link>
      </div>
    )

  if (!viaTracking && order.userId !== user?.id)
    return (
      <div className="wrap max-w-md py-12">
        <h1 className="display mb-6 text-center text-3xl font-semibold">Entre para ver o pedido</h1>
        <div className="rounded-3xl border border-line bg-white p-6">
          <AuthForms onDone={() => undefined} />
        </div>
      </div>
    )

  const first = order.customer.name.split(' ')[0]
  const PayIcon = order.payment.method === 'pix' ? Pix : order.payment.method === 'card' ? Card : Barcode

  return (
    <div className="wrap pb-10">
      {!isNew && (
        <Breadcrumbs
          items={[
            { label: 'Início', to: '/' },
            { label: 'Meus pedidos', to: '/conta' },
            { label: order.id },
          ]}
        />
      )}

      {isNew && (
        <div className="relative mt-6 overflow-hidden rounded-[28px] bg-navy-900 p-6 text-white md:p-10">
          <div className="dots absolute inset-0" />
          <div className="relative">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-ok text-white">
              <Check size={28} />
            </span>
            <h1 className="display mt-4 text-3xl font-semibold md:text-5xl">
              {order.status === 'aguardando' ? `Quase lá, ${first}!` : `Pedido confirmado, ${first}!`}
            </h1>
            <p className="mt-2 max-w-xl text-white/70">
              {order.status === 'aguardando'
                ? 'Seu pedido foi registrado. Assim que o pagamento for confirmado, ele entra em produção.'
                : `Pagamento aprovado. Enviamos os detalhes para ${order.customer.email}.`}
            </p>
            <p className="mt-4 text-sm text-white/60">
              Número do pedido: <b className="text-gold-300">{order.id}</b>
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link to="/" className="btn btn-gold btn-sm">
                <Home size={16} /> Voltar ao início
              </Link>
              <Link to="/conta" className="btn btn-sm border border-white/25 text-white hover:bg-white/10">
                Meus pedidos
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className={`grid gap-6 lg:grid-cols-[1fr_380px] ${isNew ? 'mt-6' : ''}`}>
        <div className="space-y-6">
          {order.status === 'aguardando' && order.payment.method === 'pix' && <PixBox order={order} />}
          {order.status === 'aguardando' && order.payment.method === 'boleto' && <BoletoBox order={order} />}

          <section className="rounded-3xl border border-line bg-white p-5 md:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                {!isNew && <h1 className="display text-2xl font-semibold">Pedido {order.id}</h1>}
                <p className="text-sm text-mute">Feito em {formatDate(order.createdAt, true)}</p>
              </div>
              <StatusPill order={order} />
            </div>
            {order.status !== 'entregue' && order.status !== 'cancelado' && (
              <p className="mb-5 rounded-2xl bg-paper px-4 py-3 text-sm">
                {order.digitalOnly ? 'Entrega dos arquivos prevista até ' : order.shippingOption.id === 'pickup' ? 'Retirada prevista a partir de ' : 'Previsão de entrega: até '}
                <b>{formatDate(order.estimate)}</b>
              </p>
            )}
            <Timeline order={order} />
            {order.digitalOnly && order.status === 'entregue' && (
              <button type="button" className="btn btn-primary mt-6" onClick={() => downloadDeliverable(order)}>
                <Upload size={18} className="rotate-180" /> Baixar arquivos do projeto
              </button>
            )}
          </section>

          <section className="rounded-3xl border border-line bg-white p-5 md:p-6">
            <h2 className="mb-2 text-lg font-semibold">Itens</h2>
            <ul className="divide-y divide-line">
              {order.items.map((i, k) => (
                <li key={k} className="flex gap-3 py-3">
                  {i.photo ? <img src={i.photo} alt="" className="h-16 w-16 rounded-xl object-cover" /> : <ProductImage productId={i.productId} color={i.color} className="h-16 w-16 shrink-0 rounded-xl" />}
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold">{i.name}</p>
                    <p className="text-xs text-mute">{i.variant.join(' · ')}</p>
                    {i.personalization && <p className="line-clamp-2 text-xs text-navy-700">“{i.personalization}”</p>}
                    <p className="mt-1 text-xs text-mute">
                      {i.qty} × {money(i.unitPrice)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{money(i.qty * i.unitPrice)}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-line bg-white p-5">
            <h2 className="mb-3 text-base font-semibold">Pagamento</h2>
            <p className="flex items-center gap-2 text-sm">
              <PayIcon size={18} />
              {order.payment.method === 'pix' && 'Pix'}
              {order.payment.method === 'boleto' && 'Boleto bancário'}
              {order.payment.method === 'card' && (
                <>
                  Cartão <span className="uppercase">{order.payment.brand !== 'unknown' ? order.payment.brand : ''}</span> final {order.payment.last4} · {order.payment.installments}x
                </>
              )}
            </p>
            <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-mute">Subtotal</dt>
                <dd className="tabular-nums">{money(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-ok">
                  <dt>Cupom {order.coupon}</dt>
                  <dd className="tabular-nums">-{money(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-mute">Frete ({order.shippingOption.label})</dt>
                <dd className="tabular-nums">{order.shipping ? money(order.shipping) : 'Grátis'}</dd>
              </div>
              {order.pixDiscount > 0 && (
                <div className="flex justify-between text-ok">
                  <dt>Desconto Pix</dt>
                  <dd className="tabular-nums">-{money(order.pixDiscount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd className="tabular-nums">{money(order.total)}</dd>
              </div>
            </dl>
          </section>
          <section className="rounded-3xl border border-line bg-white p-5">
            <h2 className="mb-3 text-base font-semibold">{order.digitalOnly ? 'Entrega digital' : order.shippingOption.id === 'pickup' ? 'Retirada' : 'Entrega'}</h2>
            {order.address && order.shippingOption.id !== 'pickup' ? (
              <AddressText a={order.address} />
            ) : order.shippingOption.id === 'pickup' ? (
              <p className="text-sm text-mute">Ateliê Bodemania — São Paulo/SP. Avisaremos pelo WhatsApp quando estiver pronto, com endereço e horário.</p>
            ) : (
              <p className="text-sm text-mute">Os arquivos ficam disponíveis aqui e são enviados para {order.customer.email}.</p>
            )}
            {order.notes && <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-xs text-mute">Obs.: {order.notes}</p>}
          </section>
          <a href={whatsappLink(`Olá! Quero falar sobre o pedido ${order.id}.`)} target="_blank" rel="noreferrer" className="btn btn-ghost w-full">
            <Whatsapp size={18} className="text-[#1faa59]" /> Falar sobre este pedido
          </a>
          <Link to="/loja" className="block text-center text-sm font-semibold text-navy-700 hover:underline">
            Continuar comprando
          </Link>
        </aside>
      </div>
    </div>
  )
}
