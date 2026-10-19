/** Estado do app, persistido no navegador (localStorage). */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Activity,
  AppNotification,
  Automation,
  Broadcast,
  Contact,
  GrowthTool,
  RunState,
  SavedReply,
  Sequence,
  Settings,
} from '../lib/types'
import type { AutomationDraft } from '../data/templates'
import { uid } from '../lib/util'
import { DEFAULT_SETTINGS, createSeed } from './seed'

const MAX_ACTIVITY = 6000
const MAX_NOTIFICATIONS = 60

export interface Trace {
  contactId: string
  automationId: string
  nodeIds: string[]
  activeNodeId?: string
}

export interface FluxaData {
  automations: Automation[]
  contacts: Contact[]
  broadcasts: Broadcast[]
  sequences: Sequence[]
  growthTools: GrowthTool[]
  savedReplies: SavedReply[]
  settings: Settings
  runs: Record<string, RunState>
  activity: Activity[]
  notifications: AppNotification[]
}

interface FluxaState extends FluxaData {
  /** Caminho percorrido no último teste (não persistido): destaca os nós no construtor. */
  trace: Trace | null
  setTrace: (trace: Trace | null) => void

  createAutomation: (draft: AutomationDraft) => string
  updateAutomation: (id: string, patch: Partial<Automation> | ((a: Automation) => Automation)) => void
  deleteAutomation: (id: string) => void
  duplicateAutomation: (id: string) => string | null

  updateContact: (id: string, patch: Partial<Contact> | ((c: Contact) => Contact)) => void
  addContact: (contact: Contact) => void
  deleteContacts: (ids: string[]) => void

  saveBroadcast: (broadcast: Broadcast) => void
  deleteBroadcast: (id: string) => void
  saveSequence: (sequence: Sequence) => void
  deleteSequence: (id: string) => void
  saveGrowthTool: (tool: GrowthTool) => void
  deleteGrowthTool: (id: string) => void
  saveReply: (reply: SavedReply) => void
  deleteReply: (id: string) => void

  updateSettings: (patch: Partial<Settings>) => void
  setRun: (contactId: string, state: RunState | null) => void
  log: (events: Omit<Activity, 'id'>[]) => void
  notify: (text: string, contactId?: string) => void
  markNotificationsRead: () => void

  resetDemo: () => void
  clearAll: () => void
  importData: (data: FluxaData) => void
}

function initialData(): FluxaData {
  return { ...createSeed(), settings: DEFAULT_SETTINGS, runs: {}, notifications: [] }
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list]
}

