'use client'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'
import { redeemAccessCode } from '@/server/actions/access'

function safeNext(value: string | null): string {
  // Apenas caminhos internos — evita open redirect.
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/lab'
}

function translateAuthError(message?: string, code?: string): string {
  const key = (code ?? message ?? '').toUpperCase()
  if (key.includes('INVALID_EMAIL_OR_PASSWORD') || key.includes('INVALID EMAIL OR PASSWORD')) return 'E-mail ou senha incorretos.'
  if (key.includes('USER_ALREADY_EXISTS') || key.includes('ALREADY EXISTS')) return 'Já existe uma conta com este e-mail.'
  if (key.includes('PASSWORD_TOO_SHORT')) return 'A senha precisa ter pelo menos 8 caracteres.'
  if (key.includes('TOO_MANY') || key.includes('RATE')) return 'Muitas tentativas. Aguarde um minuto.'
  if (key.includes('INVALID_EMAIL')) return 'E-mail inválido.'
  return 'Não foi possível concluir. Tente novamente.'
}

export function SignInForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
    const { error } = await authClient.signIn.email({
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
    })
    if (error) {
      setError(error.status === 429 ? 'Muitas tentativas. Aguarde um minuto.' : translateAuthError(error.message, error.code))
      setPending(false)
      return
    }
    router.replace(safeNext(params.get('next')))
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate={false}>
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required inputMode="email" />
      </Field>
      <Field label="Senha" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} />
      </Field>
      {error && (
        <p role="alert" className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" disabled={pending} className="mt-1">
        {pending && <Loader2 className="animate-spin" />} Entrar
      </Button>
      <p className="text-center text-sm text-mute">
        Ainda não tem conta?{' '}
        <Link href="/criar-conta" className="text-gold-300 underline decoration-gold-300/40 underline-offset-4 hover:decoration-gold-300">
          Criar conta
        </Link>
      </p>
    </form>
  )
}

export function SignUpForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')
    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.')
      return
    }
    setPending(true)
    setError(null)
    const { error } = await authClient.signUp.email({
      name: String(form.get('name') ?? '').trim(),
      email: String(form.get('email') ?? '').trim(),
      password,
    })
    if (error) {
      setError(error.status === 429 ? 'Muitas tentativas. Aguarde alguns minutos.' : translateAuthError(error.message, error.code))
      setPending(false)
      return
    }
    const code = String(form.get('code') ?? '').trim()
    if (code) {
      const result = await redeemAccessCode(code)
      if (result.ok) toast.success('Acesso ativado', { description: `Plano ${result.data.planName} liberado.` })
      else toast.error('Conta criada, mas o código não foi aceito', { description: result.error })
    }
    router.replace('/lab')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Nome" htmlFor="name">
        <Input id="name" name="name" autoComplete="name" required maxLength={80} />
      </Field>
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required inputMode="email" />
      </Field>
      <Field label="Senha" htmlFor="password" hint="Mínimo de 8 caracteres.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
      </Field>
      <Field
        label="Código de acesso"
        htmlFor="code"
        optional
        hint="Recebido após a compra do INTELRA AI LAB. Você também pode ativá-lo depois."
      >
        <Input id="code" name="code" autoComplete="off" placeholder="LAB-XXXX-XXXX-XXXX" className="font-mono uppercase" maxLength={64} />
      </Field>
      {error && (
        <p role="alert" className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" disabled={pending} className="mt-1">
        {pending && <Loader2 className="animate-spin" />} Criar conta
      </Button>
      <p className="text-center text-sm text-mute">
        Já tem conta?{' '}
        <Link href="/entrar" className="text-gold-300 underline decoration-gold-300/40 underline-offset-4 hover:decoration-gold-300">
          Entrar
        </Link>
      </p>
    </form>
  )
}

export function RedeemCodeForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = String(new FormData(event.currentTarget).get('code') ?? '')
    setError(null)
    startTransition(async () => {
      const result = await redeemAccessCode(code)
      if (!result.ok) {
        setError(result.error)
        return
      }
      toast.success('Acesso ativado', { description: `Bem-vindo ao ${result.data.planName}.` })
      router.replace('/lab')
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <Field label="Código de acesso" htmlFor="code" error={error ?? undefined}>
        <Input
          id="code"
          name="code"
          required
          autoComplete="off"
          placeholder="LAB-XXXX-XXXX-XXXX"
          className="font-mono uppercase"
          aria-invalid={Boolean(error)}
          maxLength={64}
        />
      </Field>
      <Button type="submit" variant="primary" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Ativar acesso
      </Button>
    </form>
  )
}

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      disabled={pending}
      onClick={async () => {
        setPending(true)
        await authClient.signOut()
        router.replace('/entrar')
        router.refresh()
      }}
    >
      Sair
    </Button>
  )
}
