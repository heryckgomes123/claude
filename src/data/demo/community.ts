/**
 * ⚠️ DADOS DE DEMONSTRAÇÃO
 * Ranking, desafios, conquistas, metas, aulas e notificações fictícios.
 * Nenhum nome aqui corresponde a alunos ou professores reais da LIFT.
 */
import type {
  Achievement,
  AppNotification,
  Challenge,
  ClassSession,
  Goal,
  RankingEntry,
  RankingPeriod,
} from '@/types/models'
import { addDays, startOfDay, startOfMonth, startOfWeek } from '@/lib/dates'
import { seeded } from '@/lib/utils'

// ── Ranking ──────────────────────────────────────────────────
const DEMO_PEOPLE = [
  'Ana L.', 'Bruno M.', 'Carla S.', 'Diego R.', 'Elisa T.', 'Felipe A.', 'Gabi P.',
  'Hugo C.', 'Isa F.', 'João V.', 'Kaio B.', 'Larissa N.', 'Marina O.', 'Nico D.',
]

const initialsOf = (name: string) =>
  name
    .replace('.', '')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()

export function demoRanking(period: RankingPeriod): RankingEntry[] {
  const rand = seeded(period === 'week' ? 11 : period === 'month' ? 22 : 33)
  const now = new Date()
  // proporcional ao tempo decorrido no período, para comparar de forma justa com o aluno
  const elapsed =
    period === 'week' ? (((now.getDay() + 6) % 7) + 1) / 7 : period === 'month' ? now.getDate() / 30 : 1
  const scale = (period === 'week' ? 1 : period === 'month' ? 4.2 : 38) * elapsed
  return DEMO_PEOPLE.map((name, i) => {
    const workouts = Math.max(1, Math.round((5.2 - i * 0.3 + rand() * 1.6) * (scale / (period === 'all' ? 6 : 1.5))))
    return {
      userId: `demo-${i}`,
      name,
      initials: initialsOf(name),
      avatarUrl: null,
      workouts,
      xp: Math.round(workouts * (205 + rand() * 40) + rand() * 120),
      streak: Math.max(0, Math.round(16 - i * 1.1 + rand() * 4)),
    }
  })
}

// ── Desafios ─────────────────────────────────────────────────
/** `progress` é recalculado a partir do histórico (ver services/progress.ts). */
export function demoChallenges(now = new Date()): Challenge[] {
  const week = startOfWeek(now)
  const month = startOfMonth(now)
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return [
    {
      id: 'ch-7d',
      title: 'Desafio 7 dias',
      description: 'Treine 5 vezes nos próximos 7 dias.',
      metric: 'workouts',
      target: 5,
      progress: 0,
      startsAt: addDays(startOfDay(now), -3).toISOString(),
      endsAt: addDays(startOfDay(now), 4).toISOString(),
      xpReward: 300,
      participants: 38,
      joined: true,
      accent: 'lift',
    },
    {
      id: 'ch-week',
      title: 'Semana Completa',
      description: 'Complete 6 treinos nesta semana.',
      metric: 'workouts',
      target: 6,
      progress: 0,
      startsAt: week.toISOString(),
      endsAt: addDays(week, 7).toISOString(),
      xpReward: 250,
      participants: 52,
      joined: true,
      accent: 'ok',
    },
    {
      id: 'ch-flow',
      title: 'Flow do Mês',
      description: 'Acumule 150 minutos de treino de mobilidade e Animal Flow no mês.',
      metric: 'minutes',
      target: 150,
      progress: 0,
      startsAt: month.toISOString(),
      endsAt: nextMonth.toISOString(),
      xpReward: 400,
      participants: 24,
      joined: true,
      accent: 'gold',
    },
    {
      id: 'ch-streak21',
      title: 'Consistência 21',
      description: 'Alcance 21 dias consecutivos de atividade.',
      metric: 'streak',
      target: 21,
      progress: 0,
      startsAt: month.toISOString(),
      endsAt: addDays(nextMonth, 20).toISOString(),
      xpReward: 600,
      participants: 17,
      joined: false,
      accent: 'lift',
    },
  ]
}

