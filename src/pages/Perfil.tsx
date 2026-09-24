import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Award, Bell, CalendarDays, ChevronRight, CreditCard, LogOut, Box, RotateCcw, Shield, Target, Users, Vibrate, Volume2, Zap } from 'lucide-react'
import { useProgress } from '@/services/progress'
import { useAppStore, type GraphicsMode } from '@/store/useAppStore'
import { DEMO_PROFILE } from '@/data/demo/student'
import { LevelCore3D, MedalBadge } from '@/components/three'
import { Header } from '@/components/ui/Header'
import { Card, SectionTitle } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { DemoTag } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { SoundService } from '@/services/sound/SoundService'
import { fmtFullDate } from '@/lib/dates'
import { cn, formatNumber, pct } from '@/lib/utils'

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', on ? 'bg-lift' : 'bg-surface-3')}
    >
      <span className={cn('absolute top-1 size-5 rounded-full bg-white shadow transition-all', on ? 'left-6' : 'left-1')} />
    </button>
  )
}

function Row({ icon, label, hint, to, onClick, right }: { icon: ReactNode; label: string; hint?: string; to?: string; onClick?: () => void; right?: ReactNode }) {
  const inner = (
    <>
      <span className="grid size-9 place-items-center rounded-xl bg-white/5 text-ink-2">{icon}</span>
      <span className="flex-1">
        <span className="block text-[14.5px] font-medium">{label}</span>
        {hint && <span className="block text-[12px] text-muted">{hint}</span>}
      </span>
      {right ?? <ChevronRight size={17} className="text-muted" />}
    </>
  )
  const cls = 'flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-white/3'
  if (to) return <Link to={to} className={cls}>{inner}</Link>
  if (onClick) return <button onClick={onClick} className={cls}>{inner}</button>
  return <div className={cls}>{inner}</div>
}

const GFX: { id: GraphicsMode; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'high', label: 'Alto' },
  { id: 'low', label: 'Leve' },
  { id: 'off', label: 'Off' },
]

