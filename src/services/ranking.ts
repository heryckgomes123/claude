/**
 * Ranking: lista demo + o aluno atual (calculado a partir do progresso local).
 * Em produção: GET /api/ranking?period= (calculado no servidor).
 */
import { useMemo } from 'react'
import { demoRanking } from '@/data/demo/community'
import { DEMO_PROFILE } from '@/data/demo/student'
import type { RankingEntry, RankingPeriod } from '@/types/models'
import { useProgress } from './progress'

export function useRanking(period: RankingPeriod) {
  const p = useProgress()
  return useMemo(() => {
    const me: RankingEntry = {
      userId: DEMO_PROFILE.userId,
      name: 'Você',
      initials: DEMO_PROFILE.initials,
      avatarUrl: DEMO_PROFILE.avatarUrl,
      xp: period === 'week' ? p.xpThisWeek : period === 'month' ? p.xpThisMonth : p.totalXp,
      workouts: period === 'week' ? p.week.workouts : period === 'month' ? p.month.workouts : p.totals.workouts,
      streak: p.streak,
      isCurrentUser: true,
    }
    const list = [...demoRanking(period), me].sort((a, b) => b.xp - a.xp)
    const position = list.findIndex((e) => e.isCurrentUser) + 1
    const percentile = Math.max(1, Math.round((position / list.length) * 100))
    return { list, position, total: list.length, percentile, me }
  }, [period, p])
}
