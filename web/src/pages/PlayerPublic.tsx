import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Send, Swords, Trophy, Flame, Target } from 'lucide-react';
import { get } from '../lib/api';
import { useMe } from '../lib/session';
import { Portrait } from '../components/Portrait';
import { Badge, Button, Emblem, Empty, Loader, PageHead, Panel, PanelTitle, Stat } from '../components/ui';
import { ThemeIcon } from '../components/Icon';
import { ACHIEVEMENT_MAP } from '../../../shared/catalog';
import { fmt, timeAgo } from '../lib/format';
import { TransferModal } from './Profile';

export default function PlayerPublic() {
  const { username = '' } = useParams();
  const me = useMe();
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ['player', username], queryFn: () => get<any>(`/players/${username}`) });
  if (q.isLoading) return <Loader />;
  if (!q.data) return <Empty title="Jogador não encontrado" />;
  const p = q.data;
  const winRate = p.stats.games ? Math.round((p.stats.wins / p.stats.games) * 100) : 0;
  return (
    <div className="page">
      <PageHead back={{ to: '/ranking', label: 'Ranking' }} title="" />
      <Panel variant="leather" rivets glow className="profile-hero">
        <Portrait avatar={p.avatar} frame={p.frame} size={120} square />
        <div className="grow col gap-2">
          <span className="t-xs t-up" style={{ color: 'var(--c-ember)' }}>{p.title}</span>
          <h1 className="t-gold profile-name">{p.displayName}</h1>
          <span className="t-small t-dim">@{p.username}{p.resident && ' · residente da Toca'}</span>
          <div className="row gap-2 row-wrap">
            <Badge tone="gold">Nível {p.level}</Badge>
            <Badge>{fmt(p.points)} pontos</Badge>
            {p.clubs.map((c: any) => (
              <Link key={c.id} to={`/clubes/${c.id}`} className="row gap-1 t-small">
                <Emblem icon={c.emblem} color={c.color} size={18} /> {c.name}
              </Link>
            ))}
          </div>
        </div>
        {p.id !== me.id && !p.resident && (
          <Button icon={<Send size={16} />} onClick={() => setOpen(true)} disabled={me.isGuest}>
            Transferir
          </Button>
        )}
      </Panel>
      <div className="grid grid-4 mt-4">
        <Stat label="Partidas" value={fmt(p.stats.games)} icon={<Swords size={13} />} />
        <Stat label="Vitórias" value={fmt(p.stats.wins)} sub={`${winRate}%`} icon={<Trophy size={13} />} />
        <Stat label="Melhor turno" value={fmt(p.stats.bestTurn)} icon={<Flame size={13} />} />
        <Stat label="Sequência máx." value={p.stats.maxWinStreak} icon={<Target size={13} />} />
      </div>
      <div className="split mt-4">
        <Panel>
          <PanelTitle>Partidas recentes</PanelTitle>
          <div className="list">
            {p.recentGames.map((g: any) => (
              <div key={g.id} className="list-item">
                <span className={`history-badge ${g.won ? 'is-win' : ''}`}>{g.won ? <Trophy size={16} /> : `${g.placement}º`}</span>
                <div className="grow">
                  <b>{g.roomName}</b>
                  <div className="t-xs t-dim">{g.players} jogadores · {g.finishedAt ? timeAgo(g.finishedAt) : ''}</div>
                </div>
                <b className="t-num">{fmt(g.score)}</b>
              </div>
            ))}
            {!p.recentGames.length && <p className="t-dim">Sem partidas ainda.</p>}
          </div>
        </Panel>
        <Panel>
          <PanelTitle>Conquistas ({p.achievements.length})</PanelTitle>
          <div className="row row-wrap gap-2">
            {p.achievements.map((id: string) => {
              const a = ACHIEVEMENT_MAP[id];
              return a ? (
                <span key={id} className={`ach-chip tier-${a.tier}`} title={a.description}>
                  <ThemeIcon name={a.icon} size={14} /> {a.name}
                </span>
              ) : null;
            })}
          </div>
        </Panel>
      </div>
      <TransferModal open={open} onClose={() => setOpen(false)} to={p.username} />
    </div>
  );
}
