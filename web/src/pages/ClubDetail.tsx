import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Crown, DoorOpen, LogOut, UserPlus, Users, ScrollText, Activity, Table2, Coins } from 'lucide-react';
import { get, post } from '../lib/api';
import { useSession } from '../lib/session';
import { Badge, Button, Confirm, Emblem, Empty, Field, Input, Loader, Modal, PageHead, Panel, PanelTitle, Stat, Tabs } from '../components/ui';
import { Portrait } from '../components/Portrait';
import { ActivityFeed, CreateRoomModal, TableCard } from '../components/game-ui';
import { useErrorToast, useToast } from '../components/Toast';
import { CLUB_TYPES } from '../../../shared/catalog';
import { fmt } from '../lib/format';
import type { ClubDto, TableDto } from '../lib/types';
import { sfx } from '../lib/sound';

interface Detail {
  club: ClubDto;
  members: { userId: string; username: string; displayName: string; avatar: string; frame: string; level: number; role: string; online: boolean; games: number; wins: number }[];
  activity: any[];
  tables: TableDto[];
}
const ROLE: Record<string, string> = { owner: 'Fundador', admin: 'Administrador', agent: 'Agente', member: 'Membro' };

export default function ClubDetail() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { refresh, me } = useSession();
  const toast = useToast();
  const onError = useErrorToast();
  const [tab, setTab] = useState<'mesas' | 'membros' | 'atividade' | 'regras'>('mesas');
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState(100);
  const q = useQuery({ queryKey: ['club', id], queryFn: () => get<Detail>(`/clubs/${id}`), refetchInterval: 10000 });

  if (q.isLoading) return <Loader />;
  if (!q.data) return <Empty title="Clube não encontrado" action={<Button onClick={() => nav('/clubes')}>Voltar</Button>} />;
  const { club, members, activity, tables } = q.data;
  const isMember = club.myStatus === 'active';
  const isAdmin = isMember && (club.myRole === 'owner' || club.myRole === 'admin');
  const canInvite = isMember && (isAdmin || club.myRole === 'agent' || club.settings.membersCanInvite);
  const type = CLUB_TYPES.find((t) => t.id === club.type)!;

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try {
      await fn();
      if (ok) toast(ok, 'success');
      sfx.coin();
      qc.invalidateQueries({ queryKey: ['club', id] });
      qc.invalidateQueries({ queryKey: ['clubs'] });
      refresh();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page">
      <PageHead back={{ to: '/clubes', label: 'Clubes' }} title={club.name} />
      <Panel variant="leather" rivets glow className="club-hero">
        <Emblem icon={club.emblem} color={club.color} size={96} />
        <div className="grow col gap-2" style={{ minWidth: 0 }}>
          <div className="row gap-2 row-wrap">
            <Badge tone={club.type === 'aberto' ? 'green' : club.type === 'convite' ? 'blue' : 'muted'}>{type.label}</Badge>
            {isMember && <Badge tone="gold">{ROLE[club.myRole ?? 'member']}</Badge>}
            {club.settings.minLevel > 1 && <Badge tone="muted">Nível mín. {club.settings.minLevel}</Badge>}
            {club.status === 'suspended' && <Badge tone="ember">Suspenso</Badge>}
          </div>
          <p className="t-muted">{club.description}</p>
          <span className="t-xs t-dim">
            Fundado por {club.ownerName} · taxa das mesas {club.settings.rakePct}%
          </span>
          <div className="row gap-2 row-wrap mt-2">
            {!club.myStatus && club.type !== 'convite' && (
              <Button variant="primary" loading={busy === 'join'} onClick={() => run('join', () => post(`/clubs/${club.id}/join`), club.type === 'aberto' ? 'Bem-vindo ao clube!' : 'Solicitação enviada!')}>
                {club.type === 'aberto' ? 'Entrar no clube' : 'Solicitar entrada'}
              </Button>
            )}
            {!club.myStatus && club.type === 'convite' && <span className="t-small t-dim">Somente por convite.</span>}
            {club.myStatus === 'pending' && <Badge tone="ember">Solicitação aguardando aprovação</Badge>}
            {club.myStatus === 'invited' && (
              <>
                <Button variant="primary" loading={busy === 'accept'} onClick={() => run('accept', () => post(`/clubs/${club.id}/invite/respond`, { accept: true }), 'Convite aceito!')}>
                  Aceitar convite
                </Button>
                <Button variant="ghost" onClick={() => run('decline', () => post(`/clubs/${club.id}/invite/respond`, { accept: false }))}>
                  Recusar
                </Button>
              </>
            )}
            {isAdmin && (
              <Link to={`/clubes/${club.id}/admin`} className="btn btn--primary">
                <Crown size={16} /> Administração
              </Link>
            )}
            {canInvite && (
              <Button icon={<UserPlus size={16} />} onClick={() => setInviteOpen(true)}>
                Convidar
              </Button>
            )}
            {isMember && (
              <Button icon={<DoorOpen size={16} />} onClick={() => setRoomOpen(true)}>
                Sala do clube
              </Button>
            )}
            {isMember && (
              <Button icon={<Coins size={16} />} onClick={() => setDepositOpen(true)}>
                Depositar no caixa
              </Button>
            )}
            {isMember && club.myRole !== 'owner' && (
              <Button variant="ghost" icon={<LogOut size={16} />} onClick={() => setLeaveOpen(true)}>
                Sair
              </Button>
            )}
          </div>
        </div>
      </Panel>

      <div className="grid grid-4 mt-4">
        <Stat label="Membros" value={fmt(club.members)} icon={<Users size={13} />} />
        <Stat label="Mesas" value={club.tables} icon={<Table2 size={13} />} />
        <Stat label="Partidas (7 dias)" value={club.gamesWeek} icon={<Activity size={13} />} />
        <Stat label="Reputação" value={fmt(club.points)} icon={<Crown size={13} />} />
      </div>

      <div className="mt-6">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'mesas', label: 'Mesas', icon: <Table2 size={14} /> },
            { id: 'membros', label: 'Membros', icon: <Users size={14} /> },
            { id: 'atividade', label: 'Atividade', icon: <Activity size={14} /> },
            { id: 'regras', label: 'Regras', icon: <ScrollText size={14} /> },
          ]}
        />
        {tab === 'mesas' &&
          (tables.length ? (
            <div className="grid grid-3">
              {tables.map((t) => (
                <TableCard key={t.id} t={t} />
              ))}
            </div>
          ) : (
            <Empty icon={<Table2 size={40} />} title="Nenhuma mesa aberta" action={isAdmin ? <Link className="btn" to={`/clubes/${club.id}/admin/mesas`}>Abrir mesa</Link> : undefined} />
          ))}
        {tab === 'membros' && (
          <Panel>
            <div className="list">
              {members.map((m) => (
                <Link key={m.userId} to={`/jogador/${m.username}`} className="list-item list-item--button" style={{ color: 'inherit' }}>
                  <Portrait avatar={m.avatar} frame={m.frame} size={42} level={m.level} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row gap-2">
                      <b className="truncate">{m.displayName}</b>
                      {m.online && <span className="online-dot" title="Online" />}
                    </div>
                    <span className="t-xs t-dim">
                      {m.games} partidas no clube · {m.wins} vitórias
                    </span>
                  </div>
                  <Badge tone={m.role === 'owner' ? 'gold' : m.role === 'admin' ? 'ember' : m.role === 'agent' ? 'blue' : 'muted'}>{ROLE[m.role]}</Badge>
                </Link>
              ))}
            </div>
          </Panel>
        )}
        {tab === 'atividade' && (
          <Panel>
            <ActivityFeed items={activity} />
          </Panel>
        )}
        {tab === 'regras' && (
          <Panel variant="parchment">
            <PanelTitle icon={<ScrollText size={18} />}>Regras do clube</PanelTitle>
            <p style={{ whiteSpace: 'pre-wrap' }}>{club.rules || 'Este clube ainda não escreveu suas regras.'}</p>
            <hr className="divider" />
            <ul className="t-small">
              <li>Taxa das mesas: {club.settings.rakePct}% do pote (vai para o caixa do clube).</li>
              <li>Entrada máxima: {fmt(club.settings.maxEntry)} Miúdas.</li>
              <li>Limite de membros: {club.settings.maxMembers}.</li>
              <li>{club.settings.allowBots ? 'Mesas podem ser completadas com bots da casa.' : 'Mesas sem bots.'}</li>
            </ul>
          </Panel>
        )}
      </div>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Convidar para o clube" footer={<Button variant="primary" loading={busy === 'invite'} onClick={() => run('invite', async () => (await post(`/clubs/${club.id}/invite`, { username: username.trim().toLowerCase() }), setInviteOpen(false), setUsername('')), 'Convite enviado!')}>Enviar convite</Button>}>
        <Field label="Usuário do jogador" hint={club.myRole === 'agent' ? 'Jogadores convidados por você ficam vinculados como seus.' : undefined}>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ex.: aric" autoFocus />
        </Field>
      </Modal>
      <Modal open={depositOpen} onClose={() => setDepositOpen(false)} title="Depositar no caixa" footer={<Button variant="primary" loading={busy === 'dep'} onClick={() => run('dep', async () => (await post(`/clubs/${club.id}/deposit`, { amount }), setDepositOpen(false)), 'Depósito realizado!')}>Depositar {fmt(amount)} Miúdas</Button>}>
        <Field label="Valor (Miúdas)" hint={`Seu saldo: ${fmt(me?.miudas ?? 0)}`}>
          <Input type="number" min={1} value={amount} onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 0))} />
        </Field>
      </Modal>
      <CreateRoomModal open={roomOpen} onClose={() => setRoomOpen(false)} clubId={club.id} />
      <Confirm open={leaveOpen} onClose={() => setLeaveOpen(false)} title="Sair do clube?" message="Você perde acesso às mesas exclusivas." danger confirmLabel="Sair" onConfirm={() => run('leave', async () => (await post(`/clubs/${club.id}/leave`), setLeaveOpen(false)), 'Você saiu do clube.')} />
    </div>
  );
}
