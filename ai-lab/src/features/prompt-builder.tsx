'use client'
import { Check, Copy, CopyPlus, Heart, Loader2, RotateCcw, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { copyToClipboard } from '@/components/lab/copy-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  BUILDER_FIELDS,
  BUILDER_FORMATS,
  BUILDER_FORMAT_LABELS,
  composeFinalPrompt,
  filledFieldCount,
  type BuilderState,
} from '@/lib/prompt-builder'
import { cn } from '@/lib/utils'
import { saveUserPrompt } from '@/server/actions/lab'

const DRAFT_KEY = 'intelra.builder.draft'

function readDraft(): BuilderState | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as BuilderState) : null
  } catch {
    return null
  }
}

export function PromptBuilder({
  initial,
}: {
  initial?: { id: string; title: string; state: BuilderState; isFavorite: boolean }
}) {
  const router = useRouter()
  // Renderizado apenas no cliente (ver prompt-builder-loader), então ler o rascunho local aqui é seguro.
  const [state, setState] = useState<BuilderState>(() => initial?.state ?? readDraft() ?? { format: 'descriptive' })
  const [title, setTitle] = useState(initial?.title ?? '')
  const [savedId, setSavedId] = useState(initial?.id)
  const [favorite, setFavorite] = useState(initial?.isFavorite ?? false)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  // Rascunho local (apenas conveniência deste navegador) enquanto não há um prompt salvo.
  useEffect(() => {
    if (savedId) return
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(state))
    } catch {
      /* armazenamento indisponível */
    }
  }, [state, savedId])

  const finalPrompt = useMemo(() => composeFinalPrompt(state), [state])
  const filled = filledFieldCount(state)
  const set = (key: keyof BuilderState, value: string) => setState((s) => ({ ...s, [key]: value }))

  function persist(opts: { asNew?: boolean; isFavorite?: boolean }) {
    if (!finalPrompt.trim()) {
      toast.error('Preencha pelo menos o assunto antes de salvar.')
      return
    }
    const builderState = Object.fromEntries(
      Object.entries(state).filter(([, v]) => typeof v === 'string' && v.trim()),
    ) as Record<string, string>
    const nextTitle = (title.trim() || state.subject?.trim() || 'Prompt sem título').slice(0, 140)
    startTransition(async () => {
      const result = await saveUserPrompt({
        id: opts.asNew ? undefined : savedId,
        title: opts.asNew ? `Cópia — ${nextTitle}`.slice(0, 140) : nextTitle,
        body: finalPrompt,
        negativePrompt: state.negative?.trim() || undefined,
        builderState,
        isFavorite: opts.isFavorite ?? favorite,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(opts.asNew ? 'Cópia salva no Meu Lab' : result.message)
      if (!opts.asNew) {
        setSavedId(result.data.id)
        setTitle(nextTitle)
        try {
          window.localStorage.removeItem(DRAFT_KEY)
        } catch {
          /* ignore */
        }
        router.replace(`/lab/prompt-builder?id=${result.data.id}`, { scroll: false })
      }
    })
  }

  async function copy() {
    if (!finalPrompt.trim()) return
    if (await copyToClipboard(finalPrompt)) {
      setCopied(true)
      toast.success('Prompt copiado')
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  function reset() {
    setState({ format: state.format ?? 'descriptive' })
    setTitle('')
    setSavedId(undefined)
    setFavorite(false)
    router.replace('/lab/prompt-builder', { scroll: false })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
      <div className="grid content-start gap-5">
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Formato do prompt">
          {BUILDER_FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={(state.format ?? 'descriptive') === f}
              onClick={() => set('format', f)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm transition-colors',
                (state.format ?? 'descriptive') === f ? 'border-gold-300/40 bg-gold-300/10 text-gold-100' : 'border-border text-mute hover:text-bone',
              )}
            >
              {BUILDER_FORMAT_LABELS[f].label}
            </button>
          ))}
          <span className="text-xs text-mute-600">{BUILDER_FORMAT_LABELS[state.format ?? 'descriptive'].hint}</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {BUILDER_FIELDS.map((field, index) => (
            <div key={field.key} className={cn('grid gap-1.5 rounded-2xl border border-border bg-ink-900/60 p-4', index === 0 && 'md:col-span-2')}>
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={`b-${field.key}`} className="text-[13px] font-medium">
                  <span className="mr-2 font-mono text-[10px] text-gold-300/80">{String(index + 1).padStart(2, '0')}</span>
                  {field.label}
                </label>
                <span className="text-[11px] text-mute-600">{field.hint}</span>
              </div>
              <Input
                id={`b-${field.key}`}
                value={state[field.key] ?? ''}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.placeholder}
                maxLength={400}
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {field.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set(field.key, state[field.key]?.trim() ? `${state[field.key]!.trim()}, ${s}` : s)}
                    className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-mute transition-colors hover:border-gold-300/40 hover:text-gold-100"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="grid gap-1.5 rounded-2xl border border-border bg-ink-900/60 p-4 md:col-span-2">
            <label htmlFor="b-negative" className="text-[13px] font-medium">
              Prompt negativo <span className="font-normal text-mute-600">— o que evitar</span>
            </label>
            <Input id="b-negative" value={state.negative ?? ''} onChange={(e) => set('negative', e.target.value)} placeholder="text, watermark, extra fingers, low contrast" maxLength={1000} />
          </div>
          <div className="grid gap-1.5 rounded-2xl border border-border bg-ink-900/60 p-4 md:col-span-2">
            <label htmlFor="b-parameters" className="text-[13px] font-medium">
              Parâmetros técnicos <span className="font-normal text-mute-600">— específicos da ferramenta</span>
            </label>
            <Input id="b-parameters" value={state.parameters ?? ''} onChange={(e) => set('parameters', e.target.value)} placeholder="--ar 4:5 --style raw --stylize 250" className="font-mono" maxLength={300} />
          </div>
        </div>
      </div>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <div className="overflow-hidden rounded-2xl border border-gold-300/20 bg-ink-900">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="eyebrow !text-[10px]">Prompt final</span>
            <span className="font-mono text-[11px] text-mute-600">
              {filled}/{BUILDER_FIELDS.length} campos
            </span>
          </div>
          <div className="px-4 pt-4">
            <label htmlFor="b-title" className="sr-only">
              Título
            </label>
            <Input id="b-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título para salvar (opcional)" maxLength={140} />
          </div>
          <p className="min-h-40 whitespace-pre-wrap break-words px-4 py-4 font-mono text-[13px] leading-6 text-bone/90" aria-live="polite">
            {finalPrompt || <span className="text-mute-600">Comece pelo assunto. O prompt aparece aqui enquanto você preenche.</span>}
          </p>
          <div className="grid gap-2 border-t border-border p-4">
            <Button variant="primary" size="lg" onClick={copy} disabled={!finalPrompt}>
              {copied ? <Check /> : <Copy />} {copied ? 'Copiado!' : 'Copiar prompt'}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => persist({})} disabled={pending || !finalPrompt}>
                {pending ? <Loader2 className="animate-spin" /> : <Save />} {savedId ? 'Atualizar' : 'Salvar'}
              </Button>
              <Button
                onClick={() => {
                  const next = !favorite
                  setFavorite(next)
                  persist({ isFavorite: next })
                }}
                disabled={pending || !finalPrompt}
                aria-pressed={favorite}
              >
                <Heart className={cn(favorite && 'fill-gold-300 text-gold-300')} /> Favorito
              </Button>
              <Button variant="ghost" onClick={() => persist({ asNew: true })} disabled={pending || !finalPrompt || !savedId}>
                <CopyPlus /> Duplicar
              </Button>
              <Button variant="ghost" onClick={reset}>
                <RotateCcw /> Limpar
              </Button>
            </div>
            {savedId && <p className="text-center text-xs text-mute-600">Salvo em Meu Lab → Meus prompts</p>}
          </div>
        </div>
        <p className="mt-3 px-1 text-xs leading-relaxed text-mute-600">
          O Builder monta o prompt a partir dos seus campos — sem IA externa. Melhoria automática com IA está planejada como
          recurso futuro.
        </p>
      </aside>
    </div>
  )
}

