import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { SignUpForm } from '@/features/auth-forms'
import { getViewer } from '@/server/auth/viewer'

export const metadata: Metadata = { title: 'Criar conta' }

export default async function SignUpPage() {
  const viewer = await getViewer()
  if (viewer) redirect(viewer.hasLabAccess ? '/lab' : '/acesso')
  return (
    <div className="animate-fade-up">
      <p className="eyebrow">Primeiro acesso</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Crie sua conta</h1>
      <p className="mt-2 text-sm leading-relaxed text-mute">
        Comprou o INTELRA AI LAB? Crie sua conta com o <strong className="font-medium text-bone">mesmo e-mail da compra</strong>{' '}
        e o acesso abre na hora.
      </p>
      <div className="mt-8 rounded-2xl border border-border bg-ink-900/70 p-6">
        <Suspense>
          <SignUpForm />
        </Suspense>
      </div>
    </div>
  )
}
