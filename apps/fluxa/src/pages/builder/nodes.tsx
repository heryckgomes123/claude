import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { memo, type ReactNode } from 'react'
import { Icon, type IconName } from '../../components/Icon'
import { CHANNEL_LABEL } from '../../lib/audience'
import { TRIGGER_META, describeTrigger } from '../../lib/describe'
import { NODE_META, outputHandles } from '../../lib/flow'
import type { FlowNode, NodeData, NodeKind } from '../../lib/types'
import { formatDelay, formatNumber } from '../../lib/util'
import { useBuilder } from './context'

export type RFData = NodeData & Record<string, unknown>
export type RFNode = Node<RFData, NodeKind>

export const NODE_ICON: Record<NodeKind, IconName> = {
  trigger: 'bolt',
  message: 'message',
  question: 'question',
  condition: 'branch',
  action: 'tag',
  delay: 'clock',
  ai: 'sparkles',
  split: 'split',
  goto: 'arrowRight',
}

const ACTION_LABEL = {
  add_tag: 'Adicionar tag',
  remove_tag: 'Remover tag',
  set_field: 'Definir campo',
  add_score: 'Pontuação',
  notify: 'Notificar time',
  handoff: 'Passar para humano',
  subscribe_sequence: 'Inscrever em sequência',
  unsubscribe_sequence: 'Remover de sequência',
  webhook: 'Webhook',
} as const

export { ACTION_LABEL }

