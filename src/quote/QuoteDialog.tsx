import { useEffect, useRef, useState } from 'react'
import { Dialog } from '../components/Dialog'
import { ArrowLeft, ArrowRight, Check, Close, Copy, WhatsApp } from '../components/Icons'
import { MASCOT_LINES } from '../config/mascot'
import { CONTACT, whatsappLink } from '../config/site'
import { track } from '../lib/analytics'
import { buildPayload, submitQuote } from '../lib/quote/submit'
import { projectLines, whatsappMessage } from '../lib/quote/summary'
import { validateAnswers, validateContact, validateServices } from '../lib/quote/validation'
import type { FieldErrors } from '../lib/quote/validation'
import { Mascot } from '../mascot/Mascot'
import { useMascotLine } from '../mascot/useMascotLine'
import { useProject } from '../state/project'
import { useUI } from '../state/ui'
import type { QuoteStep, SubmitError } from '../state/ui'
import { StepContact, StepDetails, StepReview, StepServices } from './steps'

const STEPS: { n: QuoteStep; label: string; title: string }[] = [
  { n: 1, label: 'Serviços', title: 'O que você precisa?' },
  { n: 2, label: 'Projeto', title: 'Conte sobre o projeto' },
  { n: 3, label: 'Contato', title: 'Investimento e contato' },
  { n: 4, label: 'Revisão', title: 'Revisar e solicitar' },
]

const ERROR_TEXT: Record<SubmitError, string> = {
  not_configured:
    'O envio pelo site ainda não foi configurado, então sua solicitação não foi enviada. Seu briefing continua salvo nesta sessão — você pode copiar o resumo ou tentar novamente mais tarde.',
  validation: 'Alguns dados precisam de ajuste. Revise as etapas marcadas e tente de novo.',
  rate_limited: 'Recebemos várias solicitações deste acesso em pouco tempo. Aguarde alguns minutos e tente novamente.',
  spam: 'Não conseguimos validar o envio. Aguarde alguns segundos e tente novamente.',
  network: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
  server: 'Não conseguimos gravar sua solicitação agora. Nada foi enviado — tente novamente em instantes.',
}

