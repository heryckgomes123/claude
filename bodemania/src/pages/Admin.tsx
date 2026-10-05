/**
 * Painel da loja (demonstração). Aqui a equipe acompanha pedidos e avança o status:
 * pago → em produção → enviado (gera código de rastreio) → entregue.
 * Na versão de produção este painel lê/escreve na API, com login de administrador de verdade.
 */
import { useState } from 'react'
import { PRODUCTS } from '../data/catalog'
import { formatDate, money } from '../lib/format'
import { maskCEP } from '../lib/masks'
import { Link } from '../router'
import { STATUS_FLOW, advanceOrder, dbStore, setOrderStatus, statusLabel, type Order, type OrderStatus } from '../state/shop'
import { ChevronDown, Lock, Trash, Upload } from '../components/Icons'
import Logo from '../components/Logo'
import { StatusPill, Timeline } from './OrderPage'
import ProductImage from '../components/ProductImage'
import { resizeImage } from '../lib/image'
import { addPhotos, hasBundledPhotos, photoStore, removePhoto, storedPhotosBytes } from '../state/photos'
import { toast } from '../state/shop'

const DEMO_PASS = 'bodemania'

export default function Admin() {
  const [ok, setOk] = useState(() => {
    try {
      return sessionStorage.getItem('bm.admin') === '1'
    } catch {
      return false
    }
  })
  const [pass, setPass] = useState('')
  const [err, setErr] = useState(false)

  if (!ok)
    return (
      <div className="grid min-h-dvh place-items-center bg-navy-950 px-4">
        <form
          className="w-full max-w-sm rounded-3xl bg-white p-6"
          onSubmit={(e) => {
            e.preventDefault()
            if (pass !== DEMO_PASS) return setErr(true)
            try {
              sessionStorage.setItem('bm.admin', '1')
            } catch {
              /* ignora */
            }
            setOk(true)
          }}
        >
          <Logo compact />
          <h1 className="mt-6 flex items-center gap-2 text-xl font-semibold">
            <Lock size={20} /> Painel da loja
          </h1>
          <input
            type="password"
            className="field mt-4"
            placeholder="Senha"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            aria-invalid={err}
            autoFocus
            aria-label="Senha"
          />
          {err && <p className="mt-1 text-xs text-err">Senha incorreta.</p>}
          <button className="btn btn-primary mt-4 w-full">Entrar</button>
          <p className="mt-3 text-center text-xs text-mute">
            Demonstração — senha: <b>{DEMO_PASS}</b>
          </p>
          <Link to="/" className="mt-4 block text-center text-sm text-navy-700 underline">
            Voltar para a loja
          </Link>
        </form>
      </div>
    )

  return <Dashboard />
}

