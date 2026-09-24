/**
 * Sistema de XP e níveis — configurável.
 * Os valores abaixo são um ponto de partida; ajuste sem tocar nos componentes.
 * Em produção, o cálculo de XP deve ser feito no SERVIDOR (o cliente apenas exibe).
 */

export const XP_RULES = {
  checkin: 50,
  workoutCompleted: 150,
  setCompleted: 5,
  streakDay: 10,
  /** Bônus a cada 7 dias consecutivos */
  streakWeekBonus: 100,
  classAttended: 80,
  // desafios e conquistas definem o próprio xpReward
} as const

export type XPEventType =
  | 'checkin'
  | 'workout'
  | 'set'
  | 'streak'
  | 'challenge'
  | 'achievement'
  | 'class'

export interface LevelDef {
  level: number
  minXp: number
  /** Nome opcional — definir com a equipe LIFT. */
  name: string | null
}

/** Curva de níveis: minXp(n) = round(BASE * (n-1)^EXP). */
const LEVEL_BASE = 400
const LEVEL_EXP = 1.45
const MAX_LEVEL = 50

export const LEVELS: LevelDef[] = Array.from({ length: MAX_LEVEL }, (_, i) => ({
  level: i + 1,
  minXp: Math.round(LEVEL_BASE * Math.pow(i, LEVEL_EXP)),
  name: null,
}))

export interface LevelInfo {
  level: number
  name: string | null
  xp: number
  currentLevelXp: number
  nextLevelXp: number | null
  /** 0..1 dentro do nível atual */
  progress: number
  xpToNext: number
}

export function getLevelInfo(xp: number): LevelInfo {
  let idx = 0
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].minXp) idx = i
  const cur = LEVELS[idx]
  const next = LEVELS[idx + 1] ?? null
  const span = next ? next.minXp - cur.minXp : 1
  return {
    level: cur.level,
    name: cur.name,
    xp,
    currentLevelXp: cur.minXp,
    nextLevelXp: next?.minXp ?? null,
    progress: next ? Math.min(1, (xp - cur.minXp) / span) : 1,
    xpToNext: next ? next.minXp - xp : 0,
  }
}
