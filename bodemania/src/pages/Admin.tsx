/**
 * Painel da loja. Produção: só entra quem tem papel "admin" no banco (cadastro normal + promoção por SQL).
 * Demonstração (sem banco): senha fixa, só para mostrar o fluxo.
 */
import { useEffect, useState } from 'react'
import { api } from '../api'
import { STORE } from '../config/store'
import { formatDate, money } from '../lib/format'
import { maskCEP } from '../lib/masks'
import { Link } from '../router'
import { STATUS_FLOW, dbStore, messageOf, statusLabel, toast, useSessionReady, useUser, type Order, type OrderItem, type OrderStatus } from '../state/shop'
import { ChevronDown, Copy, Lock } from '../components/Icons'
import Logo from '../components/Logo'
import ProductImage from '../components/ProductImage'
import { AuthForms } from './Auth'
import { AdminCoupons, AdminCustomers } from './AdminExtras'
import { AdminProducts } from './AdminProducts'
import { StatusPill, Timeline } from './OrderPage'

const DEMO_PASS = 'bodemania'
type Tab = 'pedidos' | 'produtos' | 'cupons' | 'clientes'

export default function Admin() {
  const user = useUser()
  const ready = useSessionReady()
  const [demoOk, setDemoOk] = useState(() => {
    try {
      return sessionStorage.getItem('bm.admin') === '1'
    } catch {
      return false
    }
  })
  const [pass, setPass] = useState('')
  const [err, setErr] = useState(false)

  if (api.mode === 'supabase') {
    if (!ready) return <Shell>Carregando…</Shell>
    if (!user)
      return (
        <Shell>
          <h1 className="mb-1 flex items-center gap-2 text-xl font-semibold">
            <Lock size={20} /> Painel da loja
          </h1>
          <p className="mb-5 text-sm text-mute">Entre com a conta da equipe.</p>
          <AuthForms onDone={() => undefined} />
        </Shell>
      )
    if (user.role !== 'admin')
      return (
        <Shell>
          <h1 className="text-xl font-semibold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-mute">A conta {user.email} não tem permissão de administrador. Peça para a equipe liberar o acesso.</p>
          <Link to="/" className="btn btn-primary mt-5 w-full">
            Voltar para a loja
          </Link>
        </Shell>
      )
    return <Dashboard />
  }

  if (!demoOk)
    return (
      <Shell>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (pass !== DEMO_PASS) return setErr(true)
            try {
              sessionStorage.setItem('bm.admin', '1')
            } catch {
              /* ignora */
            }
            setDemoOk(true)
          }}
        >
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Lock size={20} /> Painel da loja
          </h1>
          <input type="password" className="field mt-4" placeholder="Senha" value={pass} onChange={(e) => setPass(e.target.value)} aria-invalid={err} autoFocus aria-label="Senha" />
          {err && <p className="mt-1 text-xs text-err">Senha incorreta.</p>}
          <button className="btn btn-primary mt-4 w-full">Entrar</button>
          <p className="mt-3 text-center text-xs text-mute">
            Demonstração — senha: <b>{DEMO_PASS}</b>
          </p>
        </form>
      </Shell>
    )
  return <Dashboard />
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-navy-950 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6">
        <Logo compact />
        <div className="mt-6">{children}</div>
        <Link to="/" className="mt-4 block text-center text-sm text-navy-700 underline">
          Voltar para a loja
        </Link>
      </div>
    </div>
  )
}

