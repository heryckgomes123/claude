/** Modelo de dados do INTELRA Fluxa. Tudo serializável em JSON (persistido no navegador). */

export type Channel = 'instagram' | 'whatsapp' | 'messenger' | 'telegram' | 'web'

export const CHANNELS: Channel[] = ['instagram', 'whatsapp', 'messenger', 'telegram', 'web']

/* ───────────── Gatilhos ───────────── */

export type TriggerType =
  | 'keyword' // mensagem com palavra-chave
  | 'comment' // comentário em post com palavra-chave → DM
  | 'story_reply' // resposta a story
  | 'ref_link' // entrada por link / QR com ref
  | 'ai_intent' // intenção detectada por IA (sem depender de palavra exata)
  | 'welcome' // primeira mensagem de um contato novo
  | 'default' // nenhuma outra automação respondeu

export type KeywordMatch = 'contains' | 'exact' | 'starts'

export interface Trigger {
  id: string
  type: TriggerType
  channels: Channel[]
  keywords: string[]
  match: KeywordMatch
  /** ai_intent: descrição da intenção em linguagem natural. */
  intent?: string
  /** comment: id do post ('' = qualquer post). */
  postId?: string
  /** comment: resposta pública deixada no comentário. */
  publicReply?: string
  /** ref_link: identificador do link. */
  ref?: string
}

/* ───────────── Fluxo ───────────── */

export type NodeKind = 'trigger' | 'message' | 'question' | 'condition' | 'action' | 'delay' | 'ai' | 'split' | 'goto'

export type ButtonAction = 'next' | 'url' | 'automation'

export interface FlowButton {
  id: string
  label: string
  action: ButtonAction
  url?: string
  automationId?: string
}

export interface TriggerNodeData {
  kind: 'trigger'
}

export interface MessageNodeData {
  kind: 'message'
  text: string
  imageUrl?: string
  buttons: FlowButton[]
  quickReplies: { id: string; label: string }[]
}

export type InputType = 'text' | 'email' | 'phone' | 'number' | 'choice'

export interface QuestionNodeData {
  kind: 'question'
  prompt: string
  inputType: InputType
  /** Campo personalizado onde a resposta é salva. */
  field: string
  choices: string[]
  retryText: string
}

export type RuleSubject = 'tag' | 'field' | 'channel' | 'score'
export type RuleOp = 'has' | 'not_has' | 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'set' | 'unset'

export interface ConditionRule {
  id: string
  subject: RuleSubject
  op: RuleOp
  field?: string
  value: string
}

export interface ConditionNodeData {
  kind: 'condition'
  combinator: 'and' | 'or'
  rules: ConditionRule[]
}

export type ActionKind = 'add_tag' | 'remove_tag' | 'set_field' | 'add_score' | 'notify' | 'handoff' | 'subscribe_sequence' | 'unsubscribe_sequence' | 'webhook'

export interface FlowAction {
  id: string
  kind: ActionKind
  /** tag, valor, pontos, texto da notificação, id da sequência ou URL do webhook. */
  value: string
  field?: string
}

export interface ActionNodeData {
  kind: 'action'
  actions: FlowAction[]
}

export type DelayUnit = 'seconds' | 'minutes' | 'hours' | 'days'

export interface DelayNodeData {
  kind: 'delay'
  amount: number
  unit: DelayUnit
}

export interface AiIntent {
  id: string
  label: string
}

export interface AiNodeData {
  kind: 'ai'
  mode: 'reply' | 'classify'
  instructions: string
  /** reply: texto usado quando a IA não está configurada ou falha. */
  fallbackText: string
  /** classify: cada intenção vira uma saída do nó. */
  intents: AiIntent[]
  /** Campo onde salvar a resposta/intenção (opcional). */
  saveTo?: string
}

export interface SplitVariant {
  id: string
  label: string
  weight: number
}

export interface SplitNodeData {
  kind: 'split'
  variants: SplitVariant[]
}

export interface GotoNodeData {
  kind: 'goto'
  automationId: string
}

export type NodeData =
  | TriggerNodeData
  | MessageNodeData
  | QuestionNodeData
  | ConditionNodeData
  | ActionNodeData
  | DelayNodeData
  | AiNodeData
  | SplitNodeData
  | GotoNodeData

