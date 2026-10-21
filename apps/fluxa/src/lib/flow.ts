/** Utilidades de fluxo: saídas de cada nó, criação de nós e validação ("linter" do fluxo). */
import type { Automation, FlowNode, NodeData, NodeKind } from './types'
import { interactiveHandles } from './engine'
import { uid } from './util'

export interface HandleDef {
  id: string
  label: string
  tone?: 'yes' | 'no' | 'muted'
}

/** Saídas (handles) de um nó, na ordem em que aparecem. */
export function outputHandles(node: FlowNode): HandleDef[] {
  const data = node.data
  switch (data.kind) {
    case 'trigger':
    case 'action':
    case 'delay':
      return [{ id: 'out', label: 'Próximo' }]
    case 'message': {
      const interactive = [
        ...data.buttons.filter((b) => b.action === 'next').map((b) => ({ id: b.id, label: b.label || 'Botão' })),
        ...data.quickReplies.map((q) => ({ id: q.id, label: q.label || 'Resposta rápida' })),
      ]
      return interactive.length ? interactive : [{ id: 'out', label: 'Próximo' }]
    }
    case 'question':
      return [
        { id: 'out', label: 'Respondeu' },
        { id: 'invalid', label: '3 respostas inválidas', tone: 'muted' },
      ]
    case 'condition':
      return [
        { id: 'yes', label: 'Sim', tone: 'yes' },
        { id: 'no', label: 'Não', tone: 'no' },
      ]
    case 'ai':
      if (data.mode === 'classify') {
        return [...data.intents.map((i) => ({ id: i.id, label: i.label || 'Intenção' })), { id: 'fallback', label: 'Nenhuma', tone: 'muted' as const }]
      }
      return [{ id: 'out', label: 'Próximo' }]
    case 'split':
      return data.variants.map((v) => ({ id: v.id, label: `${v.label} · ${v.weight}%` }))
    case 'goto':
      return []
  }
}

export const NODE_META: Record<NodeKind, { label: string; hint: string; color: string }> = {
  trigger: { label: 'Gatilho', hint: 'Onde o fluxo começa', color: '#0a8754' },
  message: { label: 'Mensagem', hint: 'Texto, imagem, botões e respostas rápidas', color: '#0098b0' },
  question: { label: 'Pergunta', hint: 'Coleta e valida uma resposta', color: '#2f6feb' },
  condition: { label: 'Condição', hint: 'Divide por tag, campo, canal ou pontuação', color: '#a3369a' },
  action: { label: 'Ação', hint: 'Tags, campos, pontuação, time, webhook', color: '#c46a06' },
  delay: { label: 'Atraso', hint: 'Espera antes de continuar', color: '#687a8f' },
  ai: { label: 'IA', hint: 'Responde ou classifica com IA', color: '#7855f5' },
  split: { label: 'Teste A/B', hint: 'Divide o tráfego entre variantes', color: '#c2410c' },
  goto: { label: 'Ir para automação', hint: 'Continua em outra automação', color: '#687a8f' },
}

export function createNodeData(kind: NodeKind): NodeData {
  switch (kind) {
    case 'trigger':
      return { kind }
    case 'message':
      return { kind, text: 'Escreva sua mensagem, {{first_name}}!', buttons: [], quickReplies: [] }
    case 'question':
      return { kind, prompt: 'Qual é o seu melhor e-mail?', inputType: 'email', field: 'email', choices: [], retryText: 'Hmm, não consegui entender. Pode enviar de novo?' }
    case 'condition':
      return { kind, combinator: 'and', rules: [{ id: uid('r'), subject: 'tag', op: 'has', value: 'cliente' }] }
    case 'action':
      return { kind, actions: [{ id: uid('a'), kind: 'add_tag', value: 'lead' }] }
    case 'delay':
      return { kind, amount: 5, unit: 'minutes' }
    case 'ai':
      return {
        kind,
        mode: 'reply',
        instructions: 'Responda dúvidas sobre os serviços da empresa e convide a pessoa para conversar com o time.',
        fallbackText: 'Recebi sua mensagem! Nosso time vai te responder em instantes. 🙌',
        intents: [
          { id: uid('i'), label: 'Quer comprar ou saber preço' },
          { id: uid('i'), label: 'Precisa de suporte' },
        ],
      }
    case 'split':
      return {
        kind,
        variants: [
          { id: uid('v'), label: 'A', weight: 50 },
          { id: uid('v'), label: 'B', weight: 50 },
        ],
      }
    case 'goto':
      return { kind, automationId: '' }
  }
}

export function createNode(kind: NodeKind, position: { x: number; y: number }): FlowNode {
  return { id: uid('n'), type: kind, position, data: createNodeData(kind) }
}

export interface FlowIssue {
  nodeId?: string
  level: 'error' | 'warning'
  text: string
}

