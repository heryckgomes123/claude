import { useEffect, useState } from 'react'
import { api, type AdminCoupon } from '../api'
import { formatDate, money } from '../lib/format'
import { messageOf, toast } from '../state/shop'
import { Field } from '../components/ui'

const EMPTY: AdminCoupon = { code: '', label: '', percent: 0.1, amount: null, freeShipping: false, minSubtotal: null, maxUses: null, uses: 0, expiresAt: null, active: true }
const num = (v: string) => {
  const n = Number(v.replace(',', '.'))
  return v.trim() && Number.isFinite(n) ? n : null
}

export function AdminCoupons() {
  const [list, setList] = useState<AdminCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<AdminCoupon | null>(null)
  const [kind, setKind] = useState<'percent' | 'amount' | 'free'>('percent')
  const [value, setValue] = useState('10')
  const reload = () => api.admin.loadCoupons().then(setList).catch((e) => toast(messageOf(e), 'err')).finally(() => setLoading(false))
  useEffect(() => void reload(), [])

  const save = async (c: AdminCoupon) => {
    try {
      await api.admin.saveCoupon(c)
      toast('Cupom salvo')
      setDraft(null)
      await reload()
    } catch (e) {
      toast(messageOf(e), 'err')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="display text-3xl font-semibold">Cupons</h1>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => (setKind('percent'), setValue('10'), setDraft({ ...EMPTY }))}>
          Novo cupom
        </button>
      </div>

      {draft && (
        <form
          className="mt-5 grid gap-4 rounded-3xl border border-line bg-white p-5 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            const v = num(value)
            void save({ ...draft, percent: kind === 'percent' && v ? v / 100 : null, amount: kind === 'amount' ? v : null, freeShipping: kind === 'free' })
          }}
        >
          <Field label="Código" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} required maxLength={24} disabled={list.some((c) => c.code === draft.code && draft.uses > 0)} />
          <Field label="Descrição (aparece para o cliente)" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} required maxLength={60} />
          <div>
            <span className="mb-1.5 block text-sm font-medium">Tipo de desconto</span>
            <div className="flex gap-2">
              {([['percent', '% do pedido'], ['amount', 'Valor fixo'], ['free', 'Frete grátis']] as const).map(([k, l]) => (
                <button key={k} type="button" className="chip flex-1 justify-center" aria-pressed={kind === k} onClick={() => setKind(k)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {kind !== 'free' && <Field label={kind === 'percent' ? 'Percentual (ex.: 10)' : 'Valor em R$'} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} required />}
          <Field label="Pedido mínimo (R$, opcional)" inputMode="decimal" value={draft.minSubtotal ?? ''} onChange={(e) => setDraft({ ...draft, minSubtotal: num(e.target.value) })} />
          <Field label="Limite de usos (opcional)" inputMode="numeric" value={draft.maxUses ?? ''} onChange={(e) => setDraft({ ...draft, maxUses: num(e.target.value) })} />
          <Field label="Vale até (opcional)" type="date" value={draft.expiresAt?.slice(0, 10) ?? ''} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value ? `${e.target.value}T23:59:59-03:00` : null })} />
          <div className="flex items-end gap-2">
            <button className="btn btn-primary">Salvar cupom</button>
            <button type="button" className="btn btn-ghost" onClick={() => setDraft(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="mt-5 overflow-x-auto rounded-3xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-mute">
            <tr className="border-b border-line">
              {['Código', 'Desconto', 'Mínimo', 'Usos', 'Validade', 'Ativo'].map((h) => (
                <th key={h} className="p-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-mute">
                  Carregando…
                </td>
              </tr>
            )}
            {!loading && !list.length && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-mute">
                  Nenhum cupom ainda.
                </td>
              </tr>
            )}
            {list.map((c) => (
              <tr key={c.code}>
                <td className="p-3 font-semibold">{c.code}<br /><span className="text-xs font-normal text-mute">{c.label}</span></td>
                <td className="p-3">{c.freeShipping ? 'Frete grátis' : c.percent ? `${Math.round(c.percent * 1000) / 10}%` : money(c.amount ?? 0)}</td>
                <td className="p-3 tabular-nums">{c.minSubtotal ? money(c.minSubtotal) : '—'}</td>
                <td className="p-3 tabular-nums">{c.uses}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                <td className="p-3">{c.expiresAt ? formatDate(c.expiresAt) : 'sem prazo'}</td>
                <td className="p-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-5 w-5 accent-navy-900" checked={c.active} onChange={(e) => save({ ...c, active: e.target.checked })} aria-label={`Cupom ${c.code} ativo`} />
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AdminCustomers() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof api.admin.loadCustomers>>>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.admin.loadCustomers().then(setRows).catch((e) => toast(messageOf(e), 'err')).finally(() => setLoading(false))
  }, [])
  return (
    <div>
      <h1 className="display text-3xl font-semibold">Clientes</h1>
      <p className="mt-1 text-sm text-mute">{rows.length} cadastros</p>
      <div className="mt-5 overflow-x-auto rounded-3xl border border-line bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs text-mute">
            <tr className="border-b border-line">
              {['Nome', 'E-mail', 'Celular', 'Desde'].map((h) => (
                <th key={h} className="p-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-mute">
                  Carregando…
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="p-3 font-medium">{u.name || '—'}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.phone}</td>
                <td className="p-3">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
