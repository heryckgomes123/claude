/**
 * Estado de interface: orçamento, painel “Meu projeto”, cena visível, falas pontuais do mascote e avisos.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { MascotState, SceneId } from '../config/mascot'
import { track } from '../lib/analytics'
import { useProject } from './project'

export type QuoteStep = 1 | 2 | 3 | 4

export type SubmitError = 'not_configured' | 'validation' | 'rate_limited' | 'spam' | 'network' | 'server'
export type SubmitStatus = { status: 'idle' } | { status: 'sending' } | { status: 'success'; id: string } | { status: 'error'; error: SubmitError }

interface MascotEvent {
  id: number
  text: string
  state: MascotState
}

interface UIApi {
  quoteOpen: boolean
  quoteStep: QuoteStep
  summaryOpen: boolean
  scene: SceneId
  event: MascotEvent | null
  toast: { id: number; text: string } | null
  submit: SubmitStatus
  videoPlaying: boolean
  mascotMinimized: boolean
  openQuote: (opts?: { step?: QuoteStep; source?: string }) => void
  closeQuote: () => void
  setQuoteStep: (step: QuoteStep) => void
  openSummary: () => void
  closeSummary: () => void
  setScene: (scene: SceneId) => void
  say: (text: string, state?: MascotState) => void
  notify: (text: string) => void
  setSubmit: (s: SubmitStatus) => void
  setVideoPlaying: (playing: boolean) => void
  setMascotMinimized: (min: boolean) => void
}

const UIContext = createContext<UIApi | null>(null)
const MIN_KEY = 'intelra:mascot-min'

export function UIProvider({ children }: { children: ReactNode }) {
  const { dispatch } = useProject()
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteStep, setQuoteStep] = useState<QuoteStep>(1)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [scene, setScene] = useState<SceneId>('inicio')
  const [event, setEvent] = useState<MascotEvent | null>(null)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const [submit, setSubmit] = useState<SubmitStatus>({ status: 'idle' })
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [mascotMinimized, setMin] = useState(() => {
    try {
      return sessionStorage.getItem(MIN_KEY) === '1'
    } catch {
      return false
    }
  })
  const counter = useRef(0)

  useEffect(() => {
    if (!event) return
    const t = window.setTimeout(() => setEvent(null), 5000)
    return () => window.clearTimeout(t)
  }, [event])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(t)
  }, [toast])

  const openQuote = useCallback(
    (opts: { step?: QuoteStep; source?: string } = {}) => {
      dispatch({ type: 'started' })
      setSummaryOpen(false)
      setQuoteStep(opts.step ?? 1)
      setSubmit((s) => (s.status === 'sending' ? s : { status: 'idle' }))
      setQuoteOpen(true)
      track('quote_started', { source: opts.source ?? 'unknown' })
    },
    [dispatch],
  )

  const say = useCallback((text: string, state: MascotState = 'selected') => {
    counter.current += 1
    setEvent({ id: counter.current, text, state })
  }, [])

  const notify = useCallback((text: string) => {
    counter.current += 1
    setToast({ id: counter.current, text })
  }, [])

  const setMascotMinimized = useCallback((min: boolean) => {
    setMin(min)
    try {
      sessionStorage.setItem(MIN_KEY, min ? '1' : '0')
    } catch {
      /* noop */
    }
  }, [])

  const api = useMemo<UIApi>(
    () => ({
      quoteOpen,
      quoteStep,
      summaryOpen,
      scene,
      event,
      toast,
      submit,
      videoPlaying,
      mascotMinimized,
      openQuote,
      closeQuote: () => setQuoteOpen(false),
      setQuoteStep,
      openSummary: () => setSummaryOpen(true),
      closeSummary: () => setSummaryOpen(false),
      setScene,
      say,
      notify,
      setSubmit,
      setVideoPlaying,
      setMascotMinimized,
    }),
    [quoteOpen, quoteStep, summaryOpen, scene, event, toast, submit, videoPlaying, mascotMinimized, openQuote, say, notify, setMascotMinimized],
  )

  return <UIContext.Provider value={api}>{children}</UIContext.Provider>
}

export function useUI(): UIApi {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI precisa de <UIProvider>')
  return ctx
}
