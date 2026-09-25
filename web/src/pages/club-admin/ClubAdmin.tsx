/**
 * Administração do clube: Visão Geral · Notificações · Membros · Caixa ·
 * Dados · Mesas · Ajustes. Todas as operações são validadas no servidor.
 */
import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, AlertTriangle, Ban, Bell, Coins, Crown, Info, LayoutDashboard, Plus, Send, Settings, Table2, Trash2, UserPlus, Users, BarChart3, Check, X, Pencil } from 'lucide-react';
import { del, get, patch, post } from '../../lib/api';
import { Badge, Button, Confirm, Emblem, Empty, Field, Input, Loader, Miudas, Modal, PageHead, Panel, PanelTitle, Segmented, Slider, Stat, Toggle } from '../../components/ui';
import { Portrait } from '../../components/Portrait';
import { ThemeIcon } from '../../components/Icon';
import { ActivityFeed } from '../../components/game-ui';
import { AreaChart, BarChart, BarList, SERIES } from '../../components/charts';
import { useErrorToast, useToast } from '../../components/Toast';
import { CLUB_COLORS, CLUB_EMBLEMS, CLUB_TYPES, TABLE_CATEGORIES } from '../../../../shared/catalog';
import { BOT_DIFFICULTIES } from '../../../../shared/bot';
import { dateTime, fmt, fmtSigned, timeAgo } from '../../lib/format';
import { sfx } from '../../lib/sound';
import type { ClubDto, TableDto, TxRow } from '../../lib/types';

const ROLE: Record<string, string> = { owner: 'Fundador', admin: 'Administrador', agent: 'Agente', member: 'Membro' };

