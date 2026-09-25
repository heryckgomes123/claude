/**
 * SUPER ADMIN — Central de Comando da Toca.
 * Dashboard · Jogadores · Clubes · Agentes · Mesas · Economia · Atividade · Configurações
 */
import { useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Coins, Handshake, LayoutDashboard, Settings, Shield, Table2, Users, Eye, Plus, Radio, Flame, Landmark, Search, Database } from 'lucide-react';
import { get, patch, post } from '../../lib/api';
import { demoLogin, useSession } from '../../lib/session';
import { Badge, Button, Emblem, Empty, Field, Input, Loader, Miudas, Modal, Diamonds, Panel, PanelTitle, Segmented, Stat, Toggle } from '../../components/ui';
import { Portrait } from '../../components/Portrait';
import { ActivityFeed } from '../../components/game-ui';
import { AreaChart, BarChart, BarList, SERIES, StackBar } from '../../components/charts';
import { useErrorToast, useToast } from '../../components/Toast';
import { TableEditor, TxList } from '../club-admin/ClubAdmin';
import { Medallion } from '../../brand/Logo';
import { compact, fmt, timeAgo } from '../../lib/format';
import { TX_LABELS, TABLE_CATEGORIES, type TxKind } from '../../../../shared/catalog';

function useAct(keys: string[][]) {
  const qc = useQueryClient();
  const toast = useToast();
  const onError = useErrorToast();
  const [busy, setBusy] = useState<string | null>(null);
  return {
    busy,
    run: async (key: string, fn: () => Promise<unknown>, ok?: string) => {
      setBusy(key);
      try {
        await fn();
        if (ok) toast(ok, 'success');
        keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
        return true;
      } catch (e) {
        onError(e);
        return false;
      } finally {
        setBusy(null);
      }
    },
  };
}

