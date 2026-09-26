'use client'
import { Check, Copy, Heart, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { copyToClipboard } from '@/components/lab/copy-button'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  createCollection,
  deleteCollection,
  deleteUserPrompt,
  saveUserPrompt,
  setCollectionItem,
  toggleUserPromptFavorite,
  updateCollection,
} from '@/server/actions/lab'

export function NewCollectionButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await createCollection({ name: String(form.get('name') ?? ''), description: String(form.get('description') ?? '') })
      if (!result.ok) {
        setError(result.fieldErrors?.name ?? result.error)
        return
      }
      setOpen(false)
      toast.success('Coleção criada')
      router.push(`/lab/my-lab/collections/${result.data.id}`)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary">
          <Plus /> Nova coleção
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Nova coleção</DialogTitle>
        <DialogDescription>Ex.: “Prompts para clientes”, “Vídeos para TikTok”, “Publicidade”.</DialogDescription>
        <form onSubmit={onSubmit} className="mt-5 grid gap-4">
          <Field label="Nome" htmlFor="c-name" error={error}>
            <Input id="c-name" name="name" required maxLength={80} autoFocus aria-invalid={Boolean(error)} />
          </Field>
          <Field label="Descrição" htmlFor="c-desc" optional>
            <Textarea id="c-desc" name="description" maxLength={280} className="min-h-20" />
          </Field>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} Criar coleção
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CollectionActions({ id, name, description }: { id: string; name: string; description: string | null }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await updateCollection({ id, name: String(form.get('name') ?? ''), description: String(form.get('description') ?? '') })
      if (!result.ok) return setError(result.fieldErrors?.name ?? result.error)
      setOpen(false)
      toast.success('Coleção atualizada')
    })
  }

  return (
    <div className="flex gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary">
            <Pencil /> Editar
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Editar coleção</DialogTitle>
          <form onSubmit={onSubmit} className="mt-5 grid gap-4">
            <Field label="Nome" htmlFor="e-name" error={error}>
              <Input id="e-name" name="name" defaultValue={name} required maxLength={80} />
            </Field>
            <Field label="Descrição" htmlFor="e-desc" optional>
              <Textarea id="e-desc" name="description" defaultValue={description ?? ''} maxLength={280} className="min-h-20" />
            </Field>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Salvar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmButton
        label="Excluir"
        title="Excluir esta coleção?"
        description="Os conteúdos continuam no Lab e nos seus favoritos — só a coleção é removida."
        onConfirm={async () => {
          const result = await deleteCollection(id)
          if (result && !result.ok) toast.error(result.error)
        }}
      />
    </div>
  )
}

export function RemoveFromCollection({ collectionId, contentId, userPromptId }: { collectionId: string; contentId?: string; userPromptId?: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setCollectionItem({ collectionId, contentId, userPromptId, include: false })
          if (!result.ok) toast.error(result.error)
          else toast.success('Removido da coleção')
        })
      }
      className="relative z-10 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-mute transition-colors hover:bg-danger/10 hover:text-danger"
    >
      {pending ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />} Remover
    </button>
  )
}

export function ConfirmButton({
  label,
  title,
  description,
  onConfirm,
  variant = 'danger',
  size = 'md',
}: {
  label: string
  title: string
  description?: string
  onConfirm: () => Promise<void>
  variant?: 'danger' | 'ghost'
  size?: 'sm' | 'md'
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Trash2 /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await onConfirm()
                setOpen(false)
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />} {label}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function UserPromptEditor({
  prompt,
}: {
  prompt: { id: string; title: string; body: string; negativePrompt: string | null; notes: string | null; isFavorite: boolean }
}) {
  const [values, setValues] = useState({
    title: prompt.title,
    body: prompt.body,
    negativePrompt: prompt.negativePrompt ?? '',
    notes: prompt.notes ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [favorite, setFavorite] = useState(prompt.isFavorite)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()
  const dirty =
    values.title !== prompt.title ||
    values.body !== prompt.body ||
    values.negativePrompt !== (prompt.negativePrompt ?? '') ||
    values.notes !== (prompt.notes ?? '')

  function save(event: React.FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      const result = await saveUserPrompt({ id: prompt.id, ...values })
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {})
        toast.error(result.error)
        return
      }
      setErrors({})
      toast.success('Prompt salvo')
    })
  }

  return (
    <form onSubmit={save} className="grid gap-5">
      <Field label="Título" htmlFor="p-title" error={errors.title}>
        <Input id="p-title" value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} maxLength={140} required />
      </Field>
      <Field label="Prompt" htmlFor="p-body" error={errors.body} hint="Edite livremente. Variáveis {{assim}} continuam funcionando como marcadores.">
        <Textarea
          id="p-body"
          value={values.body}
          onChange={(e) => setValues({ ...values, body: e.target.value })}
          className="min-h-56 font-mono text-[13px] leading-6"
          maxLength={8000}
          required
        />
      </Field>
      <Field label="Prompt negativo" htmlFor="p-neg" optional error={errors.negativePrompt}>
        <Textarea id="p-neg" value={values.negativePrompt} onChange={(e) => setValues({ ...values, negativePrompt: e.target.value })} className="min-h-20 font-mono text-[13px]" maxLength={2000} />
      </Field>
      <Field label="Notas" htmlFor="p-notes" optional hint="O que funcionou, para qual cliente, qual ferramenta…">
        <Textarea id="p-notes" value={values.notes} onChange={(e) => setValues({ ...values, notes: e.target.value })} maxLength={4000} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={pending || !dirty}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} {dirty ? 'Salvar alterações' : 'Salvo'}
        </Button>
        <Button
          type="button"
          onClick={async () => {
            if (await copyToClipboard(values.body)) {
              setCopied(true)
              toast.success('Prompt copiado')
              window.setTimeout(() => setCopied(false), 2000)
            }
          }}
        >
          {copied ? <Check /> : <Copy />} Copiar
        </Button>
        <Button
          type="button"
          aria-pressed={favorite}
          onClick={() =>
            startTransition(async () => {
              const result = await toggleUserPromptFavorite(prompt.id)
              if (result.ok) setFavorite(result.data.favorited)
              else toast.error(result.error)
            })
          }
        >
          <Heart className={cn(favorite && 'fill-gold-300 text-gold-300')} /> {favorite ? 'Favorito' : 'Favoritar'}
        </Button>
        <div className="ml-auto">
          <ConfirmButton
            label="Excluir"
            variant="ghost"
            title="Excluir este prompt?"
            description="Esta ação não pode ser desfeita."
            onConfirm={async () => {
              const result = await deleteUserPrompt(prompt.id)
              if (result && !result.ok) toast.error(result.error)
            }}
          />
        </div>
      </div>
    </form>
  )
}
