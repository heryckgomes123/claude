import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Award, Bell, CalendarDays, Dumbbell, Megaphone, Zap } from 'lucide-react'
import type { NotificationType } from '@/types/models'
import { liftApi } from '@/services/api/liftApi'
import { useResource } from '@/hooks/useResource'
import { useAppStore } from '@/store/useAppStore'
import { Header } from '@/components/ui/Header'
import { DemoTag } from '@/components/ui/Badge'
import { EmptyState, LoadingState } from '@/components/ui/States'
import { relativeTime } from '@/lib/dates'
import { cn } from '@/lib/utils'

const TYPE: Record<NotificationType, { icon: typeof Bell; cls: string; label: string }> = {
  treino: { icon: Dumbbell, cls: 'bg-lift/15 text-lift-2', label: 'Treino' },
  aula: { icon: CalendarDays, cls: 'bg-lift/15 text-lift-3', label: 'Aula' },
  desafio: { icon: Zap, cls: 'bg-warn/15 text-warn', label: 'Desafio' },
  conquista: { icon: Award, cls: 'bg-gold/15 text-gold', label: 'Conquista' },
  lembrete: { icon: Bell, cls: 'bg-white/8 text-ink-2', label: 'Lembrete' },
  aviso: { icon: Megaphone, cls: 'bg-ok/12 text-ok', label: 'Aviso' },
}

export default function Notificacoes() {
  const navigate = useNavigate()
  const { data, loading } = useResource(() => liftApi.listNotifications())
  const read = useAppStore((s) => s.readNotifications)
  const markRead = useAppStore((s) => s.markNotificationsRead)
  // Mantém o destaque de "não lida" durante a visita, mesmo após marcar como lidas
  const [snapshotRead] = useState(read)

  useEffect(() => {
    if (data) markRead(data.map((n) => n.id))
  }, [data, markRead])

  return (
    <div>
      <Header title="Notificações" subtitle="Novidades" back action={<DemoTag />} />
      <div className="space-y-2 px-4">
        {loading && <LoadingState rows={5} />}
        {data?.length === 0 && <EmptyState icon={<Bell />} title="Tudo em dia" body="Você não tem notificações." />}
        {data?.map((n, i) => {
          const t = TYPE[n.type]
          const unread = !snapshotRead.includes(n.id)
          return (
            <motion.button
              key={n.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => n.href && navigate(n.href)}
              className={cn('flex w-full gap-3.5 rounded-2xl border p-4 text-left', unread ? 'border-lift/30 bg-lift/6' : 'border-line bg-surface')}
            >
              <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', t.cls)}>
                <t.icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[14px] font-semibold">{n.title}</p>
                  <span className="shrink-0 text-[11px] text-muted">{relativeTime(n.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{n.body}</p>
                <p className="mt-1.5 text-[10.5px] font-semibold tracking-wider text-muted uppercase">{t.label}</p>
              </div>
              {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-lift" />}
            </motion.button>
          )
        })}
        <p className="pt-3 text-center text-[11.5px] leading-relaxed text-muted">
          Notificações de demonstração. Push notifications exigem backend e permissão do aluno — serão ativadas na integração.
        </p>
      </div>
    </div>
  )
}
