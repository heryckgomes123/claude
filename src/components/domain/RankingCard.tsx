import { Flame, Dumbbell } from 'lucide-react'
import { motion } from 'motion/react'
import type { RankingEntry } from '@/types/models'
import { Avatar } from '@/components/ui/Avatar'
import { cn, formatNumber } from '@/lib/utils'

export function RankingCard({ entry, position, index = 0 }: { entry: RankingEntry; position: number; index?: number }) {
  const me = entry.isCurrentUser
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.03, duration: 0.3 }}
      className={cn(
        'flex items-center gap-3 rounded-2xl border px-3.5 py-3',
        me ? 'border-lift/45 bg-lift/10' : 'border-line bg-surface',
      )}
    >
      <span className={cn('font-display-wide w-7 text-center text-sm font-bold tabular', position <= 3 ? 'text-ink' : 'text-muted')}>
        {position}
      </span>
      <Avatar initials={entry.initials} src={entry.avatarUrl} size={38} highlight={me} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold">
          {entry.name}
          {me && <span className="ml-1.5 text-[11px] font-bold text-lift-2">VOCÊ</span>}
        </p>
        <div className="mt-0.5 flex items-center gap-3 text-[11.5px] text-muted">
          <span className="flex items-center gap-1">
            <Flame size={12} /> {entry.streak}d
          </span>
          <span className="flex items-center gap-1">
            <Dumbbell size={12} /> {entry.workouts}
          </span>
        </div>
      </div>
      <span className="font-display-wide text-[15px] font-bold tabular">
        {formatNumber(entry.xp)}
        <span className="ml-0.5 text-[10px] text-muted">XP</span>
      </span>
    </motion.li>
  )
}
