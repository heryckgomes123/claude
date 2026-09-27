import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { SignInForm } from '@/features/auth-forms'
import { getViewer } from '@/server/auth/viewer'
import { emailEnabled } from '@/server/env'

export const metadata: Metadata = { title: 'Entrar' }

export default async function SignInPage({ searchParams }: PageProps<'/entrar'>) {
  const viewer = await getViewer()
  if (viewer) redirect(viewer.hasLabAccess ? '/lab' : '/acesso')
  const { senha } = await searchParams
  return (
    <div className="animate-fade-up">
      <p className="eyebrow">Área de membros</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Entrar no Lab</h1>
      <p className="mt-2 text-sm text-mute">Seus prompts, aulas e ferramentas estão esperando.</p>
      {senha === 'nova' && (
        <p role="status" className="mt-6 rounded-xl border border-success/25 bg-success/10 px-3.5 py-2.5 text-sm text-success">
          Senha alterada. Entre com a nova senha.
        </p>
      )}
      <div className="mt-8 rounded-2xl border border-border bg-ink-900/70 p-6">
        <Suspense>
          <SignInForm canResetPassword={emailEnabled()} />
        </Suspense>
      </div>
    </div>
  )
}
