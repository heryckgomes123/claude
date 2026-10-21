import { useEffect, useMemo, useState } from 'react'
import { ChatThread } from '../components/ChatThread'
import { Icon } from '../components/Icon'
import { Avatar, Badge, Button, ChannelBadge, ChannelIcon, ChipInput, IconButton, Tabs, Toggle, toast } from '../components/ui'
import { claudeSuggest, claudeSummarize, describeAiError } from '../lib/ai'
import { allTags, temperature } from '../lib/audience'
import { navigate } from '../lib/router'
import type { Contact } from '../lib/types'
import { fullName, insideWindow, interpolate, normalize, timeAgo } from '../lib/util'
import { clickButton, receive, sendAgentMessage, setBotPaused, startAutomation } from '../store/runtime'
import { useStore } from '../store/store'

type Filter = 'all' | 'unread' | 'human' | 'test'

function ContactList({ selectedId }: { selectedId?: string }) {
  const contacts = useStore((s) => s.contacts)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const list = useMemo(() => {
    const q = normalize(query)
    return contacts
      .filter((c) => c.messages.length > 0 || c.isTest)
      .filter((c) => (filter === 'test' ? c.isTest : !c.isTest))
      .filter((c) => (filter === 'unread' ? c.unread > 0 : filter === 'human' ? c.botPaused : true))
      .filter((c) => !q || normalize(`${fullName(c)} ${c.handle} ${c.messages.at(-1)?.text ?? ''}`).includes(q))
      .sort((a, b) => b.lastActivityAt - a.lastActivityAt)
  }, [contacts, filter, query])

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-subtle p-3">
        <label className="relative block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
            <Icon name="search" size={15} />
          </span>
          <input className="field !pl-9" placeholder="Buscar conversa" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar conversas" />
        </label>
        <Tabs
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'all', label: 'Todas' },
            { id: 'unread', label: 'Não lidas', count: contacts.filter((c) => !c.isTest && c.unread > 0).length },
            { id: 'human', label: 'Time', count: contacts.filter((c) => !c.isTest && c.botPaused).length },
            { id: 'test', label: 'Testes' },
          ]}
        />
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {list.length === 0 && <li className="p-8 text-center text-[13px] text-faint">Nenhuma conversa aqui.</li>}
        {list.map((c) => {
          const last = c.messages.at(-1)
          return (
            <li key={c.id}>
              <a
                href={`#/inbox/${c.id}`}
                className={`flex gap-3 border-b border-sunken px-3 py-3 transition ${selectedId === c.id ? 'bg-brand-100/70 shadow-[inset_3px_0_0_var(--color-brand-500)]' : 'hover:bg-sunken'}`}
              >
                <Avatar name={fullName(c)} hue={c.avatarHue} isTest={c.isTest} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className={`truncate text-[13.5px] ${c.unread ? 'font-semibold' : 'font-medium'}`}>{fullName(c)}</span>
                    <ChannelIcon channel={c.channel} size={12} />
                    <span className="ml-auto shrink-0 text-[11px] text-faint">{timeAgo(c.lastActivityAt)}</span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5">
                    <span className={`truncate text-[12.5px] ${c.unread ? 'text-fg/90' : 'text-faint'}`}>
                      {last?.from === 'bot' ? '🤖 ' : last?.from === 'agent' ? 'Você: ' : ''}
                      {last?.text ?? ''}
                    </span>
                    {c.botPaused && <Icon name="hand" size={12} className="text-accent" />}
                    {c.unread > 0 && <span className="ml-auto shrink-0 rounded-full bg-brand px-1.5 text-[10.5px] font-bold text-navy">{c.unread}</span>}
                  </span>
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Conversation({ contact }: { contact: Contact }) {
  const automations = useStore((s) => s.automations)
  const savedReplies = useStore((s) => s.savedReplies)
  const settings = useStore((s) => s.settings)
  const [text, setText] = useState('')
  const [asContact, setAsContact] = useState(false)
  const [busy, setBusy] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const [startId, setStartId] = useState('')
  const aiOn = settings.ai.apiKey.trim() !== ''
  const open = insideWindow(contact)

  const submit = async () => {
    const value = text.trim()
    if (!value) return
    setText('')
    if (asContact) {
      setBusy(true)
      await receive(contact.id, { text: value })
      setBusy(false)
    } else {
      sendAgentMessage(contact.id, value)
    }
  }

  const suggest = async () => {
    setSuggesting(true)
    try {
      const reply = await claudeSuggest({ apiKey: settings.ai.apiKey, model: settings.ai.model, businessName: settings.businessName }, contact)
      if (reply) setText(reply)
      else toast('A IA não sugeriu uma resposta para esta conversa.', 'error')
    } catch (error) {
      toast(await describeAiError(error), 'error')
    } finally {
      setSuggesting(false)
    }
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-5 py-3">
        <IconButton icon="chevronLeft" label="Voltar" className="md:hidden" onClick={() => navigate('/inbox')} />
        <Avatar name={fullName(contact)} hue={contact.avatarHue} isTest={contact.isTest} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-semibold">{fullName(contact)}</div>
          <div className="flex items-center gap-2">
            <ChannelBadge channel={contact.channel} />
            <span className="truncate text-[12px] text-faint">{contact.handle}</span>
          </div>
        </div>
        <label className="flex items-center gap-2 text-[12.5px] text-muted" title="Pausar a automação faz a conversa ficar só com o time">
          <Toggle checked={!contact.botPaused} onChange={(v) => setBotPaused(contact.id, !v)} label={contact.botPaused ? 'Retomar automação' : 'Pausar automação'} />
          {contact.botPaused ? 'Com o time' : 'Automação ligada'}
        </label>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ChatThread
          messages={contact.messages}
          perspective="business"
          typing={busy}
          onButton={asContact ? (m, b) => clickButton(contact.id, m, b) : undefined}
          onQuickReply={asContact ? (_, q) => void receive(contact.id, { text: q.label, payload: q.id }) : undefined}
        />
      </div>

      {!open && !asContact && (
        <div className="mx-3 mb-2 flex items-start gap-2 rounded-lg border border-[#f1d58a] bg-[#fff8e5] px-3 py-2 text-[12px] text-[#6b4e00]">
          <Icon name="clock" size={14} className="mt-0.5" />
          Fora da janela de 24 h do {contact.channel === 'whatsapp' ? 'WhatsApp' : 'Meta'}: a plataforma só aceita mensagem de modelo aprovado até o contato responder.
        </div>
      )}

      <div className="m-3 mt-0 rounded-xl border border-line bg-surface p-3 shadow-card">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAsContact(!asContact)}
            className={`rounded-lg px-2.5 py-1 text-[11.5px] transition ${asContact ? 'bg-success/15 text-success' : 'text-faint hover:text-muted'}`}
            title="Escreva como se fosse o contato para testar as automações ativas"
          >
            {asContact ? '● Simulando o contato' : 'Simular mensagem do contato'}
          </button>
          {!asContact && (
            <>
              <button type="button" onClick={() => setShowReplies(!showReplies)} className="rounded-lg px-2.5 py-1 text-[11.5px] text-faint hover:text-muted">
                Respostas salvas
              </button>
              <button
                type="button"
                disabled={!aiOn || suggesting}
                onClick={suggest}
                title={aiOn ? 'Sugerir resposta com IA' : 'Conecte o Claude em Configurações'}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11.5px] text-success/90 hover:text-success disabled:text-faint"
              >
                <Icon name="sparkles" size={12} /> {suggesting ? 'Pensando…' : 'Sugerir com IA'}
              </button>
            </>
          )}
        </div>
        {showReplies && !asContact && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {savedReplies.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setText(interpolate(r.text, contact))
                  setShowReplies(false)
                }}
                className="rounded-full border border-line px-3 py-1 text-[12px] text-muted hover:border-brand-600 hover:text-fg"
              >
                {r.title}
              </button>
            ))}
          </div>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <textarea
            className="field !min-h-10"
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void submit()
              }
            }}
            placeholder={asContact ? `Escreva como ${contact.firstName}…` : 'Responder como time… (Enter envia)'}
            aria-label="Mensagem"
          />
          <button type="submit" disabled={!text.trim()} aria-label="Enviar" className="grid size-10 shrink-0 place-items-center self-end rounded-[10px] bg-navy text-white transition hover:bg-navy-700 disabled:opacity-30">
            <Icon name="send" size={16} />
          </button>
        </form>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select className="field !h-8 !w-auto !py-0 text-[12px]" value={startId} onChange={(e) => setStartId(e.target.value)} aria-label="Iniciar automação para este contato">
            <option value="">Enviar automação…</option>
            {automations.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={!startId}
            onClick={async () => {
              if (contact.botPaused) setBotPaused(contact.id, false)
              await startAutomation(contact.id, startId)
              setStartId('')
              toast('Automação enviada.')
            }}
          >
            Enviar
          </Button>
        </div>
      </div>
    </div>
  )
}

