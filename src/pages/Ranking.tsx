import { useState } from 'react'
import { motion } from 'motion/react'
import { Crown } from 'lucide-react'
import { useRanking } from '@/services/ranking'
import type { RankingEntry, RankingPeriod } from '@/types/models'
import { Header } from '@/components/ui/Header'
import { Avatar } from '@/components/ui/Avatar'
import { DemoTag } from '@/components/ui/Badge'
import { RankingCard } from '@/components/domain/RankingCard'
import { cn, formatNumber } from '@/lib/utils'

const PERIODS: { id: RankingPeriod; label: string }[] = [
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
  { id: 'all', label: 'Geral' },
]

function Podium({ entries }: { entries: RankingEntry[] }) {
  const order = [entries[1], entries[0], entries[2]].filter(Boolean)
  const heights = ['h-20', 'h-28', 'h-16']
  const places = [2, 1, 3]
  return (
    <div className="flex items-end justify-center gap-3 pt-4">
      {order.map((e, i) => (
        <motion.div
          key={e.userId}
          className="flex w-[30%] flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: [0.15, 0, 0.3][i], type: 'spring', stiffness: 260, damping: 22 }}
        >
          {places[i] === 1 && <Crown size={20} className="mb-1 text-gold" />}
          <Avatar initials={e.initials} size={places[i] === 1 ? 62 : 50} ring={places[i] === 1} highlight={e.isCurrentUser} />
          <p className="mt-2 max-w-full truncate text-[12.5px] font-semibold">{e.isCurrentUser ? 'Você' : e.name}</p>
          <p className="text-[11px] text-muted tabular">{formatNumber(e.xp)} XP</p>
          <div
            className={cn(
              'mt-2 grid w-full place-items-start justify-center rounded-t-2xl border border-b-0 pt-2',
              heights[i],
              places[i] === 1 ? 'border-lift/40 bg-gradient-to-b from-lift/30 to-lift/0' : 'border-line bg-gradient-to-b from-white/6 to-transparent',
            )}
          >
            <span className="font-display-wide text-xl font-black">{places[i]}</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default function Ranking() {
  const [period, setPeriod] = useState<RankingPeriod>('week')
  const { list, position, total } = useRanking(period)

  return (
    <div>
      <Header title="Ranking" subtitle="Comunidade LIFT" action={<DemoTag />} />
      <div className="px-4">
        <div className="flex rounded-2xl border border-line bg-surface p-1" role="tablist">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={period === p.id}
              onClick={() => setPeriod(p.id)}
              className={cn('relative h-10 flex-1 rounded-xl text-[13px] font-semibold transition-colors', period === p.id ? 'text-ink' : 'text-muted')}
            >
              {period === p.id && <motion.span layoutId="rank-tab" className="absolute inset-0 rounded-xl bg-surface-3" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
              <span className="relative">{p.label}</span>
            </button>
          ))}
        </div>

        <Podium key={period} entries={list.slice(0, 3)} />

        <div className="mt-2 mb-3 flex items-center justify-between rounded-2xl border border-lift/30 bg-lift/8 px-4 py-3">
          <span className="text-[13px] text-ink-2">Sua posição</span>
          <span className="font-display-wide text-lg font-black">
            #{position}
            <span className="text-[12px] font-semibold text-muted"> de {total}</span>
          </span>
        </div>

        <ul className="space-y-2" key={`list-${period}`}>
          {list.slice(3).map((e, i) => (
            <RankingCard key={e.userId} entry={e} position={i + 4} index={i} />
          ))}
        </ul>
        <p className="mt-5 text-center text-[11.5px] leading-relaxed text-muted">
          Participantes fictícios de demonstração. O ranking real será calculado pelo servidor com base em XP, treinos e sequência.
        </p>
      </div>
    </div>
  )
}
