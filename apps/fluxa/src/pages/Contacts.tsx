import { useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { Avatar, Badge, Button, ChannelIcon, Empty, Modal, PageHeader, download, toast } from '../components/ui'
import { CHANNEL_LABEL, allTags, temperature, toCsv, type Temperature } from '../lib/audience'
import { navigate } from '../lib/router'
import type { Channel, Contact } from '../lib/types'
import { CHANNELS } from '../lib/types'
import { fullName, normalize, timeAgo, uid } from '../lib/util'
import { useStore } from '../store/store'

function newContact(partial: Partial<Contact>): Contact {
  const now = Date.now()
  return {
    id: uid('c'),
    firstName: '',
    lastName: '',
    channel: 'whatsapp',
    handle: '',
    avatarHue: Math.floor(Math.random() * 360),
    tags: [],
    fields: {},
    score: 0,
    subscribed: true,
    botPaused: false,
    createdAt: now,
    lastInboundAt: 0,
    lastActivityAt: now,
    unread: 0,
    messages: [],
    sequences: [],
    ...partial,
  }
}

/** CSV simples com aspas; aceita vírgula ou ponto e vírgula. */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const split = (line: string) => {
    const out: string[] = []
    let cur = ''
    let quoted = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"' && quoted && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') quoted = !quoted
      else if (ch === sep && !quoted) {
        out.push(cur)
        cur = ''
      } else cur += ch
    }
    out.push(cur)
    return out.map((v) => v.trim())
  }
  const header = split(lines[0]).map((h) => normalize(h).replace(/\s+/g, '_'))
  return lines.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [header[i] ?? `col${i}`, v])))
}

const CHANNEL_ALIASES: Record<string, Channel> = { instagram: 'instagram', ig: 'instagram', whatsapp: 'whatsapp', wpp: 'whatsapp', zap: 'whatsapp', messenger: 'messenger', facebook: 'messenger', telegram: 'telegram', site: 'web', web: 'web' }

