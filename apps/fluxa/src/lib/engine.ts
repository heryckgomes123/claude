/**
 * Motor de fluxos: executa uma automação para um contato.
 * Não acessa a store nem o relógio diretamente — tudo chega por parâmetro,
 * o que permite testar o motor isoladamente e reutilizá-lo no simulador.
 */
import type {
  Automation,
  ChatMessage,
  ConditionNodeData,
  ConditionRule,
  Contact,
  FlowAction,
  FlowNode,
  QuestionNodeData,
  RunState,
} from './types'
import { EMAIL_RE, delayMs, interpolate, isPhone, normalize } from './util'

export interface AiProvider {
  /** Retorna o id da intenção escolhida, ou null se nenhuma se aplica. */
  classify(text: string, intents: { id: string; label: string }[], instructions?: string): Promise<string | null>
  /** Retorna o texto gerado, ou null quando a IA não está disponível. */
  reply(instructions: string, history: ChatMessage[], contact: Contact): Promise<string | null>
}

export type OutgoingMessage = Omit<ChatMessage, 'id' | 'ts'>

export type Effect =
  | { type: 'send'; message: OutgoingMessage }
  | { type: 'note'; text: string }
  | { type: 'notify'; text: string }
  | { type: 'handoff' }
  | { type: 'webhook'; url: string; payload: unknown }
  | { type: 'goto'; automationId: string }
  | { type: 'visit'; nodeId: string }
  | { type: 'variant'; variantId: string }
  | { type: 'click'; buttonId: string }
  | { type: 'completed' }

export interface StepResult {
  contact: Contact
  state: RunState | null
  effects: Effect[]
  /** false quando a mensagem não pertence ao fluxo em andamento (o fluxo é encerrado). */
  handled: boolean
}

export interface EngineEnv {
  ai: AiProvider
  now: () => number
  random: () => number
  timeScale: 'demo' | 'real'
}

export interface Input {
  text: string
  payload?: string
}

const MAX_STEPS = 60
export const MAX_ATTEMPTS = 3

export function findNode(automation: Automation, id: string): FlowNode | undefined {
  return automation.nodes.find((n) => n.id === id)
}

export function nextNodeId(automation: Automation, nodeId: string, handle = 'out'): string | undefined {
  return automation.edges.find((e) => e.source === nodeId && e.sourceHandle === handle)?.target
}

export function startNode(automation: Automation): FlowNode | undefined {
  return automation.nodes.find((n) => n.type === 'trigger')
}

/** Botões e respostas rápidas que fazem o fluxo esperar pelo clique. */
export function interactiveHandles(node: FlowNode): string[] {
  if (node.data.kind !== 'message') return []
  return [...node.data.buttons.filter((b) => b.action === 'next').map((b) => b.id), ...node.data.quickReplies.map((q) => q.id)]
}

/* ───────────── Regras ───────────── */

export function evaluateRule(rule: ConditionRule, contact: Contact): boolean {
  const value = rule.value.trim()
  switch (rule.subject) {
    case 'tag': {
      const has = contact.tags.some((t) => normalize(t) === normalize(value))
      return rule.op === 'not_has' ? !has : has
    }
    case 'channel':
      return rule.op === 'neq' ? contact.channel !== value : contact.channel === value
    case 'score':
      return compare(contact.score, rule.op, Number(value))
    case 'field': {
      const current = contact.fields[rule.field ?? ''] ?? ''
      switch (rule.op) {
        case 'set':
          return current.trim() !== ''
        case 'unset':
          return current.trim() === ''
        case 'eq':
          return normalize(current) === normalize(value)
        case 'neq':
          return normalize(current) !== normalize(value)
        case 'contains':
          return normalize(current).includes(normalize(value))
        case 'gt':
        case 'lt':
          return compare(Number(current.replace(',', '.')), rule.op, Number(value))
        default:
          return false
      }
    }
  }
}

function compare(a: number, op: ConditionRule['op'], b: number): boolean {
  if (Number.isNaN(a) || Number.isNaN(b)) return false
  if (op === 'gt') return a > b
  if (op === 'lt') return a < b
  if (op === 'neq') return a !== b
  return a === b
}

export function evaluateCondition(data: ConditionNodeData, contact: Contact): boolean {
  if (data.rules.length === 0) return true
  const results = data.rules.map((r) => evaluateRule(r, contact))
  return data.combinator === 'and' ? results.every(Boolean) : results.some(Boolean)
}

/* ───────────── Validação de respostas ───────────── */

export function validateAnswer(data: QuestionNodeData, text: string): string | null {
  const answer = text.trim()
  if (!answer) return null
  switch (data.inputType) {
    case 'email':
      return EMAIL_RE.test(answer) ? answer.toLowerCase() : null
    case 'phone':
      return isPhone(answer) ? answer.replace(/[^\d+]/g, '') : null
    case 'number': {
      const n = Number(answer.replace(/\./g, '').replace(',', '.'))
      return Number.isFinite(n) ? String(n) : null
    }
    case 'choice': {
      const byIndex = Number(answer)
      if (Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= data.choices.length) return data.choices[byIndex - 1]
      return data.choices.find((c) => normalize(c) === normalize(answer)) ?? null
    }
    default:
      return answer
  }
}