export const useStore = create<FluxaState>()(
  persist(
    (set, get) => ({
      ...initialData(),
      trace: null,
      setTrace: (trace) => set({ trace }),

      createAutomation: (draft) => {
        const now = Date.now()
        const id = uid('a')
        const automation: Automation = { ...draft, id, active: false, stats: { runs: 0, completed: 0, clicks: 0, nodeVisits: {}, variants: {} }, createdAt: now, updatedAt: now }
        set((s) => ({ automations: [automation, ...s.automations] }))
        return id
      },
      updateAutomation: (id, patch) =>
        set((s) => ({
          automations: s.automations.map((a) => {
            if (a.id !== id) return a
            const next = typeof patch === 'function' ? patch(a) : { ...a, ...patch }
            return { ...next, updatedAt: Date.now() }
          }),
        })),
      deleteAutomation: (id) =>
        set((s) => ({
          automations: s.automations.filter((a) => a.id !== id),
          runs: Object.fromEntries(Object.entries(s.runs).filter(([, r]) => r.automationId !== id)),
        })),
      duplicateAutomation: (id) => {
        const source = get().automations.find((a) => a.id === id)
        if (!source) return null
        const copy = structuredClone(source)
        return get().createAutomation({ name: `${copy.name} (cópia)`, description: copy.description, triggers: copy.triggers.map((t) => ({ ...t, id: uid('t') })), nodes: copy.nodes, edges: copy.edges })
      },

      updateContact: (id, patch) =>
        set((s) => ({ contacts: s.contacts.map((c) => (c.id === id ? (typeof patch === 'function' ? patch(c) : { ...c, ...patch }) : c)) })),
      addContact: (contact) => set((s) => ({ contacts: [contact, ...s.contacts] })),
      deleteContacts: (ids) =>
        set((s) => ({
          contacts: s.contacts.filter((c) => !ids.includes(c.id)),
          runs: Object.fromEntries(Object.entries(s.runs).filter(([cid]) => !ids.includes(cid))),
        })),

      saveBroadcast: (b) => set((s) => ({ broadcasts: upsert(s.broadcasts, b) })),
      deleteBroadcast: (id) => set((s) => ({ broadcasts: s.broadcasts.filter((b) => b.id !== id) })),
      saveSequence: (q) => set((s) => ({ sequences: upsert(s.sequences, q) })),
      deleteSequence: (id) =>
        set((s) => ({
          sequences: s.sequences.filter((q) => q.id !== id),
          contacts: s.contacts.map((c) => (c.sequences.some((x) => x.sequenceId === id) ? { ...c, sequences: c.sequences.filter((x) => x.sequenceId !== id) } : c)),
        })),
      saveGrowthTool: (t) => set((s) => ({ growthTools: upsert(s.growthTools, t) })),
      deleteGrowthTool: (id) => set((s) => ({ growthTools: s.growthTools.filter((t) => t.id !== id) })),
      saveReply: (r) => set((s) => ({ savedReplies: upsert(s.savedReplies, r) })),
      deleteReply: (id) => set((s) => ({ savedReplies: s.savedReplies.filter((r) => r.id !== id) })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setRun: (contactId, state) =>
        set((s) => {
          const runs = { ...s.runs }
          if (state) runs[contactId] = state
          else delete runs[contactId]
          return { runs }
        }),
      log: (events) =>
        set((s) => {
          const added = events.map((e) => ({ ...e, id: uid('ev') }))
          const activity = [...s.activity, ...added]
          return { activity: activity.length > MAX_ACTIVITY ? activity.slice(-MAX_ACTIVITY) : activity }
        }),
      notify: (text, contactId) =>
        set((s) => ({ notifications: [{ id: uid('nt'), ts: Date.now(), text, contactId, read: false }, ...s.notifications].slice(0, MAX_NOTIFICATIONS) })),
      markNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

      resetDemo: () => set({ ...initialData(), settings: { ...DEFAULT_SETTINGS, ai: get().settings.ai }, trace: null }),
      clearAll: () =>
        set({
          automations: [],
          contacts: [],
          broadcasts: [],
          sequences: [],
          growthTools: [],
          savedReplies: [],
          activity: [],
          notifications: [],
          runs: {},
          trace: null,
        }),
      importData: (data) => set({ ...data, trace: null }),
    }),
    {
      name: 'intelra-fluxa:v1',
      version: 1,
      partialize: (s) => pickData(s),
    },
  ),
)

function pickData(s: FluxaData): FluxaData {
  return {
    automations: s.automations,
    contacts: s.contacts,
    broadcasts: s.broadcasts,
    sequences: s.sequences,
    growthTools: s.growthTools,
    savedReplies: s.savedReplies,
    settings: s.settings,
    runs: s.runs,
    activity: s.activity,
    notifications: s.notifications,
  }
}

/** Cópia dos dados para backup. A chave da API nunca é exportada. */
export function exportData(): FluxaData {
  const data = pickData(useStore.getState())
  return { ...data, settings: { ...data.settings, ai: { ...data.settings.ai, apiKey: '' } } }
}

export function isFluxaData(value: unknown): value is FluxaData {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return ['automations', 'contacts', 'broadcasts', 'sequences', 'growthTools', 'savedReplies', 'activity'].every((k) => Array.isArray(v[k])) && typeof v.settings === 'object'
}
