'use client'
import { Check, Copy, CopyPlus, Loader2, RotateCcw, Shuffle } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { copyToClipboard } from '@/components/lab/copy-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fillVariables, segmentPrompt } from '@/lib/prompt-variables'
import { cn } from '@/lib/utils'
import { createPromptFromContent, recordCopy } from '@/server/actions/lab'

type Variable = { key: string; label: string; placeholder: string | null; defaultValue: string | null; description: string | null }

export function PromptWorkbench({
  contentId,
  body,
  negativePrompt,
  variables,
  canSave,
}: {
  contentId: string
  body: string
  negativePrompt: string | null
  variables: Variable[]
  canSave: boolean
}) {
  const initialValues = useMemo(
    () => Object.fromEntries(variables.map((v) => [v.key, v.defaultValue ?? ''])),
    [variables],
  )
  const [values, setValues] = useState<Record<string, string>>(initialValues)
  const [copied, setCopied] = useState<'prompt' | 'negative' | null>(null)
  const [pending, startTransition] = useTransition()
  const segments = segmentPrompt(body, values)
  const missing = variables.filter((v) => !values[v.key]?.trim())

  async function copy(kind: 'prompt' | 'negative') {
    const text = kind === 'prompt' ? fillVariables(body, values) : (negativePrompt ?? '')
    if (!(await copyToClipboard(text))) {
      toast.error('Não foi possível copiar. Selecione o texto manualmente.')
      return
    }
    setCopied(kind)
    window.setTimeout(() => setCopied(null), 2200)
    if (kind === 'prompt') {
      void recordCopy(contentId)
      toast.success('Prompt copiado', {
        description: missing.length ? `${missing.length} variável(is) sem valor ficaram como {{…}}.` : 'Cole na ferramenta indicada.',
      })
    }
  }

  function fromContent(mode: 'remix' | 'duplicate') {
    startTransition(async () => {
      const result = await createPromptFromContent({ contentId, mode, variables: values })
      if (result && !result.ok) toast.error(result.error)
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="order-2 grid gap-4 lg:order-1">
        <div className="relative overflow-hidden rounded-2xl border border-gold-300/20 bg-ink-900">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="eyebrow !text-[10px]">Prompt</span>
            <span className="font-mono text-[11px] text-mute-600">{fillVariables(body, values).length} caracteres</span>
          </div>
          <p className="whitespace-pre-wrap break-words px-4 py-5 font-mono text-[13.5px] leading-7 text-bone/90 md:px-6" aria-live="polite">
            {segments.map((s, i) =>
              s.kind === 'text' ? (
                <span key={i}>{s.value}</span>
              ) : (
                <mark
                  key={i}
                  className={cn(
                    'rounded px-1 py-0.5 transition-colors',
                    s.value ? 'bg-gold-300/15 text-gold-100' : 'bg-electric/10 text-electric ring-1 ring-electric/30',
                  )}
                >
                  {s.value ?? `{{${s.key}}}`}
                </mark>
              ),
            )}
          </p>
          <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-border bg-ink-900/95 p-3 backdrop-blur md:p-4">
            <Button variant="primary" size="lg" onClick={() => copy('prompt')} className="flex-1 sm:flex-none" aria-live="polite">
              {copied === 'prompt' ? <Check /> : <Copy />}
              {copied === 'prompt' ? 'Copiado!' : 'Copiar prompt'}
            </Button>
            {canSave && (
              <>
                <Button variant="secondary" size="lg" onClick={() => fromContent('remix')} disabled={pending}>
                  {pending ? <Loader2 className="animate-spin" /> : <Shuffle />} Remix
                </Button>
                <Button variant="ghost" size="lg" onClick={() => fromContent('duplicate')} disabled={pending}>
                  <CopyPlus /> Duplicar
                </Button>
              </>
            )}
          </div>
        </div>

        {negativePrompt && (
          <div className="rounded-2xl border border-border bg-ink-900/60">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="eyebrow !text-[10px]">Prompt negativo</span>
              <Button variant="ghost" size="sm" onClick={() => copy('negative')}>
                {copied === 'negative' ? <Check className="text-success" /> : <Copy />}
                {copied === 'negative' ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
            <p className="px-4 py-4 font-mono text-[13px] leading-6 text-mute md:px-6">{negativePrompt}</p>
          </div>
        )}
      </div>

      <aside className="order-1 lg:order-2">
        <div className="rounded-2xl border border-border bg-ink-900/60 p-5 lg:sticky lg:top-6">
          <div className="flex items-center justify-between">
            <h2 className="eyebrow">Variáveis</h2>
            {variables.length > 0 && (
              <button
                type="button"
                onClick={() => setValues(initialValues)}
                className="inline-flex items-center gap-1 text-xs text-mute hover:text-bone"
              >
                <RotateCcw className="size-3" /> Restaurar
              </button>
            )}
          </div>
          {variables.length === 0 ? (
            <p className="mt-3 text-sm text-mute">Este prompt não tem variáveis — é só copiar.</p>
          ) : (
            <div className="mt-4 grid gap-4">
              <p className="text-xs leading-relaxed text-mute-600">
                Preencha para adaptar ao seu projeto. A pré-visualização atualiza enquanto você digita.
              </p>
              {variables.map((v) => (
                <div key={v.key} className="grid gap-1.5">
                  <label htmlFor={`var-${v.key}`} className="text-[13px] font-medium">
                    {v.label}
                  </label>
                  <Input
                    id={`var-${v.key}`}
                    value={values[v.key] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [v.key]: e.target.value }))}
                    placeholder={v.placeholder ?? ''}
                    maxLength={500}
                  />
                  {v.description && <p className="text-xs text-mute-600">{v.description}</p>}
                </div>
              ))}
              <p className="text-xs text-mute-600">Dica: descrições em inglês funcionam melhor nos modelos de imagem e vídeo.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
