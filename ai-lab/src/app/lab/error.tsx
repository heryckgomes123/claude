'use client'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import { useEffect } from 'react'
import { EmptyState } from '@/components/lab/page-header'
import { Button } from '@/components/ui/button'

export default function LabError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <EmptyState
      icon={<TriangleAlert className="size-5" />}
      title="Algo não carregou como deveria"
      description={`Pode ser uma instabilidade momentânea. Tente de novo.${error.digest ? ` (ref. ${error.digest})` : ''}`}
      action={
        <Button variant="primary" onClick={reset}>
          <RotateCcw /> Tentar novamente
        </Button>
      }
    />
  )
}
