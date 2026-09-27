'use client'
import { useState } from 'react'
import { CopyButton } from '@/components/lab/copy-button'
import { Field, Input } from '@/components/ui/input'
import { extractVariables, fillVariables, segmentPrompt } from '@/lib/prompt-variables'

/** Personalização dos campos {{…}}, pré-visualização e botões de copiar. */
export function PromptWorkbench({ promptId, body, negative }: { promptId: string; body: string; negative: string | null }) {
  const variables = extractVariables(body)
  const [values, setValues] = useState<Record<string, string>>({})
  const segments = segmentPrompt(body, values)

  return (
    <div className="grid gap-5">
      {variables.length > 0 && (
        <section className="rounded-2xl border border-border bg-ink-900/70 p-5" aria-labelledby="personalize">
          <h2 id="personalize" className="eyebrow">
            Personalize (opcional)
          </h2>
          <p className="mt-1.5 text-sm text-mute">Troque os campos destacados pelo seu caso. Em branco, fica o exemplo.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {variables.map((v) => (
              <Field key={v.key} label={v.label} htmlFor={`var-${v.key}`}>
                <Input
                  id={`var-${v.key}`}
                  value={values[v.key] ?? ''}
                  placeholder={v.defaultValue || 'Digite aqui'}
                  onChange={(e) => setValues((current) => ({ ...current, [v.key]: e.target.value }))}
                  maxLength={300}
                />
              </Field>
            ))}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-gold-300/20 bg-ink-900" aria-labelledby="prompt-text">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
          <h2 id="prompt-text" className="eyebrow">
            Prompt
          </h2>
          <span className="text-xs text-mute-600">Cole na ferramenta de IA</span>
        </div>
        <p className="whitespace-pre-wrap break-words px-5 py-5 font-mono text-[13.5px] leading-relaxed text-bone/90">
          {segments.map((s, i) =>
            s.kind === 'text' ? (
              s.value
            ) : (
              <mark
                key={i}
                className={
                  s.filled
                    ? 'rounded bg-gold-300/15 px-1 text-gold-200'
                    : 'rounded border border-dashed border-gold-300/40 bg-transparent px-1 text-gold-300/80'
                }
              >
                {s.value}
              </mark>
            ),
          )}
        </p>
        <div className="flex flex-wrap gap-2 border-t border-border px-5 py-4">
          <CopyButton text={() => fillVariables(body, values)} promptId={promptId} label="Copiar prompt" variant="primary" size="lg" />
          {negative && (
            <CopyButton
              text={negative}
              label="Copiar prompt negativo"
              toastMessage="Prompt negativo copiado."
              size="lg"
            />
          )}
        </div>
      </section>

      {negative && (
        <details className="rounded-2xl border border-border bg-ink-900/50 px-5 py-4 text-sm">
          <summary className="cursor-pointer text-mute hover:text-bone">Ver prompt negativo</summary>
          <p className="mt-3 break-words font-mono text-[13px] leading-relaxed text-mute">{negative}</p>
        </details>
      )}
    </div>
  )
}
