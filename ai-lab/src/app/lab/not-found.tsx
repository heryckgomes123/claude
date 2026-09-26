import { SearchX } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/lab/page-header'
import { Button } from '@/components/ui/button'

export default function LabNotFound() {
  return (
    <EmptyState
      icon={<SearchX className="size-5" />}
      title="Conteúdo não encontrado"
      description="Ele pode ter sido removido, renomeado ou ainda não foi publicado."
      action={
        <div className="flex gap-2">
          <Button asChild variant="primary">
            <Link href="/lab/explore">Explorar o Lab</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/lab/search">Buscar</Link>
          </Button>
        </div>
      }
    />
  )
}