export default function SuperAdmin() {
  return (
    <div className="page command">
      <header className="command-head">
        <Medallion size={58} glow={false} />
        <div>
          <span className="kicker">Super Admin</span>
          <h1 className="t-gold">Central de Comando da Toca</h1>
        </div>
        <span className="badge badge--live badge--ember command-live">Ao vivo</span>
      </header>
      <nav className="subnav" aria-label="Super Admin">
        <NavLink to="/admin" end>
          <LayoutDashboard size={14} /> Dashboard
        </NavLink>
        <NavLink to="/admin/jogadores">
          <Users size={14} /> Jogadores
        </NavLink>
        <NavLink to="/admin/clubes">
          <Shield size={14} /> Clubes
        </NavLink>
        <NavLink to="/admin/agentes">
          <Handshake size={14} /> Agentes
        </NavLink>
        <NavLink to="/admin/mesas">
          <Table2 size={14} /> Mesas
        </NavLink>
        <NavLink to="/admin/economia">
          <Coins size={14} /> Economia
        </NavLink>
        <NavLink to="/admin/atividade">
          <Activity size={14} /> Atividade
        </NavLink>
        <NavLink to="/admin/configuracoes">
          <Settings size={14} /> Configurações
        </NavLink>
      </nav>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="jogadores" element={<Players />} />
        <Route path="clubes" element={<ClubsAdmin />} />
        <Route path="agentes" element={<Agents />} />
        <Route path="mesas" element={<TablesAdmin />} />
        <Route path="economia" element={<Economy />} />
        <Route path="atividade" element={<ActivityPage />} />
        <Route path="configuracoes" element={<GlobalSettings />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </div>
  );
}

function Kpi({ label, value, sub, icon, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; icon: React.ReactNode; tone?: string }) {
  return (
    <div className="kpi" style={tone ? { ['--kpi' as any]: tone } : undefined}>
      <span className="kpi-icon">{icon}</span>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value t-num">{value}</span>
      {sub && <span className="kpi-sub">{sub}</span>}
    </div>
  );
}

function Dashboard() {
  const q = useQuery({ queryKey: ['admin-overview'], queryFn: () => get<any>('/admin/overview'), refetchInterval: 8000 });
  const act = useQuery({ queryKey: ['admin-activity'], queryFn: () => get<{ items: any[] }>('/admin/activity'), refetchInterval: 8000 });
  if (q.isLoading) return <Loader label="Acendendo os braseiros…" />;
  const d = q.data;
  const k = d.kpis;
  return (
    <div className="col gap-4">
      {!d.database.persistent && (
        <div className="callout callout--danger">
          <Database size={18} /> Banco em memória (sem DATABASE_URL): os dados são temporários. Configure o PostgreSQL para produção — veja o README.
        </div>
      )}
      <div className="kpi-grid">
        <Kpi label="Jogadores" value={fmt(k.players)} sub={`${k.online} online · ${k.residents} residentes`} icon={<Users size={20} />} />
        <Kpi label="Clubes" value={fmt(k.clubs)} icon={<Shield size={20} />} />
        <Kpi label="Mesas ativas" value={`${k.tablesPlaying}/${k.tables}`} sub="em jogo / abertas" icon={<Table2 size={20} />} tone="var(--c-ember)" />
        <Kpi label="Partidas" value={fmt(k.gamesTotal)} sub={`${k.gamesDay} nas últimas 24h · ${k.gamesLive} ao vivo`} icon={<Flame size={20} />} />
        <Kpi label="Miúdas em circulação" value={compact(k.circulation)} sub={`+ ${compact(k.clubsTreasury)} nos caixas de clubes`} icon={<Coins size={20} />} tone="var(--c-gold-300)" />
        <Kpi label="Agentes" value={fmt(k.agents)} icon={<Handshake size={20} />} />
        <Kpi label="Atividade (24h)" value={fmt(k.activityDay)} sub={`${fmt(k.txDay)} lançamentos`} icon={<Activity size={20} />} />
        <Kpi label="Tesouro da Toca" value={compact(k.house)} sub={`custódia de mesas: ${fmt(k.escrow)}`} icon={<Landmark size={20} />} />
      </div>
      <div className="grid grid-2">
        <Panel>
          <PanelTitle>Partidas por dia</PanelTitle>
          <BarChart data={d.series.map((s: any) => ({ label: s.day, value: s.games }))} unit="partidas" />
        </Panel>
        <Panel>
          <PanelTitle>Volume de potes por dia (Miúdas)</PanelTitle>
          <AreaChart data={d.series.map((s: any) => ({ label: s.day, value: s.volume }))} unit="Miúdas" color={SERIES[1]} />
        </Panel>
      </div>
      <div className="split">
        <Panel>
          <PanelTitle icon={<Radio size={18} color="var(--c-ember)" />}>Mesas agora</PanelTitle>
          <div className="live-tables">
            {d.liveTables.map((t: any) => (
              <div key={t.id} className={`live-table ${t.status === 'playing' ? 'is-live' : ''}`}>
                <b className="truncate">{t.name}</b>
                <span className="t-xs t-dim truncate">{t.club ?? 'Toca'}</span>
                <span className="row gap-2 t-small">
                  {t.status === 'playing' ? <Badge tone="ember" live>jogo</Badge> : <Badge tone="green">{t.seated}/{t.capacity}</Badge>}
                  <Miudas value={t.entryFee} size={13} />
                </span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <PanelTitle>Clubes da semana</PanelTitle>
          <BarList items={d.topClubs.map((c: any) => ({ key: c.id, label: <span className="row gap-2"><Emblem icon={c.emblem} color={c.color} size={18} /> {c.name}</span>, value: c.volume, sub: `${c.games} partidas` }))} />
        </Panel>
      </div>
      <div className="grid grid-2">
        <Panel>
          <PanelTitle>Novos jogadores por dia</PanelTitle>
          <BarChart data={d.series.map((s: any) => ({ label: s.day, value: s.newPlayers }))} unit="jogadores" color={SERIES[3]} height={150} />
        </Panel>
        <Panel>
          <PanelTitle action={<Link to="/admin/atividade" className="t-xs t-up">Tudo</Link>}>Atividade do universo</PanelTitle>
          <ActivityFeed items={(act.data?.items ?? []).slice(0, 8)} />
        </Panel>
      </div>
    </div>
  );
}

function Players() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'humanos' | 'residentes' | 'todos'>('humanos');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const q = useQuery({ queryKey: ['admin-players', search, filter, page], queryFn: () => get<any>(`/admin/players?q=${encodeURIComponent(search)}&filter=${filter}&page=${page}`) });
  return (
    <Panel>
      <div className="row row-wrap gap-2 row-between" style={{ marginBottom: 12 }}>
        <Segmented value={filter} onChange={(v) => (setFilter(v), setPage(0))} options={[{ value: 'humanos', label: 'Jogadores' }, { value: 'residentes', label: 'Residentes' }, { value: 'todos', label: 'Todos' }]} />
        <div className="search-box">
          <Search size={16} />
          <Input placeholder="Buscar nome ou usuário" value={search} onChange={(e) => (setSearch(e.target.value), setPage(0))} />
        </div>
      </div>
      {q.isLoading ? (
        <Loader />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Jogador</th>
                  <th className="num">Miúdas</th>
                  <th className="num hide-mobile">💎</th>
                  <th className="num hide-mobile">Partidas</th>
                  <th className="hide-mobile">Visto</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {q.data.players.map((p: any) => (
                  <tr key={p.id} onClick={() => setSel(p.id)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="row gap-2">
                        <Portrait avatar={p.avatar} frame={p.frame} size={32} level={p.level} />
                        <span style={{ minWidth: 0 }}>
                          <b className="truncate" style={{ display: 'block' }}>{p.displayName}</b>
                          <span className="t-xs t-dim">@{p.username}</span>
                        </span>
                      </div>
                    </td>
                    <td className="num">{fmt(p.miudas)}</td>
                    <td className="num hide-mobile">{fmt(p.diamonds)}</td>
                    <td className="num hide-mobile">{p.games}</td>
                    <td className="hide-mobile t-xs t-dim">{timeAgo(p.lastSeenAt)}</td>
                    <td>
                      <div className="row gap-1 row-wrap">
                        {p.status === 'banned' ? <Badge tone="ember">Banido</Badge> : <Badge tone="green">Ativo</Badge>}
                        {p.isSuperAdmin && <Badge tone="gold">Admin</Badge>}
                        {p.isGuest && <Badge tone="muted">Convidado</Badge>}
                        {p.resident && <Badge tone="blue">Residente</Badge>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row row-between mt-4">
            <span className="t-small t-dim">{fmt(q.data.total)} registros</span>
            <div className="row gap-2">
              <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <Button size="sm" variant="ghost" disabled={(page + 1) * 25 >= q.data.total} onClick={() => setPage(page + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
      {sel && <PlayerModal id={sel} onClose={() => setSel(null)} />}
    </Panel>
  );
}

function PlayerModal({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ['admin-player', id], queryFn: () => get<any>(`/admin/players/${id}`) });
  const { busy, run } = useAct([['admin-player', id], ['admin-players'], ['me']]);
  const [currency, setCurrency] = useState<'MIUDA' | 'DIAMOND'>('MIUDA');
  const [amount, setAmount] = useState(100);
  const [reason, setReason] = useState('');
  const p = q.data;
  return (
    <Modal open onClose={onClose} wide title={p ? p.displayName : 'Jogador'}>
      {!p ? (
        <Loader />
      ) : (
        <div className="col gap-4">
          <div className="row gap-3 row-wrap">
            <Portrait avatar={p.avatar} size={64} level={p.level} />
            <div className="grow">
              <div className="t-small t-dim">@{p.username}</div>
              <div className="row gap-3">
                <Miudas value={p.miudas} size={20} />
                <Diamonds value={p.diamonds} size={18} />
                <span className="t-small">{fmt(p.points)} pts</span>
              </div>
              <div className="t-xs t-dim">{p.clubs.map((c: any) => `${c.name} (${c.role}${c.status !== 'active' ? `, ${c.status}` : ''})`).join(' · ') || 'Sem clube'}</div>
            </div>
            {!p.resident && (
              <div className="col gap-2">
                <Button size="sm" variant={p.status === 'banned' ? 'default' : 'danger'} loading={busy === 'ban'} onClick={() => run('ban', () => patch(`/admin/players/${id}`, { status: p.status === 'banned' ? 'active' : 'banned' }), 'Status atualizado.')}>
                  {p.status === 'banned' ? 'Reativar' : 'Banir'}
                </Button>
                <Button size="sm" variant="ghost" loading={busy === 'sa'} onClick={() => run('sa', () => patch(`/admin/players/${id}`, { superAdmin: !p.isSuperAdmin }), 'Papel atualizado.')}>
                  {p.isSuperAdmin ? 'Remover Super Admin' : 'Tornar Super Admin'}
                </Button>
              </div>
            )}
          </div>
          <Panel variant="stone" tight>
            <span className="field-label">Ajuste de saldo</span>
            <div className="row row-wrap gap-2 mt-2">
              <Segmented value={currency} onChange={setCurrency} options={[{ value: 'MIUDA', label: 'Miúdas' }, { value: 'DIAMOND', label: 'Diamantes' }]} />
              <Input type="number" style={{ width: 120 }} value={amount} onChange={(e) => setAmount(Math.round(Number(e.target.value) || 0))} aria-label="Valor" />
              <Input style={{ flex: 1, minWidth: 160 }} placeholder="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
              <Button variant="primary" loading={busy === 'adj'} disabled={!amount} onClick={() => run('adj', () => patch(`/admin/players/${id}`, { currency, amount, reason }), 'Saldo ajustado.')}>
                {amount >= 0 ? 'Creditar' : 'Debitar'}
              </Button>
            </div>
            <p className="t-xs t-dim mt-2">Valores negativos debitam. Todo ajuste sai/entra no Tesouro da Toca e fica no extrato.</p>
          </Panel>
          <div className="grid grid-4">
            <Stat label="Partidas" value={p.stats.games} />
            <Stat label="Vitórias" value={p.stats.wins} />
            <Stat label="Melhor turno" value={fmt(p.stats.bestTurn)} />
            <Stat label="Miúdas ganhas" value={fmt(p.stats.miudasWon)} />
          </div>
          <TxList items={p.transactions} />
        </div>
      )}
    </Modal>
  );
}

function ClubsAdmin() {
  const q = useQuery({ queryKey: ['admin-clubs'], queryFn: () => get<{ items: any[] }>('/admin/clubs') });
  const { busy, run } = useAct([['admin-clubs']]);
  if (q.isLoading) return <Loader />;
  return (
    <Panel>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Clube</th>
              <th className="num">Membros</th>
              <th className="num hide-mobile">Mesas</th>
              <th className="num hide-mobile">Partidas</th>
              <th className="num">Volume</th>
              <th className="num hide-mobile">Caixa</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {q.data!.items.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/clubes/${c.id}`} className="row gap-2" style={{ color: 'inherit' }}>
                    <Emblem icon={c.emblem} color={c.color} size={30} />
                    <span>
                      <b>{c.name}</b>
                      <span className="t-xs t-dim" style={{ display: 'block' }}>
                        {c.owner} · {c.agents} agentes
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="num">{c.members}</td>
                <td className="num hide-mobile">{c.tables}</td>
                <td className="num hide-mobile">{c.games}</td>
                <td className="num">{fmt(c.volume)}</td>
                <td className="num hide-mobile">{fmt(c.treasury)}</td>
                <td>{c.status === 'active' ? <Badge tone="green">Ativo</Badge> : <Badge tone="ember">Suspenso</Badge>}</td>
                <td className="num">
                  <div className="row gap-1" style={{ justifyContent: 'flex-end' }}>
                    <Link to={`/clubes/${c.id}/admin`} className="btn btn--sm btn--ghost">
                      <Eye size={14} />
                    </Link>
                    <Button size="sm" variant={c.status === 'active' ? 'danger' : 'default'} loading={busy === c.id} onClick={() => run(c.id, () => patch(`/admin/clubs/${c.id}`, { status: c.status === 'active' ? 'suspended' : 'active' }), 'Clube atualizado.')}>
                      {c.status === 'active' ? 'Suspender' : 'Reativar'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Agents() {
  const q = useQuery({ queryKey: ['admin-agents'], queryFn: () => get<{ items: any[] }>('/admin/agents') });
  if (q.isLoading) return <Loader />;
  const items = q.data!.items;
  if (!items.length) return <Empty icon={<Handshake size={40} />} title="Nenhum agente nomeado" />;
  return (
    <div className="split">
      <Panel>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Agente</th>
                <th>Clube</th>
                <th className="num">Jogadores</th>
                <th className="num hide-mobile">Volume</th>
                <th className="num">Comissões</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.userId + a.clubId}>
                  <td>
                    <div className="row gap-2">
                      <Portrait avatar={a.avatar} frame={a.frame} size={32} />
                      <b>{a.displayName}</b>
                    </div>
                  </td>
                  <td className="t-small">
                    {a.clubName} <Badge tone="muted">{a.commissionPct}%</Badge>
                  </td>
                  <td className="num">{a.players}</td>
                  <td className="num hide-mobile">{fmt(a.volume)}</td>
                  <td className="num">
                    <b className="t-gold">{fmt(a.commissions)}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel>
        <PanelTitle>Comissões por agente</PanelTitle>
        <BarList items={items.map((a) => ({ key: a.userId + a.clubId, label: a.displayName, value: a.commissions, sub: a.clubName }))} />
      </Panel>
    </div>
  );
}

function TablesAdmin() {
  const nav = useNavigate();
  const q = useQuery({ queryKey: ['admin-tables'], queryFn: () => get<{ items: any[] }>('/admin/tables'), refetchInterval: 6000 });
  const { busy, run } = useAct([['admin-tables'], ['tables']]);
  const [edit, setEdit] = useState<any | 'new' | null>(null);
  if (q.isLoading) return <Loader />;
  return (
    <Panel>
      <PanelTitle action={<Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => setEdit('new')}>Mesa da Toca</Button>}>Todas as mesas e salas</PanelTitle>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Mesa</th>
              <th className="hide-mobile">Dono</th>
              <th className="num">Entrada</th>
              <th className="num hide-mobile">Partidas</th>
              <th className="num hide-mobile">Volume</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {q.data!.items.map((t) => (
              <tr key={t.id}>
                <td>
                  <b>{t.name}</b>
                  <div className="t-xs t-dim">
                    {t.kind === 'private' ? 'Sala privada' : TABLE_CATEGORIES.find((c) => c.id === t.category)?.label} · {t.code} · {t.seated}/{t.capacity}
                  </div>
                </td>
                <td className="hide-mobile t-small">{t.club ?? (t.kind === 'private' ? t.host : 'Toca')}</td>
                <td className="num">{fmt(t.entryFee)}</td>
                <td className="num hide-mobile">{t.games}</td>
                <td className="num hide-mobile">{fmt(t.volume)}</td>
                <td>{t.status === 'playing' ? <Badge tone="ember" live>Jogo</Badge> : t.status === 'closed' ? <Badge tone="muted">Fechada</Badge> : <Badge tone="green">Aberta</Badge>}</td>
                <td className="num">
                  <div className="row gap-1" style={{ justifyContent: 'flex-end' }}>
                    {t.gameId && (
                      <Button size="sm" variant="ghost" onClick={() => nav(`/partida/${t.gameId}`)} icon={<Eye size={14} />}>
                        Assistir
                      </Button>
                    )}
                    {t.kind === 'table' && !t.clubId && (
                      <Button size="sm" variant="ghost" onClick={() => setEdit(t)}>
                        Editar
                      </Button>
                    )}
                    {t.kind === 'table' && t.status !== 'playing' && (
                      <Button size="sm" variant="ghost" loading={busy === t.id} onClick={() => run(t.id, () => patch(`/admin/tables/${t.id}`, { status: t.status === 'closed' ? 'open' : 'closed' }), 'Mesa atualizada.')}>
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
      {edit && (
        <TableEditor
          table={edit === 'new' ? null : { ...edit, capacity: edit.capacity, description: '', rounds: edit.rounds }}
          endpoint="/admin/tables"
          maxEntry={100000}
          onClose={() => setEdit(null)}
          onSaved={() => q.refetch()}
        />
      )}
    </Panel>
  );
}

function Economy() {
  const q = useQuery({ queryKey: ['admin-economy'], queryFn: () => get<any>('/admin/economy'), refetchInterval: 15000 });
  if (q.isLoading) return <Loader />;
  const e = q.data;
  const s = e.supply;
  const miudaKinds = e.byKind.filter((k: any) => k.currency === 'MIUDA');
  return (
    <div className="col gap-4">
      <div className="kpi-grid">
        <Kpi label="Oferta total" value={compact(s.total)} sub={s.total === s.genesis ? 'conservada ✓ (= tesouro inicial)' : `tesouro inicial ${compact(s.genesis)}`} icon={<Coins size={20} />} tone="var(--c-gold-300)" />
        <Kpi label="Com jogadores" value={compact(s.users)} icon={<Users size={20} />} />
        <Kpi label="Caixas de clubes" value={compact(s.clubs)} icon={<Shield size={20} />} />
        <Kpi label="Diamantes (jogadores)" value={fmt(s.diamondsUsers)} icon={<Coins size={20} />} tone="var(--c-diamond)" />
      </div>
      <Panel>
        <PanelTitle>Distribuição das Miúdas</PanelTitle>
        <StackBar
          parts={[
            { label: 'Tesouro da Toca', value: s.house },
            { label: 'Jogadores', value: s.users },
            { label: 'Caixas de clubes', value: s.clubs },
            { label: 'Custódia de mesas', value: s.escrow },
          ]}
        />
      </Panel>
      <div className="grid grid-2">
        <Panel>
          <PanelTitle>Entradas de mesa por dia</PanelTitle>
          <AreaChart data={e.series.map((x: any) => ({ label: x.day, value: x.volume }))} unit="Miúdas" />
        </Panel>
        <Panel>
          <PanelTitle>Movimentações por tipo (30 dias)</PanelTitle>
          <BarList items={miudaKinds.slice(0, 8).map((k: any) => ({ key: k.kind, label: TX_LABELS[k.kind as TxKind] ?? k.kind, value: k.total, sub: `${fmt(k.count)} lançamentos` }))} />
        </Panel>
      </div>
      <Panel>
        <PanelTitle>Lançamentos recentes (créditos)</PanelTitle>
        <TxList items={e.recent} showOwner />
      </Panel>
    </div>
  );
}

function ActivityPage() {
  const q = useQuery({ queryKey: ['admin-activity'], queryFn: () => get<{ items: any[] }>('/admin/activity'), refetchInterval: 8000 });
  return <Panel>{q.isLoading ? <Loader /> : <ActivityFeed items={q.data!.items} />}</Panel>;
}

function GlobalSettings() {
  const q = useQuery({ queryKey: ['admin-settings'], queryFn: () => get<any>('/admin/settings') });
  const { busy, run } = useAct([['admin-settings'], ['me']]);
  const { signIn } = useSession();
  const qc = useQueryClient();
  const [f, setF] = useState<any>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  if (q.isLoading) return <Loader />;
  const v = f ?? q.data;
  const num = (k: string, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <Input type="number" value={v[k]} onChange={(e) => setF({ ...v, [k]: Number(e.target.value) })} />
    </Field>
  );
  return (
    <div className="grid grid-2">
      <Panel>
        <PanelTitle>Economia e progressão</PanelTitle>
        <div className="col gap-3">
          {num('welcomeBonus', 'Bônus de boas-vindas (Miúdas)')}
          {num('welcomeDiamonds', 'Diamantes de boas-vindas')}
          {num('levelUpDiamonds', 'Diamantes por nível')}
          {num('defaultRakePct', 'Taxa padrão das mesas (%)')}
          {num('defaultAgentCommissionPct', 'Comissão padrão de agentes (%)')}
          {num('maxTransfer', 'Limite por transferência')}
        </div>
      </Panel>
      <Panel>
        <PanelTitle>Vidas e operação</PanelTitle>
        <div className="col gap-3">
          {num('lifeRegenMinutes', 'Recuperação de 1 vida (minutos)')}
          {num('lifeRefillCostDiamonds', 'Custo de recarga por vida (💎)')}
          <Field label="Aviso para todos os jogadores" hint="Aparece na Toca e é enviado como notificação.">
            <textarea className="textarea" maxLength={200} value={v.announcement} onChange={(e) => setF({ ...v, announcement: e.target.value })} />
          </Field>
          <Toggle checked={v.maintenance} onChange={(x) => setF({ ...v, maintenance: x })} label="Modo manutenção" description="Somente Super Admins acessam a API." />
        </div>
      </Panel>
      <div className="row gap-2" style={{ gridColumn: '1 / -1' }}>
        <Button variant="primary" size="lg" loading={busy === 'save'} disabled={!f} onClick={async () => (await run('save', () => patch('/admin/settings', f), 'Configurações salvas.')) && setF(null)}>
          Salvar configurações
        </Button>
        <Button variant="danger" onClick={() => setResetOpen(true)}>
          Resetar dados
        </Button>
      </div>
      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Resetar dados de teste"
        footer={
          <Button
            variant="danger"
            disabled={confirm !== 'RESETAR'}
            loading={busy === 'reset'}
            onClick={() =>
              run('reset', async () => {
                await post('/admin/reset', { confirm: 'RESETAR' });
                const r = await demoLogin('SUPER_ADMIN');
                qc.clear();
                signIn(r.token, r.me);
                setResetOpen(false);
              }, 'A Toca foi recriada.')
            }
          >
            Apagar e recriar
          </Button>
        }
      >
        <div className="col gap-3">
          <div className="callout callout--danger">Apaga todos os dados e recria a demonstração. Use apenas em desenvolvimento/testes.</div>
          <Field label='Digite "RESETAR"'>
            <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
