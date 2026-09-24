/**
 * AIService — ponto único de acesso à LIFT AI.
 *
 *   Frontend → AIService → Provider
 *                           ├─ demoRulesProvider (padrão, sem IA real)
 *                           └─ apiProvider → Backend/API → AI Provider
 *
 * Para conectar uma IA real: configure o servidor (AI_PROVIDER, AI_API_KEY)
 * e defina VITE_AI_MODE="api".
 */
import { AI_CONFIG } from '@/config/lift.config'
import type { AIMessage } from '@/types/models'
import type { AIProvider, AIReply, StudentAIContext } from './types'
import { demoRulesProvider } from './providers/demoRulesProvider'
import { apiProvider } from './providers/apiProvider'

class AIServiceImpl {
  private provider: AIProvider = AI_CONFIG.AI_MODE === 'api' ? apiProvider : demoRulesProvider

  get isRealAI() {
    return this.provider.isRealAI
  }
  get providerId() {
    return this.provider.id
  }
  setProvider(p: AIProvider) {
    this.provider = p
  }
  reply(history: AIMessage[], context: StudentAIContext): Promise<AIReply> {
    return this.provider.reply(history, context)
  }
}

export const AIService = new AIServiceImpl()
export { AINotConfiguredError } from './types'
export type { StudentAIContext } from './types'

export const AI_SUGGESTIONS = [
  'Treinei três vezes essa semana. O que posso fazer amanhã?',
  'Como está minha consistência?',
  'Explica o agachamento',
  'Resume meus dados do mês',
  'Como estão minhas metas?',
  'Preciso de motivação hoje',
]
