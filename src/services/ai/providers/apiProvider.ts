/**
 * Provedor REAL da LIFT AI: Frontend → Backend (/api/ai/chat) → Provedor de IA.
 * A chave do provedor fica SOMENTE no servidor (server/). Nada de segredos aqui.
 */
import type { AIMessage } from '@/types/models'
import type { AIProvider, AIReply, StudentAIContext } from '../types'
import { AINotConfiguredError } from '../types'
import { AI_CONFIG } from '@/config/lift.config'
import { ApiError, apiFetch } from '@/services/api/client'

export const apiProvider: AIProvider = {
  id: 'api',
  isRealAI: true,
  async reply(history: AIMessage[], context: StudentAIContext): Promise<AIReply> {
    try {
      const res = await apiFetch<{ content: string }>(AI_CONFIG.AI_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({
          messages: history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
          context,
        }),
      })
      return { content: res.content, source: 'api' }
    } catch (e) {
      if (e instanceof ApiError && (e.status === 503 || e.code === 'ai_not_configured')) throw new AINotConfiguredError()
      throw e
    }
  },
}
