import { SearchX } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/lab/page-header'
import { Button } from '@/components/ui/button'

export default function LabNotFound() {
  return (
    <EmptyState
      icon={<SearchX className="size-5" />}
      title="Não encontramos este conteúdo"
      description="Ele pode ter sido removido ou o link está incorreto."
      action={
        <Button asChild variant="secondary">
          <Link href="/lab">Voltar ao início</Link>
        </Button>
      }
    />
  )
}