export interface FlowNode {
  id: string
  type: NodeKind
  position: { x: number; y: number }
  data: NodeData
}

export interface FlowEdge {
  id: string
  source: string
  /** Saída do nó de origem: 'out', 'yes', 'no', id do botão, id da intenção, id da variante… */
  sourceHandle: string
  target: string
}

export interface AutomationStats {
  runs: number
  completed: number
  clicks: number
  /** Visitas por nó (para mapa de calor no construtor). */
  nodeVisits: Record<string, number>
  /** Contagem por variante de teste A/B. */
  variants: Record<string, number>
}

export interface Automation {
  id: string
  name: string
  description: string
  active: boolean
  triggers: Trigger[]
  nodes: FlowNode[]
  edges: FlowEdge[]
  stats: AutomationStats
  createdAt: number
  updatedAt: number
}

/* ───────────── Contatos e conversas ───────────── */

export type Sender = 'contact' | 'bot' | 'agent' | 'system'

export interface ChatMessage {
  id: string
  from: Sender
  text: string
  imageUrl?: string
  buttons?: FlowButton[]
  quickReplies?: { id: string; label: string }[]
  ts: number
  automationId?: string
  broadcastId?: string
}

export interface SequenceSubscription {
  sequenceId: string
  subscribedAt: number
  /** Índice do próximo passo a enviar. */
  nextStep: number
}

export interface Contact {
  id: string
  firstName: string
  lastName: string
  channel: Channel
  handle: string
  avatarHue: number
  tags: string[]
  fields: Record<string, string>
  score: number
  subscribed: boolean
  botPaused: boolean
  assignedTo?: string
  isTest?: boolean
  createdAt: number
  lastInboundAt: number
  lastActivityAt: number
  unread: number
  messages: ChatMessage[]
  sequences: SequenceSubscription[]
}

/** Estado de uma conversa parada no meio de um fluxo. */
export interface RunState {
  automationId: string
  nodeId: string
  wait: 'reply' | 'input' | 'delay'
  resumeAt?: number
  attempts?: number
}

/* ───────────── Transmissões, sequências, crescimento ───────────── */

export interface Segment {
  channels: Channel[]
  includeTags: string[]
  excludeTags: string[]
  minScore: number
}

export interface Broadcast {
  id: string
  name: string
  text: string
  buttons: FlowButton[]
  segment: Segment
  status: 'draft' | 'scheduled' | 'sent'
  scheduledAt?: number
  sentAt?: number
  sentTo: number
  skipped: number
  clicks: number
  createdAt: number
}

export interface SequenceStep {
  id: string
  amount: number
  unit: DelayUnit
  text: string
}

export interface Sequence {
  id: string
  name: string
  active: boolean
  steps: SequenceStep[]
  createdAt: number
}

export type GrowthToolType = 'link' | 'qr' | 'button'

export interface GrowthTool {
  id: string
  name: string
  type: GrowthToolType
  channel: Exclude<Channel, 'web'>
  ref: string
  automationId: string
  entries: number
  createdAt: number
}

export interface SavedReply {
  id: string
  title: string
  text: string
}

/* ───────────── Configurações e atividade ───────────── */

export interface Settings {
  businessName: string
  agentName: string
  handles: {
    instagram: string
    whatsapp: string
    messenger: string
    telegram: string
  }
  ai: {
    apiKey: string
    model: string
  }
  /** 'demo' comprime atrasos: cada unidade vira segundos (5 min → 5 s). */
  timeScale: 'demo' | 'real'
  /** Envia o lead para o time quando a pontuação atinge este valor. */
  hotLeadScore: number
}

export type ActivityType = 'message_in' | 'message_out' | 'run' | 'completed' | 'click' | 'new_contact' | 'lead' | 'handoff' | 'broadcast'

export interface Activity {
  id: string
  ts: number
  type: ActivityType
  contactId?: string
  automationId?: string
  channel?: Channel
}

export interface AppNotification {
  id: string
  ts: number
  text: string
  contactId?: string
  read: boolean
}
