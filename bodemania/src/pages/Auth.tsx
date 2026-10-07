import { useEffect, useState, type ChangeEvent } from 'react'
import { STORE } from '../config/store'
import { maskCPF, maskPhone } from '../lib/masks'
import { isCPF, isEmail, isFullName, isPhone, passwordIssues } from '../lib/validate'
import { Link, navigate, useRoute } from '../router'
import { api, login, messageOf, register, toast, useUser } from '../state/shop'
import Logo from '../components/Logo'
import { Field } from '../components/ui'

export function AuthForms({ onDone, initial = 'login' }: { onDone: () => void; initial?: 'login' | 'register' }) {
  const [mode, setMode] = useState<'login' | 'register'>(initial)
  return (
    <div>
      <div className="mb-6 grid grid-cols-2 rounded-full bg-paper-2 p-1" role="tablist">
        {(
          [
            ['login', 'Já sou cliente'],
            ['register', 'Criar conta'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)} className={`h-11 rounded-full text-sm font-semibold transition ${mode === id ? 'bg-white shadow' : 'text-mute'}`}>
            {label}
          </button>
        ))}
      </div>
      {mode === 'login' ? <LoginForm onDone={onDone} /> : <RegisterForm onDone={onDone} />}
    </div>
  )
}

function LoginForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [forgot, setForgot] = useState(false)

  if (forgot) return <ForgotForm initialEmail={email} onBack={() => setForgot(false)} />

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        setError('')
        setBusy(true)
        try {
          await login(email, password)
          toast('Bem-vindo de volta!')
          onDone()
        } catch (err) {
          setError(messageOf(err))
        } finally {
          setBusy(false)
        }
      }}
    >
      <Field label="E-mail" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Field
        label="Senha"
        name="password"
        type={show ? 'text' : 'password'}
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        right={
          <button type="button" className="text-xs font-semibold text-navy-700" onClick={() => setShow((s) => !s)}>
            {show ? 'Ocultar' : 'Mostrar'}
          </button>
        }
      />
      {error && <p role="alert" className="rounded-xl bg-err-50 px-3 py-2 text-sm font-medium text-err">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? 'Entrando…' : 'Entrar'}
      </button>
      <button type="button" className="w-full text-center text-sm text-mute underline" onClick={() => setForgot(true)}>
        Esqueci minha senha
      </button>
    </form>
  )
}

function ForgotForm({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
  const [email, setEmail] = useState(initialEmail)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (sent)
    return (
      <div className="space-y-4 text-center">
        <p className="rounded-xl bg-ok-50 px-4 py-3 text-sm font-medium text-ok">Se existir uma conta com {email}, enviamos um link para criar uma nova senha. Confira também o spam.</p>
        <button type="button" className="text-sm font-semibold text-navy-700 underline" onClick={onBack}>
          Voltar para o login
        </button>
      </div>
    )
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!isEmail(email)) return setError('Digite um e-mail válido.')
        setError('')
        setBusy(true)
        try {
          await api.auth.resetPassword(email)
          setSent(true)
        } catch (err) {
          setError(messageOf(err))
        } finally {
          setBusy(false)
        }
      }}
    >
      <p className="text-sm text-mute">Digite o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>
      <Field label="E-mail" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? 'Enviando…' : 'Enviar link'}
      </button>
      <button type="button" className="w-full text-center text-sm text-mute underline" onClick={onBack}>
        Voltar
      </button>
    </form>
  )
}

function RegisterForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ name: '', email: '', cpf: '', phone: '', password: '', newsletter: true, terms: false })
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const pw = passwordIssues(f.password)
  const errors = {
    name: !isFullName(f.name) ? 'Digite nome e sobrenome.' : '',
    email: !isEmail(f.email) ? 'E-mail inválido.' : '',
    cpf: !isCPF(f.cpf) ? 'CPF inválido.' : '',
    phone: !isPhone(f.phone) ? 'Celular com DDD.' : '',
    password: pw.length ? `A senha precisa de ${pw.join(' e ')}.` : '',
    terms: !f.terms ? 'Aceite os termos para continuar.' : '',
  }
  const show = (k: keyof typeof errors) => (touched ? errors[k] : '')

  if (confirm)
    return (
      <div className="space-y-3 text-center">
        <p className="rounded-xl bg-ok-50 px-4 py-3 text-sm font-medium text-ok">Quase lá! Enviamos um link de confirmação para {f.email}. Abra o e-mail (veja o spam também) e depois volte para entrar.</p>
      </div>
    )
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        setTouched(true)
        setError('')
        if (Object.values(errors).some(Boolean)) return
        setBusy(true)
        try {
          const r = await register(f)
          if (r.needsConfirmation) return setConfirm(true)
          toast(`Conta criada! Bem-vindo, ${f.name.trim().split(' ')[0]}.`)
          onDone()
        } catch (err) {
          setError(messageOf(err))
        } finally {
          setBusy(false)
        }
      }}
    >
      <Field label="Nome completo" name="name" autoComplete="name" value={f.name} onChange={set('name')} error={show('name')} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" value={f.email} onChange={set('email')} error={show('email')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="CPF" name="cpf" inputMode="numeric" value={f.cpf} onChange={(e) => setF((s) => ({ ...s, cpf: maskCPF(e.target.value) }))} error={show('cpf')} hint="Para a nota fiscal" />
        <Field label="Celular / WhatsApp" name="phone" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF((s) => ({ ...s, phone: maskPhone(e.target.value) }))} error={show('phone')} />
      </div>
      <Field label="Crie uma senha" name="new-password" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} error={show('password')} hint="Mínimo de 8 caracteres, com letras e números" />
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 h-5 w-5 accent-navy-900" checked={f.newsletter} onChange={set('newsletter')} />
        Quero receber novidades e ofertas por e-mail e WhatsApp.
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 h-5 w-5 accent-navy-900" checked={f.terms} onChange={set('terms')} aria-invalid={!!show('terms')} />
        <span>
          Li e aceito os{' '}
          <Link to="/politicas/termos" className="font-medium text-navy-700 underline">
            termos de uso
          </Link>{' '}
          e a{' '}
          <Link to="/politicas/privacidade" className="font-medium text-navy-700 underline">
            política de privacidade
          </Link>
          .{show('terms') && <span className="block text-xs font-medium text-err">{show('terms')}</span>}
        </span>
      </label>
      {error && <p role="alert" className="rounded-xl bg-err-50 px-3 py-2 text-sm font-medium text-err">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? 'Criando…' : 'Criar minha conta'}
      </button>
    </form>
  )
}

export default function AuthPage() {
  const { query } = useRoute()
  const next = query.get('next') ?? '/conta'
  const user = useUser()
  // quem já está logado não precisa ver o formulário
  useEffect(() => {
    if (user) navigate(next, { replace: true })
  }, [user, next])
  return (
    <div className="wrap grid min-h-[70vh] items-center py-10 lg:grid-cols-2 lg:gap-16">
      <div className="hidden lg:block">
        <Logo />
        <h1 className="display mt-8 text-5xl leading-tight font-semibold">
          Sua conta na <span className="text-gold-600 italic">{STORE.name}</span>.
        </h1>
        <ul className="mt-6 space-y-3 text-mute">
          <li>✓ Acompanhe a produção e a entrega dos seus pedidos</li>
          <li>✓ Salve endereços e finalize compras em segundos</li>
          <li>✓ Baixe os arquivos dos serviços digitais</li>
          <li>✓ Receba ofertas exclusivas do Clube Bodemania</li>
        </ul>
      </div>
      <div className="mx-auto w-full max-w-md rounded-[28px] border border-line bg-white p-6 shadow-sm md:p-8">
        <h2 className="display mb-6 text-center text-3xl font-semibold lg:hidden">Entre ou cadastre-se</h2>
        <AuthForms initial={query.get('modo') === 'cadastro' ? 'register' : 'login'} onDone={() => navigate(next, { replace: true })} />
      </div>
    </div>
  )
}

/** Página aberta pelo link do e-mail "Esqueci minha senha" (o Supabase já deixa o usuário logado). */
export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const issues = passwordIssues(password)
  return (
    <div className="wrap grid min-h-[60vh] place-items-center py-10">
      <div className="w-full max-w-md rounded-[28px] border border-line bg-white p-6 md:p-8">
        <h1 className="display text-3xl font-semibold">Nova senha</h1>
        {done ? (
          <div className="mt-4 space-y-4">
            <p className="rounded-xl bg-ok-50 px-4 py-3 text-sm font-medium text-ok">Senha alterada com sucesso.</p>
            <Link to="/conta" className="btn btn-primary w-full">
              Ir para minha conta
            </Link>
          </div>
        ) : (
          <form
            className="mt-4 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              if (issues.length) return setError(`A senha precisa de ${issues.join(' e ')}.`)
              setBusy(true)
              setError('')
              try {
                await api.auth.updatePassword(password)
                setDone(true)
              } catch (err) {
                setError(messageOf(err, 'Link expirado. Peça um novo em “Esqueci minha senha”.'))
              } finally {
                setBusy(false)
              }
            }}
          >
            <Field label="Nova senha" name="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={error} hint="Mínimo de 8 caracteres, com letras e números" />
            <button className="btn btn-primary w-full" disabled={busy}>
              {busy ? 'Salvando…' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
