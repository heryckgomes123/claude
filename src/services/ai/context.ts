/**
 * Monta o contexto do aluno para a LIFT AI:
 *   ALUNO → DADOS DO ALUNO → LIFT AI → RESPOSTA PERSONALIZADA
 *
 * Em produção, o SERVIDOR deve montar esse contexto a partir do banco
 * (usuário autenticado), sem confiar no que o cliente envia.
 */
import type { ProgressData } from '@/services/progress'
import type { StudentAIContext } from './types'
import { DEMO_PROFILE } from '@/data/demo/student'
import { todaysWorkout, workoutById } from '@/data/demo/workouts'
import { DEMO_EXERCISES, exerciseById } from '@/data/demo/exercises'

export function buildStudentContext(p: ProgressData): StudentAIContext {
  const tw = todaysWorkout()
  return {
    firstName: DEMO_PROFILE.firstName,
    level: p.level.level,
    totalXp: p.totalXp,
    streak: p.streak,
    bestStreak: p.bestStreak,
    workoutsThisWeek: p.week.workouts,
    workoutsThisMonth: p.month.workouts,
    minutesThisMonth: p.month.minutes,
    activeDaysThisMonth: p.month.activeDays,
    elapsedDaysThisMonth: p.month.elapsedDays,
    trainedToday: p.activeToday,
    todaysWorkout: tw
      ? {
          code: tw.code,
          title: tw.title,
          focus: tw.focus,
          exercises: tw.exercises.map((e) => exerciseById(e.exerciseId)?.name ?? e.exerciseId),
        }
      : null,
    lastWorkouts: p.recent.slice(0, 7).map((r) => {
      const w = r.workoutId ? workoutById(r.workoutId) : null
      return { date: r.date.toISOString().slice(0, 10), title: w ? `${w.code} · ${w.title}` : 'Treino', minutes: r.minutes }
    }),
    goals: p.goals.map((g) => ({ title: g.title, progress: g.progress, target: g.target })),
    challenges: p.challenges.filter((c) => c.joined).map((c) => ({ title: c.title, progress: c.progress, target: c.target })),
    exerciseCatalog: DEMO_EXERCISES.map((e) => ({ name: e.name, description: e.description, cues: e.cues })),
  }
}
