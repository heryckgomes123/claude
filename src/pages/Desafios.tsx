import { motion } from 'motion/react'
import { useProgress } from '@/services/progress'
import { useAppStore } from '@/store/useAppStore'
import { Header } from '@/components/ui/Header'
import { SectionTitle } from '@/components/ui/Card'
import { DemoTag } from '@/components/ui/Badge'
import { ChallengeCard } from '@/components/domain/ChallengeCard'

export default function Desafios() {
  const { challenges } = useProgress()
  const toggle = useAppStore((s) => s.toggleChallenge)
  const mine = challenges.filter((c) => c.joined)
  const open = challenges.filter((c) => !c.joined)

  return (
    <div>
      <Header title="Desafios" subtitle="Supere-se" back action={<DemoTag />} />
      <div className="space-y-7 px-4">
        <section>
          <SectionTitle title={`Participando · ${mine.length}`} />
          <div className="space-y-3">
            {mine.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                <ChallengeCard challenge={c} onToggle={(j) => toggle(c.id, j)} />
              </motion.div>
            ))}
          </div>
        </section>
        {open.length > 0 && (
          <section>
            <SectionTitle title="Disponíveis" />
            <div className="space-y-3">
              {open.map((c) => (
                <ChallengeCard key={c.id} challenge={c} onToggle={(j) => toggle(c.id, j)} />
              ))}
            </div>
          </section>
        )}
        <p className="text-center text-[11.5px] leading-relaxed text-muted">
          Desafios de demonstração. O progresso é calculado com base no seu histórico registrado no app; a recompensa de XP será concedida pelo servidor quando integrado.
        </p>
      </div>
    </div>
  )
}
