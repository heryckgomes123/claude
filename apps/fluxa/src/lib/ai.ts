/**
 * IA do Fluxa.
 * - Com uma chave da API do Claude (Configurações), classificação de intenção, respostas,
 *   sugestões no inbox e resumos usam o Claude.
 * - Sem chave, a classificação usa um classificador local por similaridade de palavras e
 *   os nós de resposta usam o texto alternativo configurado no fluxo.
 *
 * A chave fica só no navegador de quem a configurou e é enviada direto para a API da Anthropic.
 */
import type Anthropic from '@anthropic-ai/sdk'
import type { AiProvider } from './engine'
import type { ChatMessage, Contact } from './types'
import { fullName, normalize } from './util'

export const DEFAULT_MODEL = 'claude-opus-5-5'

export const AI_MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (recomendado)' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (mais rápido)' },
]

export interface AiConfig {
  apiKey: string
  model: string
  businessName: string
}

/* ───────────── Classificador local ───────────── */

const STOPWORDS = new Set(
  'a o as os um uma uns umas de da do das dos em no na nos nas por para pra pro com sem e ou que se me te lhe eu voce vc tu ele ela nos vos eles elas meu minha seu sua isso isto esse essa este esta aquele aquela ja nao sim mais muito pouco quero queria gostaria saber sobre tem ter tenho como qual quais quando onde porque ola oi bom boa dia tarde noite favor obrigado obrigada'.split(
    ' ',
  ),
)

function stems(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .map((w) => w.slice(0, 5))
}

/** Similaridade simples entre a mensagem e a descrição de cada intenção. */
export function localClassify(text: string, intents: { id: string; label: string }[]): string | null {
  const words = new Set(stems(text))
  if (words.size === 0) return null
  let best: { id: string; score: number } | null = null
  for (const intent of intents) {
    const terms = [...new Set(stems(intent.label))]
    if (terms.length === 0) continue
    const hits = terms.filter((t) => words.has(t)).length
    const score = hits / Math.sqrt(terms.length)
    if (hits > 0 && (!best || score > best.score)) best = { id: intent.id, score }
  }
  return best?.id ?? null
}

/* ───────────── Claude ───────────── */

let cachedClient: { key: string; client: Anthropic } | null = null

async function getClient(apiKey: string): Promise<Anthropic> {
  if (cachedClient?.key === apiKey) return cachedClient.client
  const { default: AnthropicSDK } = await import('@anthropic-ai/sdk')
  const client = new AnthropicSDK({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 })
  cachedClient = { key: apiKey, client }
  return client
}

function transcript(history: ChatMessage[], contact: Contact): string {
  return history
    .filter((m) => m.from !== 'system' && m.text.trim())
    .map((m) => `${m.from === 'contact' ? fullName(contact) || 'Cliente' : 'Atendimento'}: ${m.text}`)
    .join('\n')
}

function contactProfile(contact: Contact): string {
  const fields = Object.entries(contact.fields)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')
  return [`Nome: ${fullName(contact) || 'desconhecido'}`, `Canal: ${contact.channel}`, contact.tags.length ? `Tags: ${contact.tags.join(', ')}` : '', fields ? `Campos: ${fields}` : '']
    .filter(Boolean)
    .join('\n')
}

interface AskOptions {
  system: string
  prompt: string
  maxTokens: number
  schema?: Record<string, unknown>
}

async function ask(config: AiConfig, options: AskOptions): Promise<string | null> {
  const client = await getClient(config.apiKey)
  const response = await client.beta.messages.create({
    model: config.model || DEFAULT_MODEL,
    max_tokens: options.maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', ...(options.schema ? { format: { type: 'json_schema', schema: options.schema } } : {}) },
    system: options.system,
    messages: [{ role: 'user', content: options.prompt }],
  })
  if (response.stop_reason === 'refusal') return null
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
  return text || null
}

