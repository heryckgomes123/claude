import { Checkbox, Field, Input, Textarea } from '@/components/ui/input'

type ToolValues = {
  id?: string
  name?: string
  category?: string
  description?: string
  url?: string
  howTo?: string | null
  published?: boolean
  position?: number
}

export function ToolFields({ tool = {}, categories }: { tool?: ToolValues; categories: string[] }) {
  return (
    <>
      {tool.id && <input type="hidden" name="id" value={tool.id} />}
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Nome" htmlFor="name">
          <Input id="name" name="name" required maxLength={80} defaultValue={tool.name} placeholder="Ex.: Midjourney" />
        </Field>
        <Field label="Categoria" htmlFor="category">
          <Input id="category" name="category" required maxLength={60} list="tool-categorias" defaultValue={tool.category} placeholder="Ex.: Imagem" />
          <datalist id="tool-categorias">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Link" htmlFor="url" className="md:col-span-2">
          <Input id="url" name="url" type="url" required maxLength={2000} defaultValue={tool.url} placeholder="https://…" />
        </Field>
        <Field label="Para que serve" htmlFor="description" optional className="md:col-span-2">
          <Textarea id="description" name="description" maxLength={600} rows={2} defaultValue={tool.description} />
        </Field>
        <Field label="Como usar no método" htmlFor="howTo" optional className="md:col-span-2">
          <Textarea id="howTo" name="howTo" maxLength={1000} rows={3} defaultValue={tool.howTo ?? ''} />
        </Field>
        <Field label="Ordem" htmlFor="position" hint="Menor aparece primeiro.">
          <Input id="position" name="position" type="number" min={0} max={100000} defaultValue={tool.position ?? 0} />
        </Field>
        <label className="flex items-center gap-3 self-center pt-5 text-sm">
          <Checkbox name="published" defaultChecked={tool.published ?? true} /> Publicada (visível para os alunos)
        </label>
      </div>
    </>
  )
}