/* ───────────── Ações ───────────── */

function applyAction(action: FlowAction, contact: Contact, env: EngineEnv, effects: Effect[], automation: Automation): Contact {
  const value = interpolate(action.value, contact)
  switch (action.kind) {
    case 'add_tag':
      if (!value || contact.tags.some((t) => normalize(t) === normalize(value))) return contact
      return { ...contact, tags: [...contact.tags, value] }
    case 'remove_tag':
      return { ...contact, tags: contact.tags.filter((t) => normalize(t) !== normalize(value)) }
    case 'set_field':
      if (!action.field) return contact
      return { ...contact, fields: { ...contact.fields, [action.field]: value } }
    case 'add_score': {
      const points = Number(value)
      if (!Number.isFinite(points)) return contact
      return { ...contact, score: Math.max(0, contact.score + points) }
    }
    case 'notify':
      effects.push({ type: 'notify', text: value || 'Novo evento em uma automação' })
      return contact
    case 'handoff':
      effects.push({ type: 'handoff' })
      return { ...contact, botPaused: true, unread: contact.unread + 1 }
    case 'subscribe_sequence':
      if (!action.value || contact.sequences.some((s) => s.sequenceId === action.value)) return contact
      return { ...contact, sequences: [...contact.sequences, { sequenceId: action.value, subscribedAt: env.now(), nextStep: 0 }] }
    case 'unsubscribe_sequence':
      return { ...contact, sequences: contact.sequences.filter((s) => s.sequenceId !== action.value) }
    case 'webhook':
      if (value) {
        effects.push({
          type: 'webhook',
          url: value,
          payload: {
            event: 'fluxa.automation',
            automation: { id: automation.id, name: automation.name },
            contact: { id: contact.id, name: `${contact.firstName} ${contact.lastName}`.trim(), channel: contact.channel, tags: contact.tags, fields: contact.fields, score: contact.score },
          },
        })
      }
      return contact
  }
}

/* ───────────── Execução ───────────── */

function lastInbound(contact: Contact): string {
  for (let i = contact.messages.length - 1; i >= 0; i--) {
    if (contact.messages[i].from === 'contact') return contact.messages[i].text
  }
  return ''
}

function pickVariant(variants: { id: string; weight: number }[], random: number): string | undefined {
  const total = variants.reduce((sum, v) => sum + Math.max(0, v.weight), 0)
  if (total <= 0) return variants[0]?.id
  let cursor = random * total
  for (const v of variants) {
    cursor -= Math.max(0, v.weight)
    if (cursor < 0) return v.id
  }
  return variants[variants.length - 1]?.id
}

