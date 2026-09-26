'use client'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

/** Captura falhas em layouts internos (ex.: banco indisponível ao validar a sessão do Lab). */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <main id="conteudo" className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-warning/10">
          <TriangleAlert className="size-5 text-warning" aria-hidden />
        </span>
        <h1 className="mt-5 text-xl font-semibold">O Lab está temporariamente indisponível</h1>
        <p className="mt-2 text-sm text-mute">
          Não conseguimos carregar seus dados agora. Tente novamente em instantes.
          {error.digest ? ` (ref. ${error.digest})` : ''}
        </p>
        <Button variant="primary" className="mt-6" onClick={reset}>
          <RotateCcw /> Tentar novamente
        </Button>
      </div>
    </main>
  )
}
