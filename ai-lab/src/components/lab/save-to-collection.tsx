'use client'
import { FolderPlus, Loader2, Plus } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createCollection, setCollectionItem } from '@/server/actions/lab'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Checkbox, Input } from '../ui/input'

type CollectionOption = { id: string; name: string; included: boolean }

export function SaveToCollection({
  target,
  collections: initial,
  size = 'md',
}: {
  target: { contentId?: string; userPromptId?: string }
  collections: CollectionOption[]
  size?: 'sm' | 'md'
}) {
  const [collections, setCollections] = useState(initial)
  const [name, setName] = useState('')
  const [pending, startTransition] = useTransition()
  const count = collections.filter((c) => c.included).length

  function toggle(collection: CollectionOption) {
    const include = !collection.included
    setCollections((list) => list.map((c) => (c.id === collection.id ? { ...c, included: include } : c)))
    startTransition(async () => {
      const result = await setCollectionItem({ collectionId: collection.id, ...target, include })
      if (!result.ok) {
        toast.error(result.error)
        setCollections((list) => list.map((c) => (c.id === collection.id ? { ...c, included: !include } : c)))
      } else toast.success(result.message, { description: collection.name })
    })
  }

  function create(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    startTransition(async () => {
      const created = await createCollection({ name: trimmed })
      if (!created.ok) {
        toast.error(created.error)
        return
      }
      const added = await setCollectionItem({ collectionId: created.data.id, ...target, include: true })
      setCollections((list) => [{ id: created.data.id, name: created.data.name, included: added.ok }, ...list])
      setName('')
      toast.success('Coleção criada', { description: `Salvo em “${created.data.name}”` })
    })
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size={size === 'sm' ? 'sm' : 'md'}>
          <FolderPlus /> {count ? `Em ${count} ${count === 1 ? 'coleção' : 'coleções'}` : 'Salvar em coleção'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Salvar em coleção</DialogTitle>
        <DialogDescription>Organize por cliente, projeto ou formato.</DialogDescription>
        <form onSubmit={create} className="mt-5 flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nova coleção — ex.: Vídeos para TikTok"
            maxLength={80}
            aria-label="Nome da nova coleção"
          />
          <Button type="submit" variant="primary" disabled={pending || !name.trim()} aria-label="Criar coleção">
            {pending ? <Loader2 className="animate-spin" /> : <Plus />}
          </Button>
        </form>
        <ul className="mt-4 grid max-h-72 gap-1 overflow-y-auto">
          {collections.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-bone/[0.04]">
                <Checkbox checked={c.included} onChange={() => toggle(c)} disabled={pending} />
                <span className="text-sm">{c.name}</span>
              </label>
            </li>
          ))}
          {collections.length === 0 && (
            <li className="px-3 py-4 text-sm text-mute">Você ainda não tem coleções. Crie a primeira acima.</li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
