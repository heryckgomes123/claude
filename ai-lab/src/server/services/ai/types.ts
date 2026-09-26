/**
 * Contrato para recursos futuros de IA (melhorar prompt, remix assistido, gerar workflow,
 * recomendar ferramentas, briefing criativo, resumir tutorial).
 *
 * STATUS: somente arquitetura. Nenhum provedor está implementado ou configurado nesta versão,
 * e nenhuma tela apresenta recursos de IA como se funcionassem. Uma implementação concreta
 * (Anthropic, OpenAI, Google, modelo local…) deve implementar esta interface e ser registrada
 * em `getAIProvider()` — o restante do produto não depende de um fornecedor específico.
 */
export type AITask = 'improve-prompt' | 'remix-prompt' | 'generate-workflow' | 'recommend-tools' | 'creative-brief' | 'summarize-tutorial'

export type AICompletionRequest = {
  task: AITask
  /** Instruções do sistema específicas da tarefa (mantidas no servidor). */
  system?: string
  input: string
  maxOutputTokens?: number
  /** Identificador do usuário para rate limit/auditoria — nunca enviar e-mail ou dados pessoais ao provedor. */
  userId: string
}

export type AICompletionResult = { text: string; provider: string; model: string }

export interface AIProvider {
  readonly name: string
  readonly supportedTasks: readonly AITask[]
  complete(request: AICompletionRequest): Promise<AICompletionResult>
}
