import { useState } from 'react'
import { motion } from 'motion/react'
import { Lock, Zap } from 'lucide-react'
import { useProgress, type AchievementState } from '@/services/progress'
import { Header } from '@/components/ui/Header'
import { SectionTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { AchievementCard } from '@/components/domain/AchievementCard'
import { Medal3D } from '@/components/three'
import { fmtFullDate } from '@/lib/dates'
import { pct } from '@/lib/utils'

const TIER_LABEL = { bronze: 'Bronze', silver: 'Prata', gold: 'Ouro', lift: 'LIFT' }

export default function Conquistas() {
  const { achievements } = useProgress()
  const [sel, setSel] = useState<AchievementState | null>(null)
  const unlocked = achievements.filter((a) => a.unlockedAt)
  const locked = achievements.filter((a) => !a.unlockedAt)

  return (
    <div>
      <Header title="Conquistas" subtitle={`${unlocked.length} de ${achievements.length} desbloqueadas`} back />
      <div className="space-y-7 px-4">
        <ProgressBar value={pct(unlocked.length, achievements.length)} segments={achievements.length} label="Conquistas desbloqueadas" />
        <section>
          <SectionTitle title="Desbloqueadas" />
          <div className="grid grid-cols-3 gap-2.5">
            {unlocked.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                <AchievementCard a={a} onClick={() => setSel(a)} />
              </motion.div>
            ))}
          </div>
        </section>
        <section>
          <SectionTitle title="Próximas" />
          <div className="grid grid-cols-3 gap-2.5">
            {locked.map((a) => (
              <AchievementCard key={a.id} a={a} onClick={() => setSel(a)} />
            ))}
          </div>
        </section>
      </div>

      <Modal open={!!sel} onClose={() => setSel(null)}>
        {sel && (
          <div className="pb-4 text-center">
            <Medal3D icon={sel.icon} tier={sel.tier} locked={!sel.unlockedAt} className="mx-auto h-60 w-full" />
            <p className="mt-1 text-[11px] text-muted">Arraste para girar</p>
            <div className="mt-4 flex justify-center gap-1.5">
              <Badge tone={sel.tier === 'gold' ? 'gold' : sel.tier === 'lift' ? 'lift' : 'neutral'}>{TIER_LABEL[sel.tier]}</Badge>
              <Badge tone="lift" icon={<Zap size={11} />}>{sel.xpReward} XP</Badge>
            </div>
            <h3 className="title-fit mt-3 text-2xl font-extrabold uppercase">{sel.name}</h3>
            <p className="mx-auto mt-2 max-w-xs text-[14px] text-ink-2">{sel.description}</p>
            {sel.unlockedAt ? (
              <p className="mt-4 text-[13px] font-semibold text-ok">Desbloqueada em {fmtFullDate(sel.unlockedAt)}</p>
            ) : (
              <div className="mx-auto mt-5 max-w-xs">
                <ProgressBar value={pct(sel.progress, sel.target)} />
                <p className="mt-2 flex items-center justify-center gap-1.5 text-[12.5px] text-muted tabular">
                  <Lock size={12} /> {sel.progress.toLocaleString('pt-BR')} / {sel.target.toLocaleString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
