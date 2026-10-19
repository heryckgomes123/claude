import type { ReactNode } from 'react'
import { Icon } from '../../components/Icon'
import { Button, ChipInput, IconButton } from '../../components/ui'
import { NODE_META } from '../../lib/flow'
import type {
  ActionKind,
  Automation,
  ButtonAction,
  DelayUnit,
  FlowAction,
  FlowNode,
  InputType,
  NodeData,
  RuleOp,
  RuleSubject,
  Sequence,
} from '../../lib/types'
import { CHANNELS } from '../../lib/types'
import { CHANNEL_LABEL } from '../../lib/audience'
import { UNIT_LABEL, uid } from '../../lib/util'
import { ACTION_LABEL, INPUT_LABEL, NODE_ICON } from './nodes'

interface Props {
  node: FlowNode
  automation: Automation
  automations: Automation[]
  sequences: Sequence[]
  tags: string[]
  fields: string[]
  onChange: (data: NodeData) => void
  onDelete: () => void
  onDuplicate: () => void
  onClose: () => void
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="label !mb-0">{title}</span>
        {action}
      </div>
      {children}
    </section>
  )
}

const VARIABLES = ['{{first_name}}', '{{last_name}}', '{{email}}', '{{telefone}}']

function VariableHint({ onInsert }: { onInsert: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-[11px] text-mute-600">
      Variáveis:
      {VARIABLES.map((v) => (
        <button key={v} type="button" onClick={() => onInsert(v)} className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-brand-200 hover:bg-ink-700">
          {v}
        </button>
      ))}
    </div>
  )
}

