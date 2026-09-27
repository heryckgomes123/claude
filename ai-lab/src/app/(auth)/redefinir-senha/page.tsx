import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ResetPasswordForm } from '@/features/auth-forms'

export const metadata: Metadata = { title: 'Nova senha' }

export default function ResetPasswordPage() {
  return (
    <div className="animate-fade-up">
      <p className="eyebrow">Recuperar acesso</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Crie uma nova senha</h1>
      <div className="mt-8 rounded-2xl border border-border bg-ink-900/70 p-6">
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