export default function Perfil() {
  const navigate = useNavigate()
  const p = useProgress()
  const settings = useAppStore((s) => s.settings)
  const setSettings = useAppStore((s) => s.updateSettings)
  const signOut = useAppStore((s) => s.signOut)
  const resetDemo = useAppStore((s) => s.resetDemo)
  const [confirmReset, setConfirmReset] = useState(false)
  const unlocked = p.achievements.filter((a) => a.unlockedAt)

  return (
    <div>
      <Header title="Perfil" subtitle="Sua jornada" action={<DemoTag />} />
      <div className="space-y-7 px-4">
        {/* Identidade + núcleo 3D */}
        <Card padded={false}>
          <div className="hud-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(circle_at_50%_30%,black,transparent_70%)]" />
          <div className="relative">
            <LevelCore3D progress={p.level.progress} streak={p.streak} level={p.level.level} className="h-52 w-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <Avatar initials={DEMO_PROFILE.initials} src={DEMO_PROFILE.avatarUrl} size={58} highlight />
            </div>
          </div>
          <div className="relative px-5 pb-5 text-center">
            <h2 className="font-display-wide text-xl font-extrabold">{DEMO_PROFILE.name}</h2>
            <p className="mt-0.5 text-[12.5px] text-muted">
              Aluno desde {fmtFullDate(DEMO_PROFILE.memberSince)} · {DEMO_PROFILE.focus.join(' · ')}
            </p>
            <div className="mx-auto mt-4 max-w-xs">
              <div className="mb-1.5 flex justify-between text-[12px]">
                <span className="font-semibold">Nível {p.level.level}</span>
                <span className="text-muted tabular">{formatNumber(p.totalXp)} XP</span>
              </div>
              <ProgressBar value={p.level.progress} label="Progresso de nível" />
            </div>
          </div>
          <div className="relative grid grid-cols-3 border-t border-line">
            {[
              { v: p.streak, l: 'Sequência' },
              { v: p.totals.workouts, l: 'Treinos' },
              { v: `${Math.round(pct(p.month.activeDays, p.month.elapsedDays) * 100)}%`, l: 'Frequência' },
            ].map((s, i) => (
              <div key={s.l} className={cn('py-4 text-center', i > 0 && 'border-l border-line')}>
                <p className="font-display-wide text-xl font-bold tabular">{s.v}</p>
                <p className="text-[11px] text-muted">{s.l}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Conquistas */}
        <section>
          <SectionTitle title="Conquistas" action={<Link to="/conquistas" className="text-[12px] font-semibold text-lift-2">Ver todas</Link>} />
          <Link to="/conquistas" className="card-surface flex items-center gap-3 p-4">
            <div className="flex -space-x-3">
              {unlocked.slice(0, 5).map((a) => (
                <MedalBadge key={a.id} icon={a.icon} tier={a.tier} locked={false} size={44} />
              ))}
            </div>
            <span className="ml-auto text-[13px] font-semibold text-ink-2">
              {unlocked.length}/{p.achievements.length}
            </span>
          </Link>
        </section>

        {/* Metas */}
        <section>
          <SectionTitle title="Metas" action={<Link to="/metas" className="text-[12px] font-semibold text-lift-2">Ver</Link>} />
          <Card className="space-y-4">
            {p.goals.filter((g) => !g.completedAt).slice(0, 2).map((g) => (
              <div key={g.id}>
                <div className="mb-1.5 flex justify-between text-[13px]">
                  <span className="font-medium">{g.title}</span>
                  <span className="text-muted tabular">
                    {g.progress}/{g.target}
                  </span>
                </div>
                <ProgressBar value={pct(g.progress, g.target)} size="sm" />
              </div>
            ))}
          </Card>
        </section>

        {/* Menu */}
        <section>
          <SectionTitle title="Conta" />
          <div className="card-surface divide-y divide-line overflow-hidden !p-0">
            <Row icon={<CreditCard size={17} />} label="Meu plano" to="/plano" />
            <Row icon={<CalendarDays size={17} />} label="Agenda e reservas" to="/agenda" />
            <Row icon={<Zap size={17} />} label="Desafios" to="/desafios" />
            <Row icon={<Target size={17} />} label="Metas" to="/metas" />
            <Row icon={<Award size={17} />} label="Conquistas" to="/conquistas" />
            <Row icon={<Bell size={17} />} label="Notificações" to="/notificacoes" />
            <Row icon={<Users size={17} />} label="Comunidade" hint="Em breve" to="/comunidade" />
          </div>
        </section>

        <section>
          <SectionTitle title="Preferências" />
          <div className="card-surface divide-y divide-line overflow-hidden !p-0">
            <Row
              icon={<Volume2 size={17} />}
              label="Sons"
              hint="Feedback sonoro ao concluir séries e check-in"
              right={
                <Toggle
                  label="Sons"
                  on={settings.sound}
                  onChange={(v) => {
                    setSettings({ sound: v })
                    if (v) setTimeout(() => SoundService.play('success'), 50)
                  }}
                />
              }
            />
            <Row icon={<Vibrate size={17} />} label="Vibração" hint="Quando suportado pelo aparelho" right={<Toggle label="Vibração" on={settings.haptics} onChange={(v) => setSettings({ haptics: v })} />} />
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-3.5">
                <span className="grid size-9 place-items-center rounded-xl bg-white/5 text-ink-2">
                  <Box size={17} />
                </span>
                <span className="flex-1">
                  <span className="block text-[14.5px] font-medium">Gráficos 3D</span>
                  <span className="block text-[12px] text-muted">"Auto" ajusta ao desempenho do aparelho</span>
                </span>
              </div>
              <div className="mt-3 flex rounded-xl bg-surface-2 p-1">
                {GFX.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSettings({ graphics: g.id })}
                    className={cn('h-8 flex-1 rounded-lg text-[12.5px] font-semibold', settings.graphics === g.id ? 'bg-surface-3 text-ink' : 'text-muted')}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="card-surface divide-y divide-line overflow-hidden !p-0">
            {import.meta.env.DEV && <Row icon={<Shield size={17} />} label="Área administrativa" hint="Estrutura (somente desenvolvimento)" to="/admin" />}
            <Row icon={<RotateCcw size={17} />} label="Reiniciar demonstração" hint="Apaga os dados locais de teste" onClick={() => setConfirmReset(true)} />
            <Row
              icon={<LogOut size={17} />}
              label="Sair"
              onClick={() => {
                signOut()
                navigate('/login', { replace: true })
              }}
            />
          </div>
          <p className="mt-5 text-center text-[11px] text-muted">LIFT 2.0 · v0.1.0</p>
        </section>
      </div>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reiniciar demonstração?" variant="center">
        <p className="text-[14px] text-ink-2">Check-ins, treinos, reservas e conversas feitos neste dispositivo serão apagados.</p>
        <div className="mt-5 mb-3 flex flex-col gap-2">
          <Button
            variant="danger"
            block
            onClick={() => {
              resetDemo()
              setConfirmReset(false)
            }}
          >
            Reiniciar
          </Button>
          <Button variant="ghost" block onClick={() => setConfirmReset(false)}>
            Cancelar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