function useAct(invalidate: string[][]) {
  const qc = useQueryClient();
  const toast = useToast();
  const onError = useErrorToast();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try {
      await fn();
      if (ok) {
        sfx.coin();
        toast(ok, 'success');
      }
      invalidate.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      return true;
    } catch (e) {
      onError(e);
      return false;
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
}

export default function ClubAdmin() {
  const { id = '' } = useParams();
  const q = useQuery({ queryKey: ['club-admin', id], queryFn: () => get<any>(`/clubs/${id}/admin/overview`), refetchInterval: 15000, retry: false });
  if (q.isLoading) return <Loader />;
  if (q.error) return <Empty icon={<Crown size={40} />} title="Acesso restrito" action={<Link className="btn" to={`/clubes/${id}`}>Ver clube</Link>}>{(q.error as Error).message}</Empty>;
  const club: ClubDto = q.data.club;
  const pending = q.data.inbox.pending.length;
  const base = `/clubes/${id}/admin`;
  return (
    <div className="page">
      <PageHead
        back={{ to: `/clubes/${id}`, label: club.name }}
        kicker="Administração do clube"
        title={
          <span className="row gap-3">
            <Emblem icon={club.emblem} color={club.color} size={40} /> {club.name}
          </span>
        }
      />
      <nav className="subnav" aria-label="Administração">
        <NavLink to={base} end>
          <LayoutDashboard size={14} /> Visão Geral
        </NavLink>
        <NavLink to={`${base}/notificacoes`}>
          <Bell size={14} /> Notificações {pending > 0 && <span className="count">{pending}</span>}
        </NavLink>
        <NavLink to={`${base}/membros`}>
          <Users size={14} /> Membros
        </NavLink>
        <NavLink to={`${base}/caixa`}>
          <Coins size={14} /> Caixa
        </NavLink>
        <NavLink to={`${base}/dados`}>
          <BarChart3 size={14} /> Dados
        </NavLink>
        <NavLink to={`${base}/mesas`}>
          <Table2 size={14} /> Mesas
        </NavLink>
        <NavLink to={`${base}/ajustes`}>
          <Settings size={14} /> Ajustes
        </NavLink>
      </nav>
      <Routes>
        <Route index element={<Overview data={q.data} base={base} />} />
        <Route path="notificacoes" element={<Inbox clubId={club.id} />} />
        <Route path="membros" element={<Members clubId={club.id} myRole={club.myRole ?? 'owner'} />} />
        <Route path="caixa" element={<Treasury clubId={club.id} />} />
        <Route path="dados" element={<Data metrics={q.data.metrics} />} />
        <Route path="mesas" element={<Tables club={club} />} />
        <Route path="ajustes" element={<ClubSettings club={club} />} />
        <Route path="*" element={<Navigate to={base} replace />} />
      </Routes>
    </div>
  );
}

function Overview({ data, base }: { data: any; base: string }) {
  const m = data.metrics;
  return (
    <div className="col gap-4">
      <div className="grid grid-4">
        <Stat label="Membros ativos" value={fmt(m.members.active)} sub={`+${m.members.newWeek} na semana`} icon={<Users size={13} />} />
        <Stat label="Solicitações" value={m.members.pending} sub={`${m.members.invited} convites em aberto`} icon={<UserPlus size={13} />} accent={m.members.pending ? 'var(--c-amber)' : undefined} />
        <Stat label="Partidas (24h)" value={m.gamesDay} sub={`${m.live} ao vivo agora`} icon={<Activity size={13} />} />
        <Stat label="Caixa" value={<Miudas value={data.treasury.balance} size={22} />} sub={`+${fmt(data.treasury.inflowWeek)} nos últimos 7 dias`} icon={<Coins size={13} />} />
      </div>
      <div className="split">
        <Panel>
          <PanelTitle action={<Link to={`${base}/dados`} className="t-xs t-up">Dados</Link>}>Partidas por dia</PanelTitle>
          <BarChart data={m.series.map((s: any) => ({ label: s.day, value: s.games }))} unit="partidas" />
        </Panel>
        <div className="col gap-4">
          <Panel>
            <PanelTitle>Alertas</PanelTitle>
            <ul className="alerts">
              {data.inbox.alerts.map((a: any, i: number) => (
                <li key={i} className={`alert alert--${a.level}`}>
                  {a.level === 'warn' ? <AlertTriangle size={16} /> : <Info size={16} />} {a.message}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel>
            <PanelTitle>Destaques</PanelTitle>
            <BarList items={m.topPlayers.slice(0, 5).map((p: any) => ({ key: p.id, label: <span className="row gap-2"><Portrait avatar={p.avatar} size={22} /> {p.name}</span>, value: p.wins, sub: `${p.games} partidas` }))} format={(n) => `${n} vit.`} />
          </Panel>
        </div>
      </div>
      <Panel>
        <PanelTitle>Atividade recente</PanelTitle>
        <ActivityFeed items={data.inbox.activity.slice(0, 10)} />
      </Panel>
    </div>
  );
}

function Inbox({ clubId }: { clubId: string }) {
  const q = useQuery({ queryKey: ['club-inbox', clubId], queryFn: () => get<any>(`/clubs/${clubId}/admin/inbox`) });
  const { busy, run } = useAct([['club-inbox', clubId], ['club-admin', clubId], ['me']]);
  const [user, setUser] = useState('');
  const [asAgent, setAsAgent] = useState(false);
  if (q.isLoading) return <Loader />;
  const d = q.data;
  return (
    <div className="split">
      <div className="col gap-4">
        <Panel>
          <PanelTitle icon={<UserPlus size={18} />}>Solicitações de entrada</PanelTitle>
          {!d.pending.length ? (
            <p className="t-dim t-small">Nenhuma solicitação pendente.</p>
          ) : (
            <div className="list">
              {d.pending.map((m: any) => (
                <div key={m.userId} className="list-item">
                  <Portrait avatar={m.avatar} frame={m.frame} size={40} level={m.level} />
                  <div className="grow">
                    <b>{m.displayName}</b>
                    <div className="t-xs t-dim">
                      Nível {m.level} · {fmt(m.points)} pontos · pediu {timeAgo(m.requestedAt)}
                    </div>
                  </div>
                  <Button size="sm" variant="primary" icon={<Check size={14} />} loading={busy === `a${m.userId}`} onClick={() => run(`a${m.userId}`, () => post(`/clubs/${clubId}/admin/requests/${m.userId}`, { approve: true }), 'Membro aprovado!')}>
                    Aprovar
                  </Button>
                  <Button size="sm" variant="ghost" icon={<X size={14} />} loading={busy === `r${m.userId}`} onClick={() => run(`r${m.userId}`, () => post(`/clubs/${clubId}/admin/requests/${m.userId}`, { approve: false }))}>
                    Recusar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel>
          <PanelTitle icon={<Send size={18} />}>Convites enviados</PanelTitle>
          {!d.invited.length ? (
            <p className="t-dim t-small">Nenhum convite em aberto.</p>
          ) : (
            <div className="list">
              {d.invited.map((m: any) => (
                <div key={m.userId} className="list-item">
                  <Portrait avatar={m.avatar} size={36} />
                  <div className="grow">
                    <b>{m.displayName}</b>
                    <div className="t-xs t-dim">convidado {timeAgo(m.requestedAt)}{m.agentName ? ` · agente ${m.agentName}` : ''}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => run(`c${m.userId}`, () => del(`/clubs/${clubId}/admin/members/${m.userId}`), 'Convite cancelado.')}>
                    Cancelar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel>
          <PanelTitle icon={<Activity size={18} />}>Atividades</PanelTitle>
          <ActivityFeed items={d.activity} />
        </Panel>
      </div>
      <aside className="col gap-4">
        <Panel glow>
          <PanelTitle>Convidar jogador</PanelTitle>
          <div className="col gap-3">
            <Input value={user} onChange={(e) => setUser(e.target.value.toLowerCase())} placeholder="usuário" />
            <Toggle checked={asAgent} onChange={setAsAgent} label="Vincular a mim como agente" />
            <Button variant="primary" loading={busy === 'inv'} disabled={user.length < 3} onClick={async () => (await run('inv', () => post(`/clubs/${clubId}/invite`, { username: user }), 'Convite enviado!')) && setUser('')}>
              Enviar convite
            </Button>
          </div>
        </Panel>
        <Panel>
          <PanelTitle>Alertas</PanelTitle>
          <ul className="alerts">
            {d.alerts.map((a: any, i: number) => (
              <li key={i} className={`alert alert--${a.level}`}>
                {a.level === 'warn' ? <AlertTriangle size={16} /> : <Info size={16} />} {a.message}
              </li>
            ))}
          </ul>
        </Panel>
      </aside>
    </div>
  );
}

function Members({ clubId, myRole }: { clubId: string; myRole: string }) {
  const [status, setStatus] = useState<'active' | 'banned'>('active');
  const q = useQuery({ queryKey: ['club-members', clubId, status], queryFn: () => get<{ items: any[] }>(`/clubs/${clubId}/admin/members?status=${status}`) });
  const { busy, run } = useAct([['club-members', clubId, status], ['club-admin', clubId]]);
  const [edit, setEdit] = useState<any | null>(null);
  const [remove, setRemove] = useState<{ m: any; ban: boolean } | null>(null);
  const [search, setSearch] = useState('');
  const items = (q.data?.items ?? []).filter((m) => m.displayName.toLowerCase().includes(search.toLowerCase()));
  const agents = (q.data?.items ?? []).filter((m) => m.role === 'agent');
  return (
    <Panel>
      <div className="row row-between row-wrap gap-2" style={{ marginBottom: 12 }}>
        <Segmented value={status} onChange={setStatus} options={[{ value: 'active', label: 'Ativos' }, { value: 'banned', label: 'Banidos' }]} />
        <Input style={{ maxWidth: 260 }} placeholder="Buscar membro" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {q.isLoading ? (
        <Loader />
      ) : !items.length ? (
        <Empty title="Ninguém por aqui" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Membro</th>
                <th>Função</th>
                <th className="hide-mobile">Agente</th>
                <th className="num hide-mobile">Partidas</th>
                <th className="num hide-mobile">Volume</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.userId}>
                  <td>
                    <div className="row gap-2">
                      <Portrait avatar={m.avatar} frame={m.frame} size={32} level={m.level} />
                      <div style={{ minWidth: 0 }}>
                        <b className="truncate" style={{ display: 'block' }}>{m.displayName}</b>
                        <span className="t-xs t-dim">@{m.username}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge tone={m.role === 'owner' ? 'gold' : m.role === 'admin' ? 'ember' : m.role === 'agent' ? 'blue' : 'muted'}>{ROLE[m.role]}</Badge>
                    {m.role === 'agent' && m.commissionPct != null && <span className="t-xs t-dim"> {m.commissionPct}%</span>}
                  </td>
                  <td className="hide-mobile t-small">{m.agentName ?? <span className="t-dim">—</span>}</td>
                  <td className="num hide-mobile">{m.games}</td>
                  <td className="num hide-mobile">{fmt(m.volume)}</td>
                  <td>{m.status === 'banned' ? <Badge tone="ember">Banido</Badge> : m.online ? <span className="row gap-1 t-small"><span className="online-dot" /> online</span> : <span className="t-dim t-small">offline</span>}</td>
                  <td className="num">
                    {m.role !== 'owner' && m.status === 'active' && (
                      <div className="row gap-1" style={{ justifyContent: 'flex-end' }}>
                        <button className="icon-btn" style={{ width: 34, height: 34 }} aria-label="Editar" onClick={() => setEdit(m)}>
                          <Pencil size={14} />
                        </button>
                        <button className="icon-btn" style={{ width: 34, height: 34 }} aria-label="Remover" onClick={() => setRemove({ m, ban: false })}>
                          <Trash2 size={14} />
                        </button>
                        <button className="icon-btn" style={{ width: 34, height: 34 }} aria-label="Banir" onClick={() => setRemove({ m, ban: true })}>
                          <Ban size={14} />
                        </button>
                      </div>
                    )}
                    {m.status === 'banned' && (
                      <Button size="sm" variant="ghost" loading={busy === `u${m.userId}`} onClick={() => run(`u${m.userId}`, () => post(`/clubs/${clubId}/admin/members/${m.userId}/unban`), 'Banimento removido.')}>
                        Desbanir
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && <EditMember clubId={clubId} m={edit} agents={agents} myRole={myRole} onClose={() => setEdit(null)} />}
      <Confirm
        open={!!remove}
        onClose={() => setRemove(null)}
        title={remove?.ban ? 'Banir membro?' : 'Remover membro?'}
        message={remove?.ban ? `${remove?.m.displayName} não poderá voltar ao clube.` : `${remove?.m.displayName} será removido do clube.`}
        danger
        confirmLabel={remove?.ban ? 'Banir' : 'Remover'}
        loading={busy === 'rm'}
        onConfirm={async () => (await run('rm', () => del(`/clubs/${clubId}/admin/members/${remove!.m.userId}${remove!.ban ? '?ban=1' : ''}`), 'Feito.')) && setRemove(null)}
      />
    </Panel>
  );
}

function EditMember({ clubId, m, agents, myRole, onClose }: { clubId: string; m: any; agents: any[]; myRole: string; onClose: () => void }) {
  const { busy, run } = useAct([['club-members', clubId, 'active'], ['club-admin', clubId]]);
  const [role, setRole] = useState(m.role);
  const [agentId, setAgentId] = useState<string>(m.agentId ?? '');
  const [pct, setPct] = useState<number>(m.commissionPct ?? 30);
  const save = async () => {
    const body: any = {};
    if (role !== m.role) body.role = role;
    if (role !== 'agent' && (agentId || null) !== m.agentId) body.agentId = agentId || null;
    if (role === 'agent') body.commissionPct = pct;
    if (await run('save', () => patch(`/clubs/${clubId}/admin/members/${m.userId}`, body), 'Membro atualizado.')) onClose();
  };
  const roles = myRole === 'owner' ? ['member', 'agent', 'admin'] : ['member', 'agent'];
  return (
    <Modal open onClose={onClose} title={m.displayName} footer={<Button variant="primary" loading={busy === 'save'} onClick={save}>Salvar</Button>}>
      <div className="col gap-4">
        <Field label="Função">
          <Segmented block value={role} onChange={setRole} options={roles.map((r) => ({ value: r, label: ROLE[r] }))} />
        </Field>
        {role === 'agent' ? (
          <Field label={`Comissão do agente: ${pct}% da taxa`} hint="Parte da taxa das mesas paga ao agente sobre as entradas dos seus jogadores.">
            <Slider min={0} max={80} step={5} value={pct} onChange={setPct} label="Comissão" />
          </Field>
        ) : (
          <Field label="Agente responsável">
            <select className="select" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              <option value="">Sem agente</option>
              {agents
                .filter((a) => a.userId !== m.userId)
                .map((a) => (
                  <option key={a.userId} value={a.userId}>
                    {a.displayName}
                  </option>
                ))}
            </select>
          </Field>
        )}
      </div>
    </Modal>
  );
}

function Treasury({ clubId }: { clubId: string }) {
  const q = useQuery({ queryKey: ['club-treasury', clubId], queryFn: () => get<any>(`/clubs/${clubId}/admin/treasury`) });
  const { busy, run } = useAct([['club-treasury', clubId], ['club-admin', clubId]]);
  const [f, setF] = useState({ username: '', amount: 100, note: '' });
  if (q.isLoading) return <Loader />;
  const t = q.data;
  return (
    <div className="col gap-4">
      <div className="grid grid-4">
        <Stat label="Saldo do caixa" value={<Miudas value={t.balance} size={22} />} icon={<Coins size={13} />} />
        <Stat label="Entradas" value={fmt(t.inflow)} sub="total acumulado" accent="var(--c-success)" />
        <Stat label="Saídas" value={fmt(t.outflow)} sub="pagamentos" />
        <Stat label="Taxas arrecadadas" value={fmt(t.rake)} sub={`+ ${fmt(t.agentCommissions)} pagos a agentes`} />
      </div>
      <div className="split">
        <Panel>
          <PanelTitle>Movimentações</PanelTitle>
          <TxList items={t.transactions} />
        </Panel>
        <Panel glow>
          <PanelTitle icon={<Send size={18} />}>Pagar membro</PanelTitle>
          <div className="col gap-3">
            <Field label="Usuário">
              <Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase() })} placeholder="usuário do membro" />
            </Field>
            <Field label="Valor">
              <Input type="number" min={1} value={f.amount} onChange={(e) => setF({ ...f, amount: Math.max(1, Number(e.target.value) || 0) })} />
            </Field>
            <Field label="Motivo">
              <Input value={f.note} maxLength={80} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Prêmio do torneio semanal" />
            </Field>
            <Button variant="primary" loading={busy === 'pay'} disabled={f.username.length < 3 || f.amount > t.balance} onClick={async () => (await run('pay', () => post(`/clubs/${clubId}/admin/treasury/payout`, f), 'Pagamento enviado!')) && setF({ username: '', amount: 100, note: '' })}>
              Pagar {fmt(f.amount)} Miúdas
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function TxList({ items, showOwner }: { items: (TxRow & { owner?: string })[]; showOwner?: boolean }) {
  if (!items.length) return <p className="t-dim">Nenhuma movimentação.</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Quando</th>
            {showOwner && <th>Carteira</th>}
            <th>Descrição</th>
            <th className="num">Valor</th>
            <th className="num hide-mobile">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id}>
              <td className="t-xs t-dim" style={{ whiteSpace: 'nowrap' }}>{dateTime(t.createdAt)}</td>
              {showOwner && <td className="t-small">{t.owner}</td>}
              <td>
                <div className="t-small">{t.description}</div>
                <div className="t-xs t-dim">{t.label}{t.counterparty ? ` · ${t.counterparty}` : ''}</div>
              </td>
              <td className={`num ${t.amount > 0 ? 't-success' : ''}`}>
                <b>{fmtSigned(t.amount)}</b> {t.currency === 'DIAMOND' ? '💎' : ''}
              </td>
              <td className="num hide-mobile t-dim">{fmt(t.balanceAfter)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Data({ metrics: m }: { metrics: any }) {
  return (
    <div className="col gap-4">
      <div className="grid grid-4">
        <Stat label="Partidas (total)" value={fmt(m.games)} />
        <Stat label="Volume (potes)" value={<Miudas value={m.volume} size={22} />} />
        <Stat label="Taxas" value={fmt(m.rake)} />
        <Stat label="Agentes" value={m.members.agents} />
      </div>
      <div className="grid grid-2">
        <Panel>
          <PanelTitle>Partidas por dia</PanelTitle>
          <BarChart data={m.series.map((s: any) => ({ label: s.day, value: s.games }))} unit="partidas" />
        </Panel>
        <Panel>
          <PanelTitle>Volume por dia (Miúdas)</PanelTitle>
          <AreaChart data={m.series.map((s: any) => ({ label: s.day, value: s.volume }))} unit="Miúdas" color={SERIES[1]} />
        </Panel>
        <Panel>
          <PanelTitle>Jogadores ativos por dia</PanelTitle>
          <BarChart data={m.series.map((s: any) => ({ label: s.day, value: s.players }))} unit="jogadores" color={SERIES[3]} />
        </Panel>
        <Panel>
          <PanelTitle>Desempenho das mesas</PanelTitle>
          <BarList items={m.tables.map((t: any) => ({ key: t.id, label: t.name, value: t.volume, sub: `${t.games} partidas · ${t.status === 'closed' ? 'fechada' : 'aberta'}` }))} />
        </Panel>
      </div>
      <Panel>
        <PanelTitle>Melhores jogadores do clube</PanelTitle>
        <BarList items={m.topPlayers.map((p: any) => ({ key: p.id, label: <span className="row gap-2"><Portrait avatar={p.avatar} size={22} /> {p.name}</span>, value: p.wins, sub: `${p.games} partidas · ${fmt(p.prizes)} Miúdas em prêmios` }))} format={(n) => `${n} vitórias`} />
      </Panel>
    </div>
  );
}

function Tables({ club }: { club: ClubDto }) {
  const q = useQuery({ queryKey: ['club-tables', club.id], queryFn: () => get<{ items: TableDto[] }>(`/clubs/${club.id}/admin/tables`) });
  const { busy, run } = useAct([['club-tables', club.id], ['club-admin', club.id], ['tables']]);
  const [edit, setEdit] = useState<TableDto | 'new' | null>(null);
  return (
    <Panel>
      <PanelTitle
        action={
          <Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => setEdit('new')}>
            Nova mesa
          </Button>
        }
      >
        Mesas do clube
      </PanelTitle>
      {q.isLoading ? (
        <Loader />
      ) : !q.data?.items.length ? (
        <Empty icon={<Table2 size={36} />} title="Nenhuma mesa" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Mesa</th>
                <th>Categoria</th>
                <th className="num">Entrada</th>
                <th className="num hide-mobile">Lugares</th>
                <th className="num hide-mobile">Taxa</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {q.data.items.map((t) => (
                <tr key={t.id}>
                  <td>
                    <b>{t.name}</b>
                    <div className="t-xs t-dim">código {t.code} · {t.rounds} rodadas</div>
                  </td>
                  <td>{TABLE_CATEGORIES.find((c) => c.id === t.category)?.label}</td>
                  <td className="num">{fmt(t.entryFee)}</td>
                  <td className="num hide-mobile">
                    {t.players}/{t.capacity}
                  </td>
                  <td className="num hide-mobile">{t.rakePct}%</td>
                  <td>{t.status === 'playing' ? <Badge tone="ember" live>Em jogo</Badge> : t.status === 'closed' ? <Badge tone="muted">Fechada</Badge> : <Badge tone="green">Aberta</Badge>}</td>
                  <td className="num">
                    <div className="row gap-1" style={{ justifyContent: 'flex-end' }}>
                      <Button size="sm" variant="ghost" onClick={() => setEdit(t)}>
                        Editar
                      </Button>
                      {t.status !== 'playing' && (
                        <Button size="sm" variant={t.status === 'closed' ? 'default' : 'ghost'} loading={busy === t.id} onClick={() => run(t.id, () => patch(`/clubs/${club.id}/admin/tables/${t.id}`, { status: t.status === 'closed' ? 'open' : 'closed' }), t.status === 'closed' ? 'Mesa reaberta.' : 'Mesa fechada.')}>
                          {t.status === 'closed' ? 'Abrir' : 'Fechar'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && <TableEditor table={edit === 'new' ? null : edit} endpoint={`/clubs/${club.id}/admin/tables`} maxEntry={club.settings.maxEntry} allowBots={club.settings.allowBots} onClose={() => setEdit(null)} onSaved={() => q.refetch()} />}
    </Panel>
  );
}

export function TableEditor({ table, endpoint, maxEntry, allowBots = true, onClose, onSaved }: { table: TableDto | null; endpoint: string; maxEntry: number; allowBots?: boolean; onClose: () => void; onSaved: () => void }) {
  const { busy, run } = useAct([['tables']]);
  const [f, setF] = useState({
    name: table?.name ?? '',
    category: table?.category ?? 'taverna',
    entryFee: table?.entryFee ?? 50,
    maxPlayers: table?.capacity ?? 6,
    rounds: table?.rounds ?? 5,
    rakePct: table?.rakePct ?? 10,
    botFill: table?.botFill ?? allowBots,
    botDifficulty: 'medio',
    description: table?.description ?? '',
  });
  const save = async () => {
    const ok = await run('save', () => (table ? patch(`${endpoint}/${table.id}`, f) : post(endpoint, f)), table ? 'Mesa atualizada.' : 'Mesa aberta!');
    if (ok) {
      onSaved();
      onClose();
    }
  };
  return (
    <Modal open onClose={onClose} title={table ? `Editar ${table.name}` : 'Nova mesa'} footer={<Button variant="primary" loading={busy === 'save'} disabled={f.name.trim().length < 3} onClick={save}>{table ? 'Salvar' : 'Abrir mesa'}</Button>}>
      <div className="col gap-4">
        <Field label="Nome">
          <Input value={f.name} maxLength={32} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Mesa da Lareira" />
        </Field>
        <Field label="Categoria">
          <Segmented block value={f.category} onChange={(v) => setF({ ...f, category: v })} options={TABLE_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
        </Field>
        <Field label="Entrada (Miúdas)" hint={`Máximo permitido: ${fmt(maxEntry)}`}>
          <Input type="number" min={0} max={maxEntry} value={f.entryFee} onChange={(e) => setF({ ...f, entryFee: Math.max(0, Math.min(maxEntry, Number(e.target.value) || 0)) })} />
        </Field>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <Field label={`Lugares: ${f.maxPlayers}`}>
            <Slider min={2} max={6} value={f.maxPlayers} onChange={(v) => setF({ ...f, maxPlayers: v })} label="Lugares" />
          </Field>
          <Field label={`Taxa: ${f.rakePct}%`}>
            <Slider min={0} max={25} value={f.rakePct} onChange={(v) => setF({ ...f, rakePct: v })} label="Taxa" />
          </Field>
        </div>
        <Field label="Rodadas">
          <Segmented block value={f.rounds} onChange={(v) => setF({ ...f, rounds: v })} options={[3, 5, 7, 9].map((n) => ({ value: n, label: n }))} />
        </Field>
        {allowBots && <Toggle checked={f.botFill} onChange={(v) => setF({ ...f, botFill: v })} label="Completar com bots da casa" description="Lugares vazios são ocupados por bots quando a contagem termina." />}
        {f.botFill && (
          <Field label="Dificuldade dos bots">
            <Segmented block value={f.botDifficulty} onChange={(v) => setF({ ...f, botDifficulty: v })} options={BOT_DIFFICULTIES.map((b) => ({ value: b.id, label: b.label }))} />
          </Field>
        )}
        <Field label="Descrição">
          <Input value={f.description} maxLength={140} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function ClubSettings({ club }: { club: ClubDto }) {
  const { busy, run } = useAct([['club-admin', club.id], ['club', club.id], ['me']]);
  const [f, setF] = useState({ name: club.name, description: club.description, emblem: club.emblem, color: club.color, type: club.type, rules: club.rules, settings: { ...club.settings } });
  useEffect(() => setF({ name: club.name, description: club.description, emblem: club.emblem, color: club.color, type: club.type, rules: club.rules, settings: { ...club.settings } }), [club]);
  const s = f.settings;
  const setS = (p: Partial<typeof s>) => setF({ ...f, settings: { ...s, ...p } });
  return (
    <div className="grid grid-2">
      <Panel>
        <PanelTitle>Identidade</PanelTitle>
        <div className="col gap-4">
          <Field label="Nome">
            <Input value={f.name} maxLength={32} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Descrição">
            <textarea className="textarea" maxLength={280} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </Field>
          <div className="field">
            <span className="field-label">Emblema e cor</span>
            <div className="row gap-3">
              <Emblem icon={f.emblem} color={f.color} size={56} />
              <div className="col gap-2 grow">
                <div className="emblem-grid emblem-grid--sm">
                  {CLUB_EMBLEMS.map((e) => (
                    <button key={e} className="pick" aria-pressed={f.emblem === e} onClick={() => setF({ ...f, emblem: e })} aria-label={e}>
                      <ThemeIcon name={e} size={18} />
                    </button>
                  ))}
                </div>
                <div className="row row-wrap gap-1">
                  {CLUB_COLORS.map((c) => (
                    <button key={c.id} className="pick swatch" aria-pressed={f.color === c.id} onClick={() => setF({ ...f, color: c.id })} title={c.name} style={{ background: c.value }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <Field label="Tipo">
            <Segmented block value={f.type} onChange={(v) => setF({ ...f, type: v })} options={CLUB_TYPES.map((t) => ({ value: t.id, label: t.label }))} />
          </Field>
          <Field label="Regras">
            <textarea className="textarea" rows={6} maxLength={1200} value={f.rules} onChange={(e) => setF({ ...f, rules: e.target.value })} />
          </Field>
        </div>
      </Panel>
      <Panel>
        <PanelTitle>Funcionamento</PanelTitle>
        <div className="col gap-4">
          <Field label={`Taxa padrão das mesas: ${s.rakePct}%`}>
            <Slider min={0} max={25} value={s.rakePct} onChange={(v) => setS({ rakePct: v })} label="Taxa" />
          </Field>
          <Field label={`Comissão padrão de agentes: ${s.agentCommissionPct}%`}>
            <Slider min={0} max={80} step={5} value={s.agentCommissionPct} onChange={(v) => setS({ agentCommissionPct: v })} label="Comissão" />
          </Field>
          <Field label={`Limite de membros: ${s.maxMembers}`}>
            <Slider min={10} max={1000} step={10} value={s.maxMembers} onChange={(v) => setS({ maxMembers: v })} label="Membros" />
          </Field>
          <Field label={`Nível mínimo: ${s.minLevel}`}>
            <Slider min={1} max={30} value={s.minLevel} onChange={(v) => setS({ minLevel: v })} label="Nível mínimo" />
          </Field>
          <Field label={`Entrada máxima: ${fmt(s.maxEntry)}`}>
            <Slider min={0} max={20000} step={100} value={s.maxEntry} onChange={(v) => setS({ maxEntry: v })} label="Entrada máxima" />
          </Field>
          <Field label={`Limite de mesas abertas: ${s.tableLimit}`}>
            <Slider min={1} max={30} value={s.tableLimit} onChange={(v) => setS({ tableLimit: v })} label="Mesas" />
          </Field>
          <Toggle checked={s.allowBots} onChange={(v) => setS({ allowBots: v })} label="Permitir bots nas mesas" />
          <Toggle checked={s.membersCanInvite} onChange={(v) => setS({ membersCanInvite: v })} label="Membros podem convidar" />
        </div>
      </Panel>
      <div style={{ gridColumn: '1 / -1' }} className="row">
        <Button variant="primary" size="lg" loading={busy === 'save'} onClick={() => run('save', () => patch(`/clubs/${club.id}/admin/settings`, f), 'Configurações salvas.')}>
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}
