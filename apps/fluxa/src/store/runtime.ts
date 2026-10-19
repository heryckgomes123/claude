/**
 * Runtime: liga o motor de fluxos às conversas.
 * Recebe mensagens, escolhe a automação, aplica os efeitos (mensagens, tags, notificações,
 * estatísticas), agenda atrasos e envia sequências e transmissões agendadas.
 */
import { createAiProvider } from '../lib/ai'
import type { Effect, EngineEnv, Input, StepResult } from '../lib/engine'
import { resumeRun, startRun } from '../lib/engine'
import { broadcastReach } from '../lib/audience'
import { INTENT_PRIORITY, intentCandidates, matchTriggers, type EventKind, type InboundEvent } from '../lib/triggers'
import type { Activity, Automation, Broadcast, Channel, ChatMessage, Contact, FlowButton, RunState } from '../lib/types'
import { delayMs, fullName, insideWindow, interpolate, normalize, uid } from '../lib/util'
import { useStore } from './store'

const get = () => useStore.getState()

function env(): EngineEnv {
  const { settings } = get()
  return {
    ai: createAiProvider({ apiKey: settings.ai.apiKey, model: settings.ai.model, businessName: settings.businessName }),
    now: Date.now,
    random: Math.random,
    timeScale: settings.timeScale,
  }
}

function contactById(id: string): Contact | undefined {
  return get().contacts.find((c) => c.id === id)
}

function automationById(id: string): Automation | undefined {
  return get().automations.find((a) => a.id === id)
}

let clock = 0
/** Timestamps estritamente crescentes, para manter a ordem das mensagens. */
function tick(): number {
  clock = Math.max(Date.now(), clock + 1)
  return clock
}

function appendMessages(contactId: string, messages: Omit<ChatMessage, 'id' | 'ts'>[]): void {
  if (!messages.length) return
  get().updateContact(contactId, (c) => ({
    ...c,
    messages: [...c.messages, ...messages.map((m) => ({ ...m, id: uid('m'), ts: tick() }))].slice(-300),
    lastActivityAt: Date.now(),
  }))
}

function systemNote(contactId: string, text: string): void {
  appendMessages(contactId, [{ from: 'system', text }])
}

/* ───────────── Atrasos ───────────── */

const timers = new Map<string, ReturnType<typeof setTimeout>>()

function scheduleDelay(contactId: string, state: RunState): void {
  clearTimeout(timers.get(contactId))
  const wait = Math.max(0, (state.resumeAt ?? Date.now()) - Date.now())
  timers.set(
    contactId,
    setTimeout(() => {
      timers.delete(contactId)
      const current = get().runs[contactId]
      if (!current || current.nodeId !== state.nodeId || current.resumeAt !== state.resumeAt) return
      const automation = automationById(current.automationId)
      const contact = contactById(contactId)
      if (!automation || !contact) return get().setRun(contactId, null)
      void resumeRun(automation, current, contact, null, env()).then((r) => apply(contactId, automation, r, false))
    }, wait),
  )
}

/* ───────────── Aplicação de efeitos ───────────── */

