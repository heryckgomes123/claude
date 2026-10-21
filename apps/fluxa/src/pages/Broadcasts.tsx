import { useMemo, useState } from 'react'
import { ChatThread } from '../components/ChatThread'
import { Icon } from '../components/Icon'
import { SegmentEditor } from '../components/SegmentEditor'
import { Badge, Button, Empty, IconButton, Modal, PageHeader, toast } from '../components/ui'
import { allTags, broadcastReach } from '../lib/audience'
import type { Broadcast, ButtonAction } from '../lib/types'
import { formatNumber, interpolate, percent, timeAgo, uid } from '../lib/util'
import { sendBroadcast } from '../store/runtime'
import { useStore } from '../store/store'

function blank(): Broadcast {
  return {
    id: uid('bc'),
    name: 'Nova transmissão',
    text: 'Oi, {{first_name|tudo bem}}! ',
    buttons: [],
    segment: { channels: [], includeTags: [], excludeTags: [], minScore: 0 },
    status: 'draft',
    sentTo: 0,
    skipped: 0,
    clicks: 0,
    createdAt: Date.now(),
  }
}

function toLocalInput(ts: number): string {
  const d = new Date(ts - new Date().getTimezoneOffset() * 60_000)
  return d.toISOString().slice(0, 16)
}