function Dashboard() {
  const orders = dbStore.use((s) => s.orders)
  const users = dbStore.use((s) => s.users)
  const [filter, setFilter] = useState<OrderStatus | 'todos'>('todos')
  const [open, setOpen] = useState<string>('')
  const [tab, setTab] = useState<'pedidos' | 'produtos'>('pedidos')
  const paid = orders.filter((o) => o.status !== 'aguardando' && o.status !== 'cancelado')
  const revenue = paid.reduce((s, o) => s + o.total, 0)
  const list = filter === 'todos' ? orders : orders.filter((o) => o.status === filter)
  const count = (s: OrderStatus) => orders.filter((o) => o.status === s).length

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-white">
        <div className="wrap flex h-16 items-center justify-between">
          <Logo compact />
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold text-gold-700 sm:inline">
              Painel · demonstração
            </span>
            <Link to="/" className="font-semibold text-navy-700 hover:underline">
              Ver loja →
            </Link>
          </div>
        </div>
      </header>
      <main className="wrap py-8">
        <div className="mb-6 inline-grid grid-cols-2 rounded-full bg-paper-2 p-1" role="tablist">
          {(
            [
              ['pedidos', 'Pedidos'],
              ['produtos', 'Produtos e fotos'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`h-11 rounded-full px-5 text-sm font-semibold ${tab === id ? 'bg-white shadow' : 'text-mute'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'produtos' ? (
          <ProductsPhotos />
        ) : (
          <>
            <h1 className="display text-3xl font-semibold">Visão geral</h1>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ['Faturamento (pagos)', money(revenue)],
                ['Pedidos', String(orders.length)],
                ['Ticket médio', money(paid.length ? revenue / paid.length : 0)],
                ['Clientes', String(users.length)],
              ].map(([l, v]) => (
                <div key={l} className="rounded-3xl border border-line bg-white p-5">
                  <p className="text-xs text-mute">{l}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{v}</p>
                </div>
              ))}
            </div>

            <div className="no-scrollbar mt-8 -mx-4 flex gap-2 overflow-x-auto px-4">
              <button type="button" className="chip" aria-pressed={filter === 'todos'} onClick={() => setFilter('todos')}>
                Todos · {orders.length}
              </button>
              {[...STATUS_FLOW, 'cancelado' as const].map((s) => (
                <button key={s} type="button" className="chip" aria-pressed={filter === s} onClick={() => setFilter(s)}>
                  {s === 'aguardando' ? 'Aguardando pgto' : s === 'producao' ? 'Em produção' : s.charAt(0).toUpperCase() + s.slice(1)} ·{' '}
                  {count(s)}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {list.length === 0 && (
                <p className="rounded-3xl border border-dashed border-line-2 p-10 text-center text-sm text-mute">
                  Nenhum pedido aqui. Faça uma compra na loja para vê-la chegar neste painel.
                </p>
              )}
              {list.map((o) => (
                <OrderRow key={o.id} o={o} open={open === o.id} onToggle={() => setOpen(open === o.id ? '' : o.id)} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function OrderRow({ o, open, onToggle }: { o: Order; open: boolean; onToggle: () => void }) {
  const i = STATUS_FLOW.indexOf(o.status)
  const next = i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null
  return (
    <div className="rounded-3xl border border-line bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left"
        aria-expanded={open}
      >
        <span className="font-semibold">{o.id}</span>
        <span className="text-sm text-mute">{o.customer.name}</span>
        <span className="text-sm text-mute">{formatDate(o.createdAt, true)}</span>
        <span className="ml-auto flex items-center gap-3">
          <span className="text-sm font-semibold tabular-nums">{money(o.total)}</span>
          <StatusPill order={o} />
          <ChevronDown size={18} className={open ? 'rotate-180' : ''} />
        </span>
      </button>
      {open && (
        <div className="grid gap-6 border-t border-line p-4 md:grid-cols-2 md:p-6">
          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-1 text-xs font-semibold text-mute uppercase">Itens</p>
              {o.items.map((it, k) => (
                <div key={k} className="flex gap-2 py-1.5">
                  {it.photo ? (
                    <img src={it.photo} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <ProductImage productId={it.productId} color={it.color} className="h-12 w-12 rounded-lg" />
                  )}
                  <div>
                    <p className="font-medium">
                      {it.qty}× {it.name}
                    </p>
                    <p className="text-xs text-mute">{it.variant.join(' · ')}</p>
                    {it.personalization && <p className="text-xs font-medium text-navy-700">Personalização: “{it.personalization}”</p>}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-mute uppercase">Cliente</p>
              <p>
                {o.customer.name} · CPF {o.customer.cpf}
                <br />
                {o.customer.email} · {o.customer.phone}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-mute uppercase">Entrega · {o.shippingOption.label}</p>
              {o.address ? (
                <p>
                  {o.address.recipient} — {o.address.street}, {o.address.number} {o.address.complement}
                  <br />
                  {o.address.district} · {o.address.city}/{o.address.uf} · {maskCEP(o.address.cep)}
                </p>
              ) : (
                <p className="text-mute">{o.digitalOnly ? 'Entrega digital' : 'Retirada no ateliê'}</p>
              )}
              {o.notes && <p className="mt-2 rounded-lg bg-paper px-2 py-1 text-xs">Obs.: {o.notes}</p>}
            </div>
          </div>
          <div>
            <Timeline order={o} />
            <div className="mt-5 flex flex-wrap gap-2">
              {next && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => advanceOrder(o.id)}>
                  Marcar como “{statusLabel(o, next)}”
                </button>
              )}
              {o.status !== 'cancelado' && o.status !== 'entregue' && (
                <button
                  type="button"
                  className="btn btn-sm text-err hover:bg-err-50"
                  onClick={() => setOrderStatus(o.id, 'cancelado', 'Cancelado pela loja.')}
                >
                  Cancelar pedido
                </button>
              )}
              <Link to={`/pedido/${o.id}?email=${encodeURIComponent(o.customer.email)}`} className="btn btn-ghost btn-sm">
                Ver como cliente
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductsPhotos() {
  const byId = photoStore.use((s) => s.byId)
  const [busy, setBusy] = useState('')
  const usedMb = storedPhotosBytes() / 1_000_000

  const upload = async (productId: string, files: FileList | null) => {
    if (!files?.length) return
    setBusy(productId)
    try {
      const urls: string[] = []
      for (const f of Array.from(files)) urls.push(await resizeImage(f, 1000))
      addPhotos(productId, urls)
      toast(urls.length === 1 ? 'Foto adicionada' : `${urls.length} fotos adicionadas`)
    } catch (e) {
      toast((e as Error).message, 'err')
    } finally {
      setBusy('')
    }
  }

  return (
    <div>
      <h1 className="display text-3xl font-semibold">Produtos e fotos</h1>
      <div className="mt-3 max-w-3xl space-y-1 text-sm text-mute">
        <p>
          Tire as fotos com o celular e envie aqui: elas aparecem na hora na loja, na vitrine, na página do produto e no carrinho. A
          primeira foto é a capa.
        </p>
        <p>
          As fotos enviadas por aqui ficam guardadas só neste navegador (usado: {usedMb.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} de ~4,5 MB). Para ficarem definitivas
          para todos os clientes, envie as fotos para a equipe de desenvolvimento colocar na pasta{' '}
          <code className="rounded bg-paper-2 px-1">src/assets/produtos/</code>.
        </p>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PRODUCTS.map((p) => {
          const mine = byId[p.id] ?? []
          return (
            <div key={p.id} className="flex flex-col gap-3 rounded-3xl border border-line bg-white p-4">
              <div className="flex items-center gap-3">
                <ProductImage p={p} className="h-14 w-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <Link to={p.href ?? `/p/${p.slug}`} className="line-clamp-2 text-sm leading-snug font-semibold hover:underline">
                    {p.name}
                  </Link>
                  <p className="text-xs text-mute">
                    {money(p.price)} · estoque {p.stock ?? '—'} ·{' '}
                    {mine.length ? `${mine.length} foto(s) enviada(s)` : hasBundledPhotos(p.slug) ? 'fotos do projeto' : 'sem foto'}
                  </p>
                </div>
              </div>
              {mine.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {mine.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt="" className="h-16 w-16 rounded-lg object-cover ring-1 ring-line" />
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 rounded bg-navy-900/80 px-1 text-[9px] font-bold text-white">CAPA</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(p.id, i)}
                        className="absolute -top-2 -right-2 grid h-7 w-7 place-items-center rounded-full bg-white text-err shadow ring-1 ring-line"
                        aria-label={`Remover foto ${i + 1} de ${p.name}`}
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className={`btn btn-ghost btn-sm mt-auto cursor-pointer ${busy === p.id ? 'opacity-60' : ''}`}>
                <Upload size={16} /> {busy === p.id ? 'Enviando…' : mine.length ? 'Adicionar mais fotos' : 'Enviar fotos'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    upload(p.id, e.target.files)
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}