// ── Conquistas ───────────────────────────────────────────────
export const DEMO_ACHIEVEMENTS: Achievement[] = [
  { id: 'ac-first-week', icon: '🔥', name: 'Primeira semana', description: 'Treine em 3 dias diferentes na sua primeira semana.', tier: 'bronze', xpReward: 100, target: 3, metric: 'workouts' },
  { id: 'ac-10', icon: '💪', name: '10 treinos', description: 'Conclua 10 treinos na LIFT.', tier: 'bronze', xpReward: 150, target: 10, metric: 'workouts' },
  { id: 'ac-30', icon: '🏆', name: '30 treinos', description: 'Conclua 30 treinos na LIFT.', tier: 'silver', xpReward: 300, target: 30, metric: 'workouts' },
  { id: 'ac-streak7', icon: '⚡', name: '7 dias consecutivos', description: 'Mantenha uma sequência de 7 dias.', tier: 'silver', xpReward: 250, target: 7, metric: 'streak' },
  { id: 'ac-goal', icon: '🎯', name: 'Meta concluída', description: 'Conclua uma meta pessoal.', tier: 'bronze', xpReward: 150, target: 1, metric: 'goals' },
  { id: 'ac-100', icon: '💯', name: '100 treinos', description: 'Conclua 100 treinos na LIFT.', tier: 'gold', xpReward: 1000, target: 100, metric: 'workouts' },
  { id: 'ac-streak30', icon: '🧬', name: '30 dias de consistência', description: 'Mantenha uma sequência de 30 dias.', tier: 'gold', xpReward: 800, target: 30, metric: 'streak' },
  { id: 'ac-checkin50', icon: '📍', name: 'Presença LIFT', description: 'Faça 50 check-ins na academia.', tier: 'lift', xpReward: 500, target: 50, metric: 'checkins' },
  { id: 'ac-minutes', icon: '⏱️', name: '3.000 minutos', description: 'Acumule 3.000 minutos de treino.', tier: 'lift', xpReward: 700, target: 3000, metric: 'minutes' },
]

// ── Metas ────────────────────────────────────────────────────
/** Progresso das metas com métrica é recalculado a partir do histórico. */
export function demoGoals(now = new Date()): Goal[] {
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return [
    { id: 'gl-month', title: 'Treinar 20 vezes este mês', metric: 'workouts', target: 20, progress: 0, unit: 'treinos', period: 'mês', dueAt: endOfMonth.toISOString(), completedAt: null },
    { id: 'gl-minutes', title: '900 minutos de treino no mês', metric: 'minutes', target: 900, progress: 0, unit: 'min', period: 'mês', dueAt: endOfMonth.toISOString(), completedAt: null },
    { id: 'gl-muscleup', title: 'Primeiro muscle-up', description: 'Meta de habilidade acompanhada pelo coach.', metric: 'custom', target: 1, progress: 0, unit: 'repetição', period: 'livre', dueAt: null, completedAt: null },
    { id: 'gl-pullups', title: '10 barras fixas seguidas', description: 'Registrado pelo coach em avaliação.', metric: 'custom', target: 10, progress: 10, unit: 'reps', period: 'livre', dueAt: null, completedAt: addDays(now, -18).toISOString() },
  ]
}

// ── Agenda ───────────────────────────────────────────────────
interface SlotTemplate {
  days: number[] // 0 = domingo
  time: string
  modality: string
  title: string
  coach: string
  duration: number
  capacity: number
}

