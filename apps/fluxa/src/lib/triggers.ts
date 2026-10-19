/**
 * Decide qual automação responde a um evento de entrada.
 * Ordem de prioridade (da mais específica para a mais genérica):
 * link/QR → comentário → resposta a story → palavra-chave exata → início → contém → intenção por IA → boas-vindas → padrão.
 */
import type { Automation, Channel, Trigger } from './types'
import { normalize } from './util'

export type EventKind = 'message' | 'comment' | 'story_reply' | 'ref'

export interface InboundEvent {
  kind: EventKind
  channel: Channel
  text: string
  ref?: string
  postId?: string
  /** Primeira interação do contato com a marca. */
  isNewContact: boolean
}

export interface TriggerMatch {
  automation: Automation
  trigger: Trigger
  /** Quanto menor, mais específica. */
  priority: number
}

export function keywordMatches(trigger: Pick<Trigger, 'keywords' | 'match'>, text: string): boolean {
  const message = normalize(text)
  if (!message) return false
  return trigger.keywords.some((raw) => {
    const keyword = normalize(raw)
    if (!keyword) return false
    if (trigger.match === 'exact') return message === keyword
    if (trigger.match === 'starts') return message === keyword || message.startsWith(`${keyword} `)
    // "contém" respeita fronteira de palavra: "oi" não dispara em "boiada".
    return ` ${message} `.includes(` ${keyword} `)
  })
}

function supportsChannel(trigger: Trigger, channel: Channel): boolean {
  return trigger.channels.length === 0 || trigger.channels.includes(channel)
}

/** Prioridade de um gatilho para o evento, ou null se não corresponde. Gatilhos de IA são tratados à parte. */
export function triggerPriority(trigger: Trigger, event: InboundEvent): number | null {
  if (!supportsChannel(trigger, event.channel)) return null
  switch (trigger.type) {
    case 'ref_link': {
      if (!trigger.ref) return null
      if (event.kind === 'ref' && event.ref === trigger.ref) return 0
      // No WhatsApp o "ref" chega como a mensagem pré-preenchida do link.
      if (event.kind === 'message' && normalize(event.text) === normalize(trigger.ref)) return 0
      return null
    }
    case 'comment':
      if (event.kind !== 'comment') return null
      if (trigger.postId && event.postId && trigger.postId !== event.postId) return null
      if (trigger.keywords.length === 0) return 2
      return keywordMatches(trigger, event.text) ? 1 : null
    case 'story_reply':
      if (event.kind !== 'story_reply') return null
      if (trigger.keywords.length === 0) return 3
      return keywordMatches(trigger, event.text) ? 2 : null
    case 'keyword':
      if (event.kind !== 'message' || !keywordMatches(trigger, event.text)) return null
      return trigger.match === 'exact' ? 4 : trigger.match === 'starts' ? 5 : 6
    case 'welcome':
      return event.isNewContact && event.kind === 'message' ? 8 : null
    case 'default':
      return event.kind === 'message' ? 9 : null
    case 'ai_intent':
      return null
  }
}

/** Melhor correspondência determinística (sem IA) entre as automações ativas. */
export function matchTriggers(automations: Automation[], event: InboundEvent): TriggerMatch | null {
  let best: TriggerMatch | null = null
  for (const automation of automations) {
    if (!automation.active) continue
    for (const trigger of automation.triggers) {
      const priority = triggerPriority(trigger, event)
      if (priority === null) continue
      if (!best || priority < best.priority) best = { automation, trigger, priority }
    }
  }
  return best
}

/** Gatilhos de intenção (IA) candidatos para o evento. Rodam antes de boas-vindas/padrão. */
export function intentCandidates(automations: Automation[], event: InboundEvent): { automation: Automation; trigger: Trigger }[] {
  if (event.kind !== 'message' || !normalize(event.text)) return []
  const out: { automation: Automation; trigger: Trigger }[] = []
  for (const automation of automations) {
    if (!automation.active) continue
    for (const trigger of automation.triggers) {
      if (trigger.type === 'ai_intent' && trigger.intent?.trim() && supportsChannel(trigger, event.channel)) out.push({ automation, trigger })
    }
  }
  return out
}

/** Prioridade a partir da qual um gatilho de intenção vence: tudo que é mais genérico que "contém palavra-chave". */
export const INTENT_PRIORITY = 7
