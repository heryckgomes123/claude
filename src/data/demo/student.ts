/**
 * ⚠️ DADOS DE DEMONSTRAÇÃO
 * Aluno e histórico fictícios, gerados de forma determinística para que
 * todas as telas possam ser navegadas. NÃO são dados reais da LIFT FITNESS.
 * Em produção: GET /api/me, GET /api/me/sessions, GET /api/me/checkins.
 */
import type { Profile } from '@/types/models'
import { addDays, startOfDay } from '@/lib/dates'
import { seeded } from '@/lib/utils'
import { DEMO_WEEK_PLAN, workoutById } from './workouts'
import { XP_RULES } from '@/config/gamification.config'

export const DEMO_USER_ID = 'demo-user'

export const DEMO_PROFILE: Profile = {
  userId: DEMO_USER_ID,
  name: 'Aluno Demonstração',
  firstName: 'Rafa',
  avatarUrl: null,
  initials: 'RA',
  unitId: 'unit-main',
  memberSince: '2025-03-10T10:00:00.000Z',
  focus: ['Calistenia', 'CrossFit'],
  baseXp: 6200,
}

export interface HistoryDay {
  date: string // ISO (início do dia)
  workoutId: string
  durationMinutes: number
  checkin: boolean
  xp: number
}

/**
 * Histórico dos últimos 120 dias (sem incluir hoje).
 * - Últimos 12 dias: ativos (sequência atual de 12 dias).
 * - Dia 13: descanso (quebra a sequência anterior).
 * - Antes disso: ~4 dias por semana.
 */
function buildHistory(today = new Date()): HistoryDay[] {
  const rand = seeded(20260924)
  const base = startOfDay(today)
  const days: HistoryDay[] = []
  for (let offset = 120; offset >= 1; offset--) {
    const date = addDays(base, -offset)
    const active = offset <= 12 ? true : offset === 13 ? false : rand() < 0.6
    if (!active) continue
    const planned = DEMO_WEEK_PLAN[date.getDay()] ?? 'wk-c'
    const wk = workoutById(planned)!
    const duration = Math.round(wk.estimatedMinutes * (0.85 + rand() * 0.3))
    days.push({
      date: date.toISOString(),
      workoutId: wk.id,
      durationMinutes: duration,
      checkin: true,
      xp: XP_RULES.checkin + XP_RULES.workoutCompleted + XP_RULES.streakDay,
    })
  }
  return days
}

export const DEMO_HISTORY: HistoryDay[] = buildHistory()