export function QuoteDialog() {
  const ui = useUI()
  const { state, dispatch } = useProject()
  const line = useMascotLine()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [copied, setCopied] = useState(false)
  const honeypotRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const inFlight = useRef<AbortController | null>(null)
  const step = ui.quoteStep
  const meta = STEPS[step - 1]
  const { submit } = ui

  // Ao trocar de etapa: volta ao topo e leva o foco ao título da etapa.
  useEffect(() => {
    if (!ui.quoteOpen) return
    bodyRef.current?.scrollTo({ top: 0 })
    setErrors({})
    const t = window.setTimeout(() => headingRef.current?.focus({ preventScroll: true }), 30)
    return () => window.clearTimeout(t)
  }, [step, ui.quoteOpen])

  useEffect(() => () => inFlight.current?.abort(), [])

  // Quando o visitante corrige um campo, a mensagem de erro dele some na hora.
  useEffect(() => {
    setErrors((prev) => {
      const keys = Object.keys(prev)
      if (!keys.length) return prev
      const now = validate(step)
      const next: FieldErrors = {}
      for (const k of keys) if (now[k]) next[k] = now[k]
      return Object.keys(next).length === keys.length ? prev : next
    })
  }, [state.services, state.answers, state.contact])

  const validate = (s: QuoteStep): FieldErrors => {
    if (s === 1) return validateServices(state.services)
    if (s === 2) return validateAnswers(state.services, state.answers)
    if (s === 3) return validateContact(state.contact)
    return {}
  }

  const focusFirstError = (errs: FieldErrors) => {
    const key = Object.keys(errs)[0]
    if (!key) return
    window.requestAnimationFrame(() => {
      const root = bodyRef.current
      const el =
        root?.querySelector<HTMLElement>(`#q-${key} input, #q-${key} textarea, textarea#q-${key}, input#q-${key}`) ??
        root?.querySelector<HTMLElement>(`#${key} input, input#${key}, textarea#${key}`)
      el?.focus()
    })
  }

  const next = () => {
    const errs = validate(step)
    setErrors(errs)
    if (Object.keys(errs).length) return focusFirstError(errs)
    track('quote_step_completed', { step })
    ui.setQuoteStep((step + 1) as QuoteStep)
  }

  const goTo = (target: QuoteStep) => {
    // Só deixa avançar pulando etapas se as anteriores estiverem válidas.
    for (let s = 1 as QuoteStep; s < target; s = (s + 1) as QuoteStep) {
      const errs = validate(s)
      if (Object.keys(errs).length) {
        ui.setQuoteStep(s)
        window.setTimeout(() => {
          setErrors(errs)
          focusFirstError(errs)
        }, 40)
        return
      }
    }
    ui.setQuoteStep(target)
  }

  const send = async () => {
    if (submit.status === 'sending') return
    for (const s of [1, 2, 3] as QuoteStep[]) {
      if (Object.keys(validate(s)).length) return goTo(4)
    }
    ui.setSubmit({ status: 'sending' })
    inFlight.current?.abort()
    const controller = new AbortController()
    inFlight.current = controller
    const result = await submitQuote(buildPayload(state, honeypotRef.current?.value ?? ''), controller.signal)
    if (controller.signal.aborted) return
    if (result.ok) {
      dispatch({ type: 'submitted', id: result.id })
      ui.setSubmit({ status: 'success', id: result.id })
      track('quote_submitted', { services: state.services.join(','), references: state.references.length, has_direction: !!state.direction })
    } else {
      ui.setSubmit({ status: 'error', error: result.error })
      if (result.fields) setErrors(result.fields)
      window.requestAnimationFrame(() => bodyRef.current?.querySelector('[role=alert]')?.scrollIntoView({ block: 'nearest' }))
    }
  }

  const copySummary = async () => {
    const text = ['Projeto INTELRA', ...projectLines(state)].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  const wa = whatsappLink(whatsappMessage(state))
  const success = submit.status === 'success' || (!!state.submission && submit.status !== 'sending' && submit.status !== 'error')

  return (
    <Dialog
      open={ui.quoteOpen}
      onClose={ui.closeQuote}
      labelledBy="quote-title"
      className="m-0 h-dvh max-h-dvh w-full max-w-none overflow-hidden bg-ink-900 p-0 text-bone sm:m-auto sm:h-[min(880px,calc(100dvh-3rem))] sm:w-[calc(100%-3rem)] sm:max-w-[860px] sm:rounded-[28px] sm:ring-1 sm:ring-white/10"
    >
      <div className="flex h-full flex-col">
        {/* Cabeçalho com o anfitrião */}
        <div className="flex items-start gap-3 border-b border-white/[0.08] px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-7 sm:pt-5">
          <Mascot state={line.state} size={52} shadow={false} />
          <div className="min-w-0 flex-1">
            <h2 id="quote-title" className="font-display text-[1.25rem] font-semibold leading-tight sm:text-2xl">
              Vamos dar forma à sua ideia.
            </h2>
            <p className="mt-1 text-[0.88rem] leading-snug text-mute" aria-live="polite">
              {line.text}
            </p>
          </div>
          <button type="button" onClick={ui.closeQuote} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 hover:bg-white/5" aria-label="Fechar orçamento">
            <Close size={18} />
          </button>
        </div>

        {success ? (
          <Success
            protocol={(submit.status === 'success' ? submit.id : state.submission?.id) ?? ''}
            wa={wa}
            onClose={ui.closeQuote}
            onNew={() => {
              dispatch({ type: 'reset' })
              ui.setSubmit({ status: 'idle' })
              ui.setQuoteStep(1)
            }}
          />
        ) : (
          <>
            {/* Progresso */}
            <nav aria-label="Etapas do orçamento" className="border-b border-white/[0.08] px-4 py-3 sm:px-7">
              <ol className="grid grid-cols-4 gap-1.5">
                {STEPS.map((s) => {
                  const current = s.n === step
                  const done = s.n < step
                  return (
                    <li key={s.n}>
                      <button
                        type="button"
                        onClick={() => (s.n < step ? ui.setQuoteStep(s.n) : s.n > step ? goTo(s.n) : undefined)}
                        aria-current={current ? 'step' : undefined}
                        className="group w-full text-left"
                      >
                        <span className={`block h-1 rounded-full transition-colors ${current ? 'bg-volt-400' : done ? 'bg-ion-400' : 'bg-white/12'}`} />
                        <span className={`mt-2 flex items-center gap-1.5 text-[0.75rem] font-medium sm:text-[0.82rem] ${current ? 'text-bone' : 'text-mute'}`}>
                          {done ? <Check size={13} strokeWidth={2.6} className="text-ion-300" /> : <span className="tabular-nums">{s.n}.</span>}
                          <span className="truncate">{s.label}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </nav>

            <div ref={bodyRef} className="relative flex-1 overflow-y-auto px-4 py-6 sm:px-7 sm:py-7">
              <p className="eyebrow text-mute-600">
                Etapa {step} de 4
              </p>
              <h3 ref={headingRef} tabIndex={-1} className="mt-2 font-display text-[1.5rem] font-semibold outline-none sm:text-[1.8rem]">
                {meta.title}
              </h3>
              <div className="mt-6">
                {step === 1 && <StepServices errors={errors} />}
                {step === 2 && <StepDetails errors={errors} />}
                {step === 3 && <StepContact errors={errors} honeypotRef={honeypotRef} />}
                {step === 4 && <StepReview goTo={goTo} />}
              </div>

              {step === 4 && submit.status === 'error' && (
                <div role="alert" className="mt-6 rounded-2xl border border-coral-400/50 bg-coral-500/10 p-4 text-[0.92rem] leading-relaxed">
                  <p className="font-semibold text-coral-300">Solicitação não enviada.</p>
                  <p className="mt-1 text-bone/90">{ERROR_TEXT[submit.error]}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={send} className="btn btn-ghost btn-sm">
                      Tentar novamente
                    </button>
                    <button type="button" onClick={copySummary} className="btn btn-ghost btn-sm">
                      <Copy size={15} />
                      {copied ? 'Resumo copiado' : 'Copiar resumo'}
                    </button>
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-sm"
                        onClick={() => track('whatsapp_clicked', { source: 'quote_error' })}
                      >
                        <WhatsApp size={15} /> Enviar resumo pelo WhatsApp
                      </a>
                    )}
                    {!wa && CONTACT.email && (
                      <a href={`mailto:${CONTACT.email}?subject=${encodeURIComponent('Projeto pelo site')}`} className="btn btn-ghost btn-sm">
                        Escrever por e-mail
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] px-4 py-3 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))] sm:px-7 sm:py-4">
              {step > 1 ? (
                <button type="button" onClick={() => ui.setQuoteStep((step - 1) as QuoteStep)} className="btn btn-ghost btn-sm">
                  <ArrowLeft size={16} /> Voltar
                </button>
              ) : (
                <span className="text-[0.82rem] text-mute">Sem cadastro. Leva 2 minutos.</span>
              )}
              {step < 4 ? (
                <button type="button" onClick={next} className="btn btn-primary">
                  Continuar <ArrowRight size={18} />
                </button>
              ) : (
                <button type="button" onClick={send} disabled={submit.status === 'sending'} aria-busy={submit.status === 'sending'} className="btn btn-primary disabled:opacity-70">
                  {submit.status === 'sending' ? (
                    <>
                      <span aria-hidden="true" className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white" style={{ animation: 'spin-slow 0.8s linear infinite' }} />
                      Enviando…
                    </>
                  ) : (
                    'Solicitar meu orçamento'
                  )}
                </button>
              )}
            </div>
            <p className="sr-only" role="status">
              {submit.status === 'sending' ? MASCOT_LINES.sending : ''}
            </p>
          </>
        )}
      </div>
    </Dialog>
  )
}

function Success({ protocol, wa, onClose, onNew }: { protocol: string; wa: string | null; onClose: () => void; onNew: () => void }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => ref.current?.focus({ preventScroll: true }), [])
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10 text-center" role="status">
      <Mascot state="confirmed" size={120} alt="Robô da INTELRA comemorando" />
      <h3 ref={ref} tabIndex={-1} className="mt-6 font-display text-[1.8rem] font-semibold outline-none sm:text-[2.2rem]">
        Solicitação enviada.
      </h3>
      <p className="mt-2 text-mute">
        Protocolo <span className="font-pixel text-ion-300">{protocol.slice(0, 8).toUpperCase()}</span>
      </p>
      <p className="mt-4 max-w-md leading-relaxed text-bone/90">
        Seu projeto foi registrado. A equipe INTELRA vai analisar o pedido e responder pelo canal que você escolheu com uma proposta personalizada.
      </p>
      {wa && (
        <div className="mt-7 grid w-full max-w-sm gap-2">
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost w-full"
            onClick={() => track('whatsapp_clicked', { source: 'quote_success' })}
          >
            <WhatsApp size={18} /> Continuar no WhatsApp
          </a>
          <p className="text-[0.82rem] text-mute">Abre o WhatsApp com o resumo do projeto. A mensagem só é enviada quando você tocar em enviar lá.</p>
        </div>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onClose} className="btn btn-primary">
          Voltar para a página
        </button>
        <button type="button" onClick={onNew} className="btn btn-ghost">
          Começar novo projeto
        </button>
      </div>
    </div>
  )
}