function Shell({ node, selected, children }: { node: FlowNode; selected: boolean; children: ReactNode }) {
  const { tracedNodes, activeNodeId, issues, automation, showVisits } = useBuilder()
  const meta = NODE_META[node.type]
  const traced = tracedNodes.has(node.id)
  const active = activeNodeId === node.id
  const nodeIssues = issues.filter((i) => i.nodeId === node.id)
  const hasError = nodeIssues.some((i) => i.level === 'error')
  const handles = outputHandles(node)
  const visits = automation.stats.nodeVisits[node.id] ?? 0

  return (
    <div
      className={`w-[268px] rounded-2xl border bg-ink-900/95 shadow-[0_12px_40px_-18px_rgba(0,0,0,.9)] backdrop-blur transition ${active ? 'pulse-ring' : ''}`}
      style={{ borderColor: selected ? meta.color : traced ? 'var(--color-neon)' : hasError ? 'rgba(255,107,107,.6)' : 'var(--color-ink-700)' }}
    >
      {node.type !== 'trigger' && <Handle type="target" position={Position.Left} style={{ top: 26 }} />}
      <div className="flex items-center gap-2 border-b border-ink-800 px-3.5 py-2.5">
        <span className="grid size-6 place-items-center rounded-lg" style={{ background: `${meta.color}22`, color: meta.color }}>
          <Icon name={NODE_ICON[node.type]} size={14} />
        </span>
        <span className="text-[12.5px] font-semibold">{meta.label}</span>
        {nodeIssues.length > 0 && (
          <span className={`ml-auto ${hasError ? 'text-danger' : 'text-gold-300'}`} title={nodeIssues.map((i) => i.text).join('\n')}>
            <Icon name="alert" size={14} />
          </span>
        )}
        {showVisits && visits > 0 && (
          <span className={`${nodeIssues.length ? '' : 'ml-auto'} rounded-full bg-ink-800 px-1.5 text-[10px] tabular-nums text-mute`} title="Contatos que passaram por este passo">
            {formatNumber(visits)}
          </span>
        )}
      </div>
      <div className="px-3.5 py-3 text-[12.5px] leading-relaxed text-mute">{children}</div>
      {handles.length > 0 && (
        <div className="border-t border-ink-800 py-1.5">
          {handles.map((h) => (
            <div key={h.id} className="relative flex items-center justify-end px-3.5 py-1 text-[11.5px]">
              <span className={h.tone === 'yes' ? 'text-neon' : h.tone === 'no' ? 'text-danger' : h.tone === 'muted' ? 'text-mute-600' : 'text-bone/80'}>{h.label}</span>
              <Handle type="source" position={Position.Right} id={h.id} style={{ right: -6, top: '50%' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function clip(text: string, max = 140): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function Body({ node }: { node: FlowNode }) {
  const { automation, automations } = useBuilder()
  const d = node.data
  switch (d.kind) {
    case 'trigger':
      return automation.triggers.length ? (
        <ul className="space-y-1.5">
          {automation.triggers.map((t) => (
            <li key={t.id} className="rounded-lg bg-ink-850 px-2.5 py-1.5">
              <span className="block text-[11px] font-semibold text-neon">{TRIGGER_META[t.type].label}</span>
              <span className="block truncate text-[12px] text-bone/80">{describeTrigger(t)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-mute-600">Nenhum gatilho. Configure no painel ao lado.</span>
      )
    case 'message':
      return (
        <>
          {d.imageUrl && (
            <span className="mb-2 flex items-center gap-1.5 text-[11px] text-mute-600">
              <Icon name="image" size={12} /> imagem
            </span>
          )}
          <p className="whitespace-pre-wrap text-bone/90">{clip(d.text) || <span className="text-mute-600">Mensagem vazia</span>}</p>
          {d.buttons.filter((b) => b.action !== 'next').map((b) => (
            <span key={b.id} className="mt-2 flex items-center justify-center gap-1 rounded-lg border border-ink-700 py-1 text-[11.5px] text-info">
              {b.label} <Icon name={b.action === 'url' ? 'external' : 'flow'} size={11} />
            </span>
          ))}
        </>
      )
    case 'question':
      return (
        <>
          <p className="text-bone/90">{clip(d.prompt)}</p>
          <p className="mt-2 text-[11.5px]">
            Salva em <code className="rounded bg-ink-800 px-1 text-gold-200">{d.field || '—'}</code> · {INPUT_LABEL[d.inputType]}
          </p>
        </>
      )
    case 'condition':
      return (
        <p>
          {d.rules.length === 0
            ? 'Sem regras (sempre "Sim")'
            : d.rules.map((r, i) => (
                <span key={r.id}>
                  {i > 0 && <b className="text-bone"> {d.combinator === 'and' ? 'e' : 'ou'} </b>}
                  {ruleText(r)}
                </span>
              ))}
        </p>
      )
    case 'action':
      return (
        <ul className="space-y-1">
          {d.actions.map((a) => (
            <li key={a.id} className="truncate">
              <span className="text-bone/90">{ACTION_LABEL[a.kind]}</span>
              {a.kind === 'set_field' ? `: ${a.field} = ${a.value}` : a.kind === 'handoff' ? '' : a.kind === 'subscribe_sequence' || a.kind === 'unsubscribe_sequence' ? '' : a.value ? `: ${a.value}` : ''}
            </li>
          ))}
          {d.actions.length === 0 && <li className="text-mute-600">Nenhuma ação</li>}
        </ul>
      )
    case 'delay':
      return <p className="text-bone/90">Esperar {formatDelay(d.amount, d.unit)}</p>
    case 'ai':
      return d.mode === 'classify' ? (
        <p>
          <span className="text-bone/90">Classificar intenção</span> da última mensagem em {d.intents.length} caminho(s).
        </p>
      ) : (
        <p>
          <span className="text-bone/90">Responder com IA:</span> {clip(d.instructions, 100)}
        </p>
      )
    case 'split':
      return <p>Sorteia uma variante por contato e mede o resultado de cada uma.</p>
    case 'goto':
      return <p className="text-bone/90">{automations.find((a) => a.id === d.automationId)?.name ?? <span className="text-mute-600">Escolha a automação</span>}</p>
  }
}

export const INPUT_LABEL = { text: 'texto livre', email: 'e-mail', phone: 'telefone', number: 'número', choice: 'múltipla escolha' } as const

const OP_LABEL: Record<string, string> = { has: 'tem', not_has: 'não tem', eq: '=', neq: '≠', contains: 'contém', gt: '>', lt: '<', set: 'preenchido', unset: 'vazio' }

export function ruleText(r: { subject: string; op: string; field?: string; value: string }): string {
  if (r.subject === 'tag') return `${OP_LABEL[r.op]} a tag “${r.value}”`
  if (r.subject === 'channel') return `canal ${OP_LABEL[r.op]} ${CHANNEL_LABEL[r.value as keyof typeof CHANNEL_LABEL] ?? r.value}`
  if (r.subject === 'score') return `pontuação ${OP_LABEL[r.op]} ${r.value}`
  if (r.op === 'set' || r.op === 'unset') return `${r.field} ${OP_LABEL[r.op]}`
  return `${r.field} ${OP_LABEL[r.op]} “${r.value}”`
}

const FlowNodeView = memo(function FlowNodeView(props: NodeProps<RFNode>) {
  const node: FlowNode = { id: props.id, type: props.type, position: { x: 0, y: 0 }, data: props.data }
  return (
    <Shell node={node} selected={props.selected}>
      <Body node={node} />
    </Shell>
  )
})

export const nodeTypes = {
  trigger: FlowNodeView,
  message: FlowNodeView,
  question: FlowNodeView,
  condition: FlowNodeView,
  action: FlowNodeView,
  delay: FlowNodeView,
  ai: FlowNodeView,
  split: FlowNodeView,
  goto: FlowNodeView,
}
