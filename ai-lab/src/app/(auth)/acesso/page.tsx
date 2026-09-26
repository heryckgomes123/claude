import { KeyRound } from 'lucide-react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { RedeemCodeForm, SignOutButton } from '@/features/auth-forms'
import { requireUser } from '@/server/auth/viewer'

export const metadata: Metadata = { title: 'Ativar acesso' }

export default async function AccessPage() {
  const viewer = await requireUser()
  if (viewer.hasLabAccess) redirect('/lab')
  return (
    <div className="animate-fade-up">
      <div className="grid size-12 place-items-center rounded-2xl border border-gold-300/25 bg-gold-300/10">
        <KeyRound className="size-5 text-gold-300" aria-hidden />
      </div>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">Ative seu acesso ao Lab</h1>
      <p className="mt-2 text-sm leading-relaxed text-mute">
        Olá, {viewer.name.split(' ')[0]}. Sua conta está criada, mas ainda não há um plano ativo vinculado a ela. Digite o
        código de acesso recebido após a compra.
      </p>
      <div className="mt-8 rounded-2xl border border-border bg-ink-900/70 p-6">
        <RedeemCodeForm />
      </div>
      <div className="mt-6 flex items-center justify-between text-sm text-mute">
        <span>Conectado como {viewer.email}</span>
        <SignOutButton />
      </div>
    </div>
  )
}
