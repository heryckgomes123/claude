/**
 * “Meu projeto”: tudo que o visitante escolhe enquanto navega e no orçamento.
 * Persistido em sessionStorage para sobreviver a recarregamentos durante a sessão.
 */
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import { PORTFOLIO_BY_ID } from '../config/portfolio'
import { SERVICE_IDS } from '../config/quote'
import type { DirectionId, InterestId, ServiceId } from '../config/quote'
import type { Answers, ContactDraft } from '../lib/quote/validation'

export interface ProjectState {
  interest: InterestId | null
  services: ServiceId[]
  references: string[]
  direction: DirectionId | null
  answers: Answers
  contact: ContactDraft
  /** Chave de idempotência do envio: evita duplicar a mesma solicitação. */
  idempotencyKey: string
  /** Quando o orçamento foi aberto pela primeira vez (filtro anti-robô no servidor). */
  startedAt: number | null
  submission: { id: string; at: number } | null
}

type Action =
  | { type: 'interest'; interest: InterestId }
  | { type: 'toggleService'; service: ServiceId; on?: boolean }
  | { type: 'toggleReference'; id: string; on?: boolean }
  | { type: 'direction'; direction: DirectionId | null }
  | { type: 'answer'; id: string; value: string | string[] }
  | { type: 'contact'; patch: Partial<ContactDraft> }
  | { type: 'started' }
  | { type: 'submitted'; id: string }
  | { type: 'reset' }

const STORAGE_KEY = 'intelra:project:v1'

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  // Fallback RFC4122 v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export const EMPTY_CONTACT: ContactDraft = {
  name: '',
  company: '',
  channel: '',
  whatsapp: '',
  email: '',
  budget: '',
  budgetNote: '',
  marketingConsent: false,
}

function initialState(): ProjectState {
  return {
    interest: null,
    services: [],
    references: [],
    direction: null,
    answers: {},
    contact: EMPTY_CONTACT,
    idempotencyKey: uuid(),
    startedAt: null,
    submission: null,
  }
}

function withService(services: ServiceId[], service: ServiceId): ServiceId[] {
  return services.includes(service) ? services : SERVICE_IDS.filter((s) => s === service || services.includes(s))
}

/** Depois de um envio, qualquer edição gera uma nova solicitação (nova chave). */
function editable(state: ProjectState): ProjectState {
  return state.submission ? { ...state, submission: null, idempotencyKey: uuid() } : state
}

function reducer(state: ProjectState, action: Action): ProjectState {
  switch (action.type) {
    case 'interest': {
      const next = { ...editable(state), interest: action.interest }
      if (action.interest !== 'discover') next.services = withService(next.services, action.interest)
      return next
    }
    case 'toggleService': {
      const s = editable(state)
      const on = action.on ?? !s.services.includes(action.service)
      return { ...s, services: on ? withService(s.services, action.service) : s.services.filter((x) => x !== action.service) }
    }
    case 'toggleReference': {
      const s = editable(state)
      const has = s.references.includes(action.id)
      const on = action.on ?? !has
      if (on === has) return state
      if (!on) return { ...s, references: s.references.filter((r) => r !== action.id) }
      const item = PORTFOLIO_BY_ID[action.id]
      return { ...s, references: [...s.references, action.id], services: item ? withService(s.services, item.service) : s.services }
    }
    case 'direction':
      return { ...editable(state), direction: action.direction }
    case 'answer':
      return { ...editable(state), answers: { ...state.answers, [action.id]: action.value } }
    case 'contact':
      return { ...editable(state), contact: { ...state.contact, ...action.patch } }
    case 'started':
      return state.startedAt ? state : { ...state, startedAt: Date.now() }
    case 'submitted':
      return { ...state, submission: { id: action.id, at: Date.now() } }
    case 'reset':
      return initialState()
  }
}

function load(): ProjectState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState()
    const parsed = JSON.parse(raw) as Partial<ProjectState>
    const base = initialState()
    return {
      ...base,
      ...parsed,
      references: (parsed.references ?? []).filter((id) => id in PORTFOLIO_BY_ID),
      contact: { ...EMPTY_CONTACT, ...parsed.contact },
    }
  } catch {
    return initialState()
  }
}

interface ProjectApi {
  state: ProjectState
  dispatch: React.Dispatch<Action>
}

const ProjectContext = createContext<ProjectApi | null>(null)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Armazenamento bloqueado (aba privada etc.): o projeto segue só em memória.
    }
  }, [state])

  const api = useMemo(() => ({ state, dispatch }), [state])
  return <ProjectContext.Provider value={api}>{children}</ProjectContext.Provider>
}

export function useProject(): ProjectApi {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject precisa de <ProjectProvider>')
  return ctx
}

/** Quantidade de escolhas feitas (para o contador do “Meu projeto”). */
export function projectCount(state: ProjectState): number {
  return state.references.length + (state.direction ? 1 : 0)
}