/** Executa a partir de `nodeId` até o fluxo terminar ou precisar esperar. */
export async function runFrom(automation: Automation, nodeId: string | undefined, contactIn: Contact, env: EngineEnv): Promise<StepResult> {
  let contact = contactIn
  const effects: Effect[] = []
  let current = nodeId
  let steps = 0
  // Mensagens enviadas nesta execução também contam como histórico para a IA.
  const sent: ChatMessage[] = []

  while (current) {
    if (++steps > MAX_STEPS) {
      effects.push({ type: 'note', text: 'Fluxo interrompido: possível loop infinito entre os passos.' })
      return { contact, state: null, effects, handled: true }
    }
    const node = findNode(automation, current)
    if (!node) break
    effects.push({ type: 'visit', nodeId: node.id })
    const data = node.data

    switch (data.kind) {
      case 'trigger':
        current = nextNodeId(automation, node.id)
        break

      case 'message': {
        const message: OutgoingMessage = {
          from: 'bot',
          text: interpolate(data.text, contact),
          imageUrl: data.imageUrl || undefined,
          buttons: data.buttons.length ? data.buttons : undefined,
          quickReplies: data.quickReplies.length ? data.quickReplies : undefined,
          automationId: automation.id,
        }
        effects.push({ type: 'send', message })
        sent.push({ ...message, id: '', ts: env.now() })
        if (interactiveHandles(node).length > 0) {
          return { contact, state: { automationId: automation.id, nodeId: node.id, wait: 'reply' }, effects, handled: true }
        }
        current = nextNodeId(automation, node.id)
        break
      }

      case 'question': {
        const quickReplies = data.inputType === 'choice' ? data.choices.map((c, i) => ({ id: `choice-${i}`, label: c })) : undefined
        effects.push({ type: 'send', message: { from: 'bot', text: interpolate(data.prompt, contact), quickReplies, automationId: automation.id } })
        return { contact, state: { automationId: automation.id, nodeId: node.id, wait: 'input', attempts: 0 }, effects, handled: true }
      }

      case 'condition':
        current = nextNodeId(automation, node.id, evaluateCondition(data, contact) ? 'yes' : 'no')
        break

      case 'action':
        for (const action of data.actions) contact = applyAction(action, contact, env, effects, automation)
        current = nextNodeId(automation, node.id)
        break

      case 'delay':
        return {
          contact,
          state: { automationId: automation.id, nodeId: node.id, wait: 'delay', resumeAt: env.now() + delayMs(data.amount, data.unit, env.timeScale) },
          effects,
          handled: true,
        }

      case 'ai': {
        if (data.mode === 'classify') {
          const text = lastInbound(contact)
          let intent: string | null = null
          try {
            intent = text ? await env.ai.classify(text, data.intents, data.instructions) : null
          } catch {
            intent = null
          }
          const label = data.intents.find((i) => i.id === intent)?.label
          if (data.saveTo) contact = { ...contact, fields: { ...contact.fields, [data.saveTo]: label ?? 'indefinido' } }
          current = nextNodeId(automation, node.id, intent && label ? intent : 'fallback')
        } else {
          let text: string | null = null
          try {
            text = await env.ai.reply(data.instructions, [...contact.messages, ...sent].slice(-14), contact)
          } catch {
            text = null
          }
          const reply = text?.trim() || interpolate(data.fallbackText, contact)
          if (reply) {
            const message: OutgoingMessage = { from: 'bot', text: reply, automationId: automation.id }
            effects.push({ type: 'send', message })
            sent.push({ ...message, id: '', ts: env.now() })
          }
          if (data.saveTo) contact = { ...contact, fields: { ...contact.fields, [data.saveTo]: reply } }
          current = nextNodeId(automation, node.id)
        }
        break
      }

      case 'split': {
        const variant = pickVariant(data.variants, env.random())
        if (variant) effects.push({ type: 'variant', variantId: variant })
        current = variant ? nextNodeId(automation, node.id, variant) : undefined
        break
      }

      case 'goto':
        if (data.automationId && data.automationId !== automation.id) effects.push({ type: 'goto', automationId: data.automationId })
        return { contact, state: null, effects, handled: true }
    }
  }

  effects.push({ type: 'completed' })
  return { contact, state: null, effects, handled: true }
}

export function startRun(automation: Automation, contact: Contact, env: EngineEnv): Promise<StepResult> {
  return runFrom(automation, startNode(automation)?.id, contact, env)
}

/** Retoma um fluxo parado com a mensagem recebida (ou com o fim de um atraso). */
export async function resumeRun(automation: Automation, state: RunState, contact: Contact, input: Input | null, env: EngineEnv): Promise<StepResult> {
  const node = findNode(automation, state.nodeId)
  if (!node) return { contact, state: null, effects: [], handled: false }

  if (state.wait === 'delay') {
    return runFrom(automation, nextNodeId(automation, node.id), contact, env)
  }
  if (!input) return { contact, state, effects: [], handled: false }

  if (state.wait === 'reply' && node.data.kind === 'message') {
    const options = [
      ...node.data.buttons.filter((b) => b.action === 'next').map((b) => ({ id: b.id, label: b.label })),
      ...node.data.quickReplies,
    ]
    const chosen = options.find((o) => o.id === input.payload) ?? options.find((o) => normalize(o.label) === normalize(input.text))
    if (!chosen) return { contact, state: null, effects: [], handled: false }
    const result = await runFrom(automation, nextNodeId(automation, node.id, chosen.id), contact, env)
    return { ...result, effects: [{ type: 'click', buttonId: chosen.id }, ...result.effects] }
  }

  if (state.wait === 'input' && node.data.kind === 'question') {
    const data = node.data
    const choiceFromPayload = input.payload?.startsWith('choice-') ? data.choices[Number(input.payload.slice(7))] : undefined
    const answer = choiceFromPayload ?? validateAnswer(data, input.text)
    if (answer === null) {
      const attempts = (state.attempts ?? 0) + 1
      if (attempts >= MAX_ATTEMPTS) {
        const fallback = nextNodeId(automation, node.id, 'invalid')
        if (fallback) return runFrom(automation, fallback, contact, env)
        return { contact, state: null, effects: [{ type: 'note', text: 'Pergunta encerrada após 3 respostas inválidas.' }], handled: true }
      }
      const quickReplies = data.inputType === 'choice' ? data.choices.map((c, i) => ({ id: `choice-${i}`, label: c })) : undefined
      return {
        contact,
        state: { ...state, attempts },
        effects: [{ type: 'send', message: { from: 'bot', text: interpolate(data.retryText, contact), quickReplies, automationId: automation.id } }],
        handled: true,
      }
    }
    const updated: Contact = data.field ? { ...contact, fields: { ...contact.fields, [data.field]: answer } } : contact
    return runFrom(automation, nextNodeId(automation, node.id), updated, env)
  }

  return { contact, state: null, effects: [], handled: false }
}
