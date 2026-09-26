import 'server-only'
import type { AIProvider } from './types'

/**
 * Registro do provedor de IA. Retorna null enquanto nenhum provedor for implementado e configurado
 * (ex.: AI_PROVIDER + AI_PROVIDER_API_KEY). Chamadores DEVEM tratar null escondendo o recurso.
 */
export function getAIProvider(): AIProvider | null {
  return null
}

export function isAIEnabled(): boolean {
  return getAIProvider() !== null
}

export type { AIProvider, AITask, AICompletionRequest, AICompletionResult } from './types'
