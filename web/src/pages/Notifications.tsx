import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Coins, Crown, DoorOpen, Medal, Megaphone, Shield, Swords, Trash2, UserPlus, Sparkles, X } from 'lucide-react';
import { del, get, post } from '../lib/api';
import { useSession } from '../lib/session';
import { Button, Empty, PageHead, Panel, Segmented, Skeleton } from '../components/ui';
import { useErrorToast, useToast } from '../components/Toast';
import { timeAgo } from '../lib/format';
import { sfx } from '../lib/sound';

interface N {
  id: number;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  meta: Record<string, any>;
  read: boolean;
  createdAt: string;
}
const ICON: Record<string, React.ReactElement> = {
  invite_room: <DoorOpen size={18} />,
  invite_club: <UserPlus size={18} />,
  club_request: <UserPlus size={18} />,
  club: <Shield size={18} />,
  match: <Swords size={18} />,
  reward: <Sparkles size={18} />,
  transfer: <Coins size={18} />,
  achievement: <Medal size={18} />,
  level: <Crown size={18} />,
  system: <Megaphone size={18} />,
};
const FILTERS: Record<string, string[]> = {
  todas: [],
  convites: ['invite_room', 'invite_club', 'club_request'],
  partidas: ['match'],
  recompensas: ['reward', 'achievement', 'level', 'transfer'],
  sistema: ['system', 'club'],
};

export default function Notifications() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { refresh } = useSession();
  const toast = useToast();
  const onError = useErrorToast();
  const [params] = useSearchParams();
  const [filter, setFilter] = useState(() => (params.get('filtro') && FILTERS[params.get('filtro')!] ? params.get('filtro')! : 'todas'));
  const q = useQuery({ queryKey: ['notifications'], queryFn: () => get<{ items: N[] }>('/notifications'), refetchInterval: 15000 });
  const items = (q.data?.items ?? []).filter((n) => !FILTERS[filter].length || FILTERS[filter].includes(n.kind));
  const reload = () => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
    refresh();
  };
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) {
        sfx.coin();
        toast(ok, 'success');
      }
      reload();
    } catch (e) {
      onError(e);
    }
  };
  const open = async (n: N) => {
    if (!n.read) await post(`/notifications/${n.id}/read`).catch(() => undefined);
    reload();
    if (n.link) nav(n.link);
  };
  const fresh = items.filter((n) => !n.read);
  const old = items.filter((n) => n.read);

  const renderItem = (n: N) => (
    <li key={n.id} className={`notif ${n.read ? '' : 'is-unread'} kind-${n.kind}`}>
      <button className="notif-main" onClick={() => open(n)}>
        <span className="notif-ico">{ICON[n.kind] ?? <Bell size={18} />}</span>
        <span className="grow" style={{ minWidth: 0 }}>
          <b>{n.title}</b>
          {n.body && <span className="t-small t-muted notif-body">{n.body}</span>}
          <span className="t-xs t-dim">{timeAgo(n.createdAt)}</span>
        </span>
      </button>
      <div className="notif-actions">
        {n.meta?.action === 'club_invite' && n.meta.clubId && (
          <>
            <Button size="sm" variant="primary" onClick={() => run(async () => (await post(`/clubs/${n.meta.clubId}/invite/respond`, { accept: true }), await post(`/notifications/${n.id}/read`)), 'Bem-vindo ao clube!')}>
              Aceitar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => run(async () => (await post(`/clubs/${n.meta.clubId}/invite/respond`, { accept: false }), await del(`/notifications/${n.id}`)))}>
              Recusar
            </Button>
          </>
        )}
        {n.meta?.action === 'room_invite' && n.meta.roomCode && (
          <Button size="sm" variant="primary" onClick={() => run(async () => (await post(`/rooms/${n.meta.roomCode}/join`), await post(`/notifications/${n.id}/read`), nav(`/sala/${n.meta.roomCode}`)))}>
            Entrar
          </Button>
        )}
        {n.kind === 'club_request' && n.meta.clubId && n.meta.userId && !n.read && (
          <>
            <Button size="sm" variant="primary" onClick={() => run(async () => (await post(`/clubs/${n.meta.clubId}/admin/requests/${n.meta.userId}`, { approve: true }), await post(`/notifications/${n.id}/read`)), 'Membro aprovado!')}>
              Aprovar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => run(async () => (await post(`/clubs/${n.meta.clubId}/admin/requests/${n.meta.userId}`, { approve: false }), await post(`/notifications/${n.id}/read`)))}>
              Recusar
            </Button>
          </>
        )}
        <button className="notif-del" aria-label="Apagar notificação" onClick={() => run(() => del(`/notifications/${n.id}`))}>
          <X size={15} />
        </button>
      </div>
    </li>
  );

  return (
    <div className="page">
      <PageHead
        kicker="Mensageiro"
        title="Notificações"
        actions={
          <>
            <Button size="sm" icon={<CheckCheck size={15} />} onClick={() => run(() => post('/notifications/read-all'))}>
              Marcar todas como lidas
            </Button>
            <Button size="sm" variant="ghost" icon={<Trash2 size={15} />} onClick={() => run(() => del('/notifications'), 'Lidas removidas.')}>
              Limpar lidas
            </Button>
          </>
        }
      />
      <div style={{ marginBottom: 16 }}>
        <Segmented value={filter} onChange={setFilter} options={Object.keys(FILTERS).map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1) }))} />
      </div>
      {q.isLoading ? (
        <Skeleton h={300} />
      ) : !items.length ? (
        <Empty icon={<Bell size={42} />} title="Nenhuma notificação">
          O mensageiro Lupi avisará quando algo acontecer.
        </Empty>
      ) : (
        <div className="col gap-4">
          {fresh.length > 0 && (
            <Panel>
              <h3 className="notif-group">Novas · {fresh.length}</h3>
              <ul className="notif-list">{fresh.map(renderItem)}</ul>
            </Panel>
          )}
          {old.length > 0 && (
            <Panel>
              <h3 className="notif-group">Anteriores</h3>
              <ul className="notif-list">{old.map(renderItem)}</ul>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