function ContactPanel({ contact }: { contact: Contact }) {
  const contacts = useStore((s) => s.contacts)
  const updateContact = useStore((s) => s.updateContact)
  const sequences = useStore((s) => s.sequences)
  const settings = useStore((s) => s.settings)
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [newField, setNewField] = useState({ key: '', value: '' })
  const temp = temperature(contact.score, settings.hotLeadScore)
  const aiOn = settings.ai.apiKey.trim() !== ''

  const summarize = async () => {
    setLoading(true)
    try {
      setSummary((await claudeSummarize({ apiKey: settings.ai.apiKey, model: settings.ai.model, businessName: settings.businessName }, contact)) ?? 'Sem resumo.')
    } catch (error) {
      toast(await describeAiError(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-center justify-between">
        <span className="label !mb-0">Lead</span>
        <Badge tone={temp === 'quente' ? 'brand' : temp === 'morno' ? 'info' : 'default'}>
          {temp === 'quente' && <Icon name="fire" size={11} />} {temp} · {contact.score} pts
        </Badge>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-subtle" role="progressbar" aria-valuenow={contact.score} aria-valuemin={0} aria-valuemax={100} aria-label="Pontuação do lead">
        <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-300" style={{ width: `${Math.min(100, contact.score)}%` }} />
      </div>

      <div>
        <span className="label">Tags</span>
        <ChipInput values={contact.tags} onChange={(tags) => updateContact(contact.id, { tags })} placeholder="Adicionar tag" suggestions={allTags(contacts)} />
      </div>

      <div>
        <span className="label">Campos</span>
        <dl className="space-y-1.5 text-[12.5px]">
          {Object.entries(contact.fields).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <dt className="w-24 shrink-0 truncate font-mono text-[11.5px] text-faint">{k}</dt>
              <dd className="min-w-0 flex-1">
                <input className="field !py-1 text-[12.5px]" value={v} aria-label={k} onChange={(e) => updateContact(contact.id, { fields: { ...contact.fields, [k]: e.target.value } })} />
              </dd>
              <IconButton
                icon="x"
                label={`Remover ${k}`}
                onClick={() => {
                  const fields = { ...contact.fields }
                  delete fields[k]
                  updateContact(contact.id, { fields })
                }}
              />
            </div>
          ))}
        </dl>
        <form
          className="mt-2 flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            const key = newField.key.trim().replace(/\s+/g, '_').toLowerCase()
            if (!key) return
            updateContact(contact.id, { fields: { ...contact.fields, [key]: newField.value } })
            setNewField({ key: '', value: '' })
          }}
        >
          <input className="field !py-1 font-mono text-[12px]" placeholder="campo" value={newField.key} onChange={(e) => setNewField({ ...newField, key: e.target.value })} aria-label="Novo campo" />
          <input className="field !py-1 text-[12px]" placeholder="valor" value={newField.value} onChange={(e) => setNewField({ ...newField, value: e.target.value })} aria-label="Valor do novo campo" />
          <IconButton icon="plus" label="Adicionar campo" type="submit" />
        </form>
      </div>

      {contact.sequences.length > 0 && (
        <div>
          <span className="label">Sequências</span>
          <ul className="space-y-1 text-[12.5px]">
            {contact.sequences.map((s) => {
              const seq = sequences.find((x) => x.id === s.sequenceId)
              return (
                <li key={s.sequenceId} className="flex justify-between">
                  <span>{seq?.name ?? 'Sequência removida'}</span>
                  <span className="text-faint">
                    {Math.min(s.nextStep, seq?.steps.length ?? 0)}/{seq?.steps.length ?? 0}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div>
        <span className="label">Resumo com IA</span>
        {summary ? <p className="whitespace-pre-wrap rounded-xl border border-subtle bg-canvas p-3 text-[12.5px] leading-relaxed text-fg/90">{summary}</p> : null}
        <Button size="sm" icon="sparkles" className="mt-2" disabled={!aiOn || loading} onClick={summarize} title={aiOn ? '' : 'Conecte o Claude em Configurações'}>
          {loading ? 'Resumindo…' : summary ? 'Atualizar resumo' : 'Resumir conversa'}
        </Button>
        {!aiOn && <p className="mt-1.5 text-[11.5px] text-faint">Disponível com o Claude conectado.</p>}
      </div>

      <div className="space-y-1 text-[12px] text-faint">
        <div>Inscrito: {contact.subscribed ? 'sim' : 'não'}</div>
        <div>Contato desde {new Date(contact.createdAt).toLocaleDateString('pt-BR')}</div>
        {contact.assignedTo && <div>Responsável: {contact.assignedTo}</div>}
      </div>
    </div>
  )
}

export function Inbox({ contactId }: { contactId?: string }) {
  const contact = useStore((s) => s.contacts.find((c) => c.id === contactId))
  const updateContact = useStore((s) => s.updateContact)
  const [showPanel, setShowPanel] = useState(false)

  const unread = contact?.unread ?? 0
  // Abrir a conversa marca como lida.
  useEffect(() => {
    if (contactId && unread > 0) updateContact(contactId, { unread: 0 })
  }, [contactId, unread, updateContact])

  return (
    <div className="flex h-full">
      <div className={`w-full shrink-0 border-r border-line bg-surface md:w-[320px] ${contact ? 'hidden md:block' : ''}`}>
        <ContactList selectedId={contactId} />
      </div>
      {contact ? (
        <>
          <div className="min-w-0 flex-1">
            <Conversation key={contact.id} contact={contact} />
          </div>
          <aside className={`${showPanel ? 'fixed inset-0 z-30 bg-canvas' : 'hidden'} w-full overflow-y-auto border-l border-line bg-surface xl:static xl:block xl:w-[300px]`}>
            <div className="flex justify-end p-2 xl:hidden">
              <IconButton icon="x" label="Fechar dados" onClick={() => setShowPanel(false)} />
            </div>
            <ContactPanel contact={contact} />
          </aside>
          <button type="button" onClick={() => setShowPanel(true)} className="fixed bottom-24 right-4 z-20 grid size-11 place-items-center rounded-full border border-line bg-surface shadow-pop xl:hidden" aria-label="Dados do contato">
            <Icon name="user" />
          </button>
        </>
      ) : (
        <div className="hidden flex-1 place-items-center p-8 text-center md:grid">
          <div>
            <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl border border-brand/50 bg-brand/10 text-accent">
              <Icon name="inbox" size={22} />
            </span>
            <p className="font-semibold">Escolha uma conversa</p>
            <p className="mt-1 text-[13px] text-muted">Responda como time, pause a automação ou simule o contato para testar.</p>
          </div>
        </div>
      )}
    </div>
  )
}
