'use client'
import { Archive, Eye, EyeOff, MoreHorizontal, Pencil, Send, Star } from 'lucide-react'
import Link from 'next/link'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { contentHref, type ContentStatus, type ContentType } from '@/lib/labels'
import { setContentStatus, toggleFeatured } from '@/server/actions/admin'

export function ContentRowActions({
  id,
  type,
  slug,
  status,
  featured,
  title,
}: {
  id: string
  type: ContentType
  slug: string
  status: ContentStatus
  featured: boolean
  title: string
}) {
  const [pending, startTransition] = useTransition()
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    startTransition(async () => {
      const result = await fn()
      if (!result.ok) toast.error(result.error)
      else if (result.message) toast.success(result.message)
    })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" disabled={pending} aria-label={`Ações para ${title}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/admin/content/${id}`}>
            <Pencil /> Editar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={contentHref(type, slug)} target="_blank">
            <Eye /> Pré-visualizar no Lab
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {status !== 'PUBLISHED' && (
          <DropdownMenuItem onSelect={() => run(() => setContentStatus(id, 'PUBLISHED'))}>
            <Send /> Publicar
          </DropdownMenuItem>
        )}
        {status === 'PUBLISHED' && (
          <DropdownMenuItem onSelect={() => run(() => setContentStatus(id, 'DRAFT'))}>
            <EyeOff /> Despublicar (rascunho)
          </DropdownMenuItem>
        )}
        {status !== 'REVIEW' && (
          <DropdownMenuItem onSelect={() => run(() => setContentStatus(id, 'REVIEW'))}>
            <Eye /> Enviar para revisão
          </DropdownMenuItem>
        )}
        {status !== 'ARCHIVED' && (
          <DropdownMenuItem onSelect={() => run(() => setContentStatus(id, 'ARCHIVED'))}>
            <Archive /> Arquivar
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => run(() => toggleFeatured(id).then((r) => ({ ...r, message: r.ok ? (r.data.featured ? 'Em destaque' : 'Destaque removido') : undefined })))}>
          <Star /> {featured ? 'Remover destaque' : 'Destacar'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
