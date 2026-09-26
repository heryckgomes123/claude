'use client'
import { Loader2, Plus, Save, X } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { saveExperiment, type ExperimentInput } from '@/server/actions/lab'

type Variant = { label: string; prompt: string; parameters: string; observations: string; result: string; resultUrl: string; score: string }
type Option = { id: string; title: string }

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F']
const emptyVariant = (label: string, prompt = ''): Variant => ({ label, prompt, parameters: '', observations: '', result: '', resultUrl: '', score: '' })

export function ExperimentForm({
  tools,
  prompts,
  initial,
}: {
  tools: Option[]
  prompts: Option[]
  initial?: {
    id?: string
    title: string
    objective: string
    toolId: string | null
    sourcePromptId: string | null
    notes: string | null
    variants: Partial<Variant>[]
  }
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [objective, setObjective] = useState(initial?.objective ?? '')
  const [toolId, setToolId] = useState(initial?.toolId ?? '')
  const [sourcePromptId, setSourcePromptId] = useState(initial?.sourcePromptId ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [variants, setVariants] = useState<Variant[]>(
    initial?.variants.length
      ? initial.variants.map((v, i) => ({ ...emptyVariant(LABELS[i] ?? String(i + 1)), ...Object.fromEntries(Object.entries(v).map(([k, val]) => [k, val ?? ''])) }))
      : [emptyVariant('A'), emptyVariant('B')],
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  const update = (index: number, patch: Partial<Variant>) => setVariants((list) => list.map((v, i) => (i === index ? { ...v, ...patch } : v)))

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const payload: ExperimentInput = {
      id: initial?.id,
      title,
      objective,
      toolId,
      sourcePromptId,
      notes,
      variants: variants.map((v) => ({ ...v, score: v.score === '' ? undefined : v.score })),
    }
    startTransition(async () => {
      const result = await saveExperiment(payload)
      if (result && !result.ok) {
        setErrors(result.fieldErrors ?? {})
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <div className="grid gap-4 rounded-2xl border border-border bg-ink-900/60 p-5 md:grid-cols-2 md:p-6">
        <Field label="Título" htmlFor="x-title" error={errors.title} className="md:col-span-2">
          <Input id="x-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Luz de recorte vs. luz frontal em perfume" maxLength={140} required />
        </Field>
        <Field label="Objetivo" htmlFor="x-objective" className="md:col-span-2" hint="O que você quer descobrir com este teste?">
          <Textarea id="x-objective" value={objective} onChange={(e) => setObjective(e.target.value)} maxLength={2000} className="min-h-20" />
        </Field>
        <Field label="Ferramenta" htmlFor="x-tool" optional error={errors.toolId}>
          <NativeSelect id="x-tool" value={toolId} onChange={(e) => setToolId(e.target.value)}>
            <option value="">—</option>
            {tools.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Prompt de origem" htmlFor="x-prompt" optional error={errors.sourcePromptId}>
          <NativeSelect id="x-prompt" value={sourcePromptId} onChange={(e) => setSourcePromptId(e.target.value)}>
            <option value="">—</option>
            {prompts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <section aria-labelledby="variants-title" className="grid gap-4">
        <div className="flex items-center justify-between">
          <h2 id="variants-title" className="text-lg font-semibold">
            Variantes
          </h2>
          <Button
            type="button"
            size="sm"
            disabled={variants.length >= 6}
            onClick={() => setVariants((list) => [...list, emptyVariant(LABELS[list.length] ?? String(list.length + 1), list[list.length - 1]?.prompt ?? '')])}
          >
            <Plus /> Adicionar variante
          </Button>
        </div>
        {errors.variants && <p className="text-sm text-danger">{errors.variants}</p>}
        <div className="grid gap-4 xl:grid-cols-2">
          {variants.map((v, i) => (
            <fieldset key={i} className="grid gap-3 rounded-2xl border border-border bg-ink-900/60 p-5">
              <legend className="sr-only">Variante {v.label}</legend>
              <div className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded-full border border-gold-300/40 font-mono text-sm text-gold-200">{v.label}</span>
                {variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setVariants((list) => list.filter((_, idx) => idx !== i).map((item, idx) => ({ ...item, label: LABELS[idx] ?? item.label })))}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-mute hover:bg-danger/10 hover:text-danger"
                  >
                    <X className="size-3" /> Remover
                  </button>
                )}
              </div>
              <Field label="Prompt" htmlFor={`v${i}-prompt`} error={errors[`variants.${i}.prompt`]}>
                <Textarea id={`v${i}-prompt`} value={v.prompt} onChange={(e) => update(i, { prompt: e.target.value })} className="min-h-28 font-mono text-[13px]" maxLength={8000} required />
              </Field>
              <Field label="Parâmetros" htmlFor={`v${i}-params`} optional>
                <Input id={`v${i}-params`} value={v.parameters} onChange={(e) => update(i, { parameters: e.target.value })} className="font-mono" maxLength={1000} placeholder="--ar 4:5 --stylize 250" />
              </Field>
              <Field label="Observações" htmlFor={`v${i}-obs`} optional>
                <Textarea id={`v${i}-obs`} value={v.observations} onChange={(e) => update(i, { observations: e.target.value })} className="min-h-20" maxLength={4000} />
              </Field>
              <Field label="Resultado" htmlFor={`v${i}-result`} optional>
                <Textarea id={`v${i}-result`} value={v.result} onChange={(e) => update(i, { result: e.target.value })} className="min-h-20" maxLength={4000} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <Field label="Link do resultado" htmlFor={`v${i}-url`} optional error={errors[`variants.${i}.resultUrl`]}>
                  <Input id={`v${i}-url`} type="url" value={v.resultUrl} onChange={(e) => update(i, { resultUrl: e.target.value })} placeholder="https://…" maxLength={2048} />
                </Field>
                <Field label="Nota (0–10)" htmlFor={`v${i}-score`} optional error={errors[`variants.${i}.score`]}>
                  <Input id={`v${i}-score`} type="number" min={0} max={10} step={1} value={v.score} onChange={(e) => update(i, { score: e.target.value })} />
                </Field>
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <Field label="Conclusões e notas" htmlFor="x-notes" optional>
        <Textarea id="x-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={6000} />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="lg" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Salvar experimento
        </Button>
      </div>
    </form>
  )
}
