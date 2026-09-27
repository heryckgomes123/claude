import { ArrowRight, LifeBuoy, LockKeyhole, RotateCcw } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SignOutButton } from '@/features/auth-forms'
import { requireUser } from '@/server/auth/viewer'
import { getSettings } from '@/server/settings'

export const metadata: Metadata = { title: 'Liberar acesso' }

export default async function AccessPage() {
  const viewer = await requireUser()
  if (viewer.hasLabAccess) redirect('/lab')
  const { checkoutUrl, supportUrl } = await getSettings()
  return (
    <div className="animate-fade-up">
      <div className="grid size-12 place-items-center rounded-2xl border border-gold-300/25 bg-gold-300/10">
        <LockKeyhole className="size-5 text-gold-300" aria-hidden />
      </div>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">Seu acesso ainda não está liberado</h1>
      <p className="mt-3 text-sm leading-relaxed text-mute">
        Olá, {viewer.name.split(' ')[0]}. Não encontramos uma compra para <strong className="font-medium text-bone">{viewer.email}</strong>.
      </p>
      <ul className="mt-6 grid gap-3 rounded-2xl border border-border bg-ink-900/70 p-5 text-sm leading-relaxed text-mute">
        <li>
          <strong className="font-medium text-bone">Acabou de comprar?</strong> A liberação é automática e costuma levar alguns
          minutos após a aprovação do pagamento (boleto pode levar até 3 dias úteis).
        </li>
        <li>
          <strong className="font-medium text-bone">Comprou com outro e-mail?</strong> Saia e crie a conta com o e-mail usado na compra.
        </li>
      </ul>
      <div className="mt-6 flex flex-wrap gap-2">
        {checkoutUrl && (
          <Button asChild variant="primary" size="lg">
            <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
              Comprar acesso <ArrowRight />
            </a>
          </Button>
        )}
        <Button asChild variant="secondary" size="lg">
          <Link href="/acesso">
            <RotateCcw /> Verificar de novo
          </Link>
        </Button>
        {supportUrl && (
          <Button asChild variant="ghost" size="lg">
            <a href={supportUrl} target="_blank" rel="noopener noreferrer">
              <LifeBuoy /> Suporte
            </a>
          </Button>
        )}
      </div>
      <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5 text-sm text-mute">
        <span className="truncate">Conectado como {viewer.email}</span>
        <SignOutButton />
      </div>
    </div>
  )
}
