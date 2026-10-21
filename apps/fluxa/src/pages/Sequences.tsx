import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Badge, Button, Empty, IconButton, Modal, PageHeader, Toggle, toast } from '../components/ui'
import type { DelayUnit, Sequence } from '../lib/types'
import { UNIT_LABEL, formatDelay, fullName, uid } from '../lib/util'
import { useStore } from '../store/store'

function blank(): Sequence {
  return {
    id: uid('s'),
    name: 'Nova sequência',
    active: true,
    createdAt: Date.now(),
    steps: [{ id: uid('st'), amount: 1, unit: 'days', text: 'Oi, {{first_name|tudo bem}}! ' }],
  }
}

function Editor({ initial, onClose }: { initial: Sequence; onClose: () => void }) {
  const saveSequence = useStore((s) => s.saveSequence)
  const contacts = useStore((s) => s.contacts)
  const updateContact = useStore((s) => s.updateContact)
  const [q, setQ] = useState(initial)
  const [pick, setPick] = useState('')
  const subscribers = contacts.filter((c) => c.sequences.some((s) => s.sequenceId === q.id))
  const candidates = contacts.filter((c) => !c.sequences.some((s) => s.sequenceId === q.id) && c.subscribed)

  const move = (i: number, dir: -1 | 1) => {
    const steps = [...q.steps]
    const j = i + dir
    if (j < 0 || j >= steps.length) return
    ;[steps[i], steps[j]] = [steps[j], steps[i]]
    setQ({ ...q, steps })
  }

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title="Sequência"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={!q.name.trim() || q.steps.some((s) => !s.text.trim())}
            onClick={() => {
              saveSequence(q)
              toast('Sequência salva.')
              onClose()
            }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-4">
          <label className="block">
            <span className="label">Nome</span>
            <input className="field" value={q.name} onChange={(e) => setQ({ ...q, name: e.target.value })} />
          </label>
          <ol className="relative space-y-3 border-l border-line pl-5">
            {q.steps.map((step, i) => {
              const set = (patch: Partial<typeof step>) => setQ({ ...q, steps: q.steps.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
              return (
                <li key={step.id} className="relative rounded-2xl border border-subtle bg-surface p-3">
                  <span className="absolute -left-[29px] top-4 grid size-4 place-items-center rounded-full border border-brand-500 bg-canvas text-[9px] font-bold text-accent">{i + 1}</span>
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
                    <Icon name="clock" size={14} />
                    {i === 0 ? 'Depois da inscrição, esperar' : 'Depois do passo anterior, esperar'}
                    <input className="field !h-8 !w-16 !py-0" type="number" min={1} value={step.amount} onChange={(e) => set({ amount: Math.max(1, Number(e.target.value) || 1) })} aria-label="Quantidade" />
                    <select className="field !h-8 !w-auto !py-0" value={step.unit} onChange={(e) => set({ unit: e.target.value as DelayUnit })} aria-label="Unidade">
                      {Object.entries(UNIT_LABEL).map(([k, [, many]]) => (
                        <option key={k} value={k}>
                          {many}
                        </option>
                      ))}
                    </select>
                    <span className="ml-auto flex">
                      <IconButton icon="chevronDown" label="Mover para cima" className="rotate-180" disabled={i === 0} onClick={() => move(i, -1)} />
                      <IconButton icon="chevronDown" label="Mover para baixo" disabled={i === q.steps.length - 1} onClick={() => move(i, 1)} />
                      <IconButton icon="trash" label="Remover passo" disabled={q.steps.length === 1} onClick={() => setQ({ ...q, steps: q.steps.filter((_, j) => j !== i) })} />
                    </span>
                  </div>
                  <textarea className="field" rows={3} value={step.text} onChange={(e) => set({ text: e.target.value })} aria-label={`Mensagem do passo ${i + 1}`} />
                </li>
              )
            })}
          </ol>
          <Button icon="plus" onClick={() => setQ({ ...q, steps: [...q.steps, { id: uid('st'), amount: 2, unit: 'days', text: '' }] })}>
            Adicionar passo
          </Button>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-subtle p-4 text-[12.5px] text-muted">
            <p>
              Inscreva contatos pela ação <b className="text-fg">“Inscrever em sequência”</b> em qualquer automação, ou manualmente aqui.
            </p>
            <p className="mt-2">Passos fora da janela de 24 h do canal são pulados e registrados na conversa.</p>
          </div>
          <div className="rounded-2xl border border-subtle p-4">
            <span className="label">Inscritos ({subscribers.length})</span>
            <div className="mb-3 flex gap-1.5">
              <select className="field !h-9 !py-0 text-[12.5px]" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Contato para inscrever">
                <option value="">Inscrever contato…</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {fullName(c)}
                  </option>
                ))}
              </select>
              <IconButton
                icon="plus"
                label="Inscrever"
                disabled={!pick}
                onClick={() => {
                  saveSequence(q)
                  updateContact(pick, (c) => ({ ...c, sequences: [...c.sequences, { sequenceId: q.id, subscribedAt: Date.now(), nextStep: 0 }] }))
                  setPick('')
                  toast('Contato inscrito.')
                }}
              />
            </div>
            <ul className="max-h-60 space-y-1.5 overflow-y-auto text-[12.5px]">
              {subscribers.map((c) => {
                const sub = c.sequences.find((s) => s.sequenceId === q.id)!
                return (
                  <li key={c.id} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate">{fullName(c)}</span>
                    <span className="text-faint">
                      {Math.min(sub.nextStep, q.steps.length)}/{q.steps.length}
                    </span>
                    <IconButton icon="x" label="Remover da sequência" onClick={() => updateContact(c.id, (x) => ({ ...x, sequences: x.sequences.filter((s) => s.sequenceId !== q.id) }))} />
                  </li>
                )
              })}
              {subscribers.length === 0 && <li className="text-faint">Ninguém inscrito ainda.</li>}
            </ul>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export function Sequences() {
  const sequences = useStore((s) => s.sequences)
  const contacts = useStore((s) => s.contacts)
  const saveSequence = useStore((s) => s.saveSequence)
  const deleteSequence = useStore((s) => s.deleteSequence)
  const [editing, setEditing] = useState<Sequence | null>(null)

  return (
    <>
      <PageHeader
        title="Sequências"
        subtitle="Mensagens em etapas (nutrição, onboarding, pós-venda) enviadas automaticamente no ritmo que você definir."
        actions={
          <Button variant="primary" icon="plus" onClick={() => setEditing(blank())}>
            Nova sequência
          </Button>
        }
      />
      {sequences.length === 0 ? (
        <Empty icon="repeat" title="Nenhuma sequência" text="Crie uma série de mensagens e inscreva contatos pelas automações." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sequences.map((q) => {
            const subs = contacts.filter((c) => c.sequences.some((s) => s.sequenceId === q.id)).length
            const total = q.steps.reduce((sum, s) => sum + s.amount * { seconds: 1 / 86400, minutes: 1 / 1440, hours: 1 / 24, days: 1 }[s.unit], 0)
            return (
              <article key={q.id} className="card min-w-0 cursor-pointer p-5 transition hover:border-line-strong" onClick={() => setEditing(q)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{q.name}</h2>
                    <p className="mt-1 text-[12.5px] text-muted">
                      {q.steps.length} passo(s) · {total >= 1 ? `${Math.round(total)} dia(s)` : 'menos de 1 dia'} · {subs} inscrito(s)
                    </p>
                  </div>
                  <span onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
                    <Toggle checked={q.active} onChange={(active) => saveSequence({ ...q, active })} label={q.active ? 'Pausar sequência' : 'Ativar sequência'} />
                    <IconButton
                      icon="trash"
                      label="Excluir"
                      onClick={() => {
                        if (window.confirm(`Excluir "${q.name}"? Os inscritos serão removidos.`)) deleteSequence(q.id)
                      }}
                    />
                  </span>
                </div>
                <ol className="mt-4 space-y-2">
                  {q.steps.slice(0, 3).map((s, i) => (
                    <li key={s.id} className="flex gap-3 text-[12.5px]">
                      <Badge>{formatDelay(s.amount, s.unit)}</Badge>
                      <span className="min-w-0 truncate text-muted">
                        {i + 1}. {s.text}
                      </span>
                    </li>
                  ))}
                </ol>
              </article>
            )
          })}
        </div>
      )}
      {editing && <Editor key={editing.id} initial={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
