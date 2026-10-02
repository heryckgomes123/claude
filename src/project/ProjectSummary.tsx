import { useState } from 'react'
import { Dialog } from '../components/Dialog'
import { ArrowRight, Check, Close, Pencil, Plus, Trash } from '../components/Icons'
import { MASCOT_LINES } from '../config/mascot'
import { KIND_LABEL, PORTFOLIO_BY_ID } from '../config/portfolio'
import { DIRECTION_LABELS, SERVICES, visibleQuestions } from '../config/quote'
import { answerLabel, budgetLabel } from '../lib/quote/summary'
import { scrollToAnchor } from '../lib/scroll'
import { Mascot } from '../mascot/Mascot'
import { useProjectActions } from '../state/actions'
import { projectCount, useProject } from '../state/project'
import { useUI } from '../state/ui'

/** Painel “Meu projeto”: reúne o que foi escolhido na navegação, com remoção e edição. */
export function ProjectSummary() {
  const ui = useUI()
  const { state, dispatch } = useProject()
  const { toggleReference, toggleService, chooseDirection } = useProjectActions()
  const [confirmReset, setConfirmReset] = useState(false)
  const count = projectCount(state)

  const answered = visibleQuestions(state.services)
    .map((q) => ({ q, value: answerLabel(q, state.answers[q.id]) }))
    .filter((a) => a.value)
  const hasContact = state.contact.name || state.contact.whatsapp || state.contact.email
  const budget = budgetLabel(state.contact.budget)
  const empty = count === 0 && state.services.length === 0 && answered.length === 0

  const goTo = (hash: string) => {
    ui.closeSummary()
    window.setTimeout(() => scrollToAnchor(hash), 60)
  }

  return (
    <Dialog
      open={ui.summaryOpen}
      onClose={() => {
        setConfirmReset(false)
        ui.closeSummary()
      }}
      labelledBy="summary-title"
      className="m-0 mt-auto max-h-[88dvh] w-full max-w-none overflow-hidden rounded-t-3xl bg-ink-900 p-0 text-bone shadow-2xl sm:ml-auto sm:mt-0 sm:h-dvh sm:max-h-dvh sm:max-w-[440px] sm:rounded-none sm:rounded-l-3xl"
    >
      <div className="flex max-h-[88dvh] flex-col sm:h-dvh sm:max-h-dvh">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <div>
            <h2 id="summary-title" className="font-display text-xl font-semibold">
              Meu projeto
            </h2>
            <p className="text-[0.85rem] text-mute">Tudo aqui pode ser editado ou removido.</p>
          </div>
          <button type="button" onClick={ui.closeSummary} className="grid h-11 w-11 place-items-center rounded-full border border-white/15" aria-label="Fechar Meu projeto">
            <Close size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {empty ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Mascot state="welcome" size={88} />
              <p className="mt-5 font-display text-lg font-semibold">Seu projeto começa aqui.</p>
              <p className="mt-2 max-w-xs text-[0.95rem] text-mute">Adicione referências enquanto navega ou comece direto pelo orçamento.</p>
              <button type="button" onClick={() => goTo('#criacoes')} className="btn btn-ghost btn-sm mt-5">
                Explorar criações
              </button>
            </div>
          ) : (
            <div className="grid gap-7">
              {state.submission && (
                <p className="rounded-2xl border border-ion-400/40 bg-ion-400/10 p-4 text-[0.9rem] text-bone">
                  <span className="font-semibold">Solicitação enviada.</span> Protocolo {state.submission.id.slice(0, 8).toUpperCase()}. Se mudar algo, um
                  novo envio será necessário.
                </p>
              )}

              <section aria-labelledby="sum-services">
                <h3 id="sum-services" className="eyebrow text-mute-600">
                  Serviço de interesse
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SERVICES.map((s) => {
                    const on = state.services.includes(s.id)
                    return (
                      <button key={s.id} type="button" aria-pressed={on} onClick={() => toggleService(s.id, 'summary')} className="chip min-h-[40px] text-[0.85rem]">
                        {on ? <Check size={15} strokeWidth={2.4} /> : <Plus size={15} />}
                        {s.label}
                      </button>
                    )
                  })}
                </div>
              </section>

              <section aria-labelledby="sum-refs">
                <h3 id="sum-refs" className="eyebrow text-mute-600">
                  Referências ({state.references.length})
                </h3>
                {state.references.length === 0 ? (
                  <p className="mt-3 text-[0.9rem] text-mute">Nenhuma ainda. Use “Adicionar ao projeto” nas criações.</p>
                ) : (
                  <ul className="mt-3 grid gap-2">
                    {state.references.map((id) => {
                      const item = PORTFOLIO_BY_ID[id]
                      if (!item) return null
                      return (
                        <li key={id} className="flex items-center gap-3 rounded-2xl border border-white/10 p-2 pr-2">
                          {item.image ? (
                            <img src={item.image.src} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-xl object-cover" loading="lazy" />
                          ) : (
                            <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-volt-600/30 font-pixel text-[0.6rem] text-volt-200">
                              WEB
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[0.92rem] font-semibold">{item.title}</p>
                            <p className="truncate text-[0.78rem] text-mute">{KIND_LABEL[item.kind]}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleReference(id)}
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-mute hover:bg-white/10 hover:text-coral-300"
                            aria-label={`Remover “${item.title}” do projeto`}
                          >
                            <Trash size={17} />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              <section aria-labelledby="sum-direction">
                <h3 id="sum-direction" className="eyebrow text-mute-600">
                  Direção visual
                </h3>
                {state.direction ? (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 px-4 py-3">
                    <p className="font-semibold">{DIRECTION_LABELS[state.direction]}</p>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => goTo('#direcao')} className="rounded-full px-3 py-2 text-[0.85rem] text-mute hover:text-bone">
                        Trocar
                      </button>
                      <button
                        type="button"
                        onClick={() => chooseDirection(null)}
                        className="grid h-10 w-10 place-items-center rounded-full text-mute hover:bg-white/10 hover:text-coral-300"
                        aria-label="Remover direção visual do projeto"
                      >
                        <Trash size={17} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => goTo('#direcao')} className="mt-3 text-[0.9rem] text-ion-300 underline-offset-4 hover:underline">
                    Testar uma direção
                  </button>
                )}
              </section>

              {(answered.length > 0 || hasContact || budget) && (
                <section aria-labelledby="sum-info">
                  <div className="flex items-center justify-between">
                    <h3 id="sum-info" className="eyebrow text-mute-600">
                      Informações preenchidas
                    </h3>
                    <button type="button" onClick={() => ui.openQuote({ step: 2, source: 'summary_edit' })} className="inline-flex items-center gap-1.5 text-[0.85rem] text-ion-300">
                      <Pencil size={14} /> Editar
                    </button>
                  </div>
                  <dl className="mt-3 grid gap-2 text-[0.9rem]">
                    {answered.map(({ q, value }) => (
                      <div key={q.id} className="grid grid-cols-[40%_1fr] gap-3">
                        <dt className="text-mute">{q.label.replace(/\?$/, '').replace(' (opcional)', '')}</dt>
                        <dd className="break-words">{value}</dd>
                      </div>
                    ))}
                    {budget && (
                      <div className="grid grid-cols-[40%_1fr] gap-3">
                        <dt className="text-mute">Investimento</dt>
                        <dd>{budget}</dd>
                      </div>
                    )}
                    {state.contact.name && (
                      <div className="grid grid-cols-[40%_1fr] gap-3">
                        <dt className="text-mute">Contato</dt>
                        <dd>{state.contact.name}</dd>
                      </div>
                    )}
                  </dl>
                </section>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-2 border-t border-white/[0.08] px-5 py-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
          {count > 0 && !state.submission && <p className="text-[0.85rem] text-mute">{MASCOT_LINES.hasDirection}</p>}
          <button type="button" className="btn btn-primary w-full" onClick={() => ui.openQuote({ source: 'summary' })}>
            {state.submission ? 'Ver solicitação' : 'Continuar para o orçamento'}
            <ArrowRight size={18} />
          </button>
          {!empty &&
            (confirmReset ? (
              <div className="flex items-center justify-between gap-2 rounded-2xl bg-coral-500/10 px-3 py-2 text-[0.85rem]">
                <span>Apagar tudo do projeto?</span>
                <span className="flex gap-1">
                  <button type="button" className="rounded-full px-3 py-2 text-mute hover:text-bone" onClick={() => setConfirmReset(false)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-coral-400 px-3 py-2 font-semibold text-ink-950"
                    onClick={() => {
                      dispatch({ type: 'reset' })
                      ui.setSubmit({ status: 'idle' })
                      setConfirmReset(false)
                    }}
                  >
                    Apagar
                  </button>
                </span>
              </div>
            ) : (
              <button type="button" className="text-[0.85rem] text-mute hover:text-bone" onClick={() => setConfirmReset(true)}>
                Limpar projeto
              </button>
            ))}
        </div>
      </div>
    </Dialog>
  )
}
