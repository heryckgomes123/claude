/**
 * Estado local do app (Zustand + persistência no dispositivo).
 *
 * Enquanto não há backend, as ações do aluno (check-in, treinos concluídos,
 * reservas, XP) ficam salvas APENAS neste dispositivo, em modo demonstração.
 * Quando a API existir, cada ação abaixo passa a chamar o serviço correspondente
 * (services/api) e o servidor torna-se a fonte da verdade — inclusive do XP.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AIMessage, CheckIn, WorkoutSet } from '@/types/models'
import { XP_RULES, type XPEventType } from '@/config/gamification.config'
import { uid } from '@/lib/utils'
import { isSameDay } from '@/lib/dates'
import { LIFT_CONFIG } from '@/config/lift.config'

export interface XPEvent {
  id: string
  type: XPEventType
  amount: number
  label: string
  at: string
}

export interface LocalSession {
  id: string
  workoutId: string
  startedAt: string
  finishedAt: string
  durationMinutes: number
  sets: WorkoutSet[]
  xpEarned: number
}

export interface ActiveWorkout {
  workoutId: string
  startedAt: string
  exerciseIndex: number
  /** Série atual (0-based) dentro do exercício */
  setIndex: number
  completedSets: WorkoutSet[]
  /** Timestamp (ms) de fim do descanso em andamento */
  restEndsAt: number | null
  /** Duração total (s) do descanso em andamento */
  restTotal?: number
}

export type GraphicsMode = 'auto' | 'high' | 'low' | 'off'

export interface Settings {
  sound: boolean
  haptics: boolean
  graphics: GraphicsMode
}

export type BookingState = 'booked' | 'waitlist'

interface AppState {
  onboardingSeen: boolean
  /** Sessão de DEMONSTRAÇÃO — não é autenticação real. */
  session: { mode: 'demo'; userId: string; startedAt: string } | null
  settings: Settings
  xpEvents: XPEvent[]
  localSessions: LocalSession[]
  checkins: CheckIn[]
  bookings: Record<string, BookingState>
  joinedChallenges: Record<string, boolean>
  readNotifications: string[]
  aiMessages: AIMessage[]
  activeWorkout: ActiveWorkout | null

  completeOnboarding: () => void
  startDemoSession: (userId: string) => void
  signOut: () => void
  updateSettings: (patch: Partial<Settings>) => void
  addXP: (type: XPEventType, amount: number, label: string) => void
  checkIn: (userId: string) => CheckIn | null
  hasCheckedInToday: () => boolean
  bookClass: (classId: string, full: boolean) => BookingState
  cancelBooking: (classId: string) => void
  toggleChallenge: (id: string, joined: boolean) => void
  markNotificationsRead: (ids: string[]) => void
  pushAIMessage: (m: AIMessage) => void
  clearAIMessages: () => void
  startWorkout: (workoutId: string) => void
  updateActiveWorkout: (patch: Partial<ActiveWorkout>) => void
  finishWorkout: (xpEarned: number) => LocalSession | null
  abandonWorkout: () => void
  resetDemo: () => void
}

const initialData = {
  onboardingSeen: false,
  session: null,
  settings: { sound: false, haptics: true, graphics: 'auto' as GraphicsMode },
  xpEvents: [],
  localSessions: [],
  checkins: [],
  bookings: {},
  joinedChallenges: {},
  readNotifications: [],
  aiMessages: [],
  activeWorkout: null,
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialData,

      completeOnboarding: () => set({ onboardingSeen: true }),
      startDemoSession: (userId) =>
        set({ session: { mode: 'demo', userId, startedAt: new Date().toISOString() }, onboardingSeen: true }),
      signOut: () => set({ session: null }),
      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

      addXP: (type, amount, label) =>
        set({ xpEvents: [...get().xpEvents, { id: uid('xp'), type, amount, label, at: new Date().toISOString() }] }),

      hasCheckedInToday: () => get().checkins.some((c) => isSameDay(new Date(c.at), new Date())),

      checkIn: (userId) => {
        if (get().hasCheckedInToday()) return null
        const firstActivityToday = !get().localSessions.some((s) => isSameDay(new Date(s.finishedAt), new Date()))
        const c: CheckIn = {
          id: uid('ci'),
          userId,
          unitId: LIFT_CONFIG.UNITS[0].id,
          at: new Date().toISOString(),
          xpEarned: XP_RULES.checkin,
        }
        set({ checkins: [...get().checkins, c] })
        get().addXP('checkin', XP_RULES.checkin, 'Check-in na LIFT')
        if (firstActivityToday) get().addXP('streak', XP_RULES.streakDay, 'Sequência mantida')
        return c
      },

      bookClass: (classId, full) => {
        const state: BookingState = full ? 'waitlist' : 'booked'
        set({ bookings: { ...get().bookings, [classId]: state } })
        return state
      },
      cancelBooking: (classId) => {
        const next = { ...get().bookings }
        delete next[classId]
        set({ bookings: next })
      },

      toggleChallenge: (id, joined) => set({ joinedChallenges: { ...get().joinedChallenges, [id]: joined } }),

      markNotificationsRead: (ids) =>
        set({ readNotifications: Array.from(new Set([...get().readNotifications, ...ids])) }),

      pushAIMessage: (m) => set({ aiMessages: [...get().aiMessages, m].slice(-60) }),
      clearAIMessages: () => set({ aiMessages: [] }),

      startWorkout: (workoutId) => {
        const cur = get().activeWorkout
        if (cur && cur.workoutId === workoutId) return // retoma treino em andamento
        set({
          activeWorkout: {
            workoutId,
            startedAt: new Date().toISOString(),
            exerciseIndex: 0,
            setIndex: 0,
            completedSets: [],
            restEndsAt: null,
          },
        })
      },
      updateActiveWorkout: (patch) => {
        const cur = get().activeWorkout
        if (cur) set({ activeWorkout: { ...cur, ...patch } })
      },
      finishWorkout: (xpEarned) => {
        const cur = get().activeWorkout
        if (!cur) return null
        const finishedAt = new Date()
        const firstActivityToday =
          !get().hasCheckedInToday() && !get().localSessions.some((s) => isSameDay(new Date(s.finishedAt), finishedAt))
        const session: LocalSession = {
          id: uid('ws'),
          workoutId: cur.workoutId,
          startedAt: cur.startedAt,
          finishedAt: finishedAt.toISOString(),
          durationMinutes: Math.max(1, Math.round((finishedAt.getTime() - new Date(cur.startedAt).getTime()) / 60000)),
          sets: cur.completedSets,
          xpEarned,
        }
        set({ localSessions: [...get().localSessions, session], activeWorkout: null })
        get().addXP('workout', xpEarned, 'Treino concluído')
        if (firstActivityToday) get().addXP('streak', XP_RULES.streakDay, 'Sequência mantida')
        return session
      },
      abandonWorkout: () => set({ activeWorkout: null }),

      resetDemo: () => set({ ...initialData, onboardingSeen: true, session: get().session }),
    }),
    {
      name: 'lift-2-state',
      version: 1,
      storage: createJSONStorage(() => {
        try {
          const k = '__lift_probe__'
          localStorage.setItem(k, '1')
          localStorage.removeItem(k)
          return localStorage
        } catch {
          // navegação privada / armazenamento bloqueado → memória
          const mem = new Map<string, string>()
          return {
            getItem: (key) => mem.get(key) ?? null,
            setItem: (key, value) => void mem.set(key, value),
            removeItem: (key) => void mem.delete(key),
          }
        }
      }),
    },
  ),
)
