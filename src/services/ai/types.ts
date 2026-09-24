import type { AIMessage } from '@/types/models'

/**
 * Contexto do aluno fornecido à LIFT AI.
 * Apenas dados de treino/consistência — nada de dados sensíveis de saúde.
 */
export interface StudentAIContext {
  firstName: string
  level: number
  totalXp: number
  streak: number
  bestStreak: number
  workoutsThisWeek: number
  workoutsThisMonth: number
  minutesThisMonth: number
  activeDaysThisMonth: number
  elapsedDaysThisMonth: number
  todaysWorkout: { code: string; title: string; focus: string; exercises: string[] } | null
  trainedToday: boolean
  lastWorkouts: { date: string; title: string; minutes: number }[]
  goals: { title: string; progress: number; target: number }[]
  challenges: { title: string; progress: number; target: number }[]
  /** Exercícios conhecidos do catálogo (para explicar movimentos) */
  exerciseCatalog: { name: string; description: string; cues: string[] }[]
}

export interface AIReply {
  content: string
  source: 'demo-rules' | 'api'
}

export interface AIProvider {
  readonly id: 'demo-rules' | 'api'
  /** true = respostas de um modelo de IA real */
  readonly isRealAI: boolean
  reply(history: AIMessage[], context: StudentAIContext): Promise<AIReply>
}

export class AINotConfiguredError extends Error {
  constructor() {
    super('A LIFT AI ainda não está conectada a um provedor de IA.')
  }
}
