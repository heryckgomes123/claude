'use client'
import { ArrowDown, ArrowUp, Eye, Loader2, Plus, Save, ScanSearch, Search, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox, Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { ConfirmButton } from '@/features/my-lab-forms'
import {
  CONTENT_STATUSES,
  CONTENT_STATUS_LABELS,
  CONTENT_TYPE_META,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  MEDIA_LABELS,
  MEDIA_TYPES,
  PRICING_LABELS,
  PRICING_STATUSES,
  VERIFICATION_LABELS,
  VERIFICATION_STATUSES,
  contentHref,
  type ContentType,
  type MediaType,
} from '@/lib/labels'
import { extractVariableKeys } from '@/lib/prompt-variables'
import { cn, slugify } from '@/lib/utils'
import { deleteContent, saveContent, type ContentInput } from '@/server/actions/admin'
import type { EditorState, KV, Variable } from './editor-types'

type PickItem = { id: string; type: ContentType; title: string; status: string }
type Options = { categories: { id: string; kind: 'CONTENT' | 'TOOL'; name: string }[]; items: PickItem[] }

/** Converte o estado do formulário no payload validado pelo servidor. */
function toPayload(s: EditorState): ContentInput {
  const base = {
    id: s.id,
    title: s.title,
    slug: s.slug,
    summary: s.summary,
    description: s.description,
    coverImageUrl: s.coverImageUrl,
    categoryId: s.categoryId || null,
    difficulty: (s.difficulty || null) as ContentInput['difficulty'],
    status: s.status,
    featured: s.featured,
    tags: s.tags.split(',').map((t) => t.trim()).filter(Boolean),
    relatedIds: s.relatedIds,
    toolIds: s.type === 'PROMPT' || s.type === 'REFERENCE' || s.type === 'TUTORIAL' ? s.toolIds : [],
    changelog: s.changelog,
  }
  switch (s.type) {
    case 'PROMPT':
      return {
        ...base,
        type: 'PROMPT',
        body: s.body,
        negativePrompt: s.negativePrompt,
        mediaType: s.mediaType,
        aspectRatio: s.aspectRatio,
        parameters: s.parameters,
        recommendedSettings: s.recommendedSettings,
        expectedResult: s.expectedResult,
        tips: s.tips,
        variables: s.variables,
      }
    case 'WORKFLOW':
      return {
        ...base,
        type: 'WORKFLOW',
        objective: s.objective,
        estimatedMinutes: s.estimatedMinutes,
        inputs: s.inputs,
        expectedOutput: s.expectedOutput,
        alternatives: s.alternatives,
        troubleshooting: s.troubleshooting,
        requiredToolIds: s.requiredToolIds,
        optionalToolIds: s.optionalToolIds,
        steps: s.workflowSteps.map((st) => ({ ...st, toolId: st.toolId || null, promptId: st.promptId || null })),
      }
    case 'TOOL':
      return {
        ...base,
        type: 'TOOL',
        websiteUrl: s.websiteUrl,
        logoUrl: s.logoUrl,
        pricingStatus: s.pricingStatus,
        pricingNote: s.pricingNote,
        primaryUse: s.primaryUse,
        capabilities: s.capabilities,
        supportedMedia: s.supportedMedia,
        strengths: s.strengths,
        limitations: s.limitations,
        verificationStatus: s.verificationStatus,
        verifiedAt: s.verifiedAt || null,
      }
    case 'REFERENCE':
      return {
        ...base,
        type: 'REFERENCE',
        sourceName: s.sourceName,
        sourceUrl: s.sourceUrl,
        style: s.style,
        notes: s.notes,
        palette: s.palette,
        aspectRatio: s.aspectRatio,
      }
    case 'TUTORIAL':
      return {
        ...base,
        type: 'TUTORIAL',
        objective: s.objective,
        estimatedMinutes: s.estimatedMinutes,
        prerequisites: s.prerequisites,
        mistakes: s.mistakes,
        proTips: s.proTips,
        steps: s.tutorialSteps.map((st) => ({ ...st, promptId: st.promptId || null })),
      }
  }
}

/* -------------------------------------------------------------------------- */
/* Editor                                                                     */
/* -------------------------------------------------------------------------- */

export function ContentEditor({
  initial,
  options,
  slugLocked,
  versions,
  published,
}: {
  initial: EditorState
  options: Options
  slugLocked?: boolean
  versions?: { version: number; changelog: string | null; createdAt: Date }[]
  published?: { slug: string }
}) {
  const [s, setState] = useState<EditorState>(initial)
  const [slugTouched, setSlugTouched] = useState(Boolean(slugLocked))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()
  const set = <K extends keyof EditorState>(key: K, value: EditorState[K]) => setState((prev) => ({ ...prev, [key]: value }))

  const tools = useMemo(() => options.items.filter((i) => i.type === 'TOOL'), [options.items])
  const prompts = useMemo(() => options.items.filter((i) => i.type === 'PROMPT'), [options.items])
  const relatable = useMemo(() => options.items.filter((i) => i.id !== s.id), [options.items, s.id])
  const categories = options.categories.filter((c) => c.kind === (s.type === 'TOOL' ? 'TOOL' : 'CONTENT'))
  const meta = CONTENT_TYPE_META[s.type]

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      const result = await saveContent(toPayload(s))
      if (!result) return
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {})
        toast.error(result.error)
        return
      }
      setErrors({})
      set('changelog', '')
      toast.success(result.message ?? 'Salvo')
    })
  }

  const err = (key: string) => errors[key]

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]" noValidate>
      <div className="grid content-start gap-6">
        {/* ESSENCIAL */}
        <Panel title="Essencial">
          <Field label="Título" htmlFor="f-title" error={err('title')}>
            <Input
              id="f-title"
              value={s.title}
              onChange={(e) => {
                set('title', e.target.value)
                if (!slugTouched) set('slug', slugify(e.target.value))
              }}
              maxLength={160}
              required
            />
          </Field>
          <Field label="Slug (URL)" htmlFor="f-slug" error={err('slug')} hint={slugLocked ? 'Alterar o slug muda a URL pública do conteúdo.' : 'Gerado a partir do título.'}>
            <Input
              id="f-slug"
              value={s.slug}
              onChange={(e) => {
                setSlugTouched(true)
                set('slug', e.target.value.toLowerCase())
              }}
              className="font-mono"
              maxLength={96}
            />
          </Field>
          <Field label="Resumo" htmlFor="f-summary" error={err('summary')} hint="Aparece nos cards e na busca. 1–2 frases.">
            <Textarea id="f-summary" value={s.summary} onChange={(e) => set('summary', e.target.value)} maxLength={400} className="min-h-20" />
          </Field>
          <Field label="Descrição" htmlFor="f-description" error={err('description')} hint="O que é, quando usar e por quê.">
            <Textarea id="f-description" value={s.description} onChange={(e) => set('description', e.target.value)} maxLength={8000} className="min-h-32" />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Categoria" htmlFor="f-category" error={err('categoryId')}>
              <NativeSelect id="f-category" value={s.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {s.type !== 'TOOL' && (
              <Field label="Dificuldade" htmlFor="f-difficulty">
                <NativeSelect id="f-difficulty" value={s.difficulty} onChange={(e) => set('difficulty', e.target.value)}>
                  <option value="">—</option>
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {DIFFICULTY_LABELS[d]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
          </div>
          <Field label="Tags" htmlFor="f-tags" hint="Separadas por vírgula. Tags novas são criadas automaticamente.">
            <Input id="f-tags" value={s.tags} onChange={(e) => set('tags', e.target.value)} placeholder="produto, estúdio, luxo" maxLength={600} />
          </Field>
          <Field label="Imagem de capa (URL)" htmlFor="f-cover" optional error={err('coverImageUrl')} hint="https://… — sem imagem, o Lab gera uma capa abstrata.">
            <Input id="f-cover" type="url" value={s.coverImageUrl} onChange={(e) => set('coverImageUrl', e.target.value)} maxLength={2048} />
          </Field>
        </Panel>

        {/* ESPECÍFICO DO TIPO */}
        {s.type === 'PROMPT' && (
          <Panel title="Prompt">
            <Field label="Texto do prompt" htmlFor="f-body" error={err('body')} hint="Use {{chave}} para variáveis que o membro preenche.">
              <Textarea id="f-body" value={s.body} onChange={(e) => set('body', e.target.value)} className="min-h-44 font-mono text-[13px] leading-6" maxLength={8000} />
            </Field>
            <Field label="Prompt negativo" htmlFor="f-negative" optional>
              <Textarea id="f-negative" value={s.negativePrompt} onChange={(e) => set('negativePrompt', e.target.value)} className="min-h-20 font-mono text-[13px]" maxLength={2000} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Mídia" htmlFor="f-media">
                <NativeSelect id="f-media" value={s.mediaType} onChange={(e) => set('mediaType', e.target.value as MediaType)}>
                  {MEDIA_TYPES.map((m) => (
                    <option key={m} value={m}>
                      {MEDIA_LABELS[m]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Proporção" htmlFor="f-ratio" optional>
                <Input id="f-ratio" value={s.aspectRatio} onChange={(e) => set('aspectRatio', e.target.value)} placeholder="4:5" maxLength={20} />
              </Field>
            </div>
            <VariablesEditor
              body={s.body}
              variables={s.variables}
              onChange={(v) => set('variables', v)}
              error={Object.entries(errors).find(([k]) => k.startsWith('variables'))?.[1]}
            />
            <KeyValueEditor label="Parâmetros" items={s.parameters} onChange={(v) => set('parameters', v)} labelPlaceholder="Midjourney" valuePlaceholder="--ar 4:5 --style raw" />
            <KeyValueEditor label="Configurações recomendadas" items={s.recommendedSettings} onChange={(v) => set('recommendedSettings', v)} labelPlaceholder="Upscale" valuePlaceholder="Criatividade 0–2" />
            <Field label="Resultado esperado" htmlFor="f-expected" optional>
              <Textarea id="f-expected" value={s.expectedResult} onChange={(e) => set('expectedResult', e.target.value)} maxLength={2000} className="min-h-20" />
            </Field>
            <ListEditor label="Dicas" items={s.tips} onChange={(v) => set('tips', v)} placeholder="Uma dica por linha" />
            <Field label="Nota da versão" htmlFor="f-changelog" optional hint="Registrada no histórico quando o texto do prompt muda.">
              <Input id="f-changelog" value={s.changelog} onChange={(e) => set('changelog', e.target.value)} maxLength={280} placeholder="Ex.: luz de recorte mais forte" />
            </Field>
          </Panel>
        )}

        {s.type === 'WORKFLOW' && (
          <>
            <Panel title="Workflow">
              <Field label="Objetivo" htmlFor="f-objective">
                <Textarea id="f-objective" value={s.objective} onChange={(e) => set('objective', e.target.value)} className="min-h-20" maxLength={2000} />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Tempo estimado (min)" htmlFor="f-minutes" error={err('estimatedMinutes')}>
                  <Input id="f-minutes" type="number" min={1} value={s.estimatedMinutes} onChange={(e) => set('estimatedMinutes', e.target.value)} />
                </Field>
                <Field label="Resultado final" htmlFor="f-output" optional>
                  <Input id="f-output" value={s.expectedOutput} onChange={(e) => set('expectedOutput', e.target.value)} maxLength={2000} />
                </Field>
              </div>
              <ListEditor label="Entradas necessárias" items={s.inputs} onChange={(v) => set('inputs', v)} />
              <MultiPicker label="Ferramentas obrigatórias" options={tools} selected={s.requiredToolIds} onChange={(v) => set('requiredToolIds', v)} />
              <MultiPicker label="Ferramentas opcionais" options={tools} selected={s.optionalToolIds} onChange={(v) => set('optionalToolIds', v)} />
            </Panel>
            <Panel title="Etapas" error={err('steps')}>
              <StepsEditor
                steps={s.workflowSteps}
                onChange={(v) => set('workflowSteps', v)}
                blank={{ title: '', description: '', toolId: '', promptId: '', settings: '', tip: '' }}
                render={(step, update, i) => (
                  <>
                    <Input value={step.title} onChange={(e) => update({ title: e.target.value })} placeholder={`Etapa ${i + 1} — título`} maxLength={160} aria-label={`Título da etapa ${i + 1}`} />
                    <Textarea value={step.description} onChange={(e) => update({ description: e.target.value })} placeholder="O que fazer nesta etapa" className="min-h-20" maxLength={3000} aria-label={`Descrição da etapa ${i + 1}`} />
                    <div className="grid gap-2 md:grid-cols-2">
                      <NativeSelect value={step.toolId} onChange={(e) => update({ toolId: e.target.value })} aria-label={`Ferramenta da etapa ${i + 1}`}>
                        <option value="">Ferramenta —</option>
                        {tools.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </NativeSelect>
                      <NativeSelect value={step.promptId} onChange={(e) => update({ promptId: e.target.value })} aria-label={`Prompt da etapa ${i + 1}`}>
                        <option value="">Prompt —</option>
                        {prompts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <Input value={step.settings} onChange={(e) => update({ settings: e.target.value })} placeholder="Configurações" maxLength={500} aria-label={`Configurações da etapa ${i + 1}`} />
                      <Input value={step.tip} onChange={(e) => update({ tip: e.target.value })} placeholder="Dica" maxLength={500} aria-label={`Dica da etapa ${i + 1}`} />
                    </div>
                  </>
                )}
              />
            </Panel>
            <Panel title="Apoio">
              <ListEditor label="Alternativas" items={s.alternatives} onChange={(v) => set('alternatives', v)} />
              <PairsEditor
                label="Solução de problemas"
                items={s.troubleshooting}
                onChange={(v) => set('troubleshooting', v)}
                keys={['problem', 'solution']}
                placeholders={['Problema', 'Solução']}
              />
            </Panel>
          </>
        )}

        {s.type === 'TOOL' && (
          <Panel title="Ferramenta">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Site oficial" htmlFor="f-website" error={err('websiteUrl')}>
                <Input id="f-website" type="url" value={s.websiteUrl} onChange={(e) => set('websiteUrl', e.target.value)} maxLength={2048} />
              </Field>
              <Field label="Logo (URL)" htmlFor="f-logo" optional error={err('logoUrl')}>
                <Input id="f-logo" type="url" value={s.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} maxLength={2048} />
              </Field>
              <Field label="Uso principal" htmlFor="f-primary">
                <Input id="f-primary" value={s.primaryUse} onChange={(e) => set('primaryUse', e.target.value)} maxLength={200} />
              </Field>
              <Field label="Preço" htmlFor="f-pricing">
                <NativeSelect id="f-pricing" value={s.pricingStatus} onChange={(e) => set('pricingStatus', e.target.value as EditorState['pricingStatus'])}>
                  {PRICING_STATUSES.map((p) => (
                    <option key={p} value={p}>
                      {PRICING_LABELS[p]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field label="Observação de preço" htmlFor="f-pricing-note" optional>
              <Input id="f-pricing-note" value={s.pricingNote} onChange={(e) => set('pricingNote', e.target.value)} maxLength={500} />
            </Field>
            <fieldset className="grid gap-2">
              <legend className="text-[13px] font-medium">Mídias suportadas</legend>
              <div className="flex flex-wrap gap-4">
                {MEDIA_TYPES.map((m) => (
                  <label key={m} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={s.supportedMedia.includes(m)}
                      onChange={(e) => set('supportedMedia', e.target.checked ? [...s.supportedMedia, m] : s.supportedMedia.filter((x) => x !== m))}
                    />
                    {MEDIA_LABELS[m]}
                  </label>
                ))}
              </div>
            </fieldset>
            <ListEditor label="Capacidades" items={s.capabilities} onChange={(v) => set('capabilities', v)} />
            <ListEditor label="Pontos fortes" items={s.strengths} onChange={(v) => set('strengths', v)} />
            <ListEditor label="Limitações" items={s.limitations} onChange={(v) => set('limitations', v)} />
            <div className="grid gap-4 rounded-xl border border-warning/20 bg-warning/[0.04] p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <Field label="Verificação" htmlFor="f-verification">
                <NativeSelect id="f-verification" value={s.verificationStatus} onChange={(e) => set('verificationStatus', e.target.value as EditorState['verificationStatus'])}>
                  {VERIFICATION_STATUSES.map((v) => (
                    <option key={v} value={v}>
                      {VERIFICATION_LABELS[v]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Verificada em" htmlFor="f-verified-at">
                <Input id="f-verified-at" type="date" value={s.verifiedAt} onChange={(e) => set('verifiedAt', e.target.value)} />
              </Field>
              <Button
                type="button"
                onClick={() => {
                  set('verificationStatus', 'VERIFIED')
                  set('verifiedAt', new Date().toISOString().slice(0, 10))
                }}
              >
                Verifiquei hoje
              </Button>
            </div>
          </Panel>
        )}

        {s.type === 'REFERENCE' && (
          <Panel title="Referência">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Estilo" htmlFor="f-style">
                <Input id="f-style" value={s.style} onChange={(e) => set('style', e.target.value)} maxLength={160} />
              </Field>
              <Field label="Proporção" htmlFor="f-ref-ratio" optional>
                <Input id="f-ref-ratio" value={s.aspectRatio} onChange={(e) => set('aspectRatio', e.target.value)} placeholder="4:5" maxLength={20} />
              </Field>
              <Field label="Fonte" htmlFor="f-source" optional>
                <Input id="f-source" value={s.sourceName} onChange={(e) => set('sourceName', e.target.value)} maxLength={160} />
              </Field>
              <Field label="URL da fonte" htmlFor="f-source-url" optional error={err('sourceUrl')}>
                <Input id="f-source-url" type="url" value={s.sourceUrl} onChange={(e) => set('sourceUrl', e.target.value)} maxLength={2048} />
              </Field>
            </div>
            <Field label="Notas de direção" htmlFor="f-notes" optional>
              <Textarea id="f-notes" value={s.notes} onChange={(e) => set('notes', e.target.value)} maxLength={4000} />
            </Field>
            <PaletteEditor colors={s.palette} onChange={(v) => set('palette', v)} error={Object.entries(errors).find(([k]) => k.startsWith('palette'))?.[1]} />
          </Panel>
        )}

        {s.type === 'TUTORIAL' && (
          <>
            <Panel title="Tutorial">
              <Field label="Objetivo" htmlFor="f-t-objective">
                <Textarea id="f-t-objective" value={s.objective} onChange={(e) => set('objective', e.target.value)} className="min-h-20" maxLength={2000} />
              </Field>
              <Field label="Tempo estimado (min)" htmlFor="f-t-minutes" error={err('estimatedMinutes')}>
                <Input id="f-t-minutes" type="number" min={1} value={s.estimatedMinutes} onChange={(e) => set('estimatedMinutes', e.target.value)} />
              </Field>
              <ListEditor label="Pré-requisitos" items={s.prerequisites} onChange={(v) => set('prerequisites', v)} />
            </Panel>
            <Panel title="Passos" error={err('steps')}>
              <StepsEditor
                steps={s.tutorialSteps}
                onChange={(v) => set('tutorialSteps', v)}
                blank={{ title: '', body: '', promptId: '' }}
                render={(step, update, i) => (
                  <>
                    <Input value={step.title} onChange={(e) => update({ title: e.target.value })} placeholder={`Passo ${i + 1} — título`} maxLength={160} aria-label={`Título do passo ${i + 1}`} />
                    <Textarea value={step.body} onChange={(e) => update({ body: e.target.value })} placeholder="Explicação" className="min-h-24" maxLength={5000} aria-label={`Texto do passo ${i + 1}`} />
                    <NativeSelect value={step.promptId} onChange={(e) => update({ promptId: e.target.value })} aria-label={`Prompt do passo ${i + 1}`}>
                      <option value="">Prompt para praticar —</option>
                      {prompts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </NativeSelect>
                  </>
                )}
              />
            </Panel>
            <Panel title="Apoio">
              <ListEditor label="Erros comuns" items={s.mistakes} onChange={(v) => set('mistakes', v)} />
              <ListEditor label="Dicas pro" items={s.proTips} onChange={(v) => set('proTips', v)} />
            </Panel>
          </>
        )}

        {/* RELAÇÕES */}
        <Panel title="Grafo de conhecimento" description="Conecte este conteúdo ao caminho da criação.">
          {(s.type === 'PROMPT' || s.type === 'REFERENCE' || s.type === 'TUTORIAL') && (
            <MultiPicker label="Ferramentas compatíveis" options={tools} selected={s.toolIds} onChange={(v) => set('toolIds', v)} />
          )}
          <MultiPicker label="Conteúdos relacionados" options={relatable} selected={s.relatedIds} onChange={(v) => set('relatedIds', v)} showType />
        </Panel>
      </div>

      {/* LATERAL */}
      <aside className="grid content-start gap-4 xl:sticky xl:top-36 xl:self-start">
        <Panel title="Publicação">
          <Field label="Status" htmlFor="f-status">
            <NativeSelect id="f-status" value={s.status} onChange={(e) => set('status', e.target.value as EditorState['status'])}>
              {CONTENT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {CONTENT_STATUS_LABELS[st]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={s.featured} onChange={(e) => set('featured', e.target.checked)} /> Destacar no Lab
          </label>
          <Button type="submit" variant="primary" size="lg" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Save />} {s.id ? 'Salvar alterações' : `Criar ${meta.label.toLowerCase()}`}
          </Button>
          {published && (
            <Button asChild variant="secondary">
              <Link href={contentHref(s.type, published.slug)} target="_blank">
                <Eye /> Pré-visualizar no Lab
              </Link>
            </Button>
          )}
          {Object.keys(errors).length > 0 && (
            <p role="alert" className="text-xs text-danger">
              Revise os campos destacados.
            </p>
          )}
        </Panel>
        {versions && versions.length > 0 && (
          <Panel title="Versões do prompt">
            <ol className="grid gap-2 text-sm">
              {versions.map((v) => (
                <li key={v.version} className="flex gap-2">
                  <span className="font-mono text-gold-300">v{v.version}</span>
                  <span className="flex-1 text-mute">{v.changelog ?? '—'}</span>
                </li>
              ))}
            </ol>
          </Panel>
        )}
        {s.id && (s.status === 'DRAFT' || s.status === 'ARCHIVED') && (
          <ConfirmButton
            label="Excluir definitivamente"
            variant="ghost"
            title="Excluir este conteúdo?"
            description="Favoritos, histórico e relações com este item também serão removidos. Esta ação não pode ser desfeita."
            onConfirm={async () => {
              const result = await deleteContent(s.id!)
              if (result && !result.ok) toast.error(result.error)
            }}
          />
        )}
      </aside>
    </form>
  )
}

/* -------------------------------------------------------------------------- */
/* Subcomponentes                                                             */
/* -------------------------------------------------------------------------- */

function Panel({ title, description, error, children }: { title: string; description?: string; error?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-2xl border border-border bg-ink-900/60 p-5 md:p-6">
      <div>
        <h2 className="eyebrow">{title}</h2>
        {description && <p className="mt-1 text-sm text-mute">{description}</p>}
        {error && (
          <p role="alert" className="mt-1 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

function ListEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-[13px] font-medium">{label}</legend>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input value={item} onChange={(e) => onChange(items.map((x, idx) => (idx === i ? e.target.value : x)))} placeholder={placeholder} maxLength={400} aria-label={`${label} ${i + 1}`} />
          <RowButton label="Remover" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
            <X />
          </RowButton>
        </div>
      ))}
      <AddButton onClick={() => onChange([...items, ''])} />
    </fieldset>
  )
}

function KeyValueEditor({
  label,
  items,
  onChange,
  labelPlaceholder,
  valuePlaceholder,
}: {
  label: string
  items: KV[]
  onChange: (v: KV[]) => void
  labelPlaceholder: string
  valuePlaceholder: string
}) {
  return (
    <PairsEditor label={label} items={items} onChange={onChange} keys={['label', 'value']} placeholders={[labelPlaceholder, valuePlaceholder]} />
  )
}

function PairsEditor<T extends Record<string, string>>({
  label,
  items,
  onChange,
  keys,
  placeholders,
}: {
  label: string
  items: T[]
  onChange: (v: T[]) => void
  keys: [keyof T & string, keyof T & string]
  placeholders: [string, string]
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-[13px] font-medium">{label}</legend>
      {items.map((item, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
          {keys.map((k, ki) => (
            <Input
              key={k}
              value={item[k]}
              onChange={(e) => onChange(items.map((x, idx) => (idx === i ? { ...x, [k]: e.target.value } : x)))}
              placeholder={placeholders[ki]}
              maxLength={ki === 0 ? 300 : 1000}
              aria-label={`${label} ${i + 1} — ${placeholders[ki]}`}
            />
          ))}
          <RowButton label="Remover" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
            <X />
          </RowButton>
        </div>
      ))}
      <AddButton onClick={() => onChange([...items, Object.fromEntries(keys.map((k) => [k, ''])) as T])} />
    </fieldset>
  )
}

function VariablesEditor({ body, variables, onChange, error }: { body: string; variables: Variable[]; onChange: (v: Variable[]) => void; error?: string }) {
  const detected = extractVariableKeys(body)
  const missing = detected.filter((k) => !variables.some((v) => v.key === k))
  const unused = variables.filter((v) => !detected.includes(v.key)).map((v) => v.key)
  return (
    <fieldset className="grid gap-3 rounded-xl border border-border p-4">
      <legend className="px-1 text-[13px] font-medium">Variáveis</legend>
      <div className="flex flex-wrap items-center gap-2 text-xs text-mute">
        <span>Detectadas no texto: {detected.length ? detected.map((k) => `{{${k}}}`).join(', ') : 'nenhuma'}</span>
        {missing.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onChange([...variables, ...missing.map((key) => ({ key, label: key.replace(/[_-]/g, ' '), placeholder: '', defaultValue: '', description: '' }))])}
          >
            <ScanSearch /> Adicionar {missing.length} detectada(s)
          </Button>
        )}
      </div>
      {unused.length > 0 && <p className="text-xs text-warning">Não usadas no texto: {unused.join(', ')}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
      {variables.map((v, i) => (
        <div key={i} className="grid gap-2 rounded-lg bg-ink-950/40 p-3 md:grid-cols-2">
          <Input value={v.key} onChange={(e) => onChange(variables.map((x, idx) => (idx === i ? { ...x, key: e.target.value } : x)))} placeholder="chave" className="font-mono" maxLength={60} aria-label={`Chave da variável ${i + 1}`} />
          <Input value={v.label} onChange={(e) => onChange(variables.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))} placeholder="Rótulo" maxLength={80} aria-label={`Rótulo da variável ${i + 1}`} />
          <Input value={v.placeholder} onChange={(e) => onChange(variables.map((x, idx) => (idx === i ? { ...x, placeholder: e.target.value } : x)))} placeholder="Exemplo (placeholder)" maxLength={300} aria-label={`Exemplo da variável ${i + 1}`} />
          <Input value={v.defaultValue} onChange={(e) => onChange(variables.map((x, idx) => (idx === i ? { ...x, defaultValue: e.target.value } : x)))} placeholder="Valor padrão" maxLength={500} aria-label={`Valor padrão da variável ${i + 1}`} />
          <div className="flex gap-2 md:col-span-2">
            <Input value={v.description} onChange={(e) => onChange(variables.map((x, idx) => (idx === i ? { ...x, description: e.target.value } : x)))} placeholder="Ajuda para o membro" maxLength={300} aria-label={`Ajuda da variável ${i + 1}`} />
            <RowButton label="Remover variável" onClick={() => onChange(variables.filter((_, idx) => idx !== i))}>
              <Trash2 />
            </RowButton>
          </div>
        </div>
      ))}
    </fieldset>
  )
}

function StepsEditor<T>({
  steps,
  onChange,
  blank,
  render,
}: {
  steps: T[]
  onChange: (v: T[]) => void
  blank: T
  render: (step: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= steps.length) return
    const next = [...steps]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }
  return (
    <div className="grid gap-3">
      {steps.map((step, i) => (
        <div key={i} className="grid gap-2 rounded-xl border border-border bg-ink-950/40 p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-gold-300">{String(i + 1).padStart(2, '0')}</span>
            <div className="flex gap-1">
              <RowButton label="Mover para cima" onClick={() => move(i, i - 1)}>
                <ArrowUp />
              </RowButton>
              <RowButton label="Mover para baixo" onClick={() => move(i, i + 1)}>
                <ArrowDown />
              </RowButton>
              <RowButton label="Remover" onClick={() => onChange(steps.filter((_, idx) => idx !== i))}>
                <Trash2 />
              </RowButton>
            </div>
          </div>
          {render(step, (patch) => onChange(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s))), i)}
        </div>
      ))}
      <AddButton onClick={() => onChange([...steps, { ...blank }])} label="Adicionar etapa" />
    </div>
  )
}

function PaletteEditor({ colors, onChange, error }: { colors: string[]; onChange: (v: string[]) => void; error?: string }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-[13px] font-medium">Paleta</legend>
      <div className="flex flex-wrap gap-3">
        {colors.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5 rounded-xl border border-border p-1.5">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(c) ? c : '#000000'}
              onChange={(e) => onChange(colors.map((x, idx) => (idx === i ? e.target.value : x)))}
              className="size-8 cursor-pointer rounded-lg border-0 bg-transparent"
              aria-label={`Cor ${i + 1}`}
            />
            <Input value={c} onChange={(e) => onChange(colors.map((x, idx) => (idx === i ? e.target.value : x)))} className="h-8 w-24 font-mono text-xs" maxLength={7} aria-label={`Hex da cor ${i + 1}`} />
            <RowButton label="Remover cor" onClick={() => onChange(colors.filter((_, idx) => idx !== i))}>
              <X />
            </RowButton>
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {colors.length < 10 && <AddButton onClick={() => onChange([...colors, '#e2ae3a'])} label="Adicionar cor" />}
    </fieldset>
  )
}

function MultiPicker({
  label,
  options,
  selected,
  onChange,
  showType,
}: {
  label: string
  options: PickItem[]
  selected: string[]
  onChange: (v: string[]) => void
  showType?: boolean
}) {
  const [query, setQuery] = useState('')
  const byId = new Map(options.map((o) => [o.id, o]))
  const q = query.trim().toLowerCase()
  const filtered = options.filter((o) => !selected.includes(o.id) && (!q || o.title.toLowerCase().includes(q))).slice(0, 50)
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-[13px] font-medium">{label}</legend>
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const o = byId.get(id)
            return (
              <li key={id} className="inline-flex items-center gap-1 rounded-full border border-gold-300/30 bg-gold-300/10 py-1 pl-3 pr-1 text-xs text-gold-100">
                {showType && o && <span className="text-gold-300/70">{CONTENT_TYPE_META[o.type].label} ·</span>}
                {o?.title ?? 'Item removido'}
                <button type="button" onClick={() => onChange(selected.filter((x) => x !== id))} className="rounded-full p-1 hover:bg-bone/10" aria-label={`Remover ${o?.title ?? id}`}>
                  <X className="size-3" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mute-600" aria-hidden />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar para adicionar…" className="pl-9" aria-label={`Buscar ${label.toLowerCase()}`} />
      </div>
      {q && (
        <ul className="max-h-56 overflow-y-auto rounded-xl border border-border bg-ink-950/60 p-1">
          {filtered.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => {
                  onChange([...selected, o.id])
                  setQuery('')
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-bone/[0.05]"
              >
                {showType && <span className="w-20 shrink-0 font-mono text-[10px] uppercase text-mute-600">{CONTENT_TYPE_META[o.type].label}</span>}
                <span className="flex-1 truncate">{o.title}</span>
                {o.status !== 'PUBLISHED' && <span className="text-[10px] text-warning">{CONTENT_STATUS_LABELS[o.status as keyof typeof CONTENT_STATUS_LABELS]}</span>}
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="px-3 py-2 text-sm text-mute-600">Nada encontrado.</li>}
        </ul>
      )}
    </fieldset>
  )
}

function RowButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn('grid size-10 shrink-0 place-items-center rounded-xl text-mute transition-colors hover:bg-bone/5 hover:text-bone [&_svg]:size-4')}
    >
      {children}
    </button>
  )
}

function AddButton({ onClick, label = 'Adicionar' }: { onClick: () => void; label?: string }) {
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onClick} className="justify-self-start">
      <Plus /> {label}
    </Button>
  )
}