function Dashboard() {
  const [tab, setTab] = useState<Tab>('pedidos')
  const tabs: [Tab, string][] = [
    ['pedidos', 'Pedidos'],
    ['produtos', 'Produtos'],
    ...(api.mode === 'supabase' ? ([['cupons', 'Cupons'], ['clientes', 'Clientes']] as [Tab, string][]) : []),
  ]
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-white">
        <div className="wrap flex h-16 items-center justify-between">
          <Logo compact />
          <div className="flex items-center gap-4 text-sm">
            {STORE.demo && <span className="hidden rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold text-gold-700 sm:inline">Painel · demonstração</span>}
            <Link to="/" className="font-semibold text-navy-700 hover:underline">
              Ver loja →
            </Link>
          </div>
        </div>
      </header>
      <main className="wrap py-8">
        <div className="no-scrollbar -mx-4 mb-6 overflow-x-auto px-4">
          <div className="inline-flex rounded-full bg-paper-2 p-1" role="tablist">
            {tabs.map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`h-11 rounded-full px-5 text-sm font-semibold whitespace-nowrap ${tab === id ? 'bg-white shadow' : 'text-mute'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {tab === 'pedidos' && <OrdersTab />}
        {tab === 'produtos' && <AdminProducts />}
        {tab === 'cupons' && <AdminCoupons />}
        {tab === 'clientes' && <AdminCustomers />}
      </main>
    </div>
  )
}

function OrdersTab() {
  const orders = dbStore.use((s) => s.orders)
  const [filter, setFilter] = useState<OrderStatus | 'todos'>('todos')
  const [open, setOpen] = useState('')
  const [loading, setLoading] = useState(api.mode === 'supabase')

  useEffect(() => {
    if (api.mode !== 'supabase') return
    const load = () => api.admin.loadOrders().catch((e) => toast(messageOf(e), 'err')).finally(() => setLoading(false))
    void load()
    const t = window.setInterval(load, 30_000)
    return () => window.clearInterval(t)
  }, [])

  const paid = orders.filter((o) => o.status !== 'aguardando' && o.status !== 'cancelado')
  const revenue = paid.reduce((s, o) => s + o.total, 0)
  const list = filter === 'todos' ? orders : orders.filter((o) => o.status === filter)
  const count = (s: OrderStatus) => orders.filter((o) => o.status === s).length
  const todo = count('pago') + count('producao')

  return (
    <div>
      <h1 className="display text-3xl font-semibold">Pedidos</h1>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Faturamento (pagos)', money(revenue)],
          ['Pedidos', String(orders.length)],
          ['Para produzir/enviar', String(todo)],
          ['Ticket médio', money(paid.length ? revenue / paid.length : 0)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-3xl border border-line bg-white p-5">
            <p className="text-xs text-mute">{l}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <div className="no-scrollbar -mx-4 mt-8 flex gap-2 overflow-x-auto px-4">
        <button type="button" className="chip" aria-pressed={filter === 'todos'} onClick={() => setFilter('todos')}>
          Todos · {orders.length}
        </button>
        {[...STATUS_FLOW, 'cancelado' as const].map((s) => (
          <button key={s} type="button" className="chip" aria-pressed={filter === s} onClick={() => setFilter(s)}>
            {s === 'aguardando' ? 'Aguardando pgto' : s === 'producao' ? 'Em produção' : s.charAt(0).toUpperCase() + s.slice(1)} · {count(s)}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {loading && !orders.length && <p className="rounded-3xl border border-line bg-white p-10 text-center text-sm text-mute">Carregando pedidos…</p>}
        {!loading && list.length === 0 && <p className="rounded-3xl border border-dashed border-line-2 p-10 text-center text-sm text-mute">Nenhum pedido aqui ainda.</p>}
        {list.map((o) => (
          <OrderRow key={o.id} o={o} open={open === o.id} onToggle={() => setOpen(open === o.id ? '' : o.id)} />
        ))}
      </div>
    </div>
  )
}

function PrintInfo({ item }: { item: OrderItem }) {
  const p = item.print as Record<string, any> | undefined
  const [busy, setBusy] = useState(false)
  if (!p) return null
  const open = async (path: string) => {
    setBusy(true)
    try {
      window.open(await api.admin.signedUrl(path), '_blank', 'noopener')
    } catch (e) {
      toast(messageOf(e), 'err')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-1 rounded-lg bg-paper px-2 py-1.5 text-xs">
      <p>
        {p.origin === 'arquivo' ? 'Arquivo do cliente' : 'ESTIMATIVA por medidas — confirmar com o cliente'} · {String(p.material).toUpperCase()} {p.color} · {p.quality} · {p.infill}% · escala {p.scale}%
      </p>
      <p>
        ≈ {p.grams} g · ≈ {p.hours} h por peça · {Array.isArray(p.size) ? p.size.join(' × ') : ''} mm
      </p>
      {p.filePath && (
        <button type="button" className="mt-1 font-semibold text-navy-700 underline" disabled={busy} onClick={() => open(p.filePath)}>
          {busy ? 'Abrindo…' : 'Baixar arquivo STL'}
        </button>
      )}
    </div>
  )
}

function OrderRow({ o, open, onToggle }: { o: Order; open: boolean; onToggle: () => void }) {
  const i = STATUS_FLOW.indexOf(o.status)
  const next = i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null
  const [tracking, setTracking] = useState(o.tracking ?? '')
  const [busy, setBusy] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [refund, setRefund] = useState(true)
  const needsTracking = next === 'enviado' && !o.digitalOnly && o.shippingOption.id !== 'pickup'
  const canCancel = ['aguardando', 'pago', 'producao'].includes(o.status)
  const paidViaGateway = api.mode === 'supabase' && o.status !== 'aguardando'

  const run = async (status: OrderStatus, extra: { refund?: boolean; note?: string } = {}) => {
    setBusy(true)
    try {
      await api.admin.setStatus({ orderId: o.id, status, tracking: tracking || undefined, ...extra })
      toast(status === 'cancelado' ? 'Pedido cancelado' : 'Status atualizado e cliente avisado')
      setConfirmCancel(false)
    } catch (e) {
      toast(messageOf(e), 'err')
    } finally {
      setBusy(false)
    }
  }

  const copyAddress = () => {
    const a = o.address
    const text = a ? `${a.recipient}\n${a.street}, ${a.number} ${a.complement}\n${a.district} — ${a.city}/${a.uf}\nCEP ${maskCEP(a.cep)}\nTel. ${o.customer.phone}` : ''
    navigator.clipboard?.writeText(text).then(() => toast('Endereço copiado'), () => toast('Não foi possível copiar', 'err'))
  }

  return (
    <div className="rounded-3xl border border-line bg-white">
      <button type="button" onClick={onToggle} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left" aria-expanded={open}>
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
                    <a href={it.photo} target="_blank" rel="noreferrer" title="Abrir foto do cliente">
                      <img src={it.photo} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    </a>
                  ) : (
                    <ProductImage productId={it.productId} color={it.color} className="h-12 w-12 rounded-lg" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium">
                      {it.qty}× {it.name}
                    </p>
                    <p className="text-xs text-mute">{it.variant.join(' · ')}</p>
                    {it.personalization && <p className="text-xs font-medium text-navy-700">Personalização: “{it.personalization}”</p>}
                    <PrintInfo item={it} />
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
              <p className="mb-1 flex items-center justify-between text-xs font-semibold text-mute uppercase">
                <span>Entrega · {o.shippingOption.label}</span>
                {o.address && (
                  <button type="button" onClick={copyAddress} className="flex items-center gap-1 normal-case text-navy-700 underline">
                    <Copy size={13} /> copiar
                  </button>
                )}
              </p>
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
            <p className="text-xs text-mute">
              Pagamento: {o.payment.method}
              {o.payment.installments && o.payment.installments > 1 ? ` em ${o.payment.installments}x` : ''} · Total {money(o.total)} (frete {money(o.shipping)})
            </p>
          </div>
          <div>
            <Timeline order={o} />
            <div className="mt-5 space-y-3">
              {needsTracking && (
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-mute uppercase">Código de rastreio (Correios)</span>
                  <input className="field !min-h-11 uppercase" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="AA123456789BR" maxLength={30} />
                </label>
              )}
              <div className="flex flex-wrap gap-2">
                {next && (
                  <button type="button" className="btn btn-primary btn-sm" disabled={busy || (needsTracking && !tracking.trim())} onClick={() => run(next)}>
                    Marcar como “{statusLabel(o, next)}”
                  </button>
                )}
                {canCancel && !confirmCancel && (
                  <button type="button" className="btn btn-sm text-err hover:bg-err-50" onClick={() => setConfirmCancel(true)}>
                    Cancelar pedido
                  </button>
                )}
                <Link to={`/pedido/${o.id}`} className="btn btn-ghost btn-sm">
                  Ver como cliente
                </Link>
              </div>
              {confirmCancel && (
                <div className="rounded-2xl bg-err-50 p-3 text-sm">
                  <p className="font-semibold text-err">Cancelar {o.id}? O estoque volta e o cliente é avisado.</p>
                  {paidViaGateway && (
                    <label className="mt-2 flex items-center gap-2">
                      <input type="checkbox" className="h-5 w-5 accent-err" checked={refund} onChange={(e) => setRefund(e.target.checked)} /> Devolver o dinheiro ao cliente (estorno no Mercado Pago)
                    </label>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button type="button" className="btn btn-sm bg-err text-white" disabled={busy} onClick={() => run('cancelado', { refund: paidViaGateway && refund })}>
                      Sim, cancelar
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmCancel(false)}>
                      Voltar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