function Editor({ initial, onClose }: { initial: Broadcast; onClose: () => void }) {
  const contacts = useStore((s) => s.contacts)
  const automations = useStore((s) => s.automations)
  const saveBroadcast = useStore((s) => s.saveBroadcast)
  const [b, setB] = useState(initial)
  const [when, setWhen] = useState(toLocalInput(initial.scheduledAt ?? Date.now() + 3_600_000))
  const reach = useMemo(() => broadcastReach(contacts, b.segment), [contacts, b.segment])
  const tags = useMemo(() => allTags(contacts), [contacts])
  const sample = reach.eligible[0]
  const readOnly = initial.status === 'sent'
  const invalidButton = b.buttons.some((x) => !x.label.trim() || (x.action === 'url' && !/^https?:\/\//.test(x.url ?? '')) || (x.action === 'automation' && !x.automationId))
  const canSend = b.text.trim() && !invalidButton

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={readOnly ? `${b.name} (enviada)` : 'Transmissão'}
      footer={
        readOnly ? (
          <Button onClick={onClose}>Fechar</Button>
        ) : (
          <>
            <Button
              variant="ghost"
              onClick={() => {
                saveBroadcast({ ...b, status: 'draft', scheduledAt: undefined })
                toast('Rascunho salvo.')
                onClose()
              }}
            >
              Salvar rascunho
            </Button>
            <div className="flex items-center gap-2">
              <input type="datetime-local" className="field !h-10 !w-auto" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Data e hora do envio" />
              <Button
                disabled={!canSend || new Date(when).getTime() <= Date.now()}
                icon="clock"
                onClick={() => {
                  saveBroadcast({ ...b, status: 'scheduled', scheduledAt: new Date(when).getTime() })
                  toast('Transmissão agendada.')
                  onClose()
                }}
              >
                Agendar
              </Button>
            </div>
            <Button
              variant="primary"
              icon="send"
              disabled={!canSend || reach.eligible.length === 0}
              onClick={() => {
                if (!window.confirm(`Enviar agora para ${reach.eligible.length} contato(s)?`)) return
                saveBroadcast(b)
                const r = sendBroadcast(b)
                toast(`Enviada para ${r.sent} contato(s).`)
                onClose()
              }}
            >
              Enviar agora
            </Button>
          </>
        )
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <fieldset disabled={readOnly} className="min-w-0 space-y-4">
          <label className="block">
            <span className="label">Nome interno</span>
            <input className="field" value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} />
          </label>
          <label className="block">
            <span className="label">Mensagem</span>
            <textarea className="field" rows={5} value={b.text} onChange={(e) => setB({ ...b, text: e.target.value })} />
            <span className="mt-1 block text-[11.5px] text-faint">
              Use {'{{first_name}}'} e outros campos. {'{{first_name|amigo}}'} define um texto quando o campo está vazio.
            </span>
          </label>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="label !mb-0">Botões ({b.buttons.length}/3)</span>
              <Button size="sm" variant="ghost" icon="plus" disabled={b.buttons.length >= 3} onClick={() => setB({ ...b, buttons: [...b.buttons, { id: uid('b'), label: 'Saiba mais', action: 'url', url: 'https://' }] })}>
                Botão
              </Button>
            </div>
            <div className="space-y-2">
              {b.buttons.map((btn, i) => {
                const set = (patch: Partial<typeof btn>) => setB({ ...b, buttons: b.buttons.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
                return (
                  <div key={btn.id} className="grid gap-2 rounded-xl border border-subtle p-2.5 sm:grid-cols-[1fr_150px_1fr_auto]">
                    <input className="field" value={btn.label} maxLength={20} onChange={(e) => set({ label: e.target.value })} aria-label="Texto do botão" />
                    <select className="field" value={btn.action} onChange={(e) => set({ action: e.target.value as ButtonAction })} aria-label="Ação">
                      <option value="url">Abrir link</option>
                      <option value="automation">Iniciar automação</option>
                    </select>
                    {btn.action === 'url' ? (
                      <input className="field" value={btn.url ?? ''} onChange={(e) => set({ url: e.target.value })} aria-label="URL" />
                    ) : (
                      <select className="field" value={btn.automationId ?? ''} onChange={(e) => set({ automationId: e.target.value })} aria-label="Automação">
                        <option value="">Escolha…</option>
                        {automations.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <IconButton icon="trash" label="Remover botão" onClick={() => setB({ ...b, buttons: b.buttons.filter((_, j) => j !== i) })} />
                  </div>
                )
              })}
            </div>
          </div>
          <div className="rounded-2xl border border-subtle p-4">
            <span className="label">Público</span>
            <SegmentEditor segment={b.segment} onChange={(segment) => setB({ ...b, segment })} tags={tags} />
          </div>
        </fieldset>

        <div className="space-y-3">
          <div className="rounded-2xl border border-subtle p-4">
            <span className="label">Alcance agora</span>
            <div className="font-poster text-[34px] leading-none">{formatNumber(reach.eligible.length)}</div>
            <p className="mt-1 text-[12px] text-muted">contatos recebem a mensagem</p>
            {reach.outsideWindow.length > 0 && (
              <p className="mt-3 flex gap-1.5 text-[12px] text-accent">
                <Icon name="clock" size={14} className="mt-0.5 shrink-0" />
                {reach.outsideWindow.length} ficam de fora: estão há mais de 24 h sem falar com você no Instagram, Messenger ou WhatsApp, onde a Meta não permite mensagem livre.
              </p>
            )}
          </div>
          <div className="overflow-hidden rounded-[28px] border border-line bg-canvas">
            <div className="border-b border-subtle px-4 py-2 text-center text-[11px] text-faint">Prévia {sample ? `para ${sample.firstName}` : ''}</div>
            {sample || b.text ? (
              <ChatThread
                perspective="contact"
                messages={[
                  {
                    id: 'preview',
                    from: 'bot',
                    ts: Date.now(),
                    text: sample ? interpolate(b.text, sample) : b.text,
                    buttons: b.buttons.length ? b.buttons : undefined,
                  },
                ]}
              />
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export function Broadcasts() {
  const broadcasts = useStore((s) => s.broadcasts)
  const deleteBroadcast = useStore((s) => s.deleteBroadcast)
  const [editing, setEditing] = useState<Broadcast | null>(null)
  const sorted = [...broadcasts].sort((a, b) => (b.sentAt ?? b.scheduledAt ?? b.createdAt) - (a.sentAt ?? a.scheduledAt ?? a.createdAt))

  return (
    <>
      <PageHeader
        title="Transmissões"
        subtitle="Envie uma mensagem para um segmento de uma vez — agora ou agendada — respeitando a janela de 24 h de cada canal."
        actions={
          <Button variant="primary" icon="plus" onClick={() => setEditing(blank())}>
            Nova transmissão
          </Button>
        }
      />
      {sorted.length === 0 ? (
        <Empty icon="megaphone" title="Nenhuma transmissão" text="Avise sobre promoções, conteúdos e novidades para quem já conversa com você." />
      ) : (
        <div className="grid gap-3">
          {sorted.map((b) => (
            <article key={b.id} className="card min-w-0 flex cursor-pointer flex-col gap-4 p-4 transition hover:border-line-strong md:flex-row md:items-center" onClick={() => setEditing(b)}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{b.name}</h2>
                  {b.status === 'sent' && <Badge tone="success">Enviada {b.sentAt ? `há ${timeAgo(b.sentAt)}` : ''}</Badge>}
                  {b.status === 'scheduled' && <Badge tone="info">Agendada · {new Date(b.scheduledAt!).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</Badge>}
                  {b.status === 'draft' && <Badge>Rascunho</Badge>}
                </div>
                <p className="mt-1 truncate text-[13px] text-muted">{b.text}</p>
              </div>
              <dl className="grid grid-cols-3 gap-4 text-[12px] md:w-[300px]">
                <div>
                  <dt className="text-faint">Enviadas</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{formatNumber(b.sentTo)}</dd>
                </div>
                <div>
                  <dt className="text-faint">Fora da janela</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{formatNumber(b.skipped)}</dd>
                </div>
                <div>
                  <dt className="text-faint">Cliques</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">
                    {formatNumber(b.clicks)} <span className="text-[11px] font-normal text-faint">{percent(b.clicks, b.sentTo)}</span>
                  </dd>
                </div>
              </dl>
              <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
                <IconButton
                  icon="trash"
                  label="Excluir"
                  onClick={() => {
                    if (window.confirm(`Excluir "${b.name}"?`)) deleteBroadcast(b.id)
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && <Editor key={editing.id} initial={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
