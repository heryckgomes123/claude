import { useMemo } from 'react'
import { BarList, ColumnChart } from '../components/Charts'
import { Icon } from '../components/Icon'
import { Avatar, Badge, Button, ChannelIcon, PageHeader, Stat } from '../components/ui'
import { CHANNEL_LABEL, temperature } from '../lib/audience'
import { navigate } from '../lib/router'
import { CHANNELS } from '../lib/types'
import { formatNumber, fullName, percent, timeAgo } from '../lib/util'
import { useStore } from '../store/store'

const DAY = 86_400_000

export function Dashboard() {
  const activity = useStore((s) => s.activity)
  const contacts = useStore((s) => s.contacts)
  const automations = useStore((s) => s.automations)
  const settings = useStore((s) => s.settings)

  const stats = useMemo(() => {
    const now = Date.now()
    const since = now - 14 * DAY
    const recent = activity.filter((a) => a.ts >= since)
    const count = (type: string) => recent.filter((a) => a.type === type).length
    const startOfToday = new Date().setHours(0, 0, 0, 0)
    const days = Array.from({ length: 14 }, (_, i) => {
      const start = startOfToday - (13 - i) * DAY
      const date = new Date(start)
      return {
        label: date.toLocaleDateString('pt-BR', { day: '2-digit' }),
        detail: date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }),
        value: recent.filter((a) => a.type === 'message_in' && a.ts >= start && a.ts < start + DAY).length,
      }
    })
    const runs = count('run')
    return {
      days,
      inbound: count('message_in'),
      outbound: count('message_out'),
      runs,
      completed: count('completed'),
      clicks: count('click'),
      handoffs: count('handoff'),
    }
  }, [activity])

  const real = contacts.filter((c) => !c.isTest)
  const hot = real.filter((c) => temperature(c.score, settings.hotLeadScore) === 'quente')
  const active = automations.filter((a) => a.active)
  const byChannel = CHANNELS.map((ch) => ({ label: CHANNEL_LABEL[ch], value: real.filter((c) => c.channel === ch).length })).sort((a, b) => b.value - a.value)
  const top = [...automations].sort((a, b) => b.stats.runs - a.stats.runs).slice(0, 6)
  const recent = [...real].sort((a, b) => b.lastActivityAt - a.lastActivityAt).slice(0, 6)

  return (
    <>
      <PageHeader
        title="Painel"
        subtitle="Visão geral das conversas, automações e leads dos últimos 14 dias."
        actions={
          <>
            <Badge>Dados de demonstração — apague em Configurações</Badge>
            <Button variant="primary" icon="plus" onClick={() => navigate('/automacoes/novo')}>
              Nova automação
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Conversas recebidas" value={formatNumber(stats.inbound)} hint={`${formatNumber(stats.outbound)} mensagens automáticas enviadas`} icon="message" />
        <Stat label="Execuções de automação" value={formatNumber(stats.runs)} hint={`${percent(stats.completed, stats.runs)} concluídas`} icon="bolt" tone="success" />
        <Stat label="Cliques em botões" value={formatNumber(stats.clicks)} hint={`CTR ${percent(stats.clicks, stats.runs)}`} icon="target" tone="info" />
        <Stat label="Leads quentes" value={formatNumber(hot.length)} hint={`de ${formatNumber(real.length)} contatos · ${settings.hotLeadScore}+ pontos`} icon="fire" />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold">Conversas recebidas por dia</h2>
            <span className="text-[12px] text-faint">últimos 14 dias</span>
          </div>
          <ColumnChart data={stats.days} unit="conversas" />
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-[15px] font-semibold">Contatos por canal</h2>
          <BarList data={byChannel} />
          <div className="mt-6 grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-xl border border-subtle p-3">
              <div className="text-faint">Automações ativas</div>
              <div className="mt-1 text-lg font-semibold">
                {active.length}
                <span className="text-[12px] font-normal text-faint"> / {automations.length}</span>
              </div>
            </div>
            <div className="rounded-xl border border-subtle p-3">
              <div className="text-faint">Passadas ao time</div>
              <div className="mt-1 text-lg font-semibold">{formatNumber(stats.handoffs + real.filter((c) => c.botPaused).length)}</div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <section className="card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="text-[15px] font-semibold">Automações com mais execuções</h2>
            <a href="#/automacoes" className="text-[12px] text-accent hover:underline">
              Ver todas
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-[520px] text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-faint">
                  <th className="px-5 py-2 font-medium">Automação</th>
                  <th className="px-3 py-2 text-right font-medium">Execuções</th>
                  <th className="px-3 py-2 text-right font-medium">Concluídas</th>
                  <th className="px-5 py-2 text-right font-medium">CTR</th>
                </tr>
              </thead>
              <tbody>
                {top.map((a) => (
                  <tr key={a.id} className="cursor-pointer border-t border-subtle transition hover:bg-sunken" onClick={() => navigate(`/automacoes/${a.id}`)}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`size-1.5 rounded-full ${a.active ? 'bg-success' : 'bg-faint'}`} title={a.active ? 'Ativa' : 'Pausada'} />
                        <span className="font-medium">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatNumber(a.stats.runs)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted">{percent(a.stats.completed, a.stats.runs)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted">{percent(a.stats.clicks, a.stats.runs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Conversas recentes</h2>
            <a href="#/inbox" className="text-[12px] text-accent hover:underline">
              Abrir inbox
            </a>
          </div>
          <ul className="-mx-2">
            {recent.map((c) => {
              const last = c.messages[c.messages.length - 1]
              return (
                <li key={c.id}>
                  <a href={`#/inbox/${c.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-sunken">
                    <Avatar name={fullName(c)} hue={c.avatarHue} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[13px] font-medium">
                        {fullName(c)} <ChannelIcon channel={c.channel} size={12} />
                      </span>
                      <span className="block truncate text-[12px] text-faint">{last?.text ?? '—'}</span>
                    </span>
                    <span className="flex flex-col items-end gap-1 text-[11px] text-faint">
                      {timeAgo(c.lastActivityAt)}
                      {c.unread > 0 && <span className="rounded-full bg-brand px-1.5 font-bold text-navy">{c.unread}</span>}
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <section className="card mt-3 flex flex-wrap items-center gap-4 p-5">
        <span className="grid size-10 place-items-center rounded-xl border border-success/30 bg-success/10 text-success">
          <Icon name="sparkles" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold">{settings.ai.apiKey ? 'IA do Claude conectada' : 'Conecte o Claude para respostas com IA'}</h2>
          <p className="text-[13px] text-muted">
            {settings.ai.apiKey
              ? 'Gatilhos por intenção, nós de IA, sugestões e resumos no inbox estão usando o Claude.'
              : 'Sem chave, o Fluxa usa um classificador local e os textos alternativos dos fluxos. Com a chave, a IA entende intenções e responde de verdade.'}
          </p>
        </div>
        <Button onClick={() => navigate('/configuracoes')}>{settings.ai.apiKey ? 'Ajustar' : 'Configurar IA'}</Button>
      </section>
    </>
  )
}