export function Contacts() {
  const contacts = useStore((s) => s.contacts)
  const settings = useStore((s) => s.settings)
  const updateContact = useStore((s) => s.updateContact)
  const deleteContacts = useStore((s) => s.deleteContacts)
  const addContact = useStore((s) => s.addContact)
  const [query, setQuery] = useState('')
  const [channel, setChannel] = useState<Channel | ''>('')
  const [tag, setTag] = useState('')
  const [temp, setTemp] = useState<Temperature | ''>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkTag, setBulkTag] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', channel: 'whatsapp' as Channel, handle: '', email: '', tags: '' })
  const fileInput = useRef<HTMLInputElement>(null)

  const real = contacts.filter((c) => !c.isTest)
  const tags = allTags(real)
  const list = useMemo(() => {
    const q = normalize(query)
    return real
      .filter((c) => !channel || c.channel === channel)
      .filter((c) => !tag || c.tags.some((t) => normalize(t) === normalize(tag)))
      .filter((c) => !temp || temperature(c.score, settings.hotLeadScore) === temp)
      .filter((c) => !q || normalize(`${fullName(c)} ${c.handle} ${Object.values(c.fields).join(' ')} ${c.tags.join(' ')}`).includes(q))
      .sort((a, b) => b.lastActivityAt - a.lastActivityAt)
  }, [real, channel, tag, temp, query, settings.hotLeadScore])

  const allChecked = list.length > 0 && list.every((c) => selected.has(c.id))
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(list.map((c) => c.id)))
  const ids = [...selected].filter((id) => list.some((c) => c.id === id))

  const bulk = (fn: (c: Contact) => Contact, message: string) => {
    for (const id of ids) updateContact(id, fn)
    toast(message)
  }

  const importCsv = async (file: File) => {
    const rows = parseCsv(await file.text())
    let count = 0
    for (const r of rows) {
      const firstName = r.nome ?? r.first_name ?? r.name ?? ''
      if (!firstName && !r.usuario && !r.telefone && !r.email) continue
      const { nome: _n, sobrenome, canal, usuario, tags: t, pontuacao, ...rest } = r
      void _n
      addContact(
        newContact({
          firstName,
          lastName: sobrenome ?? r.last_name ?? '',
          channel: CHANNEL_ALIASES[normalize(canal ?? '')] ?? 'whatsapp',
          handle: usuario ?? r.telefone ?? r.email ?? '',
          tags: (t ?? '')
            .split(/[|,]/)
            .map((x) => x.trim())
            .filter(Boolean),
          score: Number(pontuacao) || 0,
          fields: Object.fromEntries(Object.entries(rest).filter(([k, v]) => v && !['inscrito', 'criado_em', 'last_name', 'first_name', 'name'].includes(k))),
        }),
      )
      count++
    }
    toast(count ? `${count} contato(s) importado(s).` : 'Nenhum contato encontrado no arquivo.', count ? 'ok' : 'error')
  }

  return (
    <>
      <PageHeader
        title="Contatos"
        subtitle="Sua audiência em todos os canais, com tags, campos personalizados e pontuação de lead."
        actions={
          <>
            <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0]).finally(() => (e.target.value = ''))} />
            <Button icon="upload" onClick={() => fileInput.current?.click()}>
              Importar CSV
            </Button>
            <Button icon="download" onClick={() => download('contatos-fluxa.csv', toCsv(list), 'text/csv;charset=utf-8')}>
              Exportar
            </Button>
            <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
              Novo contato
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
        <label className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute-600">
            <Icon name="search" size={15} />
          </span>
          <input className="field !pl-9" placeholder="Buscar por nome, usuário, e-mail, tag…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar contatos" />
        </label>
        <select className="field lg:w-40" value={channel} onChange={(e) => setChannel(e.target.value as Channel | '')} aria-label="Filtrar por canal">
          <option value="">Todos os canais</option>
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {CHANNEL_LABEL[c]}
            </option>
          ))}
        </select>
        <select className="field lg:w-44" value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filtrar por tag">
          <option value="">Todas as tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select className="field lg:w-40" value={temp} onChange={(e) => setTemp(e.target.value as Temperature | '')} aria-label="Filtrar por temperatura">
          <option value="">Toda temperatura</option>
          <option value="quente">Quente</option>
          <option value="morno">Morno</option>
          <option value="frio">Frio</option>
        </select>
      </div>

      {ids.length > 0 && (
        <div className="pop-in mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-brand-600/40 bg-brand/5 px-4 py-2.5 text-[13px]">
          <b>{ids.length} selecionado(s)</b>
          <input className="field !h-8 !w-40 !py-0" list="bulk-tags" placeholder="tag" value={bulkTag} onChange={(e) => setBulkTag(e.target.value)} aria-label="Tag para aplicar" />
          <datalist id="bulk-tags">
            {tags.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <Button size="sm" disabled={!bulkTag.trim()} onClick={() => bulk((c) => (c.tags.includes(bulkTag.trim()) ? c : { ...c, tags: [...c.tags, bulkTag.trim()] }), 'Tag adicionada.')}>
            Adicionar tag
          </Button>
          <Button size="sm" disabled={!bulkTag.trim()} onClick={() => bulk((c) => ({ ...c, tags: c.tags.filter((t) => normalize(t) !== normalize(bulkTag)) }), 'Tag removida.')}>
            Remover tag
          </Button>
          <Button size="sm" onClick={() => bulk((c) => ({ ...c, subscribed: false }), 'Contatos descadastrados das transmissões.')}>
            Descadastrar
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon="trash"
            onClick={() => {
              if (!window.confirm(`Excluir ${ids.length} contato(s) e suas conversas?`)) return
              deleteContacts(ids)
              setSelected(new Set())
              toast('Contatos excluídos.')
            }}
          >
            Excluir
          </Button>
        </div>
      )}

      {list.length === 0 ? (
        <Empty icon="users" title="Nenhum contato" text={real.length ? 'Nenhum contato corresponde aos filtros.' : 'Contatos chegam sozinhos pelas automações, ou importe um CSV.'} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="border-b border-ink-800 text-left text-[11px] uppercase tracking-wider text-mute-600">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Selecionar todos" className="accent-[var(--color-brand)]" />
                </th>
                <th className="py-3 pr-3 font-medium">Contato</th>
                <th className="px-3 py-3 font-medium">Canal</th>
                <th className="px-3 py-3 font-medium">Tags</th>
                <th className="px-3 py-3 text-right font-medium">Pontuação</th>
                <th className="px-4 py-3 text-right font-medium">Última atividade</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const t = temperature(c.score, settings.hotLeadScore)
                return (
                  <tr key={c.id} className="cursor-pointer border-b border-ink-850 transition last:border-0 hover:bg-ink-850" onClick={() => navigate(`/inbox/${c.id}`)}>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => {
                          const next = new Set(selected)
                          if (next.has(c.id)) next.delete(c.id)
                          else next.add(c.id)
                          setSelected(next)
                        }}
                        aria-label={`Selecionar ${fullName(c)}`}
                        className="accent-[var(--color-brand)]"
                      />
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={fullName(c)} hue={c.avatarHue} size={32} />
                        <div className="min-w-0">
                          <div className="font-medium">
                            {fullName(c) || 'Sem nome'}
                            {!c.subscribed && <span className="ml-2 text-[11px] text-mute-600">descadastrado</span>}
                          </div>
                          <div className="truncate text-[12px] text-mute-600">{c.fields.email ?? c.handle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5 text-mute">
                        <ChannelIcon channel={c.channel} /> {CHANNEL_LABEL[c.channel]}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex max-w-[260px] flex-wrap gap-1">
                        {c.tags.slice(0, 3).map((x) => (
                          <span key={x} className="rounded-md bg-ink-800 px-1.5 py-0.5 text-[11.5px] text-mute">
                            {x}
                          </span>
                        ))}
                        {c.tags.length > 3 && <span className="text-[11.5px] text-mute-600">+{c.tags.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Badge tone={t === 'quente' ? 'brand' : t === 'morno' ? 'info' : 'default'}>
                        {c.score} · {t}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-mute-600">{timeAgo(c.lastActivityAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[12px] text-mute-600">
        {list.length} de {real.length} contatos · CSV aceita as colunas nome, sobrenome, canal, usuario, tags (separadas por |), pontuacao e qualquer campo extra (email, telefone…).
      </p>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Novo contato"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={!form.firstName.trim()}
              onClick={() => {
                const contact = newContact({
                  firstName: form.firstName.trim(),
                  lastName: form.lastName.trim(),
                  channel: form.channel,
                  handle: form.handle.trim(),
                  fields: form.email.trim() ? { email: form.email.trim() } : {},
                  tags: form.tags
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
                addContact(contact)
                setCreating(false)
                setForm({ firstName: '', lastName: '', channel: 'whatsapp', handle: '', email: '', tags: '' })
                toast('Contato criado.')
              }}
            >
              Salvar
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="label">Nome</span>
            <input className="field" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </label>
          <label>
            <span className="label">Sobrenome</span>
            <input className="field" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </label>
          <label>
            <span className="label">Canal</span>
            <select className="field" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as Channel })}>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Usuário ou telefone</span>
            <input className="field" value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} />
          </label>
          <label className="sm:col-span-2">
            <span className="label">E-mail</span>
            <input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="sm:col-span-2">
            <span className="label">Tags (separadas por vírgula)</span>
            <input className="field" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </label>
        </div>
      </Modal>
    </>
  )
}
