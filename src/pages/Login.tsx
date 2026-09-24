import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Eye, EyeOff, Lock, Mail, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { IntegrationNotice } from '@/components/ui/States'
import { LiftWordmark } from '@/components/brand/LiftLogo'
import { AuthService } from '@/services/auth/AuthService'
import { useAppStore } from '@/store/useAppStore'
import { DEMO_USER_ID } from '@/data/demo/student'
import { LIFT_CONFIG } from '@/config/lift.config'

/**
 * Login visual. NÃO há autenticação real ainda:
 * - ENTRAR / CRIAR CONTA / ESQUECI MINHA SENHA chamam o AuthService,
 *   que informa claramente que a integração não existe.
 * - "Explorar demonstração" entra com dados fictícios.
 * Nenhuma credencial é salva ou enviada.
 */
function Field({ icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode }) {
  return (
    <label className="flex h-14 items-center gap-3 rounded-2xl border border-line-strong bg-surface px-4 transition-colors focus-within:border-lift/60">
      <span className="text-muted">{icon}</span>
      <input {...props} className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted" />
    </label>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const startDemo = useAppStore((s) => s.startDemoSession)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const attempt = async (fn: () => Promise<unknown>) => {
    setLoading(true)
    try {
      await fn()
    } catch (e) {
      setNotice((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const enterDemo = () => {
    startDemo(DEMO_USER_ID)
    navigate('/', { replace: true })
  }

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col overflow-hidden px-6 pt-safe pb-[max(var(--safe-bottom),24px)]">
      <div className="hud-grid absolute inset-x-0 top-0 h-80 opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="absolute -top-32 -right-24 size-[380px] rounded-full bg-lift/20 blur-[100px]" />

      <motion.div className="relative mt-10" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <LiftWordmark size="md" />
        <h1 className="font-display-wide mt-10 text-[34px] leading-[1.02] font-extrabold uppercase">
          Bem-vindo
          <br />
          de volta.
        </h1>
        <p className="mt-3 text-[15px] text-ink-2">Entre para acompanhar seus treinos e sua evolução.</p>
      </motion.div>

      <motion.form
        className="relative mt-9 space-y-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        onSubmit={(e) => {
          e.preventDefault()
          attempt(() => AuthService.signIn(email, password))
        }}
      >
        <Field icon={<Mail size={18} />} type="email" autoComplete="email" inputMode="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="E-mail" />
        <div className="relative">
          <Field
            icon={<Lock size={18} />}
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Senha"
          />
          <button type="button" onClick={() => setShow(!show)} className="absolute top-1/2 right-4 -translate-y-1/2 text-muted hover:text-ink" aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={() => attempt(() => AuthService.requestPasswordReset(email))} className="py-1 text-[13px] font-semibold text-lift-2 hover:text-lift-3">
            Esqueci minha senha
          </button>
        </div>
        <Button type="submit" size="xl" block loading={loading}>
          Entrar
        </Button>
        <Button variant="outline" size="lg" block onClick={() => attempt(() => AuthService.signUp(email, password, ''))}>
          Criar conta
        </Button>
      </motion.form>

      <div className="relative mt-auto pt-10">
        <div className="mb-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-line-strong" />
          <span className="hud-label !text-[10px]">ou</span>
          <span className="h-px flex-1 bg-line-strong" />
        </div>
        <Button variant="secondary" size="lg" block icon={<PlayCircle size={18} />} onClick={enterDemo}>
          Explorar demonstração
        </Button>
        <p className="mt-3 text-center text-[12px] leading-relaxed text-muted">O modo demonstração usa dados fictícios salvos apenas neste dispositivo.</p>
        <p className="mt-6 text-center text-[10.5px] tracking-wide text-muted/70">{LIFT_CONFIG.LIFT_NAME}</p>
      </div>

      <Modal open={!!notice} onClose={() => setNotice(null)} title="Autenticação em integração" variant="center">
        <IntegrationNotice>{notice}</IntegrationNotice>
        <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">
          O login com e-mail e senha será ativado quando o backend de autenticação da LIFT for conectado. Enquanto isso, você pode explorar todas as telas em modo demonstração.
        </p>
        <div className="mt-5 mb-3 flex flex-col gap-2">
          <Button block onClick={enterDemo}>
            Entrar no modo demonstração
          </Button>
          <Button block variant="ghost" onClick={() => setNotice(null)}>
            Voltar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
