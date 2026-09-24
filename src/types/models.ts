/**
 * Modelos de domínio da LIFT 2.0.
 * Espelham as tabelas planejadas em database/schema.sql.
 * Datas em ISO 8601 (string) para serialização simples entre API e cliente.
 */

export type ID = string
export type ISODate = string

// ── users / profiles ─────────────────────────────────────────
export type UserRole = 'student' | 'coach' | 'admin'

export interface User {
  id: ID
  email: string
  role: UserRole
  createdAt: ISODate
}

export interface Profile {
  userId: ID
  name: string
  firstName: string
  avatarUrl: string | null
  /** Iniciais para avatar sem foto */
  initials: string
  unitId: ID
  memberSince: ISODate
  focus: string[]
  /** XP inicial do perfil (histórico anterior); o XP total = base + eventos */
  baseXp: number
}

// ── workouts / exercises ─────────────────────────────────────
export type MuscleGroup =
  | 'pernas'
  | 'glúteos'
  | 'core'
  | 'costas'
  | 'peito'
  | 'ombros'
  | 'braços'
  | 'corpo inteiro'
  | 'mobilidade'

export interface Exercise {
  id: ID
  name: string
  description: string
  cues: string[]
  muscleGroups: MuscleGroup[]
  equipment: string[]
  /** URL de vídeo/animação/modelo 3D — null até o conteúdo ser produzido */
  mediaUrl: string | null
}

export interface WorkoutExercise {
  exerciseId: ID
  sets: number
  /** Repetições ("10"), faixa ("8-10") ou tempo ("30s") */
  reps: string
  /** Carga sugerida, ex.: "20 kg", "peso corporal" */
  load: string | null
  restSeconds: number
  notes?: string
}

export interface Workout {
  id: ID
  code: string // "Treino B"
  title: string // "Performance"
  focus: string
  modality: string
  estimatedMinutes: number
  level: 'iniciante' | 'intermediário' | 'avançado'
  coachName: string
  exercises: WorkoutExercise[]
  notes?: string
}

export interface WorkoutSet {
  exerciseId: ID
  setNumber: number
  reps: string
  load: string | null
  completedAt: ISODate
}

export interface WorkoutSession {
  id: ID
  workoutId: ID
  startedAt: ISODate
  finishedAt: ISODate
  durationMinutes: number
  sets: WorkoutSet[]
  xpEarned: number
}

// ── check-ins ────────────────────────────────────────────────
export interface CheckIn {
  id: ID
  userId: ID
  unitId: ID
  at: ISODate
  xpEarned: number
}

// ── classes / bookings ───────────────────────────────────────
export interface ClassSession {
  id: ID
  modality: string
  title: string
  coachName: string
  startsAt: ISODate
  durationMinutes: number
  capacity: number
  bookedCount: number
  waitlistCount: number
  unitId: ID
  level?: string
}

export type BookingStatus = 'booked' | 'waitlist' | 'cancelled' | 'attended'

export interface ClassBooking {
  id: ID
  classId: ID
  userId: ID
  status: BookingStatus
  createdAt: ISODate
}

// ── gamificação ──────────────────────────────────────────────
export type ChallengeMetric = 'workouts' | 'checkins' | 'minutes' | 'streak' | 'classes'

export interface Challenge {
  id: ID
  title: string
  description: string
  metric: ChallengeMetric
  target: number
  progress: number
  startsAt: ISODate
  endsAt: ISODate
  xpReward: number
  participants: number
  joined: boolean
  accent: 'lift' | 'gold' | 'ok'
}

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'lift'

export interface Achievement {
  id: ID
  icon: string
  name: string
  description: string
  tier: AchievementTier
  xpReward: number
  target: number
  metric: ChallengeMetric | 'goals'
}

export interface UserAchievement {
  achievementId: ID
  progress: number
  unlockedAt: ISODate | null
}

export interface Goal {
  id: ID
  title: string
  description?: string
  metric: ChallengeMetric | 'custom'
  target: number
  progress: number
  unit: string
  period: 'semana' | 'mês' | 'livre'
  dueAt: ISODate | null
  completedAt: ISODate | null
}

export interface RankingEntry {
  userId: ID
  name: string
  initials: string
  avatarUrl: string | null
  xp: number
  streak: number
  workouts: number
  isCurrentUser?: boolean
}

export type RankingPeriod = 'week' | 'month' | 'all'

// ── notifications ────────────────────────────────────────────
export type NotificationType = 'treino' | 'aula' | 'desafio' | 'conquista' | 'lembrete' | 'aviso'

export interface AppNotification {
  id: ID
  type: NotificationType
  title: string
  body: string
  createdAt: ISODate
  href?: string
}

// ── plans / subscriptions ────────────────────────────────────
export interface Plan {
  id: ID
  name: string
  description: string
  benefits: string[]
  /** Preço vem do backend/financeiro. null = não exibir valor. */
  priceCents: number | null
  billingCycle: 'mensal' | 'trimestral' | 'semestral' | 'anual'
}

export type SubscriptionStatus = 'active' | 'pending' | 'expired' | 'cancelled'

export interface Subscription {
  id: ID
  userId: ID
  planId: ID
  status: SubscriptionStatus
  startedAt: ISODate
  renewsAt: ISODate
}

// ── IA ───────────────────────────────────────────────────────
export type AIRole = 'user' | 'assistant'

export interface AIMessage {
  id: ID
  role: AIRole
  content: string
  createdAt: ISODate
  /** Origem da resposta — deixa explícito quando NÃO é uma IA real */
  source?: 'demo-rules' | 'api' | 'error'
}

export interface AIConversation {
  id: ID
  userId: ID
  title: string
  createdAt: ISODate
  messages: AIMessage[]
}

// ── comunidade (arquitetura futura) ──────────────────────────
export type FeedItemType = 'achievement' | 'workout' | 'challenge' | 'ranking' | 'post'

export interface FeedItem {
  id: ID
  type: FeedItemType
  authorId: ID
  createdAt: ISODate
  payload: Record<string, unknown>
  reactions: number
  comments: number
}