async function apply(contactId: string, automation: Automation, result: StepResult, isStart: boolean): Promise<void> {
  const store = get()
  const before = contactById(contactId)
  if (!before) return
  const channel = before.channel
  const events: Omit<Activity, 'id'>[] = []
  const outgoing: Omit<ChatMessage, 'id' | 'ts'>[] = []
  const visits: string[] = []
  let gotoId: string | null = null

  // O contato pode ter recebido mensagens enquanto a IA respondia: preserva o histórico atual.
  const updated: Contact = { ...result.contact, messages: before.messages, unread: Math.max(before.unread, result.contact.unread) }
  store.updateContact(contactId, () => updated)

  for (const effect of result.effects as Effect[]) {
    switch (effect.type) {
      case 'send':
        outgoing.push(effect.message)
        events.push({ ts: Date.now(), type: 'message_out', automationId: automation.id, contactId, channel })
        break
      case 'note':
        outgoing.push({ from: 'system', text: effect.text })
        break
      case 'notify':
        store.notify(effect.text, contactId)
        break
      case 'handoff':
        store.notify(`${fullName(updated) || 'Contato'} foi transferido para o atendimento humano.`, contactId)
        events.push({ ts: Date.now(), type: 'handoff', automationId: automation.id, contactId, channel })
        outgoing.push({ from: 'system', text: 'Automação pausada: conversa transferida para o time.' })
        break
      case 'webhook':
        outgoing.push({ from: 'system', text: await fireWebhook(effect.url, effect.payload) })
        break
      case 'goto':
        gotoId = effect.automationId
        break
      case 'visit':
        visits.push(effect.nodeId)
        break
      case 'variant':
        store.updateAutomation(automation.id, (a) => ({ ...a, stats: { ...a.stats, variants: { ...a.stats.variants, [effect.variantId]: (a.stats.variants[effect.variantId] ?? 0) + 1 } } }))
        break
      case 'click':
        store.updateAutomation(automation.id, (a) => ({ ...a, stats: { ...a.stats, clicks: a.stats.clicks + 1 } }))
        events.push({ ts: Date.now(), type: 'click', automationId: automation.id, contactId, channel })
        break
      case 'completed':
        store.updateAutomation(automation.id, (a) => ({ ...a, stats: { ...a.stats, completed: a.stats.completed + 1 } }))
        events.push({ ts: Date.now(), type: 'completed', automationId: automation.id, contactId, channel })
        break
    }
  }

  appendMessages(contactId, outgoing)

  if (visits.length || isStart) {
    store.updateAutomation(automation.id, (a) => {
      const nodeVisits = { ...a.stats.nodeVisits }
      for (const id of visits) nodeVisits[id] = (nodeVisits[id] ?? 0) + 1
      return { ...a, stats: { ...a.stats, runs: a.stats.runs + (isStart ? 1 : 0), nodeVisits } }
    })
  }
  if (isStart) events.unshift({ ts: Date.now(), type: 'run', automationId: automation.id, contactId, channel })

  // Lead quente: avisa o time uma única vez, quando a pontuação cruza o limite.
  const hot = get().settings.hotLeadScore
  if (before.score < hot && updated.score >= hot) {
    store.notify(`🔥 ${fullName(updated) || 'Um contato'} virou lead quente (${updated.score} pontos).`, contactId)
    events.push({ ts: Date.now(), type: 'lead', contactId, channel })
  }

  store.log(events)

  const trace = get().trace
  const sameTrace = trace?.contactId === contactId && trace.automationId === automation.id && !isStart
  store.setTrace({ contactId, automationId: automation.id, nodeIds: [...(sameTrace ? trace.nodeIds : []), ...visits], activeNodeId: result.state?.nodeId })

  store.setRun(contactId, result.state)
  if (result.state?.wait === 'delay') scheduleDelay(contactId, result.state)
  else clearTimeout(timers.get(contactId))

  if (gotoId) await startAutomation(contactId, gotoId)
}

async function fireWebhook(url: string, payload: unknown): Promise<string> {
  try {
    // no-cors: o navegador entrega o POST mesmo sem CORS no destino, mas não expõe a resposta.
    await fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) })
    return `Webhook enviado para ${new URL(url).host}.`
  } catch {
    return `Falha ao enviar webhook para ${url}.`
  }
}

/* ───────────── API pública ───────────── */

export async function startAutomation(contactId: string, automationId: string): Promise<void> {
  const automation = automationById(automationId)
  const contact = contactById(contactId)
  if (!automation || !contact) return
  clearTimeout(timers.get(contactId))
  const result = await startRun(automation, contact, env())
  await apply(contactId, automation, result, true)
}

export interface ReceiveOptions {
  kind?: EventKind
  postId?: string
  ref?: string
  /** Simulador: considera apenas os gatilhos desta automação (mesmo pausada). */
  scopeAutomationId?: string
}

