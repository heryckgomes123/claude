import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { ForgotPasswordForm } from '@/features/auth-forms'
import { emailEnabled } from '@/server/env'
import { getSettings } from '@/server/settings'

export const metadata: Metadata = { title: 'Esqueci minha senha' }

export default async function ForgotPasswordPage() {
  // Lido a cada requisição: a configuração de e-mail e o link de suporte mudam sem novo build.
  await connection()
  const enabled = emailEnabled()
  const { supportUrl } = enabled ? { supportUrl: '' } : await getSettings().catch(() => ({ supportUrl: '' }))
  return (
    <div className="animate-fade-up">
      <p className="eyebrow">Recuperar acesso</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Esqueci minha senha</h1>
      <div className="mt-8 rounded-2xl border border-border bg-ink-900/70 p-6">
        {enabled ? (
          <>
            <p className="mb-5 text-sm text-mute">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
            <ForgotPasswordForm />
          </>
        ) : (
          <p className="text-sm leading-relaxed text-mute">
            Fale com o suporte para redefinir sua senha
            {supportUrl ? (
              <>
                :{' '}
                <a href={supportUrl} target="_blank" rel="noopener noreferrer" className="text-gold-300 underline underline-offset-4">
                  abrir suporte
                </a>
              </>
            ) : (
              '.'
            )}
          </p>
        )}
      </div>
      <p className="mt-6 text-center text-sm">
        <Link href="/entrar" className="text-mute underline underline-offset-4 hover:text-bone">
          Voltar para o login
        </Link>
      </p>
    </div>
  )
}
