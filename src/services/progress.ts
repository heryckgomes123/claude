/**
 * Motor de progresso: calcula sequência, frequência, XP, metas, desafios
 * e conquistas a partir do histórico.
 *
 * Hoje combina o histórico DEMO + ações locais do aluno. Em produção, estes
 * números devem vir do servidor (fonte da verdade), e este módulo passa a
 * apenas formatar/derivar visualizações.
 */
import { useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { DEMO_HISTORY, DEMO_PROFILE } from '@/data/demo/student'
import { DEMO_ACHIEVEMENTS, demoChallenges, demoGoals } from '@/data/demo/community'
import { getLevelInfo } from '@/config/gamification.config'
import { addDays, daysBetween, startOfDay, startOfMonth, startOfWeek } from '@/lib/dates'
import type { Achievement, Challenge, ChallengeMetric, Goal } from '@/types/models'

export interface ActivityEntry {
  date: Date
  workoutId: string | null
  minutes: number
  checkin: boolean
  workout: boolean
}

export interface AchievementState extends Achievement {
  progress: number
  unlockedAt: string | null
}

export function useProgress() {
  const localSessions = useAppStore((s) => s.localSessions)
  const checkins = useAppStore((s) => s.checkins)
  const xpEvents = useAppStore((s) => s.xpEvents)
  const joined = useAppStore((s) => s.joinedChallenges)

  return useMemo(() => {
    const now = new Date()
    const today = startOfDay(now)

    // ── Linha do tempo unificada ─────────────────────────────
    const entries: ActivityEntry[] = [
      ...DEMO_HISTORY.map((h) => ({
        date: new Date(h.date),
        workoutId: h.workoutId,
        minutes: h.durationMinutes,
        checkin: h.checkin,
        workout: true,
      })),
      ...localSessions.map((s) => ({
        date: new Date(s.finishedAt),
        workoutId: s.workoutId,
        minutes: s.durationMinutes,
        checkin: false,
        workout: true,
      })),
      ...checkins.map((c) => ({ date: new Date(c.at), workoutId: null, minutes: 0, checkin: true, workout: false })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime())

    const dayKey = (d: Date) => startOfDay(d).getTime()
    const activeDays = new Set(entries.map((e) => dayKey(e.date)))

    // ── Sequência ────────────────────────────────────────────
    const activeToday = activeDays.has(dayKey(today))
    let streak = 0
    for (let d = activeToday ? today : addDays(today, -1); activeDays.has(dayKey(d)); d = addDays(d, -1)) streak++

    let bestStreak = 0
    let run = 0
    let prev: number | null = null
    for (const k of Array.from(activeDays).sort((a, b) => a - b)) {
      run = prev !== null && daysBetween(new Date(prev), new Date(k)) === 1 ? run + 1 : 1
      bestStreak = Math.max(bestStreak, run)
      prev = k
    }

    // ── Agregações ───────────────────────────────────────────
    const inRange = (from: Date, to: Date) => entries.filter((e) => e.date >= from && e.date < to)
    const count = (metric: ChallengeMetric, from: Date, to: Date): number => {
      const list = inRange(from, to)
      switch (metric) {
        case 'workouts':
          return list.filter((e) => e.workout).length
        case 'checkins':
          return list.filter((e) => e.checkin).length
        case 'minutes':
          return list.reduce((sum, e) => sum + e.minutes, 0)
        case 'classes':
          return 0 // depende de integração com presença em aulas
        case 'streak':
          return streak
      }
    }
    const tomorrow = addDays(today, 1)
    const monthStart = startOfMonth(now)
    const weekStart = startOfWeek(now)
    const workoutsTotal = entries.filter((e) => e.workout).length
    const checkinsTotal = entries.filter((e) => e.checkin).length
    const minutesTotal = entries.reduce((s, e) => s + e.minutes, 0)

    const month = {
      workouts: count('workouts', monthStart, tomorrow),
      minutes: count('minutes', monthStart, tomorrow),
      checkins: count('checkins', monthStart, tomorrow),
      activeDays: Array.from(activeDays).filter((k) => k >= monthStart.getTime()).length,
      elapsedDays: daysBetween(monthStart, today) + 1,
    }
    const week = {
      workouts: count('workouts', weekStart, tomorrow),
      minutes: count('minutes', weekStart, tomorrow),
    }

    // Últimas 8 semanas: treinos por semana
    const weekly = Array.from({ length: 8 }, (_, i) => {
      const from = addDays(weekStart, -(7 - i) * 7)
      const to = addDays(from, 7)
      return { from, workouts: count('workouts', from, to), minutes: count('minutes', from, to) }
    })

    // Últimos 7 dias
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i - 6)
      return { date: d, minutes: count('minutes', d, addDays(d, 1)), active: activeDays.has(dayKey(d)) }
    })

    // Mapa de consistência: 16 semanas
    const heatStart = addDays(weekStart, -15 * 7)
    const heatmap = Array.from({ length: 16 * 7 }, (_, i) => {
      const d = addDays(heatStart, i)
      return { date: d, minutes: count('minutes', d, addDays(d, 1)), active: activeDays.has(dayKey(d)), future: d > today }
    })

    // ── XP ───────────────────────────────────────────────────
    const historyXp = DEMO_HISTORY.reduce((s, h) => s + h.xp, 0)
    const localXp = xpEvents.reduce((s, e) => s + e.amount, 0)
    const totalXp = DEMO_PROFILE.baseXp + historyXp + localXp
    const level = getLevelInfo(totalXp)

    // XP acumulado nos últimos 30 dias (para gráfico de evolução)
    const xpSeries = Array.from({ length: 30 }, (_, i) => {
      const d = addDays(today, i - 29)
      const end = addDays(d, 1)
      const hist = DEMO_HISTORY.filter((h) => new Date(h.date) < end).reduce((s, h) => s + h.xp, 0)
      const loc = xpEvents.filter((e) => new Date(e.at) < end).reduce((s, e) => s + e.amount, 0)
      return { date: d, xp: DEMO_PROFILE.baseXp + hist + loc }
    })
    const xpThisWeek =
      DEMO_HISTORY.filter((h) => new Date(h.date) >= weekStart).reduce((s, h) => s + h.xp, 0) +
      xpEvents.filter((e) => new Date(e.at) >= weekStart).reduce((s, e) => s + e.amount, 0)

    const xpThisMonth =
      DEMO_HISTORY.filter((h) => new Date(h.date) >= monthStart).reduce((s, h) => s + h.xp, 0) +
      xpEvents.filter((e) => new Date(e.at) >= monthStart).reduce((s, e) => s + e.amount, 0)

    // ── Desafios ─────────────────────────────────────────────
    const challenges: Challenge[] = demoChallenges(now).map((c) => {
      const isJoined = joined[c.id] ?? c.joined
      const progress = Math.min(c.target, count(c.metric, new Date(c.startsAt), new Date(c.endsAt)))
      // "Flow do Mês" conta apenas treinos de mobilidade/Animal Flow
      const flowMinutes =
        c.id === 'ch-flow'
          ? inRange(new Date(c.startsAt), tomorrow)
              .filter((e) => e.workoutId === 'wk-c')
              .reduce((s, e) => s + e.minutes, 0)
          : null
      return { ...c, joined: isJoined, progress: Math.min(c.target, flowMinutes ?? progress) }
    })

    // ── Metas ────────────────────────────────────────────────
    const goals: Goal[] = demoGoals(now).map((g) => {
      if (g.metric === 'custom') return g
      const due = g.dueAt ? new Date(g.dueAt) : tomorrow
      const progress = count(g.metric, monthStart, addDays(due, 1))
      return { ...g, progress, completedAt: progress >= g.target ? now.toISOString() : null }
    })
    const goalsCompleted = goals.filter((g) => g.completedAt).length

    // ── Conquistas ───────────────────────────────────────────
    const unlockDate = (a: Achievement): string | null => {
      if (a.metric === 'goals') return goalsCompleted >= a.target ? goals.find((g) => g.completedAt)?.completedAt ?? null : null
      if (a.metric === 'streak') {
        let r = 0
        let p: number | null = null
        for (const k of Array.from(activeDays).sort((x, y) => x - y)) {
          r = p !== null && daysBetween(new Date(p), new Date(k)) === 1 ? r + 1 : 1
          if (r >= a.target) return new Date(k).toISOString()
          p = k
        }
        return null
      }
      let acc = 0
      for (const e of entries) {
        acc += a.metric === 'workouts' ? (e.workout ? 1 : 0) : a.metric === 'checkins' ? (e.checkin ? 1 : 0) : a.metric === 'minutes' ? e.minutes : 0
        if (acc >= a.target) return e.date.toISOString()
      }
      return null
    }
    const achievementProgress = (a: Achievement) => {
      switch (a.metric) {
        case 'workouts':
          return workoutsTotal
        case 'checkins':
          return checkinsTotal
        case 'minutes':
          return minutesTotal
        case 'streak':
          return bestStreak
        case 'goals':
          return goalsCompleted
        default:
          return 0
      }
    }
    const achievements: AchievementState[] = DEMO_ACHIEVEMENTS.map((a) => ({
      ...a,
      progress: Math.min(a.target, achievementProgress(a)),
      unlockedAt: unlockDate(a),
    }))

    const recent = [...entries].filter((e) => e.workout).reverse().slice(0, 12)

    return {
      streak,
      bestStreak,
      activeToday,
      totals: { workouts: workoutsTotal, checkins: checkinsTotal, minutes: minutesTotal },
      month,
      week,
      weekly,
      last7,
      heatmap,
      totalXp,
      xpThisWeek,
      xpThisMonth,
      level,
      xpSeries,
      challenges,
      goals,
      achievements,
      recent,
    }
  }, [localSessions, checkins, xpEvents, joined])
}

export type ProgressData = ReturnType<typeof useProgress>
