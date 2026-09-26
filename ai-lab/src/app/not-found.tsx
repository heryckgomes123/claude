import Link from 'next/link'
import { LabLogo } from '@/components/lab/logo'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main id="conteudo" className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <LabLogo className="justify-center" />
        <p className="display mt-10 text-7xl text-gold">404</p>
        <h1 className="mt-4 text-xl font-semibold">Não encontramos esta página</h1>
        <p className="mt-2 text-sm text-mute">O link pode estar incorreto ou o conteúdo não está mais disponível.</p>
        <div className="mt-8 flex justify-center gap-2">
          <Button asChild variant="primary">
            <Link href="/lab">Ir para o Lab</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/lab/search">Buscar</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
