import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { SignInForm } from '@/features/auth-forms'
import { getViewer } from '@/server/auth/viewer'

export const metadata: Metadata = { title: 'Entrar' }

export default async function SignInPage() {
  const viewer = await getViewer()
  if (viewer) redirect(viewer.hasLabAccess ? '/lab' : '/acesso')
  return (
    <div className="animate-fade-up">
      <p className="eyebrow">Bem-vindo de volta</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Entrar no Lab</h1>
      <p className="mt-2 text-sm text-mute">Seu laboratório criativo com IA está esperando.</p>
      <div className="mt-8 rounded-2xl border border-border bg-ink-900/70 p-6">
        <Suspense>
          <SignInForm />
        </Suspense>
      </div>
    </div>
  )
}
