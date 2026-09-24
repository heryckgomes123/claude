import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Bell, CalendarDays, Check, ChevronRight, Clock, Dumbbell, Flame, MapPin, Play, Sparkles, Target, Trophy, Zap } from 'lucide-react'
import { useProgress } from '@/services/progress'
import { useRanking } from '@/services/ranking'
import { useAppStore } from '@/store/useAppStore'
import { todaysWorkout } from '@/data/demo/workouts'
import { DEMO_PROFILE } from '@/data/demo/student'
import { demoNotifications } from '@/data/demo/community'
import { LevelCore3D } from '@/components/three'
import { Card, SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DemoTag } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { BarChart } from '@/components/charts/Charts'
import { ChallengeCard } from '@/components/domain/ChallengeCard'
import { fmtWeekdayShort, greeting } from '@/lib/dates'
import { cn, formatNumber, pct } from '@/lib/utils'

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
}

function streakMessage(streak: number) {
  if (streak === 0) return 'Um check-in hoje inicia uma nova sequência.'
  if (streak < 3) return 'Bom começo. Consistência se constrói dia a dia.'
  if (streak < 7) return 'Ritmo firme. Continue aparecendo.'
  return 'Você está mantendo sua consistência.'
}

export default function Home() {
  const navigate = useNavigate()
  const p = useProgress()
  const rank = useRanking('week')
  const active = useAppStore((s) => s.activeWorkout)
  const checkedIn = useAppStore((s) => s.hasCheckedInToday())
  const read = useAppStore((s) => s.readNotifications)
  const workout = todaysWorkout()
  const unread = demoNotifications().filter((n) => !read.includes(n.id)).length
  const challenge = p.challenges.find((c) => c.joined && c.progress < c.target) ?? p.challenges[0]
  const monthGoal = p.goals.find((g) => g.id === 'gl-month')
  const inProgress = active && workout && active.workoutId === workout.id
  const doneToday = p.recent[0] && new Date(p.recent[0].date).toDateString() === new Date().toDateString()

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="px-4">
      {/* Cabeçalho */}
      <motion.header variants={item} className="pt-safe flex items-center justify-between pb-5">
        <Link to="/perfil" className="flex items-center gap-3">
          <Avatar initials={DEMO_PROFILE.initials} src={DEMO_PROFILE.avatarUrl} size={44} highlight />
          <div>
            <p className="text-[13px] text-muted">
              {greeting()}, <span className="font-semibold text-ink">{DEMO_PROFILE.firstName}</span> 👋
            </p>
            <p className="font-display-wide text-[15px] font-bold">Pronto para evoluir hoje?</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <DemoTag />
          <Link to="/notificacoes" className="relative grid size-11 place-items-center rounded-full border border-line bg-surface text-ink-2" aria-label={`Notificações${unread ? `, ${unread} não lidas` : ''}`}>
            <Bell size={19} />
            {unread > 0 && <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-lift ring-2 ring-surface" />}
          </Link>
        </div>
      </motion.header>

      {/* Hero: sequência + núcleo de nível 3D */}
      <motion.section variants={item}>
        <Card padded={false} className="overflow-hidden">
          <div className="hud-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(circle_at_75%_50%,black,transparent_70%)]" />
          <div className="absolute top-1/2 right-0 size-60 -translate-y-1/2 rounded-full bg-lift/20 blur-[70px]" />
          <div className="relative flex items-stretch">
            <div className="flex flex-1 flex-col justify-between p-5 pr-0">
              <div>
                <p className="hud-label flex items-center gap-1.5 !text-lift-2">
                  <Flame size={13} /> Sequência
                </p>
                <p className="font-display-wide mt-2 text-[52px] leading-none font-black tabular">
                  <AnimatedNumber value={p.streak} />
                  <span className="ml-1.5 text-lg font-bold text-ink-2">{p.streak === 1 ? 'dia' : 'dias'}</span>
                </p>
                <p className="mt-2 max-w-[11rem] text-[13px] leading-snug text-ink-2">"{streakMessage(p.streak)}"</p>
              </div>
              <div className="mt-5">
                <div className="mb-1.5 flex items-baseline justify-between pr-2 text-[11px]">
                  <span className="font-semibold text-ink">Nível {p.level.level}</span>
                  <span className="text-muted tabular">{formatNumber(p.level.xpToNext)} XP p/ próximo</span>
                </div>
                <ProgressBar value={p.level.progress} size="sm" label="Progresso de nível" />
              </div>
            </div>
            <div className="relative w-[44%] min-w-[150px]">
              <LevelCore3D progress={p.level.progress} streak={p.streak} level={p.level.level} className="h-[210px] w-full" />
            </div>
          </div>
        </Card>
      </motion.section>

      {/* Ações rápidas */}
      <motion.section variants={item} className="mt-3 grid grid-cols-4 gap-2">
        {[
          { to: '/checkin', label: checkedIn ? 'Feito' : 'Check-in', icon: checkedIn ? Check : MapPin, on: checkedIn },
          { to: '/agenda', label: 'Agenda', icon: CalendarDays },
          { to: '/desafios', label: 'Desafios', icon: Zap },
          { to: '/metas', label: 'Metas', icon: Target },
        ].map(({ to, label, icon: Icon, on }) => (
          <Link key={to} to={to} className="card-surface flex flex-col items-center gap-2 py-3.5 transition-transform active:scale-95">
            <span className={cn('grid size-10 place-items-center rounded-xl', on ? 'bg-ok/15 text-ok' : 'bg-lift/12 text-lift-2')}>
              <Icon size={19} />
            </span>
            <span className="text-[11.5px] font-semibold text-ink-2">{label}</span>
          </Link>
        ))}
      </motion.section>

      {/* Treino de hoje */}
      <motion.section variants={item} className="mt-7">
        <SectionTitle title="Treino de hoje" action={<Link to="/treino" className="text-[12px] font-semibold text-lift-2">Ver todos</Link>} />
        {workout ? (
          <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-lift/30 bg-gradient-to-br from-[#10244f] via-surface to-surface p-5">
            <div className="absolute -top-16 -right-16 size-56 rounded-full bg-lift/25 blur-[60px]" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="hud-label !text-lift-3">{workout.code} · {workout.modality}</p>
                <span className="flex items-center gap-1 text-[12px] font-semibold text-ink-2">
                  <Clock size={13} /> {workout.estimatedMinutes} min
                </span>
              </div>
              <h3 className="title-fit mt-2 text-[clamp(24px,8vw,36px)] leading-none font-black uppercase">{workout.title}</h3>
              <p className="mt-2 text-[13.5px] text-ink-2">{workout.focus}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="flex items-center gap-1 rounded-full bg-white/6 px-2.5 py-1 text-[11.5px] text-ink-2">
                  <Dumbbell size={12} /> {workout.exercises.length} exercícios
                </span>
                <span className="rounded-full bg-white/6 px-2.5 py-1 text-[11.5px] text-ink-2 capitalize">{workout.level}</span>
              </div>
              <Button
                size="xl"
                block
                className="mt-5"
                icon={doneToday && !inProgress ? <Check size={18} /> : <Play size={17} fill="currentColor" />}
                variant={doneToday && !inProgress ? 'secondary' : 'primary'}
                onClick={() => navigate(`/treino/${workout.id}/modo`)}
              >
                {inProgress ? 'Continuar treino' : doneToday ? 'Treinar novamente' : 'Começar treino'}
              </Button>
            </div>
          </div>
        ) : (
          <Card>
            <p className="font-display-wide text-lg font-bold uppercase">Dia de recuperação</p>
            <p className="mt-1 text-[13px] text-muted">Nenhum treino programado. Mobilidade leve é uma boa opção.</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate('/treino')}>
              Ver treinos
            </Button>
          </Card>
        )}
      </motion.section>

      {/* Evolução */}
      <motion.section variants={item} className="mt-7">
        <SectionTitle title="Sua evolução" action={<Link to="/progresso" className="text-[12px] font-semibold text-lift-2">Detalhes</Link>} />
        <div className="grid grid-cols-2 gap-2.5">
          <Card className="!p-4">
            <p className="hud-label">Treinos no mês</p>
            <p className="font-display-wide mt-3 text-[30px] leading-none font-bold tabular">
              <AnimatedNumber value={p.month.workouts} />
            </p>
            {monthGoal && (
              <>
                <ProgressBar value={pct(monthGoal.progress, monthGoal.target)} size="sm" className="mt-3" label="Meta mensal" />
                <p className="mt-1.5 text-[11px] text-muted">Meta: {monthGoal.target}</p>
              </>
            )}
          </Card>
          <Card className="!p-4">
            <p className="hud-label">Frequência</p>
            <p className="font-display-wide mt-3 text-[30px] leading-none font-bold tabular">
              <AnimatedNumber value={Math.round(pct(p.month.activeDays, p.month.elapsedDays) * 100)} />
              <span className="text-base text-muted">%</span>
            </p>
            <p className="mt-3 text-[11px] leading-snug text-muted">
              {p.month.activeDays} de {p.month.elapsedDays} dias ativos neste mês
            </p>
          </Card>
          <Card className="col-span-2 !p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="hud-label">Tempo treinado · 7 dias</p>
                <p className="font-display-wide mt-2 text-[26px] leading-none font-bold tabular">
                  {Math.floor(p.last7.reduce((s, d) => s + d.minutes, 0) / 60)}
                  <span className="text-sm text-muted">h </span>
                  {p.last7.reduce((s, d) => s + d.minutes, 0) % 60}
                  <span className="text-sm text-muted">min</span>
                </p>
              </div>
              <span className="text-[11px] text-muted">
                {formatNumber(p.month.minutes)} min no mês
              </span>
            </div>
            <BarChart
              className="mt-4"
              height={92}
              ariaLabel="Minutos treinados nos últimos 7 dias"
              data={p.last7.map((d, i) => ({
                label: fmtWeekdayShort(d.date).slice(0, 3),
                value: d.minutes,
                tooltip: `${fmtWeekdayShort(d.date)}: ${d.minutes} minutos`,
                highlight: i === 6,
              }))}
            />
          </Card>
        </div>
      </motion.section>

      {/* Desafio atual */}
      {challenge && (
        <motion.section variants={item} className="mt-7">
          <SectionTitle title="Desafio atual" action={<Link to="/desafios" className="text-[12px] font-semibold text-lift-2">Todos</Link>} />
          <Link to="/desafios" className="block">
            <ChallengeCard challenge={challenge} />
          </Link>
        </motion.section>
      )}

      {/* Ranking */}
      <motion.section variants={item} className="mt-7">
        <SectionTitle title="Ranking semanal" />
        <Card onClick={() => navigate('/ranking')} className="flex items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-gold/25 to-transparent">
            <div className="text-center">
              <Trophy size={16} className="mx-auto text-gold" />
              <p className="font-display-wide mt-0.5 text-xl leading-none font-black">#{rank.position}</p>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] leading-snug font-semibold">
              {rank.percentile <= 30 ? 'Você está entre os alunos mais consistentes desta semana.' : 'Cada treino desta semana te aproxima do topo.'}
            </p>
            <p className="mt-1 text-[12px] text-muted">
              {formatNumber(rank.me.xp)} XP na semana · {rank.total} participantes
            </p>
          </div>
          <ChevronRight size={18} className="text-muted" />
        </Card>
      </motion.section>

      {/* LIFT AI */}
      <motion.section variants={item} className="mt-7">
        <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-line-strong bg-surface p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgb(47_107_255/0.22),transparent_55%)]" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-lift/15 text-lift-2">
                <Sparkles size={16} />
              </span>
              <p className="font-display-wide text-sm font-extrabold tracking-wide">LIFT AI</p>
            </div>
            <p className="mt-3 text-[17px] leading-snug font-semibold">Quer saber como melhorar seu próximo treino?</p>
            <Button className="mt-4" variant="outline" icon={<Sparkles size={16} />} onClick={() => navigate('/ai')}>
              Conversar com a IA
            </Button>
          </div>
        </div>
      </motion.section>
    </motion.div>
  )
}
