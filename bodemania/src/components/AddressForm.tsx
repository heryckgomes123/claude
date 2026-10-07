import { useState } from 'react'
import { uid } from '../lib/format'
import { maskCEP } from '../lib/masks'
import { lookupCep } from '../lib/shipping'
import { isCEP } from '../lib/validate'
import type { SavedAddress } from '../state/shop'
import { Field } from './ui'

const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')

export default function AddressForm({
  initial,
  recipient,
  onSave,
  onCancel,
  submitLabel = 'Salvar endereço',
}: {
  initial?: SavedAddress
  recipient: string
  onSave: (a: SavedAddress) => void | Promise<void>
  onCancel?: () => void
  submitLabel?: string
}) {
  const [a, setA] = useState<SavedAddress>(
    initial ?? { id: uid('a'), label: 'Casa', recipient, cep: '', street: '', number: '', complement: '', district: '', city: '', uf: '' },
  )
  const [loading, setLoading] = useState(false)
  const [cepMsg, setCepMsg] = useState('')
  const [touched, setTouched] = useState(false)
  const [found, setFound] = useState(!!initial)

  const set = (k: keyof SavedAddress) => (e: { target: { value: string } }) => setA((s) => ({ ...s, [k]: e.target.value }))

  const fetchCep = async (value: string) => {
    if (!isCEP(value)) return
    setLoading(true)
    setCepMsg('')
    const r = await lookupCep(value)
    setLoading(false)
    if (!r) {
      setCepMsg('CEP não encontrado. Confira ou preencha manualmente.')
      setFound(true)
      return
    }
    setFound(true)
    setA((s) => ({ ...s, ...r, street: r.street || s.street, district: r.district || s.district, city: r.city || s.city }))
    if (!r.city) setCepMsg('Sem conexão para buscar o endereço — preencha os campos abaixo.')
  }

  const errors = {
    cep: !isCEP(a.cep) ? 'CEP inválido.' : '',
    street: !a.street.trim() ? 'Informe a rua.' : '',
    number: !a.number.trim() ? 'Informe o número (ou S/N).' : '',
    district: !a.district.trim() ? 'Informe o bairro.' : '',
    city: !a.city.trim() ? 'Informe a cidade.' : '',
    uf: !UFS.includes(a.uf) ? 'UF' : '',
    recipient: a.recipient.trim().length < 3 ? 'Quem vai receber?' : '',
  }
  const e = (k: keyof typeof errors) => (touched ? errors[k] : '')

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(ev) => {
        ev.preventDefault()
        setTouched(true)
        if (!found) return fetchCep(a.cep)
        if (Object.values(errors).some(Boolean)) return
        onSave({ ...a, cep: a.cep.replace(/\D/g, '') })
      }}
    >
      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <Field
          label="CEP"
          name="cep"
          inputMode="numeric"
          autoComplete="postal-code"
          value={maskCEP(a.cep)}
          onChange={(ev) => {
            const v = maskCEP(ev.target.value)
            setA((s) => ({ ...s, cep: v }))
            if (isCEP(v)) fetchCep(v)
          }}
          error={e('cep')}
          placeholder="00000-000"
        />
        <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noreferrer" className="mb-3.5 text-xs text-mute underline">
          Não sei
        </a>
      </div>
      {loading && <p className="text-sm text-mute">Buscando endereço…</p>}
      {cepMsg && <p className="text-xs font-medium text-gold-700">{cepMsg}</p>}
      {found && (
        <>
          <Field label="Rua / Avenida" name="street" autoComplete="address-line1" value={a.street} onChange={set('street')} error={e('street')} />
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <Field label="Número" name="number" inputMode="numeric" value={a.number} onChange={set('number')} error={e('number')} />
            <Field label="Complemento" name="complement" autoComplete="address-line2" value={a.complement} onChange={set('complement')} placeholder="Apto, bloco… (opcional)" />
          </div>
          <Field label="Bairro" name="district" value={a.district} onChange={set('district')} error={e('district')} />
          <div className="grid grid-cols-[1fr_96px] gap-3">
            <Field label="Cidade" name="city" autoComplete="address-level2" value={a.city} onChange={set('city')} error={e('city')} />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">UF</span>
              <select className="field" value={a.uf} onChange={set('uf')} aria-invalid={!!e('uf')}>
                <option value="">—</option>
                {UFS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Quem vai receber" name="recipient" autoComplete="name" value={a.recipient} onChange={set('recipient')} error={e('recipient')} />
            <div>
              <span className="mb-1.5 block text-sm font-medium">Identificar como</span>
              <div className="flex gap-2">
                {['Casa', 'Trabalho', 'Loja'].map((l) => (
                  <button key={l} type="button" className="chip !min-h-[50px] flex-1" aria-pressed={a.label === l} onClick={() => setA((s) => ({ ...s, label: l }))}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button type="button" className="btn btn-ghost flex-1" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button className="btn btn-primary flex-1">{found ? submitLabel : 'Buscar CEP'}</button>
      </div>
    </form>
  )
}

export function AddressText({ a }: { a: SavedAddress }) {
  return (
    <span className="text-sm leading-relaxed">
      <span className="font-semibold">{a.recipient}</span> <span className="rounded bg-paper-2 px-1.5 py-0.5 text-[0.68rem] font-semibold text-mute uppercase">{a.label}</span>
      <br />
      {a.street}, {a.number}
      {a.complement && ` — ${a.complement}`}
      <br />
      {a.district} · {a.city}/{a.uf} · CEP {maskCEP(a.cep)}
    </span>
  )
}
