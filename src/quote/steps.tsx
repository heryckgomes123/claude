import type { ReactNode, RefObject } from 'react'
import { Check, Pencil, Trash } from '../components/Icons'
import { PRIVACY_NOTICE } from '../config/content'
import { KIND_LABEL, PORTFOLIO_BY_ID } from '../config/portfolio'
import {
  BUDGET_GUIDANCE_ID,
  BUDGET_RANGES,
  BUDGET_SKIP_ID,
  DIRECTION_LABELS,
  LIMITS,
  SERVICES,
  SERVICE_BY_ID,
  isQuestionRequired,
  visibleQuestions,
} from '../config/quote'
import type { ContactChannel } from '../config/quote'
import { answerLabel, budgetLabel } from '../lib/quote/summary'
import type { FieldErrors } from '../lib/quote/validation'
import { useProjectActions } from '../state/actions'
import { useProject } from '../state/project'
import type { QuoteStep } from '../state/ui'
import { ChoiceGroup, FieldError, TextField } from './fields'

interface StepProps {
  errors: FieldErrors
}

/* -------------------------------------------------------------------------- */

export function StepServices({ errors }: StepProps) {
  const { state } = useProject()
  const { toggleService, toggleReference } = useProjectActions()
  return (
    <div className="grid gap-8">
      <fieldset id="services" aria-describedby={errors.services ? 'services-error' : 'services-hint'} aria-invalid={errors.services ? true : undefined}>
        <legend className="font-display text-[1.05rem] font-semibold">Escolha um ou mais</legend>
        <p id="services-hint" className="mt-1 text-[0.88rem] text-mute">
          {state.interest === 'discover' ? 'Ainda descobrindo? Marque “Projeto personalizado” e conte a ideia na próxima etapa.' : 'Já marcamos o que você escolheu na navegação.'}
        </p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {SERVICES.map((s) => (
            <label key={s.id} className="chip cursor-pointer items-start rounded-2xl p-4">
              <input
                type="checkbox"
                name="services"
                value={s.id}
                checked={state.services.includes(s.id)}
                onChange={(e) => toggleService(s.id, 'quote', e.target.checked)}
                className="sr-only"
              />
              <span aria-hidden="true" className="chip-check mt-0.5">
                <Check size={12} strokeWidth={3} />
              </span>
              <span>
                <span className="block font-display text-[1.02rem] font-semibold">{s.label}</span>
                <span className="mt-1 block text-[0.85rem] font-normal leading-snug text-mute">{s.summary}</span>
              </span>
            </label>
          ))}
        </div>
        {errors.services && <FieldError id="services-error">{errors.services}</FieldError>}
      </fieldset>

      {(state.references.length > 0 || state.direction) && (
        <div>
          <p className="font-display text-[1.05rem] font-semibold">Já está no seu projeto</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {state.references.map((id) => {
              const item = PORTFOLIO_BY_ID[id]
              if (!item) return null
              return (
                <li key={id} className="flex items-center gap-1 rounded-full border border-white/15 py-1 pl-3 pr-1 text-[0.85rem]">
                  {item.title}
                  <button
                    type="button"
                    onClick={() => toggleReference(id)}
                    className="grid h-8 w-8 place-items-center rounded-full text-mute hover:bg-white/10 hover:text-coral-300"
                    aria-label={`Remover “${item.title}”`}
                  >
                    <Trash size={14} />
                  </button>
                </li>
              )
            })}
            {state.direction && (
              <li className="rounded-full border border-volt-400/60 bg-volt-600/20 px-3 py-2 text-[0.85rem]">Direção: {DIRECTION_LABELS[state.direction]}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

export function StepDetails({ errors }: StepProps) {
  const { state, dispatch } = useProject()
  const questions = visibleQuestions(state.services)
  return (
    <div className="grid gap-8">
      {questions.map((q) => {
        const required = isQuestionRequired(q, state.services)
        const set = (value: string | string[]) => dispatch({ type: 'answer', id: q.id, value })
        if (q.kind === 'single' || q.kind === 'multi') {
          return (
            <ChoiceGroup
              key={q.id}
              id={`q-${q.id}`}
              legend={q.label}
              hint={q.hint}
              options={q.options ?? []}
              multiple={q.kind === 'multi'}
              value={state.answers[q.id]}
              onChange={set}
              error={errors[q.id]}
              required={required}
            />
          )
        }
        return (
          <TextField
            key={q.id}
            id={`q-${q.id}`}
            label={q.label.replace(' (opcional)', '')}
            optional={!required}
            hint={q.hint}
            value={(state.answers[q.id] as string) ?? ''}
            onChange={set}
            multiline={q.kind === 'textarea'}
            maxLength={q.maxLength}
            placeholder={q.placeholder}
            error={errors[q.id]}
            required={required}
          />
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

export function StepContact({ errors, honeypotRef }: StepProps & { honeypotRef: RefObject<HTMLInputElement | null> }) {
  const { state, dispatch } = useProject()
  const c = state.contact
  const set = (patch: Partial<typeof c>) => dispatch({ type: 'contact', patch })
  const budgetOptions = [...BUDGET_RANGES, { id: BUDGET_GUIDANCE_ID, label: 'Quero orientação' }, { id: BUDGET_SKIP_ID, label: 'Prefiro não informar' }]

  return (
    <div className="grid gap-8">
      <div className="grid gap-4">
        <ChoiceGroup
          id="budget"
          legend="Investimento previsto (opcional)"
          hint={BUDGET_RANGES.length ? undefined : 'Sem tabela fixa: cada projeto recebe uma proposta personalizada.'}
          options={budgetOptions}
          value={c.budget || undefined}
          onChange={(v) => set({ budget: v as string })}
          error={errors.budget}
        />
        <TextField
          id="budgetNote"
          label="Tem uma verba em mente?"
          optional
          value={c.budgetNote}
          onChange={(v) => set({ budgetNote: v })}
          maxLength={LIMITS.budgetNote}
          error={errors.budgetNote}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField id="name" label="Seu nome" value={c.name} onChange={(v) => set({ name: v })} autoComplete="name" maxLength={LIMITS.name} error={errors.name} required />
        <TextField
          id="company"
          label="Empresa"
          optional
          value={c.company}
          onChange={(v) => set({ company: v })}
          autoComplete="organization"
          maxLength={LIMITS.company}
          error={errors.company}
        />
      </div>

      <ChoiceGroup
        id="channel"
        legend="Como prefere receber a resposta?"
        options={[
          { id: 'whatsapp', label: 'WhatsApp' },
          { id: 'email', label: 'E-mail' },
        ]}
        value={c.channel}
        onChange={(v) => set({ channel: v as ContactChannel })}
        error={errors.channel}
        required
      />

      {c.channel === 'whatsapp' && (
        <TextField
          id="whatsapp"
          label="Seu WhatsApp"
          hint="Com DDD. Ex.: (11) 91234-5678"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={c.whatsapp}
          onChange={(v) => set({ whatsapp: v })}
          maxLength={24}
          error={errors.whatsapp}
          required
        />
      )}
      {c.channel === 'email' && (
        <TextField
          id="email"
          label="Seu e-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={c.email}
          onChange={(v) => set({ email: v })}
          maxLength={LIMITS.email}
          error={errors.email}
          required
        />
      )}

      {/* Campo-isca contra robôs: invisível para pessoas. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Não preencha este campo</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" ref={honeypotRef} defaultValue="" />
      </div>

      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-[0.88rem] leading-relaxed text-mute">{PRIVACY_NOTICE}</p>
        <label className="flex cursor-pointer items-start gap-3 text-[0.92rem]">
          <input
            type="checkbox"
            checked={c.marketingConsent}
            onChange={(e) => set({ marketingConsent: e.target.checked })}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-volt-500)]"
          />
          <span>
            Quero receber novidades da INTELRA. <span className="text-mute">(opcional — não é necessário para o orçamento)</span>
          </span>
        </label>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function Block({ title, step, goTo, children }: { title: string; step: QuoteStep; goTo: (step: QuoteStep) => void; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h4 className="eyebrow text-mute-600">{title}</h4>
        <button type="button" onClick={() => goTo(step)} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-2 text-[0.85rem] text-ion-300 hover:text-ion-200">
          <Pencil size={14} /> Editar <span className="sr-only">{title}</span>
        </button>
      </div>
      <div className="mt-3 text-[0.95rem]">{children}</div>
    </section>
  )
}

export function StepReview({ goTo }: { goTo: (step: QuoteStep) => void }) {
  const { state } = useProject()
  const { toggleReference } = useProjectActions()
  const c = state.contact
  const answered = visibleQuestions(state.services)
    .map((q) => ({ q, value: answerLabel(q, state.answers[q.id]) }))
    .filter((a) => a.value)

  return (
    <div className="grid gap-3">
      <Block goTo={goTo} title="Serviços" step={1}>
        <p>{state.services.map((s) => SERVICE_BY_ID[s].label).join(' · ')}</p>
      </Block>

      <Block goTo={goTo} title="Referências e direção" step={1}>
        {state.references.length === 0 && !state.direction ? (
          <p className="text-mute">Nenhuma referência selecionada (tudo bem).</p>
        ) : (
          <ul className="grid gap-2">
            {state.references.map((id) => {
              const item = PORTFOLIO_BY_ID[id]
              if (!item) return null
              return (
                <li key={id} className="flex items-center justify-between gap-2">
                  <span>
                    {item.title} <span className="text-[0.82rem] text-mute">· {KIND_LABEL[item.kind]}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleReference(id)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-mute hover:bg-white/10 hover:text-coral-300"
                    aria-label={`Remover “${item.title}”`}
                  >
                    <Trash size={15} />
                  </button>
                </li>
              )
            })}
            {state.direction && <li>Direção visual: {DIRECTION_LABELS[state.direction]}</li>}
          </ul>
        )}
      </Block>

      <Block goTo={goTo} title="Escopo e prazo" step={2}>
        {answered.length === 0 ? (
          <p className="text-mute">Sem detalhes adicionais.</p>
        ) : (
          <dl className="grid gap-2">
            {answered.map(({ q, value }) => (
              <div key={q.id} className="grid gap-0.5 sm:grid-cols-[42%_1fr] sm:gap-3">
                <dt className="text-mute">{q.label.replace(' (opcional)', '')}</dt>
                <dd className="whitespace-pre-line break-words">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Block>

      <Block goTo={goTo} title="Contato e investimento" step={3}>
        <dl className="grid gap-2">
          <div className="grid gap-0.5 sm:grid-cols-[42%_1fr] sm:gap-3">
            <dt className="text-mute">Nome</dt>
            <dd>
              {c.name}
              {c.company && ` · ${c.company}`}
            </dd>
          </div>
          <div className="grid gap-0.5 sm:grid-cols-[42%_1fr] sm:gap-3">
            <dt className="text-mute">Resposta por</dt>
            <dd>{c.channel === 'whatsapp' ? `WhatsApp · ${c.whatsapp}` : `E-mail · ${c.email}`}</dd>
          </div>
          <div className="grid gap-0.5 sm:grid-cols-[42%_1fr] sm:gap-3">
            <dt className="text-mute">Investimento</dt>
            <dd>{[budgetLabel(c.budget), c.budgetNote].filter(Boolean).join(' · ') || 'Não informado'}</dd>
          </div>
          <div className="grid gap-0.5 sm:grid-cols-[42%_1fr] sm:gap-3">
            <dt className="text-mute">Novidades</dt>
            <dd>{c.marketingConsent ? 'Sim, quero receber' : 'Não'}</dd>
          </div>
        </dl>
      </Block>

      <p className="mt-2 text-[0.88rem] leading-relaxed text-mute">
        Isto é uma solicitação de proposta personalizada — não um orçamento automático. A INTELRA analisa o pedido e responde pelo canal escolhido.
      </p>
    </div>
  )
}
