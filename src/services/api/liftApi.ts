/**
 * Camada de acesso a dados da LIFT.
 *
 * Todas as telas consomem dados por aqui. Hoje as funções retornam
 * DADOS DE DEMONSTRAÇÃO; cada uma indica o endpoint que a substituirá.
 * Trocar a implementação não exige mudar os componentes.
 */
import { DEMO_WORKOUTS, todaysWorkout, workoutById } from '@/data/demo/workouts'
import { DEMO_EXERCISES, exerciseById } from '@/data/demo/exercises'
import { DEMO_PROFILE } from '@/data/demo/student'
import { demoClasses, demoNotifications, demoRanking } from '@/data/demo/community'
import { PLANS } from '@/config/plans.config'
import type { RankingPeriod, Subscription } from '@/types/models'
import { addDays } from '@/lib/dates'

export const DATA_SOURCE = 'demo' as const

export const liftApi = {
  /** GET /api/me */
  getProfile: async () => DEMO_PROFILE,
  /** GET /api/workouts */
  listWorkouts: async () => DEMO_WORKOUTS,
  /** GET /api/workouts/:id */
  getWorkout: async (id: string) => workoutById(id) ?? null,
  /** GET /api/workouts/today */
  getTodaysWorkout: async () => todaysWorkout(),
  /** GET /api/exercises */
  listExercises: async () => DEMO_EXERCISES,
  getExercise: async (id: string) => exerciseById(id) ?? null,
  /** GET /api/ranking?period= */
  getRanking: async (period: RankingPeriod) => demoRanking(period),
  /** GET /api/classes?from=&to= */
  listClasses: async () => demoClasses(),
  /** GET /api/notifications */
  listNotifications: async () => demoNotifications(),
  /** GET /api/plans */
  listPlans: async () => PLANS,
  /** GET /api/me/subscription */
  getSubscription: async (): Promise<Subscription> => ({
    id: 'sub-demo',
    userId: DEMO_PROFILE.userId,
    planId: PLANS[0].id,
    status: 'active',
    startedAt: DEMO_PROFILE.memberSince,
    renewsAt: addDays(new Date(), 19).toISOString(),
  }),
}
