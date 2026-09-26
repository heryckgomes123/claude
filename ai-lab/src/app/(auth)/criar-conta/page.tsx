import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SignUpForm } from '@/features/auth-forms'
import { getViewer } from '@/server/auth/viewer'

export const metadata: Metadata = { title: 'Criar conta' }

export default async function SignUpPage() {
  const viewer = await getViewer()
  if (viewer) redirect(viewer.hasLabAccess ? '/lab' : '/acesso')
  return (
    <div className="animate-fade-up">
      <p className="eyebrow">INTELRA AI LAB</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Crie sua conta</h1>
      <p className="mt-2 text-sm text-mute">Use o mesmo e-mail da compra. Se já recebeu seu código, ative agora.</p>
      <div className="mt-8 rounded-2xl border border-border bg-ink-900/70 p-6">
        <SignUpForm />
      </div>
    </div>
  )
}
