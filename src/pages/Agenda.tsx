import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarCheck, Clock, User, Users } from 'lucide-react'
import { liftApi } from '@/services/api/liftApi'
import { useResource } from '@/hooks/useResource'
import { useAppStore } from '@/store/useAppStore'
import type { ClassSession } from '@/types/models'
import { Header } from '@/components/ui/Header'
import { Button } from '@/components/ui/Button'
import { Badge, DemoTag } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, IntegrationNotice, LoadingState } from '@/components/ui/States'
import { celebrate } from '@/components/domain/Celebration'
import { addDays, fmtTime, fmtWeekdayShort, isSameDay, startOfDay } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { LIFT_CONFIG } from '@/config/lift.config'

const MOD_COLOR: Record<string, string> = {
  CrossFit: 'bg-lift',
  Calistenia: 'bg-lift-2',
  'Animal Flow': 'bg-gold',
  Yoga: 'bg-ok',
  Funcional: 'bg-ink-2',
}

type Status = 'booked' | 'waitlist' | 'full' | 'open' | 'past'

function statusOf(c: ClassSession, booking?: 'booked' | 'waitlist'): Status {
  if (new Date(c.startsAt).getTime() + c.durationMinutes * 60000 < Date.now()) return 'past'
  if (booking) return booking
  return c.bookedCount >= c.capacity ? 'full' : 'open'
}

export default function Agenda() {
  const { data, loading } = useResource(() => liftApi.listClasses())
  const bookings = useAppStore((s) => s.bookings)
  const book = useAppStore((s) => s.bookClass)
  const cancel = useAppStore((s) => s.cancelBooking)
  const [day, setDay] = useState(() => startOfDay(new Date()))
  const [filter, setFilter] = useState<string>('Todas')
  const [sel, setSel] = useState<ClassSession | null>(null)

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i)), [])
  const classes = (data ?? []).filter((c) => isSameDay(new Date(c.startsAt), day) && (filter === 'Todas' || c.modality === filter))
  const selStatus = sel ? statusOf(sel, bookings[sel.id]) : null
  const seats = (c: ClassSession) => {
    const mine = bookings[c.id] === 'booked' ? 1 : 0
    return Math.max(0, c.capacity - c.bookedCount - mine)
  }

  const doBook = (c: ClassSession) => {
    const full = seats(c) === 0
    const r = book(c.id, full)
    setSel(null)
    celebrate(
      r === 'booked'
        ? { title: 'Aula reservada', subtitle: `${c.title} · ${fmtTime(c.startsAt)}`, icon: '📅' }
        : { title: 'Lista de espera', subtitle: 'Avisaremos se uma vaga abrir.', icon: '⏳' },
    )
  }

  return (
    <div>
      <Header title="Agenda" subtitle="Aulas da semana" back action={<DemoTag />} />
      <div className="px-4">
        {/* Dias */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {days.map((d) => {
            const on = isSameDay(d, day)
            return (
              <button
                key={d.toISOString()}
                onClick={() => setDay(d)}
                className={cn('flex w-[52px] shrink-0 flex-col items-center rounded-2xl border py-2.5 transition-colors', on ? 'border-lift bg-lift text-white' : 'border-line bg-surface text-ink-2')}
              >
                <span className={cn('text-[10.5px] font-semibold uppercase', on ? 'text-white/80' : 'text-muted')}>{fmtWeekdayShort(d).slice(0, 3)}</span>
                <span className="font-display-wide mt-0.5 text-lg font-bold">{d.getDate()}</span>
              </button>
            )
          })}
        </div>
        {/* Modalidades */}
        <div className="no-scrollbar -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4">
          {['Todas', ...LIFT_CONFIG.MODALITIES].map((m) => (
            <button
              key={m}
              onClick={() => setFilter(m)}
              className={cn('h-8 shrink-0 rounded-full border px-3.5 text-[12.5px] font-semibold', filter === m ? 'border-ink bg-ink text-bg' : 'border-line-strong text-ink-2')}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-2.5">
          {loading && <LoadingState rows={4} />}
          <AnimatePresence mode="popLayout">
            {classes.map((c, i) => {
              const st = statusOf(c, bookings[c.id])
              const left = seats(c)
              return (
                <motion.button
                  layout
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSel(c)}
                  disabled={st === 'past'}
                  className={cn('card-surface flex w-full items-center gap-4 p-4 text-left', st === 'past' && 'opacity-45', st === 'booked' && 'border-lift/45')}
                >
                  <div className="w-14 shrink-0">
                    <p className="font-display-wide text-lg leading-none font-bold tabular">{fmtTime(c.startsAt)}</p>
                    <p className="mt-1 text-[11px] text-muted">{c.durationMinutes} min</p>
                  </div>
                  <span className={cn('h-10 w-[3px] shrink-0 rounded-full', MOD_COLOR[c.modality] ?? 'bg-ink-2')} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{c.title}</p>
                    <p className="mt-0.5 truncate text-[12px] text-muted">{c.coachName}</p>
                  </div>
                  <div className="text-right">
                    {st === 'booked' && <Badge tone="lift">Reservada</Badge>}
                    {st === 'waitlist' && <Badge tone="warn">Espera</Badge>}
                    {st === 'full' && <Badge tone="danger">Lotada</Badge>}
                    {st === 'open' && <Badge tone={left <= 3 ? 'warn' : 'ok'}>{left} vagas</Badge>}
                    {st === 'past' && <Badge>Encerrada</Badge>}
                  </div>
                </motion.button>
              )
            })}
          </AnimatePresence>
          {!loading && classes.length === 0 && <EmptyState icon={<CalendarCheck />} title="Sem aulas neste dia" body="Escolha outro dia ou modalidade." />}
        </div>
        <IntegrationNotice className="mt-6">
          Grade de aulas de demonstração. Reservas ficam salvas apenas neste dispositivo até a integração com o sistema de agenda da LIFT (limite de vagas, lista de espera e cancelamento serão validados no servidor).
        </IntegrationNotice>
      </div>

      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.title}>
        {sel && (
          <div className="pb-3">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="lift">{sel.modality}</Badge>
              {selStatus === 'booked' && <Badge tone="ok">Aula reservada</Badge>}
              {selStatus === 'waitlist' && <Badge tone="warn">Na lista de espera</Badge>}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { icon: Clock, l: 'Horário', v: `${fmtTime(sel.startsAt)}` },
                { icon: User, l: 'Professor', v: sel.coachName.replace(' (demo)', '') },
                { icon: Users, l: 'Vagas', v: `${seats(sel)}/${sel.capacity}` },
              ].map(({ icon: Icon, l, v }) => (
                <div key={l} className="rounded-2xl bg-surface-2 p-3">
                  <Icon size={15} className="text-lift-2" />
                  <p className="mt-2 text-[10.5px] text-muted uppercase">{l}</p>
                  <p className="truncate text-[14px] font-semibold">{v}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12.5px] text-muted">
              {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(sel.startsAt))} · {sel.durationMinutes} min · {LIFT_CONFIG.UNITS[0].name}
            </p>
            <div className="mt-5">
              {selStatus === 'booked' || selStatus === 'waitlist' ? (
                <Button
                  block
                  size="lg"
                  variant="danger"
                  onClick={() => {
                    cancel(sel.id)
                    setSel(null)
                  }}
                >
                  {selStatus === 'booked' ? 'Cancelar reserva' : 'Sair da lista de espera'}
                </Button>
              ) : (
                <Button block size="xl" onClick={() => doBook(sel)}>
                  {seats(sel) === 0 ? 'Entrar na lista de espera' : 'Reservar aula'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