/** Uma mensagem (ou comentário, resposta a story, entrada por link) chegou do contato. */
export async function receive(contactId: string, input: Input, options: ReceiveOptions = {}): Promise<void> {
  const store = get()
  const contact = contactById(contactId)
  if (!contact) return
  const kind = options.kind ?? 'message'
  const isNewContact = !contact.messages.some((m) => m.from === 'contact')
  const now = Date.now()

  const shown: Omit<ChatMessage, 'id' | 'ts'> =
    kind === 'comment'
      ? { from: 'system', text: `Comentário no post: “${input.text}”` }
      : kind === 'ref'
        ? { from: 'system', text: `Entrou pelo link: ${options.ref ?? input.text}` }
        : { from: 'contact', text: kind === 'story_reply' ? `↩︎ Respondeu ao story: ${input.text}` : input.text }
  appendMessages(contactId, [shown])
  store.updateContact(contactId, (c) => ({
    ...c,
    lastInboundAt: now,
    score: kind === 'message' || kind === 'story_reply' ? c.score + 1 : c.score,
    unread: c.botPaused ? c.unread + 1 : c.unread,
  }))
  store.log([{ ts: now, type: 'message_in', contactId, channel: contact.channel }, ...(isNewContact ? [{ ts: now, type: 'new_contact' as const, contactId, channel: contact.channel }] : [])])

  if (input.payload?.startsWith('start:')) return startAutomation(contactId, input.payload.slice(6))
  if (contactById(contactId)?.botPaused) return

  // 1. Fluxo em andamento esperando resposta.
  const run = get().runs[contactId]
  if (run && run.wait !== 'delay') {
    const automation = automationById(run.automationId)
    if (automation) {
      const result = await resumeRun(automation, run, contactById(contactId)!, input, env())
      if (result.handled) return apply(contactId, automation, result, false)
    }
    store.setRun(contactId, null)
  }

  // 2. Links e QR codes de crescimento.
  const scoped = options.scopeAutomationId ? automationById(options.scopeAutomationId) : undefined
  const pool = scoped ? [{ ...scoped, active: true }] : get().automations
  if (!scoped && (kind === 'ref' || kind === 'message')) {
    const ref = normalize(options.ref ?? input.text)
    const tool = get().growthTools.find((t) => t.channel === contact.channel && normalize(t.ref) === ref && automationById(t.automationId)?.active)
    if (tool) {
      store.saveGrowthTool({ ...tool, entries: tool.entries + 1 })
      return startAutomation(contactId, tool.automationId)
    }
  }

  // 3. Gatilhos.
  const event: InboundEvent = { kind, channel: contact.channel, text: input.text, ref: options.ref, postId: options.postId, isNewContact }
  let match: { automation: Automation; publicReply?: string } | null = null
  const best = matchTriggers(pool, event)
  if (best && best.priority < INTENT_PRIORITY) match = { automation: best.automation, publicReply: best.trigger.publicReply }
  else {
    const candidates = intentCandidates(pool, event)
    if (candidates.length) {
      const chosen = await env().ai.classify(
        input.text,
        candidates.map((c) => ({ id: c.trigger.id, label: c.trigger.intent ?? '' })),
      )
      const hit = candidates.find((c) => c.trigger.id === chosen)
      if (hit) match = { automation: hit.automation }
    }
    if (!match && best) match = { automation: best.automation }
  }

  if (!match) {
    if (scoped) systemNote(contactId, `Nenhum gatilho de "${scoped.name}" corresponde a esta mensagem.`)
    else store.updateContact(contactId, (c) => ({ ...c, unread: c.unread + 1 }))
    return
  }
  if (kind === 'comment' && match.publicReply) systemNote(contactId, `Resposta pública no comentário: “${interpolate(match.publicReply, contactById(contactId)!)}”`)
  if (scoped) {
    const result = await startRun(scoped, contactById(contactId)!, env())
    return apply(contactId, scoped, result, true)
  }
  return startAutomation(contactId, match.automation.id)
}

/** Clique em um botão de mensagem enviada pelo bot. */
export function clickButton(contactId: string, message: ChatMessage, button: FlowButton, options: ReceiveOptions = {}): void {
  if (message.broadcastId) {
    const broadcast = get().broadcasts.find((b) => b.id === message.broadcastId)
    if (broadcast) get().saveBroadcast({ ...broadcast, clicks: broadcast.clicks + 1 })
  }
  if (button.action === 'url') {
    if (button.url) window.open(button.url, '_blank', 'noopener')
    const automation = message.automationId ? automationById(message.automationId) : undefined
    if (automation) get().updateAutomation(automation.id, (a) => ({ ...a, stats: { ...a.stats, clicks: a.stats.clicks + 1 } }))
    get().log([{ ts: Date.now(), type: 'click', contactId, automationId: message.automationId }])
    return
  }
  if (button.action === 'automation' && button.automationId) {
    void receive(contactId, { text: button.label, payload: `start:${button.automationId}` }, options)
    return
  }
  void receive(contactId, { text: button.label, payload: button.id }, options)
}

/** Mensagem enviada por uma pessoa do time pelo inbox. */
export function sendAgentMessage(contactId: string, text: string): void {
  const contact = contactById(contactId)
  if (!contact || !text.trim()) return
  appendMessages(contactId, [{ from: 'agent', text: interpolate(text, contact) }])
  get().updateContact(contactId, { unread: 0 })
  get().log([{ ts: Date.now(), type: 'message_out', contactId, channel: contact.channel }])
}