export function Inspector({ node, automation, automations, sequences, tags, fields, onChange, onDelete, onDuplicate, onClose }: Props) {
  const d = node.data
  const meta = NODE_META[node.type]
  const others = automations.filter((a) => a.id !== automation.id)

  let body: ReactNode = null
  switch (d.kind) {
    case 'trigger':
      body = <p className="text-[13px] text-mute">Os gatilhos ficam na aba “Gatilhos” do painel. Clique em uma área vazia do canvas para vê-los.</p>
      break

    case 'message':
      body = (
        <>
          <Section title="Texto">
            <textarea className="field" rows={5} value={d.text} onChange={(e) => onChange({ ...d, text: e.target.value })} />
            <VariableHint onInsert={(v) => onChange({ ...d, text: `${d.text}${d.text.endsWith(' ') || !d.text ? '' : ' '}${v}` })} />
          </Section>
          <Section title="Imagem (URL, opcional)">
            <input className="field" placeholder="https://…" value={d.imageUrl ?? ''} onChange={(e) => onChange({ ...d, imageUrl: e.target.value })} />
          </Section>
          <Section
            title={`Botões (${d.buttons.length}/3)`}
            action={
              <Button size="sm" variant="ghost" icon="plus" disabled={d.buttons.length >= 3} onClick={() => onChange({ ...d, buttons: [...d.buttons, { id: uid('b'), label: 'Novo botão', action: 'next' }] })}>
                Botão
              </Button>
            }
          >
            {d.buttons.map((b, i) => (
              <div key={b.id} className="space-y-2 rounded-xl border border-ink-800 bg-ink-950/50 p-2.5">
                <div className="flex gap-2">
                  <input
                    className="field"
                    value={b.label}
                    maxLength={20}
                    aria-label="Texto do botão"
                    onChange={(e) => onChange({ ...d, buttons: d.buttons.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                  />
                  <IconButton icon="trash" label="Remover botão" onClick={() => onChange({ ...d, buttons: d.buttons.filter((_, j) => j !== i) })} />
                </div>
                <select
                  className="field"
                  value={b.action}
                  aria-label="Ação do botão"
                  onChange={(e) => onChange({ ...d, buttons: d.buttons.map((x, j) => (j === i ? { ...x, action: e.target.value as ButtonAction } : x)) })}
                >
                  <option value="next">Continuar o fluxo (saída no nó)</option>
                  <option value="url">Abrir link</option>
                  <option value="automation">Iniciar outra automação</option>
                </select>
                {b.action === 'url' && (
                  <input className="field" placeholder="https://…" value={b.url ?? ''} onChange={(e) => onChange({ ...d, buttons: d.buttons.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
                )}
                {b.action === 'automation' && (
                  <select className="field" value={b.automationId ?? ''} onChange={(e) => onChange({ ...d, buttons: d.buttons.map((x, j) => (j === i ? { ...x, automationId: e.target.value } : x)) })}>
                    <option value="">Escolha…</option>
                    {others.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </Section>
          <Section
            title="Respostas rápidas"
            action={
              <Button size="sm" variant="ghost" icon="plus" disabled={d.quickReplies.length >= 11} onClick={() => onChange({ ...d, quickReplies: [...d.quickReplies, { id: uid('q'), label: 'Opção' }] })}>
                Resposta
              </Button>
            }
          >
            {d.quickReplies.map((q, i) => (
              <div key={q.id} className="flex gap-2">
                <input className="field" value={q.label} maxLength={20} aria-label="Texto da resposta rápida" onChange={(e) => onChange({ ...d, quickReplies: d.quickReplies.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                <IconButton icon="trash" label="Remover" onClick={() => onChange({ ...d, quickReplies: d.quickReplies.filter((_, j) => j !== i) })} />
              </div>
            ))}
            <p className="text-[11.5px] text-mute-600">Com botões “continuar” ou respostas rápidas, o fluxo espera o clique. Cada opção vira uma saída do nó.</p>
          </Section>
        </>
      )
      break

    case 'question':
      body = (
        <>
          <Section title="Pergunta">
            <textarea className="field" rows={3} value={d.prompt} onChange={(e) => onChange({ ...d, prompt: e.target.value })} />
          </Section>
          <div className="grid grid-cols-2 gap-3">
            <Section title="Tipo de resposta">
              <select className="field" value={d.inputType} onChange={(e) => onChange({ ...d, inputType: e.target.value as InputType })}>
                {Object.entries(INPUT_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Section>
            <Section title="Salvar no campo">
              <input className="field font-mono" list="field-list" value={d.field} onChange={(e) => onChange({ ...d, field: e.target.value.replace(/\s+/g, '_').toLowerCase() })} />
            </Section>
          </div>
          {d.inputType === 'choice' && (
            <Section title="Opções">
              <ChipInput values={d.choices} onChange={(choices) => onChange({ ...d, choices })} placeholder="Digite e tecle Enter" />
            </Section>
          )}
          <Section title="Mensagem para resposta inválida">
            <input className="field" value={d.retryText} onChange={(e) => onChange({ ...d, retryText: e.target.value })} />
            <p className="text-[11.5px] text-mute-600">Após 3 tentativas inválidas o fluxo segue pela saída “3 respostas inválidas”.</p>
          </Section>
        </>
      )
      break

    case 'condition':
      body = (
        <>
          <Section title="Combinar regras">
            <select className="field" value={d.combinator} onChange={(e) => onChange({ ...d, combinator: e.target.value as 'and' | 'or' })}>
              <option value="and">Todas as regras (e)</option>
              <option value="or">Qualquer regra (ou)</option>
            </select>
          </Section>
          <Section
            title="Regras"
            action={
              <Button size="sm" variant="ghost" icon="plus" onClick={() => onChange({ ...d, rules: [...d.rules, { id: uid('r'), subject: 'tag', op: 'has', value: '' }] })}>
                Regra
              </Button>
            }
          >
            {d.rules.map((r, i) => {
              const set = (patch: Partial<typeof r>) => onChange({ ...d, rules: d.rules.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
              const ops: [RuleOp, string][] =
                r.subject === 'tag'
                  ? [
                      ['has', 'tem a tag'],
                      ['not_has', 'não tem a tag'],
                    ]
                  : r.subject === 'channel'
                    ? [
                        ['eq', 'é'],
                        ['neq', 'não é'],
                      ]
                    : r.subject === 'score'
                      ? [
                          ['gt', 'maior que'],
                          ['lt', 'menor que'],
                          ['eq', 'igual a'],
                        ]
                      : [
                          ['eq', 'igual a'],
                          ['neq', 'diferente de'],
                          ['contains', 'contém'],
                          ['gt', 'maior que'],
                          ['lt', 'menor que'],
                          ['set', 'está preenchido'],
                          ['unset', 'está vazio'],
                        ]
              return (
                <div key={r.id} className="space-y-2 rounded-xl border border-ink-800 bg-ink-950/50 p-2.5">
                  <div className="flex gap-2">
                    <select
                      className="field"
                      value={r.subject}
                      aria-label="Tipo de regra"
                      onChange={(e) => {
                        const subject = e.target.value as RuleSubject
                        set({ subject, op: subject === 'tag' ? 'has' : subject === 'score' ? 'gt' : 'eq', value: subject === 'channel' ? 'instagram' : '' })
                      }}
                    >
                      <option value="tag">Tag</option>
                      <option value="field">Campo</option>
                      <option value="channel">Canal</option>
                      <option value="score">Pontuação</option>
                    </select>
                    <IconButton icon="trash" label="Remover regra" onClick={() => onChange({ ...d, rules: d.rules.filter((_, j) => j !== i) })} />
                  </div>
                  {r.subject === 'field' && <input className="field font-mono" list="field-list" placeholder="nome do campo" value={r.field ?? ''} onChange={(e) => set({ field: e.target.value })} />}
                  <select className="field" value={r.op} aria-label="Operador" onChange={(e) => set({ op: e.target.value as RuleOp })}>
                    {ops.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                  {r.subject === 'channel' ? (
                    <select className="field" value={r.value} onChange={(e) => set({ value: e.target.value })}>
                      {CHANNELS.map((c) => (
                        <option key={c} value={c}>
                          {CHANNEL_LABEL[c]}
                        </option>
                      ))}
                    </select>
                  ) : r.op !== 'set' && r.op !== 'unset' ? (
                    <input className="field" list={r.subject === 'tag' ? 'tag-list' : undefined} type={r.subject === 'score' ? 'number' : 'text'} placeholder="valor" value={r.value} onChange={(e) => set({ value: e.target.value })} />
                  ) : null}
                </div>
              )
            })}
          </Section>
        </>
      )
      break

    case 'action':
      body = (
        <Section
          title="Ações (em ordem)"
          action={
            <Button size="sm" variant="ghost" icon="plus" onClick={() => onChange({ ...d, actions: [...d.actions, { id: uid('a'), kind: 'add_tag', value: '' }] })}>
              Ação
            </Button>
          }
        >
          {d.actions.map((a, i) => {
            const set = (patch: Partial<FlowAction>) => onChange({ ...d, actions: d.actions.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
            return (
              <div key={a.id} className="space-y-2 rounded-xl border border-ink-800 bg-ink-950/50 p-2.5">
                <div className="flex gap-2">
                  <select className="field" value={a.kind} aria-label="Tipo de ação" onChange={(e) => set({ kind: e.target.value as ActionKind, value: '', field: undefined })}>
                    {Object.entries(ACTION_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <IconButton icon="trash" label="Remover ação" onClick={() => onChange({ ...d, actions: d.actions.filter((_, j) => j !== i) })} />
                </div>
                {(a.kind === 'add_tag' || a.kind === 'remove_tag') && <input className="field" list="tag-list" placeholder="nome da tag" value={a.value} onChange={(e) => set({ value: e.target.value })} />}
                {a.kind === 'set_field' && (
                  <div className="grid grid-cols-2 gap-2">
                    <input className="field font-mono" list="field-list" placeholder="campo" value={a.field ?? ''} onChange={(e) => set({ field: e.target.value })} />
                    <input className="field" placeholder="valor" value={a.value} onChange={(e) => set({ value: e.target.value })} />
                  </div>
                )}
                {a.kind === 'add_score' && <input className="field" type="number" placeholder="pontos (use negativo para tirar)" value={a.value} onChange={(e) => set({ value: e.target.value })} />}
                {a.kind === 'notify' && <input className="field" placeholder="Texto da notificação para o time" value={a.value} onChange={(e) => set({ value: e.target.value })} />}
                {a.kind === 'handoff' && <p className="text-[11.5px] text-mute-600">Pausa a automação para este contato e coloca a conversa no inbox do time.</p>}
                {(a.kind === 'subscribe_sequence' || a.kind === 'unsubscribe_sequence') && (
                  <select className="field" value={a.value} onChange={(e) => set({ value: e.target.value })}>
                    <option value="">Escolha a sequência…</option>
                    {sequences.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
                {a.kind === 'webhook' && (
                  <>
                    <input className="field" placeholder="https://hooks.seu-sistema.com/…" value={a.value} onChange={(e) => set({ value: e.target.value })} />
                    <p className="text-[11.5px] text-mute-600">Envia um POST com o contato (nome, canal, tags, campos, pontuação) para integrar CRM, planilha ou Zapier/Make.</p>
                  </>
                )}
              </div>
            )
          })}
        </Section>
      )
      break

    case 'delay':
      body = (
        <Section title="Esperar">
          <div className="grid grid-cols-2 gap-2">
            <input className="field" type="number" min={1} value={d.amount} onChange={(e) => onChange({ ...d, amount: Math.max(1, Number(e.target.value) || 1) })} aria-label="Quantidade" />
            <select className="field" value={d.unit} onChange={(e) => onChange({ ...d, unit: e.target.value as DelayUnit })} aria-label="Unidade">
              {Object.entries(UNIT_LABEL).map(([k, [, many]]) => (
                <option key={k} value={k}>
                  {many}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11.5px] text-mute-600">No modo demonstração (Configurações) cada unidade vira 1 segundo, para testar rápido.</p>
        </Section>
      )
      break

    case 'ai':
      body = (
        <>
          <Section title="Modo">
            <div className="grid grid-cols-2 gap-2">
              {(['reply', 'classify'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onChange({ ...d, mode: m })}
                  className={`rounded-xl border px-3 py-2 text-left text-[12.5px] transition ${d.mode === m ? 'border-neon/50 bg-neon/10 text-bone' : 'border-ink-700 text-mute hover:border-ink-600'}`}
                >
                  <span className="block font-semibold">{m === 'reply' ? 'Responder' : 'Classificar'}</span>
                  <span className="text-[11px]">{m === 'reply' ? 'IA escreve a resposta' : 'Escolhe um caminho'}</span>
                </button>
              ))}
            </div>
          </Section>
          <Section title={d.mode === 'reply' ? 'Orientações do negócio' : 'Contexto (opcional)'}>
            <textarea className="field" rows={5} value={d.instructions} onChange={(e) => onChange({ ...d, instructions: e.target.value })} placeholder="O que a IA deve saber: serviços, horários, tom de voz, o que não prometer…" />
          </Section>
          {d.mode === 'reply' ? (
            <Section title="Texto alternativo (sem IA ou se ela falhar)">
              <textarea className="field" rows={3} value={d.fallbackText} onChange={(e) => onChange({ ...d, fallbackText: e.target.value })} />
            </Section>
          ) : (
            <Section
              title="Intenções (cada uma vira uma saída)"
              action={
                <Button size="sm" variant="ghost" icon="plus" onClick={() => onChange({ ...d, intents: [...d.intents, { id: uid('i'), label: '' }] })}>
                  Intenção
                </Button>
              }
            >
              {d.intents.map((it, i) => (
                <div key={it.id} className="flex gap-2">
                  <input className="field" placeholder="Ex.: quer agendar uma visita" value={it.label} onChange={(e) => onChange({ ...d, intents: d.intents.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                  <IconButton icon="trash" label="Remover intenção" onClick={() => onChange({ ...d, intents: d.intents.filter((_, j) => j !== i) })} />
                </div>
              ))}
              <p className="text-[11.5px] text-mute-600">A IA lê a última mensagem do contato. Se nenhuma intenção servir, segue por “Nenhuma”.</p>
            </Section>
          )}
          <Section title="Salvar resultado no campo (opcional)">
            <input className="field font-mono" list="field-list" placeholder="ex.: intencao" value={d.saveTo ?? ''} onChange={(e) => onChange({ ...d, saveTo: e.target.value })} />
          </Section>
        </>
      )
      break

    case 'split':
      body = (
        <Section
          title="Variantes"
          action={
            <Button size="sm" variant="ghost" icon="plus" disabled={d.variants.length >= 5} onClick={() => onChange({ ...d, variants: [...d.variants, { id: uid('v'), label: String.fromCharCode(65 + d.variants.length), weight: 0 }] })}>
              Variante
            </Button>
          }
        >
          {d.variants.map((v, i) => (
            <div key={v.id} className="flex items-center gap-2">
              <input className="field" value={v.label} aria-label="Nome da variante" onChange={(e) => onChange({ ...d, variants: d.variants.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
              <input
                className="field !w-24"
                type="number"
                min={0}
                max={100}
                aria-label="Peso (%)"
                value={v.weight}
                onChange={(e) => onChange({ ...d, variants: d.variants.map((x, j) => (j === i ? { ...x, weight: Math.max(0, Math.min(100, Number(e.target.value) || 0)) } : x)) })}
              />
              <span className="text-mute-600">%</span>
              <IconButton icon="trash" label="Remover variante" disabled={d.variants.length <= 2} onClick={() => onChange({ ...d, variants: d.variants.filter((_, j) => j !== i) })} />
            </div>
          ))}
          <SplitResults automation={automation} node={node} />
        </Section>
      )
      break

    case 'goto':
      body = (
        <Section title="Continuar em">
          <select className="field" value={d.automationId} onChange={(e) => onChange({ ...d, automationId: e.target.value })}>
            <option value="">Escolha a automação…</option>
            {others.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Section>
      )
      break
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-ink-800 px-4 py-3">
        <span className="grid size-7 place-items-center rounded-lg" style={{ background: `${meta.color}22`, color: meta.color }}>
          <Icon name={NODE_ICON[node.type]} size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold">{meta.label}</div>
          <div className="truncate text-[11.5px] text-mute-600">{meta.hint}</div>
        </div>
        <IconButton icon="x" label="Fechar painel" onClick={onClose} />
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">{body}</div>
      {node.type !== 'trigger' && (
        <div className="flex gap-2 border-t border-ink-800 px-4 py-3">
          <Button size="sm" icon="copy" onClick={onDuplicate}>
            Duplicar
          </Button>
          <Button size="sm" variant="danger" icon="trash" onClick={onDelete}>
            Excluir passo
          </Button>
        </div>
      )}
      <datalist id="tag-list">
        {tags.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <datalist id="field-list">
        {fields.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
    </div>
  )
}

function SplitResults({ automation, node }: { automation: Automation; node: FlowNode }) {
  if (node.data.kind !== 'split') return null
  const variants = node.data.variants
  const total = variants.reduce((s, v) => s + (automation.stats.variants[v.id] ?? 0), 0)
  if (!total) return <p className="text-[11.5px] text-mute-600">Os resultados aparecem aqui conforme os contatos passam pelo teste.</p>
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-ink-800 p-3">
      <span className="label">Distribuição real</span>
      {variants.map((v) => {
        const n = automation.stats.variants[v.id] ?? 0
        return (
          <div key={v.id} className="grid grid-cols-[60px_1fr_auto] items-center gap-2 text-[12px]">
            <span className="truncate text-mute">{v.label}</span>
            <span className="h-2 rounded-r bg-brand" style={{ width: `${Math.max(2, (n / total) * 100)}%` }} />
            <span className="tabular-nums">{n}</span>
          </div>
        )
      })}
    </div>
  )
}
