import { Award, MessageCircle, Trophy, Users, Zap } from 'lucide-react'
import { Header } from '@/components/ui/Header'
import { Card } from '@/components/ui/Card'
import { IntegrationNotice } from '@/components/ui/States'

/**
 * Comunidade — ARQUITETURA PREPARADA, não implementada.
 * Modelo: FeedItem (types/models.ts) + tabelas feed_items / feed_reactions / feed_comments (database/schema.sql).
 * Eventos que alimentarão o feed: conquista desbloqueada, treino concluído, desafio concluído, subida no ranking.
 */
const PLANNED = [
  { icon: Award, title: 'Conquistas da turma', body: 'Celebre medalhas desbloqueadas pelos colegas.' },
  { icon: Zap, title: 'Desafios em grupo', body: 'Metas coletivas entre alunos e turmas.' },
  { icon: Trophy, title: 'Destaques do ranking', body: 'Quem mais evoluiu na semana.' },
  { icon: MessageCircle, title: 'Reações e comentários', body: 'Interação com moderação da equipe LIFT.' },
]

export default function Comunidade() {
  return (
    <div>
      <Header title="Comunidade" subtitle="Em breve" back />
      <div className="space-y-3 px-4">
        <Card className="text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-lift/12 text-lift-2">
            <Users size={26} />
          </div>
          <h2 className="font-display-wide mt-4 text-lg font-bold uppercase">A comunidade LIFT está chegando</h2>
          <p className="mx-auto mt-2 max-w-xs text-[13.5px] leading-relaxed text-muted">
            Um espaço para acompanhar a evolução da turma, celebrar conquistas e participar de desafios juntos.
          </p>
        </Card>
        {PLANNED.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-3.5 rounded-2xl border border-line bg-surface p-4 opacity-80">
            <Icon size={19} className="mt-0.5 shrink-0 text-lift-2" />
            <div>
              <p className="text-[14px] font-semibold">{title}</p>
              <p className="text-[12.5px] text-muted">{body}</p>
            </div>
          </div>
        ))}
        <IntegrationNotice>Esta área depende de backend (feed, moderação e privacidade) e será habilitada em uma próxima fase.</IntegrationNotice>
      </div>
    </div>
  )
}
