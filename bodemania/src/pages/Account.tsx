import { useEffect, useState } from 'react'
import { formatDate, money } from '../lib/format'
import { maskCPF, maskPhone } from '../lib/masks'
import { isCPF, isFullName, isPhone } from '../lib/validate'
import { Link, navigate, useRoute } from '../router'
import { dbStore, logout, removeAddress, saveAddress, toast, updateUser, useUser, type SavedAddress } from '../state/shop'
import AddressForm, { AddressText } from '../components/AddressForm'
import { Box, Edit, Logout, MapPin, Plus, Trash, User } from '../components/Icons'
import { Empty, Field } from '../components/ui'
import { StatusPill } from './OrderPage'
import ProductImage from '../components/ProductImage'

type Tab = 'pedidos' | 'enderecos' | 'dados'

export default function Account({ tab = 'pedidos' }: { tab?: Tab }) {
  const user = useUser()
  const { path } = useRoute()
  useEffect(() => {
    if (!user) navigate(`/entrar?next=${encodeURIComponent(path)}`, { replace: true })
  }, [user, path])
  if (!user) return null
  const tabs: [Tab, string, typeof Box][] = [
    ['pedidos', 'Meus pedidos', Box],
    ['enderecos', 'Endereços', MapPin],
    ['dados', 'Meus dados', User],
  ]
  return (
    <div className="wrap py-6 md:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-mute">Olá,</p>
          <h1 className="display text-3xl font-semibold md:text-4xl">{user.name.split(' ')[0]} 👋</h1>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            logout()
            navigate('/')
          }}
        >
          <Logout size={16} /> Sair
        </button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0" aria-label="Minha conta">
          {tabs.map(([id, label, Icon]) => (
            <Link key={id} to={id === 'pedidos' ? '/conta' : `/conta/${id}`} className={`flex shrink-0 items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-semibold lg:rounded-2xl lg:py-3 ${tab === id ? 'bg-navy-900 text-white' : 'bg-white text-ink ring-1 ring-line hover:ring-line-2'}`}>
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>
        <div>
          {tab === 'pedidos' && <Orders userId={user.id} />}
          {tab === 'enderecos' && <Addresses />}
          {tab === 'dados' && <Profile />}
        </div>
      </div>
    </div>
  )
}

function Orders({ userId }: { userId: string }) {
  const all = dbStore.use((s) => s.orders)
  const orders = all.filter((o) => o.userId === userId)
  if (!orders.length)
    return (
      <div className="rounded-3xl border border-line bg-white">
        <Empty
          icon={<Box size={28} />}
          title="Nenhum pedido ainda"
          text="Quando você comprar, acompanha aqui a produção e a entrega, passo a passo."
          action={
            <Link to="/loja" className="btn btn-primary">
              Começar a comprar
            </Link>
          }
        />
      </div>
    )
  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <Link key={o.id} to={`/pedido/${o.id}`} className="block rounded-3xl border border-line bg-white p-4 transition hover:border-navy-700 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold">Pedido {o.id}</p>
              <p className="text-xs text-mute">
                {formatDate(o.createdAt)} · {o.items.reduce((s, i) => s + i.qty, 0)} itens · {money(o.total)}
              </p>
            </div>
            <StatusPill order={o} />
          </div>
          <div className="mt-3 flex items-center gap-2">
            {o.items.slice(0, 5).map((i, k) =>
              i.photo ? <img key={k} src={i.photo} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <ProductImage key={k} productId={i.productId} color={i.color} className="h-12 w-12 rounded-lg" />,
            )}
            {o.items.length > 5 && <span className="text-xs text-mute">+{o.items.length - 5}</span>}
            <span className="ml-auto text-sm font-semibold text-navy-700">Acompanhar →</span>
          </div>
        </Link>
      ))}
    </div>
  )
}

function Addresses() {
  const user = useUser()!
  const [editing, setEditing] = useState<SavedAddress | 'new' | null>(null)
  if (editing)
    return (
      <div className="rounded-3xl border border-line bg-white p-5 md:p-6">
        <h2 className="mb-4 text-lg font-semibold">{editing === 'new' ? 'Novo endereço' : 'Editar endereço'}</h2>
        <AddressForm
          initial={editing === 'new' ? undefined : editing}
          recipient={user.name}
          onCancel={() => setEditing(null)}
          onSave={(a) => {
            saveAddress(user.id, a)
            setEditing(null)
            toast('Endereço salvo')
          }}
        />
      </div>
    )
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {user.addresses.map((a) => (
        <div key={a.id} className="flex flex-col justify-between gap-3 rounded-3xl border border-line bg-white p-5">
          <AddressText a={a} />
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(a)}>
              <Edit size={15} /> Editar
            </button>
            <button
              type="button"
              className="btn btn-sm text-err hover:bg-err-50"
              onClick={() => {
                removeAddress(user.id, a.id)
                toast('Endereço removido', 'info')
              }}
            >
              <Trash size={15} /> Remover
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => setEditing('new')} className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-line-2 text-sm font-semibold text-navy-700 hover:border-navy-700">
        <Plus /> Adicionar endereço
      </button>
    </div>
  )
}

function Profile() {
  const user = useUser()!
  const [f, setF] = useState({ name: user.name, cpf: user.cpf, phone: user.phone, newsletter: user.newsletter })
  const [touched, setTouched] = useState(false)
  const errors = { name: !isFullName(f.name) ? 'Nome e sobrenome.' : '', cpf: !isCPF(f.cpf) ? 'CPF inválido.' : '', phone: !isPhone(f.phone) ? 'Celular com DDD.' : '' }
  const e = (k: keyof typeof errors) => (touched ? errors[k] : '')
  return (
    <form
      noValidate
      className="max-w-xl space-y-4 rounded-3xl border border-line bg-white p-5 md:p-6"
      onSubmit={(ev) => {
        ev.preventDefault()
        setTouched(true)
        if (Object.values(errors).some(Boolean)) return
        updateUser(user.id, f)
        toast('Dados atualizados')
      }}
    >
      <Field label="Nome completo" value={f.name} onChange={(ev) => setF((s) => ({ ...s, name: ev.target.value }))} error={e('name')} />
      <Field label="E-mail" value={user.email} disabled hint="Para trocar o e-mail, fale com o atendimento." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="CPF" inputMode="numeric" value={f.cpf} onChange={(ev) => setF((s) => ({ ...s, cpf: maskCPF(ev.target.value) }))} error={e('cpf')} />
        <Field label="Celular" inputMode="tel" value={f.phone} onChange={(ev) => setF((s) => ({ ...s, phone: maskPhone(ev.target.value) }))} error={e('phone')} />
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" className="h-5 w-5 accent-navy-900" checked={f.newsletter} onChange={(ev) => setF((s) => ({ ...s, newsletter: ev.target.checked }))} />
        Receber novidades e ofertas
      </label>
      <button className="btn btn-primary">Salvar alterações</button>
      <p className="border-t border-line pt-4 text-xs text-mute">
        Conforme a LGPD, você pode pedir a exportação ou exclusão dos seus dados a qualquer momento pelo e-mail de atendimento.
      </p>
    </form>
  )
}
