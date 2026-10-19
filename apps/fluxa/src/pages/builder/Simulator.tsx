import { useEffect, useState } from 'react'
import { ChatThread } from '../../components/ChatThread'
import { Icon } from '../../components/Icon'
import { Button, ChannelIcon, IconButton } from '../../components/ui'
import { CHANNEL_LABEL } from '../../lib/audience'
import type { EventKind } from '../../lib/triggers'
import type { Automation, Channel } from '../../lib/types'
import { CHANNELS } from '../../lib/types'
import { clickButton, receive, resetTestContact, startAutomation, testContact } from '../../store/runtime'
import { useStore } from '../../store/store'

const MODES: { id: EventKind; label: string; placeholder: string }[] = [
  { id: 'message', label: 'Mensagem', placeholder: 'Escreva como se fosse o cliente…' },
  { id: 'comment', label: 'Comentário', placeholder: 'Texto do comentário no post…' },
  { id: 'story_reply', label: 'Story', placeholder: 'Resposta ao story…' },
  { id: 'ref', label: 'Link', placeholder: 'ref do link (ex.: diagnostico)' },
]

export function Simulator({ automation, flush, onClose }: { automation: Automation; flush: () => void; onClose: () => void }) {
  const preferred = automation.triggers.flatMap((t) => t.channels)[0] ?? 'instagram'
  const [channel, setChannel] = useState<Channel>(preferred)
  const [mode, setMode] = useState<EventKind>('message')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [showData, setShowData] = useState(false)
  const contactId = `test-${channel}`
  const contact = useStore((s) => s.contacts.find((c) => c.id === contactId))
  const run = useStore((s) => s.runs[contactId])
  const aiOn = useStore((s) => s.settings.ai.apiKey.trim() !== '')
  const demo = useStore((s) => s.settings.timeScale === 'demo')

  useEffect(() => {
    testContact(channel)
  }, [channel])

  const track = async (job: () => Promise<void>) => {
    flush()
    setBusy(true)
    try {
      await job()
    } finally {
      setBusy(false)
    }
  }

  const start = () =>
    track(async () => {
      resetTestContact(channel)
      await startAutomation(contactId, automation.id)
    })

  const send = () => {
    const value = text.trim()
    if (!value) return
    setText('')
    void track(() => receive(contactId, { text: value }, { kind: mode, ref: mode === 'ref' ? value : undefined, scopeAutomationId: automation.id }))
  }

  const status = !run
    ? null
    : run.automationId !== automation.id
      ? 'Em outra automação'
      : run.wait === 'reply'
        ? 'Esperando um clique'
        : run.wait === 'input'
          ? 'Esperando a resposta'
          : `Esperando o atraso${demo ? ' (modo demo: segundos)' : ''}`

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-ink-800 px-4 py-3">
        <span className="grid size-7 place-items-center rounded-lg bg-neon/15 text-neon">
          <Icon name="play" size={13} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold">Testar ao vivo</div>
          <div className="text-[11.5px] text-mute-600">O caminho percorrido acende em verde no canvas.</div>
        </div>
        <IconButton icon="x" label="Fechar teste" onClick={onClose} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-ink-800 px-4 py-2.5">
        <label className="flex items-center gap-2 text-[12px] text-mute">
          <ChannelIcon channel={channel} />
          <select className="field !h-8 !w-auto !py-0 text-[12.5px]" value={channel} onChange={(e) => setChannel(e.target.value as Channel)} aria-label="Canal do teste">
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex gap-1.5">
          <Button size="sm" icon="reset" variant="ghost" onClick={() => resetTestContact(channel)} title="Limpa a conversa e os dados do contato de teste">
            Limpar
          </Button>
          <Button size="sm" icon="play" variant="primary" onClick={start} disabled={busy}>
            Iniciar fluxo
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,rgba(0,203,230,.06),transparent_60%)]">
        <ChatThread
          messages={contact?.messages ?? []}
          perspective="contact"
          typing={busy}
          emptyText="Clique em “Iniciar fluxo” ou envie uma mensagem para testar os gatilhos."
          onButton={(m, b) => {
            flush()
            clickButton(contactId, m, b, { scopeAutomationId: automation.id })
          }}
          onQuickReply={(_, q) => void track(() => receive(contactId, { text: q.label, payload: q.id }, { scopeAutomationId: automation.id }))}
        />
      </div>

      {status && (
        <div className="flex items-center gap-2 border-t border-ink-800 bg-neon/5 px-4 py-2 text-[12px] text-neon">
          <span className="size-1.5 animate-pulse rounded-full bg-neon" /> {status}
        </div>
      )}

      <div className="border-t border-ink-800 p-3">
        <div className="mb-2 flex gap-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`rounded-lg px-2.5 py-1 text-[11.5px] transition ${mode === m.id ? 'bg-ink-700 text-bone' : 'text-mute-600 hover:text-mute'}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          <input className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder={MODES.find((m) => m.id === mode)!.placeholder} aria-label="Mensagem de teste" />
          <button type="submit" disabled={!text.trim() || busy} aria-label="Enviar" className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-300 text-ink-950 transition disabled:opacity-40">
            <Icon name="send" size={16} />
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between text-[11px] text-mute-600">
          <span>{aiOn ? 'IA: Claude' : 'IA: classificador local + textos alternativos'}</span>
          <button type="button" className="hover:text-mute" onClick={() => setShowData(!showData)}>
            {showData ? 'Ocultar dados do contato' : 'Ver dados do contato'}
          </button>
        </div>
        {showData && contact && (
          <div className="mt-2 space-y-1.5 rounded-xl border border-ink-800 bg-ink-950 p-3 text-[12px]">
            <div>
              <span className="text-mute-600">Pontuação:</span> {contact.score}
            </div>
            <div>
              <span className="text-mute-600">Tags:</span> {contact.tags.length ? contact.tags.join(', ') : '—'}
            </div>
            <div className="break-all">
              <span className="text-mute-600">Campos:</span>{' '}
              {Object.keys(contact.fields).length
                ? Object.entries(contact.fields)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(' · ')
                : '—'}
            </div>
            {contact.botPaused && <div className="text-brand-300">Conversa transferida para o time (automação pausada).</div>}
          </div>
        )}
      </div>
    </div>
  )
}
