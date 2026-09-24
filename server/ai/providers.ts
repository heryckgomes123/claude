/**
 * Provedores de IA do servidor. Selecionado por AI_PROVIDER.
 * Para adicionar outro provedor, implemente `AIChatProvider` e registre em getAIProvider().
 */
import Anthropic from '@anthropic-ai/sdk'

export interface AIChatProvider {
  chat(system: string, messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string>
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message)
  }
}

function anthropicProvider(apiKey: string): AIChatProvider {
  const client = new Anthropic({ apiKey })
  const model = process.env.AI_MODEL || 'claude-opus-5'
  const effort = (process.env.AI_EFFORT as 'low' | 'medium' | 'high' | undefined) || 'low'

  return {
    async chat(system, messages) {
      try {
        const response = await client.beta.messages.create({
          model,
          max_tokens: 16000,
          system,
          messages,
          output_config: { effort },
          // Se o modelo principal recusar por política, o servidor tenta um modelo alternativo.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
        })
        if (response.stop_reason === 'refusal') {
          return 'Não posso ajudar com esse pedido. Posso falar sobre seus treinos, consistência ou exercícios.'
        }
        const text = response.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim()
        if (!text) throw new AIProviderError('resposta vazia')
        return text
      } catch (e) {
        if (e instanceof AIProviderError) throw e
        if (e instanceof Anthropic.RateLimitError) throw new AIProviderError('rate limit do provedor', 429)
        if (e instanceof Anthropic.AuthenticationError) throw new AIProviderError('credencial inválida', 503)
        if (e instanceof Anthropic.APIError) throw new AIProviderError(`erro do provedor (${e.status})`, 502)
        throw new AIProviderError('falha de conexão com o provedor', 502)
      }
    },
  }
}

let cached: AIChatProvider | null | undefined
export function getAIProvider(): AIChatProvider | null {
  if (cached !== undefined) return cached
  const key = process.env.AI_API_KEY
  const provider = (process.env.AI_PROVIDER || 'anthropic').toLowerCase()
  if (!key) return (cached = null)
  switch (provider) {
    case 'anthropic':
      return (cached = anthropicProvider(key))
    default:
      console.warn(`AI_PROVIDER "${provider}" não suportado.`)
      return (cached = null)
  }
}
