import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Shield, Users, Table2, Flame } from 'lucide-react';
import { get } from '../lib/api';
import { Badge, Button, Emblem, Empty, Input, PageHead, Skeleton, Tabs } from '../components/ui';
import { CLUB_TYPES } from '../../../shared/catalog';
import { fmt } from '../lib/format';
import type { ClubDto } from '../lib/types';

const ROLE_LABEL: Record<string, string> = { owner: 'Fundador', admin: 'Admin', agent: 'Agente', member: 'Membro' };

export function ClubCard({ c }: { c: ClubDto }) {
  const type = CLUB_TYPES.find((t) => t.id === c.type);
  return (
    <Link to={`/clubes/${c.id}`} className="panel card-link club-card">
      <div className="club-card-head">
        <Emblem icon={c.emblem} color={c.color} size={56} />
        <div className="grow" style={{ minWidth: 0 }}>
          <h3 className="truncate">{c.name}</h3>
          <div className="row gap-2 row-wrap">
            <Badge tone={c.type === 'aberto' ? 'green' : c.type === 'convite' ? 'blue' : 'muted'}>{type?.label}</Badge>
            {c.myStatus === 'active' && <Badge tone="gold">{ROLE_LABEL[c.myRole ?? 'member']}</Badge>}
            {c.myStatus === 'pending' && <Badge tone="ember">Solicitado</Badge>}
            {c.myStatus === 'invited' && <Badge tone="ember">Convite!</Badge>}
            {c.status === 'suspended' && <Badge tone="ember">Suspenso</Badge>}
          </div>
        </div>
      </div>
      <p className="club-card-desc t-small t-muted">{c.description || 'Um clube da Toca.'}</p>
      <div className="club-card-stats">
        <span>
          <Users size={14} /> {fmt(c.members)}
        </span>
        <span>
          <Table2 size={14} /> {c.tables} mesas
        </span>
        <span>
          <Flame size={14} /> {c.gamesWeek} partidas/sem
        </span>
      </div>
    </Link>
  );
}

export default function Clubs() {
  const nav = useNavigate();
  const [tab, setTab] = useState<'todos' | 'meus'>('todos');
  const [search, setSearch] = useState('');
  const q = useQuery({ queryKey: ['clubs', tab, search], queryFn: () => get<{ items: ClubDto[] }>(`/clubs?mine=${tab === 'meus' ? 1 : 0}&q=${encodeURIComponent(search)}`) });
  return (
    <div className="page">
      <PageHead
        kicker="Irmandades"
        title="Clubes"
        subtitle="Junte-se a uma irmandade, jogue em mesas exclusivas e construa a fama do seu estandarte."
        actions={
          <Button variant="primary" icon={<Plus size={18} />} onClick={() => nav('/clubes/novo')}>
            Criar clube
          </Button>
        }
      />
      <div className="row row-between row-wrap gap-2">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'todos', label: 'Descobrir' },
            { id: 'meus', label: 'Meus clubes' },
          ]}
        />
        <div className="search-box">
          <Search size={16} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar clube" aria-label="Buscar clube" />
        </div>
      </div>
      {q.isLoading ? (
        <div className="grid grid-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} h={190} />
          ))}
        </div>
      ) : !q.data?.items.length ? (
        <Empty icon={<Shield size={42} />} title={tab === 'meus' ? 'Você ainda não tem um clube' : 'Nenhum clube encontrado'} action={<Button onClick={() => (tab === 'meus' ? setTab('todos') : nav('/clubes/novo'))}>{tab === 'meus' ? 'Descobrir clubes' : 'Fundar o primeiro'}</Button>}>
          {tab === 'meus' ? 'Descubra irmandades abertas ou funde a sua.' : 'Tente outro nome.'}
        </Empty>
      ) : (
        <div className="grid grid-2">
          {q.data.items.map((c) => (
            <ClubCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