/** Problemas que fariam o fluxo falhar ou se comportar de forma inesperada. */
export function validateFlow(automation: Automation, all: Automation[]): FlowIssue[] {
  const issues: FlowIssue[] = []
  const start = automation.nodes.find((n) => n.type === 'trigger')
  if (!start) issues.push({ level: 'error', text: 'O fluxo não tem nó de gatilho.' })
  if (automation.triggers.length === 0) issues.push({ level: 'warning', text: 'Nenhum gatilho configurado: a automação só roda via botão, link ou outra automação.' })

  for (const trigger of automation.triggers) {
    if (trigger.type === 'keyword' && trigger.keywords.every((k) => !k.trim())) issues.push({ level: 'error', text: 'Gatilho de palavra-chave sem palavras.' })
    if (trigger.type === 'ai_intent' && !trigger.intent?.trim()) issues.push({ level: 'error', text: 'Gatilho de intenção sem descrição.' })
    if (trigger.type === 'ref_link' && !trigger.ref?.trim()) issues.push({ level: 'error', text: 'Gatilho de link sem identificador (ref).' })
  }

  const reachable = new Set<string>()
  const queue = start ? [start.id] : []
  while (queue.length) {
    const id = queue.shift()!
    if (reachable.has(id)) continue
    reachable.add(id)
    for (const e of automation.edges) if (e.source === id) queue.push(e.target)
  }

  if (start && !automation.edges.some((e) => e.source === start.id)) issues.push({ nodeId: start.id, level: 'error', text: 'O gatilho não está conectado a nenhum passo.' })

  for (const node of automation.nodes) {
    if (node.type === 'trigger') continue
    if (!reachable.has(node.id)) issues.push({ nodeId: node.id, level: 'warning', text: `${NODE_META[node.type].label} solto: nenhum caminho chega até ele.` })
    const data = node.data
    if (data.kind === 'message') {
      if (!data.text.trim() && !data.imageUrl) issues.push({ nodeId: node.id, level: 'error', text: 'Mensagem vazia.' })
      for (const b of data.buttons) {
        if (!b.label.trim()) issues.push({ nodeId: node.id, level: 'error', text: 'Botão sem texto.' })
        if (b.action === 'url' && !/^https?:\/\//.test(b.url ?? '')) issues.push({ nodeId: node.id, level: 'error', text: `Botão "${b.label}" com link inválido.` })
        if (b.action === 'automation' && !all.some((a) => a.id === b.automationId)) issues.push({ nodeId: node.id, level: 'error', text: `Botão "${b.label}" sem automação de destino.` })
      }
      if (data.buttons.length > 3) issues.push({ nodeId: node.id, level: 'warning', text: 'Instagram e WhatsApp exibem no máximo 3 botões por mensagem.' })
      for (const handle of interactiveHandles(node)) {
        if (!automation.edges.some((e) => e.source === node.id && e.sourceHandle === handle)) {
          const label = [...data.buttons, ...data.quickReplies].find((b) => b.id === handle)?.label ?? ''
          issues.push({ nodeId: node.id, level: 'warning', text: `"${label}" não leva a nenhum passo.` })
        }
      }
    }
    if (data.kind === 'question') {
      if (!data.field.trim()) issues.push({ nodeId: node.id, level: 'error', text: 'Pergunta sem campo para salvar a resposta.' })
      if (data.inputType === 'choice' && data.choices.filter((c) => c.trim()).length < 2) issues.push({ nodeId: node.id, level: 'error', text: 'Pergunta de múltipla escolha precisa de 2 opções ou mais.' })
    }
    if (data.kind === 'ai' && data.mode === 'reply' && !data.fallbackText.trim())
      issues.push({ nodeId: node.id, level: 'warning', text: 'Nó de IA sem texto alternativo: se a IA falhar, nada é enviado.' })
    if (data.kind === 'ai' && data.mode === 'classify' && data.intents.length === 0) issues.push({ nodeId: node.id, level: 'error', text: 'Classificação sem intenções.' })
    if (data.kind === 'split') {
      const total = data.variants.reduce((s, v) => s + v.weight, 0)
      if (total !== 100) issues.push({ nodeId: node.id, level: 'warning', text: `Pesos do teste A/B somam ${total}% (o ideal é 100%).` })
    }
    if (data.kind === 'goto' && !all.some((a) => a.id === data.automationId && a.id !== automation.id))
      issues.push({ nodeId: node.id, level: 'error', text: 'Escolha a automação de destino.' })
    if (data.kind === 'action') {
      for (const a of data.actions) {
        if (a.kind === 'set_field' && !a.field?.trim()) issues.push({ nodeId: node.id, level: 'error', text: 'Ação "definir campo" sem nome de campo.' })
        if (a.kind === 'webhook' && !/^https:\/\//.test(a.value)) issues.push({ nodeId: node.id, level: 'error', text: 'Webhook precisa de uma URL https://.' })
        if ((a.kind === 'add_tag' || a.kind === 'remove_tag') && !a.value.trim()) issues.push({ nodeId: node.id, level: 'error', text: 'Ação de tag sem nome da tag.' })
      }
    }
  }
  return issues
}