export async function claudeClassify(config: AiConfig, text: string, intents: { id: string; label: string }[], instructions?: string): Promise<string | null> {
  const ids = intents.map((i) => i.id)
  const raw = await ask(config, {
    maxTokens: 1024,
    system:
      `Você classifica mensagens recebidas pela empresa ${config.businessName} em intenções. ` +
      'Escolha a intenção que melhor descreve o que a pessoa quer. Se nenhuma se aplicar com clareza, responda "none".' +
      (instructions?.trim() ? `\n\nOrientações do negócio: ${instructions.trim()}` : ''),
    prompt: `Intenções:\n${intents.map((i) => `- ${i.id}: ${i.label}`).join('\n')}\n\nMensagem: """${text}"""`,
    schema: {
      type: 'object',
      properties: { intent: { type: 'string', enum: [...ids, 'none'] } },
      required: ['intent'],
      additionalProperties: false,
    },
  })
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { intent?: string }
    return parsed.intent && ids.includes(parsed.intent) ? parsed.intent : null
  } catch {
    return null
  }
}

const REPLY_RULES =
  'Responda em português do Brasil, no tom de uma conversa de mensagens: curto (até 3 frases), claro e cordial. ' +
  'Não invente preços, prazos, links ou políticas que não estejam nas orientações. Se não souber, diga que vai verificar com a equipe. ' +
  'Escreva apenas o texto da mensagem, sem aspas e sem prefixos.'

export async function claudeReply(config: AiConfig, instructions: string, history: ChatMessage[], contact: Contact): Promise<string | null> {
  return ask(config, {
    maxTokens: 4000,
    system: `Você é o assistente virtual de ${config.businessName}. ${REPLY_RULES}\n\nOrientações do negócio:\n${instructions.trim() || '(nenhuma)'}`,
    prompt: `Perfil do contato:\n${contactProfile(contact)}\n\nConversa até agora:\n${transcript(history, contact) || '(sem mensagens)'}\n\nEscreva a próxima mensagem do atendimento.`,
  })
}

export async function claudeSuggest(config: AiConfig, contact: Contact): Promise<string | null> {
  return ask(config, {
    maxTokens: 4000,
    system: `Você ajuda a equipe de atendimento de ${config.businessName} a responder clientes. ${REPLY_RULES}`,
    prompt: `Perfil do contato:\n${contactProfile(contact)}\n\nConversa:\n${transcript(contact.messages.slice(-20), contact)}\n\nSugira a próxima resposta da equipe.`,
  })
}

export async function claudeSummarize(config: AiConfig, contact: Contact): Promise<string | null> {
  return ask(config, {
    maxTokens: 4000,
    system: 'Você resume conversas de atendimento para a equipe comercial. Responda em português do Brasil.',
    prompt:
      `Perfil do contato:\n${contactProfile(contact)}\n\nConversa:\n${transcript(contact.messages.slice(-40), contact)}\n\n` +
      'Resuma em até 4 tópicos curtos: o que a pessoa quer, em que etapa está, objeções e próximo passo recomendado.',
  })
}

export async function testConnection(config: AiConfig): Promise<string> {
  const text = await ask(config, { maxTokens: 1024, system: 'Responda apenas "ok".', prompt: 'Teste de conexão.' })
  return text ?? 'sem resposta'
}

/** Mensagem amigável para erros da API. */
export async function describeAiError(error: unknown): Promise<string> {
  const { default: AnthropicSDK } = await import('@anthropic-ai/sdk')
  if (error instanceof AnthropicSDK.AuthenticationError) return 'Chave da API inválida. Confira em Configurações.'
  if (error instanceof AnthropicSDK.PermissionDeniedError) return 'Esta chave não tem permissão para o modelo escolhido.'
  if (error instanceof AnthropicSDK.NotFoundError) return 'Modelo não encontrado. Escolha outro em Configurações.'
  if (error instanceof AnthropicSDK.RateLimitError) return 'Limite de uso atingido. Tente novamente em instantes.'
  if (error instanceof AnthropicSDK.APIConnectionError) return 'Sem conexão com a API da Anthropic.'
  if (error instanceof AnthropicSDK.APIError) return `Erro da API (${error.status ?? '—'}): ${error.message}`
  return error instanceof Error ? error.message : 'Erro desconhecido.'
}

/** Provedor usado pelo motor: Claude quando há chave, classificador local quando não há. */
export function createAiProvider(config: AiConfig): AiProvider {
  const enabled = config.apiKey.trim() !== ''
  return {
    async classify(text, intents, instructions) {
      if (!enabled) return localClassify(text, intents)
      try {
        return await claudeClassify(config, text, intents, instructions)
      } catch {
        return localClassify(text, intents)
      }
    },
    async reply(instructions, history, contact) {
      if (!enabled) return null
      return claudeReply(config, instructions, history, contact)
    },
  }
}
