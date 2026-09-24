import { motion } from 'motion/react'
import { CheckCircle2, Target, UserCheck } from 'lucide-react'
import { useProgress } from '@/services/progress'
import { Header } from '@/components/ui/Header'
import { Card, SectionTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { RingProgress } from '@/components/charts/Charts'
import { IntegrationNotice } from '@/components/ui/States'
import { daysBetween, fmtDay } from '@/lib/dates'
import { pct } from '@/lib/utils'

export default function Metas() {
  const { goals } = useProgress()
  const current = goals.filter((g) => !g.completedAt)
  const done = goals.filter((g) => g.completedAt)

  return (
    <div>
      <Header title="Metas" subtitle="Objetivos" back />
      <div className="space-y-7 px-4">
        <section>
          <SectionTitle title={`Atuais · ${current.length}`} />
          <div className="space-y-2.5">
            {current.map((g, i) => {
              const v = pct(g.progress, g.target)
              const left = g.dueAt ? daysBetween(new Date(), new Date(g.dueAt)) : null
              return (
                <motion.div key={g.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <Card className="flex items-center gap-4">
                    <RingProgress value={v} size={64}>
                      <span className="text-[13px] font-bold tabular">{Math.round(v * 100)}%</span>
                    </RingProgress>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] leading-snug font-semibold">{g.title}</p>
                      <p className="font-display-wide mt-1 text-lg font-bold tabular">
                        {g.progress.toLocaleString('pt-BR')}
                        <span className="text-[13px] text-muted"> / {g.target.toLocaleString('pt-BR')} {g.unit}</span>
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {left !== null && <Badge>{left} dias restantes</Badge>}
                        {g.metric === 'custom' && <Badge icon={<UserCheck size={11} />}>Registrado pelo coach</Badge>}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </section>
        <section>
          <SectionTitle title="Concluídas" />
          <div className="space-y-2">
            {done.map((g) => (
              <div key={g.id} className="flex items-center gap-3 rounded-2xl border border-ok/20 bg-ok/6 px-4 py-3.5">
                <CheckCircle2 size={20} className="text-ok" />
                <p className="flex-1 text-[14px] font-semibold">{g.title}</p>
                <span className="text-[12px] text-muted">{fmtDay(g.completedAt!)}</span>
              </div>
            ))}
          </div>
        </section>
        <IntegrationNotice>
          <span className="flex items-center gap-1.5 font-semibold text-ink"><Target size={13} /> Criar e editar metas</span>
          Metas personalizadas serão definidas junto ao coach e salvas no servidor quando o backend for conectado.
        </IntegrationNotice>
      </div>
    </div>
  )
}
