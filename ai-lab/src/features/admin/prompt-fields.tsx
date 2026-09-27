import { PromptCover } from '@/components/lab/cover'
import { Checkbox, Field, Input, Label, Textarea } from '@/components/ui/input'

type PromptValues = {
  id?: string
  slug?: string
  title?: string
  category?: string
  description?: string
  body?: string
  negative?: string | null
  tips?: string[]
  tools?: string | null
  imageId?: string | null
  published?: boolean
  position?: number
}

/** Campos do formulário de prompt (usado em "novo" e "editar"). */
export function PromptFields({ prompt = {}, categories }: { prompt?: PromptValues; categories: string[] }) {
  return (
    <>
      {prompt.id && <input type="hidden" name="id" value={prompt.id} />}
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Título" htmlFor="title" className="md:col-span-2">
          <Input id="title" name="title" required maxLength={160} defaultValue={prompt.title} placeholder="Ex.: Foto de produto em estúdio" />
        </Field>
        <Field label="Categoria" htmlFor="category" hint="Escolha uma existente ou digite uma nova.">
          <Input id="category" name="category" required maxLength={60} list="categorias" defaultValue={prompt.category} />
          <datalist id="categorias">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Onde usar" htmlFor="tools" optional hint="Ex.: Midjourney · ChatGPT">
          <Input id="tools" name="tools" maxLength={160} defaultValue={prompt.tools ?? ''} />
        </Field>
        <Field label="Descrição curta" htmlFor="description" optional className="md:col-span-2">
          <Textarea id="description" name="description" maxLength={600} rows={2} defaultValue={prompt.description} />
        </Field>
        <Field
          label="Texto do prompt"
          htmlFor="body"
          className="md:col-span-2"
          hint={
            <>
              Partes que o aluno pode trocar: <code className="text-gold-200">{'{{produto}}'}</code> ou, com exemplo,{' '}
              <code className="text-gold-200">{'{{cor|dourado}}'}</code>.
            </>
          }
        >
          <Textarea id="body" name="body" required maxLength={8000} rows={8} className="font-mono text-[13px]" defaultValue={prompt.body} />
        </Field>
        <Field label="Prompt negativo" htmlFor="negative" optional className="md:col-span-2">
          <Textarea id="negative" name="negative" maxLength={2000} rows={2} className="font-mono text-[13px]" defaultValue={prompt.negative ?? ''} />
        </Field>
        <Field label="Dicas de uso" htmlFor="tips" optional hint="Uma dica por linha." className="md:col-span-2">
          <Textarea id="tips" name="tips" maxLength={3000} rows={4} defaultValue={(prompt.tips ?? []).join('\n')} />
        </Field>

        <div className="grid gap-3 md:col-span-2">
          <Label htmlFor="image">Imagem de exemplo (opcional)</Label>
          <div className="flex flex-wrap items-start gap-4">
            {prompt.imageId && (
              <div className="grid gap-2">
                <PromptCover seed={prompt.slug ?? ''} imageId={prompt.imageId} className="aspect-[16/10] w-48 rounded-xl border border-border" />
                <label className="flex items-center gap-2 text-sm text-mute">
                  <Checkbox name="removeImage" /> Remover imagem
                </label>
              </div>
            )}
            <div className="grid gap-1.5">
              <input
                id="image"
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="text-sm text-mute file:mr-3 file:rounded-full file:border file:border-input file:bg-ink-800 file:px-4 file:py-2 file:text-sm file:text-bone hover:file:bg-ink-750"
              />
              <p className="text-xs text-mute-600">JPG, PNG, WEBP ou GIF até 3 MB. {prompt.imageId && 'Enviar outra substitui a atual.'}</p>
            </div>
          </div>
        </div>

        <Field label="Ordem" htmlFor="position" hint="Menor aparece primeiro.">
          <Input id="position" name="position" type="number" min={0} max={100000} defaultValue={prompt.position ?? 0} />
        </Field>
        <label className="flex items-center gap-3 self-center pt-5 text-sm">
          <Checkbox name="published" defaultChecked={prompt.published ?? true} /> Publicado (visível para os alunos)
        </label>
      </div>
    </>
  )
}
