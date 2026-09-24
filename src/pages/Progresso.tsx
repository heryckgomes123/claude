import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Award, CalendarCheck, Clock, Dumbbell, Flame, Target, Zap } from 'lucide-react'
import { useProgress } from '@/services/progress'
import { workoutById } from '@/data/demo/workouts'
import { Header } from '@/components/ui/Header'
import { Card, SectionTitle } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { AreaChart, BarChart, ConsistencyMap } from '@/components/charts/Charts'
import { fmtDay, relativeTime } from '@/lib/dates'
import { formatNumber, pct } from '@/lib/utils'

export default function Progresso() {
  const p = useProgress()
  const fmtShort = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })

  return (
    <div>
      <Header title="Progresso" subtitle="Sua evolução" />
      <div className="space-y-7 px-4">
        {/* Nível / XP */}
        <Card glow>
          <div className="flex items-end justify-between">
            <div>
              <p className="hud-label !text-lift-2">Nível {p.level.level}</p>
              <p className="font-display-wide mt-1.5 text-[34px] leading-none font-black tabular">
                {formatNumber(p.totalXp)}
                <span className="ml-1 text-base text-muted">XP</span>
              </p>
            </div>
            <p className="text-right text-[12px] text-muted">
              {formatNumber(p.level.xpToNext)} XP
              <br />
              para o nível {p.level.level + 1}
            </p>
          </div>
          <ProgressBar value={p.level.progress} className="mt-4" size="lg" label="Progresso de nível" />
          <div className="mt-5 border-t border-line pt-4">
            <AreaChart
              ariaLabel="XP acumulado nos últimos 30 dias"
              height={120}
              data={p.xpSeries.map((d) => ({ label: fmtShort.format(d.date), value: d.xp }))}
              format={(v) => `${formatNumber(v)} XP`}
            />
          </div>
        </Card>

        {/* Resumo */}
        <section>
          <SectionTitle title="Este mês" />
          <div className="grid grid-cols-2 gap-2.5">
            <StatCard label="Treinos" value={p.month.workouts} icon={<Dumbbell size={16} />} accent />
            <StatCard label="Minutos" value={p.month.minutes} icon={<Clock size={16} />} accent />
            <StatCard label="Check-ins" value={p.month.checkins} icon={<CalendarCheck size={16} />} accent />
            <StatCard label="Frequência" value={Math.round(pct(p.month.activeDays, p.month.elapsedDays) * 100)} unit="%" icon={<Flame size={16} />} accent hint={`${p.month.activeDays}/${p.month.elapsedDays} dias`} />
          </div>
        </section>

        {/* Frequência semanal */}
        <section>
          <SectionTitle title="Treinos por semana" />
          <Card>
            <BarChart
              ariaLabel="Treinos por semana nas últimas 8 semanas"
              height={140}
              data={p.weekly.map((w, i) => ({
                label: i === 7 ? 'atual' : fmtShort.format(w.from).split(' ')[0],
                value: w.workouts,
                tooltip: `Semana de ${fmtShort.format(w.from)}: ${w.workouts} treinos, ${w.minutes} min`,
                highlight: i === 7,
              }))}
            />
            <p className="mt-3 text-[12px] text-muted">
              Média: {(p.weekly.slice(0, 7).reduce((s, w) => s + w.workouts, 0) / 7).toFixed(1).replace('.', ',')} treinos/semana nas 7 semanas anteriores
            </p>
          </Card>
        </section>

        {/* Consistência */}
        <section>
          <SectionTitle title="Consistência" action={<span className="flex items-center gap-1 text-[12px] text-muted"><Flame size={13} className="text-lift-2" /> recorde {p.bestStreak} dias</span>} />
          <Card>
            <ConsistencyMap cells={p.heatmap} />
          </Card>
        </section>

        {/* Atalhos */}
        <section className="grid grid-cols-2 gap-2.5">
          <Link to="/metas" className="card-surface flex items-center gap-3 p-4 active:scale-[0.98]">
            <Target size={20} className="text-lift-2" />
            <div>
              <p className="text-[14px] font-semibold">Metas</p>
              <p className="text-[11.5px] text-muted">{p.goals.filter((g) => !g.completedAt).length} em andamento</p>
            </div>
          </Link>
          <Link to="/conquistas" className="card-surface flex items-center gap-3 p-4 active:scale-[0.98]">
            <Award size={20} className="text-gold" />
            <div>
              <p className="text-[14px] font-semibold">Conquistas</p>
              <p className="text-[11.5px] text-muted">
                {p.achievements.filter((a) => a.unlockedAt).length}/{p.achievements.length} desbloqueadas
              </p>
            </div>
          </Link>
        </section>

        {/* Histórico */}
        <section>
          <SectionTitle title="Histórico" />
          <ul className="space-y-2">
            {p.recent.slice(0, 8).map((r, i) => {
              const w = r.workoutId ? workoutById(r.workoutId) : null
              return (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.03 }}
                  className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface px-4 py-3"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-surface-3 text-[13px] font-bold text-ink-2">
                    {w?.code.replace('Treino ', '') ?? '•'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">{w ? `${w.title}` : 'Treino'}</p>
                    <p className="text-[12px] text-muted">
                      {fmtDay(r.date.toISOString())} · {r.minutes} min
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-[12px] font-semibold text-lift-2">
                    <Zap size={12} /> {relativeTime(r.date.toISOString())}
                  </span>
                </motion.li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}
