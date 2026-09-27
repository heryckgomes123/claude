'use client'
import { Loader2, MailCheck } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'

function safeNext(value: string | null): string {
  // Apenas caminhos internos — evita open redirect.
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/lab'
}

function translateAuthError(message?: string, code?: string, status?: number): string {
  if (status === 429) return 'Muitas tentativas. Aguarde alguns minutos.'
  const key = (code ?? message ?? '').toUpperCase()
  if (key.includes('EMAIL_NOT_VERIFIED') || key.includes('EMAIL NOT VERIFIED'))
    return 'Confirme seu e-mail antes de entrar. Enviamos um novo link para sua caixa de entrada.'
  if (key.includes('INVALID_EMAIL_OR_PASSWORD') || key.includes('INVALID EMAIL OR PASSWORD')) return 'E-mail ou senha incorretos.'
  if (key.includes('USER_ALREADY_EXISTS') || key.includes('ALREADY EXISTS')) return 'Já existe uma conta com este e-mail. Tente entrar.'
  if (key.includes('PASSWORD_TOO_SHORT')) return 'A senha precisa ter pelo menos 8 caracteres.'
  if (key.includes('INVALID_TOKEN') || key.includes('INVALID TOKEN')) return 'Link inválido ou expirado. Peça um novo.'
  if (key.includes('INVALID_EMAIL')) return 'E-mail inválido.'
  return 'Não foi possível concluir. Tente novamente.'
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
      {message}
    </p>
  )
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="status" className="grid justify-items-center gap-3 py-2 text-center">
      <span className="grid size-12 place-items-center rounded-2xl border border-gold-300/25 bg-gold-300/10">
        <MailCheck className="size-5 text-gold-300" aria-hidden />
      </span>
      <p className="font-medium">{title}</p>
      <p className="text-sm leading-relaxed text-mute">{children}</p>
    </div>
  )
}

const linkClass = 'text-gold-300 underline decoration-gold-300/40 underline-offset-4 hover:decoration-gold-300'

export function SignInForm({ canResetPassword }: { canResetPassword: boolean }) {
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
      email: String(form.get('email') ?? '').trim(),
      password: String(form.get('password') ?? ''),
      callbackURL: '/lab',
    })
    if (error) {
      setError(translateAuthError(error.message, error.code, error.status))
      setPending(false)
      return
    }
    router.replace(safeNext(params.get('next')))
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required inputMode="email" defaultValue={params.get('email') ?? ''} />
      </Field>
      <Field
        label="Senha"
        htmlFor="password"
        hint={
          canResetPassword ? (
            <Link href="/esqueci-senha" className={linkClass}>
              Esqueci minha senha
            </Link>
          ) : undefined
        }
      >
        <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} />
      </Field>
      <FormError message={error} />
      <Button type="submit" variant="primary" size="lg" disabled={pending} className="mt-1">
        {pending && <Loader2 className="animate-spin" />} Entrar
      </Button>
      <p className="text-center text-sm text-mute">
        Primeiro acesso?{' '}
        <Link href="/criar-conta" className={linkClass}>
          Criar minha conta
        </Link>
      </p>
    </form>
  )
}

export function SignUpForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')
    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.')
      return
    }
    const email = String(form.get('email') ?? '').trim()
    setPending(true)
    setError(null)
    const { data, error } = await authClient.signUp.email({
      name: String(form.get('name') ?? '').trim(),
      email,
      password,
      callbackURL: '/lab',
    })
    if (error) {
      setError(translateAuthError(error.message, error.code, error.status))
      setPending(false)
      return
    }
    // Com confirmação de e-mail ativa, a conta só abre depois do clique no link.
    if (!data?.token) {
      setSentTo(email)
      setPending(false)
      return
    }
    router.replace('/lab')
    router.refresh()
  }

  if (sentTo)
    return (
      <Notice title="Confira seu e-mail">
        Enviamos um link de confirmação para <strong className="text-bone">{sentTo}</strong>. Clique nele para entrar na área de
        membros. Não chegou? Veja a caixa de spam.
      </Notice>
    )

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Nome" htmlFor="name">
        <Input id="name" name="name" autoComplete="name" required maxLength={80} />
      </Field>
      <Field label="E-mail da compra" htmlFor="email" hint="Use o mesmo e-mail que você usou para comprar — é ele que libera o acesso.">
        <Input id="email" name="email" type="email" autoComplete="email" required inputMode="email" defaultValue={params.get('email') ?? ''} />
      </Field>
      <Field label="Crie uma senha" htmlFor="password" hint="Mínimo de 8 caracteres.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
      </Field>
      <FormError message={error} />
      <Button type="submit" variant="primary" size="lg" disabled={pending} className="mt-1">
        {pending && <Loader2 className="animate-spin" />} Criar conta
      </Button>
      <p className="text-center text-sm text-mute">
        Já tem conta?{' '}
        <Link href="/entrar" className={linkClass}>
          Entrar
        </Link>
      </p>
    </form>
  )
}

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim()
    setPending(true)
    setError(null)
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: '/redefinir-senha' })
    setPending(false)
    if (error) {
      setError(translateAuthError(error.message, error.code, error.status))
      return
    }
    setSent(true)
  }

  if (sent)
    return (
      <Notice title="Pronto!">
        Se existir uma conta com esse e-mail, você vai receber um link para criar uma nova senha em alguns minutos.
      </Notice>
    )

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required inputMode="email" />
      </Field>
      <FormError message={error} />
      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Enviar link
      </Button>
    </form>
  )
}

export function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(params.get('error') ? 'Link inválido ou expirado. Peça um novo.' : null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const newPassword = String(new FormData(event.currentTarget).get('password') ?? '')
    if (newPassword.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.')
      return
    }
    if (!token) {
      setError('Link inválido ou expirado. Peça um novo.')
      return
    }
    setPending(true)
    setError(null)
    const { error } = await authClient.resetPassword({ newPassword, token })
    if (error) {
      setError(translateAuthError(error.message, error.code, error.status))
      setPending(false)
      return
    }
    router.replace('/entrar?senha=nova')
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Nova senha" htmlFor="password" hint="Mínimo de 8 caracteres.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
      </Field>
      <FormError message={error} />
      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Salvar nova senha
      </Button>
      <p className="text-center text-sm text-mute">
        <Link href="/esqueci-senha" className={linkClass}>
          Pedir um novo link
        </Link>
      </p>
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