const SCHEDULE_TEMPLATE: SlotTemplate[] = [
  { days: [1, 2, 3, 4, 5], time: '06:00', modality: 'CrossFit', title: 'CrossFit', coach: 'Coach A (demo)', duration: 60, capacity: 16 },
  { days: [1, 3, 5], time: '07:00', modality: 'Calistenia', title: 'Calistenia Fundamentos', coach: 'Coach B (demo)', duration: 60, capacity: 12 },
  { days: [2, 4], time: '07:00', modality: 'Animal Flow', title: 'Animal Flow', coach: 'Coach C (demo)', duration: 50, capacity: 12 },
  { days: [1, 2, 3, 4, 5], time: '12:00', modality: 'Funcional', title: 'Funcional Express', coach: 'Coach A (demo)', duration: 45, capacity: 14 },
  { days: [1, 2, 3, 4, 5], time: '18:00', modality: 'CrossFit', title: 'CrossFit', coach: 'Coach D (demo)', duration: 60, capacity: 16 },
  { days: [2, 4], time: '18:30', modality: 'Calistenia', title: 'Calistenia Skills', coach: 'Coach B (demo)', duration: 60, capacity: 12 },
  { days: [1, 3], time: '19:30', modality: 'Yoga', title: 'Yoga Recovery', coach: 'Coach E (demo)', duration: 60, capacity: 14 },
  { days: [6], time: '09:00', modality: 'CrossFit', title: 'Sábado em Equipe', coach: 'Coach D (demo)', duration: 75, capacity: 20 },
  { days: [6], time: '10:30', modality: 'Yoga', title: 'Yoga Flow', coach: 'Coach E (demo)', duration: 60, capacity: 14 },
]

export function demoClasses(now = new Date(), days = 7): ClassSession[] {
  const rand = seeded(777)
  const out: ClassSession[] = []
  for (let d = 0; d < days; d++) {
    const date = addDays(startOfDay(now), d)
    for (const slot of SCHEDULE_TEMPLATE) {
      if (!slot.days.includes(date.getDay())) continue
      const [h, m] = slot.time.split(':').map(Number)
      const startsAt = new Date(date)
      startsAt.setHours(h, m, 0, 0)
      const booked = Math.min(slot.capacity, Math.round(slot.capacity * (0.35 + rand() * 0.75)))
      out.push({
        id: `cl-${date.toISOString().slice(0, 10)}-${slot.time}-${slot.modality}`.replace(/\s/g, ''),
        modality: slot.modality,
        title: slot.title,
        coachName: slot.coach,
        startsAt: startsAt.toISOString(),
        durationMinutes: slot.duration,
        capacity: slot.capacity,
        bookedCount: booked,
        waitlistCount: booked >= slot.capacity ? Math.round(rand() * 4) : 0,
        unitId: 'unit-main',
      })
    }
  }
  return out
}

// ── Notificações ─────────────────────────────────────────────
export function demoNotifications(now = new Date()): AppNotification[] {
  const ago = (min: number) => new Date(now.getTime() - min * 60000).toISOString()
  return [
    { id: 'nt-1', type: 'treino', title: 'Treino de hoje disponível', body: 'Seu treino do dia já está no app. Bora evoluir.', createdAt: ago(35), href: '/treino' },
    { id: 'nt-2', type: 'desafio', title: 'Desafio 7 dias', body: 'Você está perto de concluir o desafio. Mantenha o ritmo!', createdAt: ago(60 * 5), href: '/desafios' },
    { id: 'nt-3', type: 'conquista', title: 'Conquista desbloqueada', body: '⚡ 7 dias consecutivos — sua consistência está aparecendo.', createdAt: ago(60 * 26), href: '/conquistas' },
    { id: 'nt-4', type: 'aula', title: 'Nova turma de Animal Flow', body: 'Terças e quintas às 07:00. Reserve pelo app.', createdAt: ago(60 * 50), href: '/agenda' },
    { id: 'nt-5', type: 'lembrete', title: 'Hora da mobilidade', body: 'Que tal 10 minutos de mobilidade hoje?', createdAt: ago(60 * 72) },
    { id: 'nt-6', type: 'aviso', title: 'Aviso da academia (exemplo)', body: 'Exemplo de comunicado: horários especiais em feriados serão publicados aqui.', createdAt: ago(60 * 24 * 4) },
  ]
}