export function setBotPaused(contactId: string, paused: boolean): void {
  get().updateContact(contactId, { botPaused: paused })
  if (paused) {
    get().setRun(contactId, null)
    clearTimeout(timers.get(contactId))
  }
  systemNote(contactId, paused ? 'Automação pausada para esta conversa.' : 'Automação retomada para esta conversa.')
}

/** Contato de teste por canal, usado pelo simulador. */
export function testContact(channel: Channel): Contact {
  const id = `test-${channel}`
  const existing = contactById(id)
  if (existing) return existing
  const now = Date.now()
  const contact: Contact = {
    id,
    firstName: 'Você',
    lastName: '(teste)',
    channel,
    handle: 'contato de teste',
    avatarHue: 45,
    tags: [],
    fields: {},
    score: 0,
    subscribed: true,
    botPaused: false,
    isTest: true,
    createdAt: now,
    lastInboundAt: now,
    lastActivityAt: now,
    unread: 0,
    messages: [],
    sequences: [],
  }
  get().addContact(contact)
  return contact
}

export function resetTestContact(channel: Channel): void {
  const id = `test-${channel}`
  clearTimeout(timers.get(id))
  get().setRun(id, null)
  get().setTrace(null)
  get().updateContact(id, (c) => ({ ...c, messages: [], tags: [], fields: {}, score: 0, botPaused: false, sequences: [] }))
}

/* ───────────── Transmissões e sequências ───────────── */

export function sendBroadcast(broadcast: Broadcast): { sent: number; skipped: number } {
  const store = get()
  const { eligible, outsideWindow } = broadcastReach(store.contacts, broadcast.segment)
  for (const contact of eligible) {
    appendMessages(contact.id, [{ from: 'bot', text: interpolate(broadcast.text, contact), buttons: broadcast.buttons.length ? broadcast.buttons : undefined, broadcastId: broadcast.id }])
  }
  store.log([...eligible.map((c) => ({ ts: Date.now(), type: 'broadcast' as const, contactId: c.id, channel: c.channel }))])
  store.saveBroadcast({ ...broadcast, status: 'sent', sentAt: Date.now(), sentTo: eligible.length, skipped: outsideWindow.length })
  return { sent: eligible.length, skipped: outsideWindow.length }
}

function stepDue(subscribedAt: number, steps: { amount: number; unit: Parameters<typeof delayMs>[1] }[], index: number, scale: 'demo' | 'real'): number {
  let at = subscribedAt
  for (let i = 0; i <= index; i++) at += delayMs(steps[i].amount, steps[i].unit, scale)
  return at
}

/** Envia passos de sequência vencidos e transmissões agendadas. Chamado periodicamente. */
export function processSchedules(now = Date.now()): void {
  const store = get()
  const scale = store.settings.timeScale
  for (const contact of store.contacts) {
    if (!contact.sequences.length || !contact.subscribed) continue
    for (const sub of contact.sequences) {
      const sequence = store.sequences.find((s) => s.id === sub.sequenceId)
      if (!sequence?.active || sub.nextStep >= sequence.steps.length) continue
      if (now < stepDue(sub.subscribedAt, sequence.steps, sub.nextStep, scale)) continue
      const step = sequence.steps[sub.nextStep]
      const fresh = contactById(contact.id)!
      if (insideWindow(fresh, now)) {
        appendMessages(contact.id, [{ from: 'bot', text: interpolate(step.text, fresh) }])
        store.log([{ ts: now, type: 'message_out', contactId: contact.id, channel: contact.channel }])
      } else {
        systemNote(contact.id, `Passo ${sub.nextStep + 1} de "${sequence.name}" não enviado: fora da janela de 24 h.`)
      }
      store.updateContact(contact.id, (c) => ({ ...c, sequences: c.sequences.map((s) => (s.sequenceId === sub.sequenceId ? { ...s, nextStep: s.nextStep + 1 } : s)) }))
    }
  }
  for (const b of store.broadcasts) {
    if (b.status === 'scheduled' && b.scheduledAt && b.scheduledAt <= now) sendBroadcast(b)
  }
}

let started = false

/** Retoma atrasos pendentes e inicia o agendador. Chamado uma vez ao abrir o app. */
export function initRuntime(): void {
  if (started) return
  started = true
  for (const [contactId, state] of Object.entries(get().runs)) {
    if (state.wait === 'delay') scheduleDelay(contactId, state)
  }
  processSchedules()
  setInterval(() => processSchedules(), 2000)
}
