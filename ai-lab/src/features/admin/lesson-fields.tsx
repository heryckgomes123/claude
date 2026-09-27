import { Checkbox, Field, Input, Label, Textarea } from '@/components/ui/input'

type LessonValues = {
  id?: string
  title?: string
  module?: string
  summary?: string
  videoUrl?: string | null
  content?: string
  materialUrl?: string | null
  durationMin?: number | null
  published?: boolean
  position?: number
  promptIds?: string[]
}

export function LessonFields({
  lesson = {},
  modules,
  prompts,
}: {
  lesson?: LessonValues
  modules: string[]
  prompts: { id: string; title: string; category: string }[]
}) {
  const selected = new Set(lesson.promptIds ?? [])
  return (
    <>
      {lesson.id && <input type="hidden" name="id" value={lesson.id} />}
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Título da aula" htmlFor="title" className="md:col-span-2">
          <Input id="title" name="title" required maxLength={160} defaultValue={lesson.title} />
        </Field>
        <Field label="Módulo" htmlFor="module" hint="Aulas do mesmo módulo aparecem juntas.">
          <Input id="module" name="module" required maxLength={80} list="modulos" defaultValue={lesson.module} placeholder="Ex.: Fundamentos" />
          <datalist id="modulos">
            {modules.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </Field>
        <Field label="Duração (minutos)" htmlFor="durationMin" optional>
          <Input id="durationMin" name="durationMin" type="number" min={1} max={600} defaultValue={lesson.durationMin ?? ''} />
        </Field>
        <Field label="Resumo" htmlFor="summary" optional className="md:col-span-2">
          <Textarea id="summary" name="summary" maxLength={400} rows={2} defaultValue={lesson.summary} />
        </Field>
        <Field
          label="Link do vídeo"
          htmlFor="videoUrl"
          optional
          className="md:col-span-2"
          hint="YouTube (pode ser “não listado”), Vimeo ou Panda Video — o player aparece na aula."
        >
          <Input id="videoUrl" name="videoUrl" type="url" maxLength={2000} defaultValue={lesson.videoUrl ?? ''} placeholder="https://youtu.be/…" />
        </Field>
        <Field
          label="Texto da aula"
          htmlFor="content"
          optional
          className="md:col-span-2"
          hint="Linhas começando com “## ” viram títulos; com “• ” ou “- ” viram lista."
        >
          <Textarea id="content" name="content" maxLength={30000} rows={12} defaultValue={lesson.content} />
        </Field>
        <Field label="Material de apoio (link)" htmlFor="materialUrl" optional className="md:col-span-2" hint="PDF, Google Drive, Notion…">
          <Input id="materialUrl" name="materialUrl" type="url" maxLength={2000} defaultValue={lesson.materialUrl ?? ''} placeholder="https://…" />
        </Field>

        {prompts.length > 0 && (
          <fieldset className="grid gap-2 md:col-span-2">
            <legend className="mb-2 text-[13px] font-medium text-bone/90">
              Prompts usados nesta aula <span className="font-normal text-mute-600">opcional</span>
            </legend>
            <div className="grid max-h-64 gap-1 overflow-y-auto rounded-xl border border-border bg-ink-900/60 p-3 sm:grid-cols-2">
              {prompts.map((p) => (
                <Label key={p.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 font-normal hover:bg-bone/[0.03]">
                  <Checkbox name="promptIds" value={p.id} defaultChecked={selected.has(p.id)} />
                  <span className="min-w-0 truncate">{p.title}</span>
                  <span className="ml-auto shrink-0 text-xs text-mute-600">{p.category}</span>
                </Label>
              ))}
            </div>
          </fieldset>
        )}

        <Field label="Ordem" htmlFor="position" hint="Menor aparece primeiro.">
          <Input id="position" name="position" type="number" min={0} max={100000} defaultValue={lesson.position ?? 0} />
        </Field>
        <label className="flex items-center gap-3 self-center pt-5 text-sm">
          <Checkbox name="published" defaultChecked={lesson.published ?? true} /> Publicada (visível para os alunos)
        </label>
      </div>
    </>
  )
}
