import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Crown, Trophy } from 'lucide-react';
import { get } from '../lib/api';
import { useMe } from '../lib/session';
import { Portrait } from '../components/Portrait';
import { Badge, Emblem, Empty, PageHead, Panel, Skeleton, Tabs } from '../components/ui';
import { fmt } from '../lib/format';

type T = 'geral' | 'semana' | 'vitorias' | 'clubes';

export default function Ranking() {
  const me = useMe();
  const [type, setType] = useState<T>('geral');
  const q = useQuery({ queryKey: ['ranking', type], queryFn: () => get<any>(`/rankings?type=${type}`) });
  const entries: any[] = q.data?.entries ?? [];
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);
  const valueLabel = type === 'vitorias' ? 'vitórias' : type === 'semana' ? 'pts na semana' : 'pontos';
  return (
    <div className="page">
      <PageHead kicker="Parede da Fama" title="Ranking" subtitle={q.data?.me ? `Sua posição: ${q.data.me}º` : 'Os nomes que a Toca não esquece.'} />
      <Tabs
        value={type}
        onChange={setType}
        tabs={[
          { id: 'geral', label: 'Reputação' },
          { id: 'semana', label: 'Semana' },
          { id: 'vitorias', label: 'Vitórias' },
          { id: 'clubes', label: 'Clubes' },
        ]}
      />
      {q.isLoading ? (
        <Skeleton h={320} />
      ) : !entries.length ? (
        <Empty icon={<Trophy size={40} />} title="Ninguém pontuou ainda" />
      ) : (
        <>
          <div className="podium">
            {[podium[1], podium[0], podium[2]].map((e, k) =>
              e ? (
                <div key={e.id} className={`podium-spot place-${e.position}`}>
                  {e.position === 1 && <Crown size={30} className="podium-crown" />}
                  {type === 'clubes' ? <Emblem icon={e.emblem} color={e.color} size={e.position === 1 ? 84 : 66} /> : <Portrait avatar={e.avatar} frame={e.frame} size={e.position === 1 ? 96 : 74} level={e.level} />}
                  <b className="truncate">{type === 'clubes' ? e.name : <Link to={`/jogador/${e.username}`}>{e.name}</Link>}</b>
                  <span className="t-num t-gold t-title">{fmt(type === 'clubes' ? e.points : e.value)}</span>
                  <div className="podium-block">{e.position}</div>
                </div>
              ) : (
                <div key={k} />
              ),
            )}
          </div>
          <Panel>
            <div className="table-wrap" style={{ border: 0 }}>
              <table className="table rank-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{type === 'clubes' ? 'Clube' : 'Jogador'}</th>
                    {type !== 'clubes' && <th className="hide-mobile">Nível</th>}
                    {type !== 'clubes' ? <th className="num hide-mobile">Desempenho</th> : <th className="num">Membros</th>}
                    <th className="num">{type === 'clubes' ? 'Reputação' : valueLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((e) => (
                    <tr key={e.id} className={e.id === me.id ? 'is-me' : ''}>
                      <td className="t-num">{e.position}</td>
                      <td>
                        {type === 'clubes' ? (
                          <Link to={`/clubes/${e.id}`} className="row gap-2" style={{ color: 'inherit' }}>
                            <Emblem icon={e.emblem} color={e.color} size={28} /> <b>{e.name}</b>
                          </Link>
                        ) : (
                          <Link to={`/jogador/${e.username}`} className="row gap-2" style={{ color: 'inherit' }}>
                            <Portrait avatar={e.avatar} frame={e.frame} size={34} />
                            <span style={{ minWidth: 0 }}>
                              <b className="truncate" style={{ display: 'block' }}>{e.name}</b>
                              <span className="t-xs t-dim">{e.club ?? e.title}</span>
                            </span>
                          </Link>
                        )}
                      </td>
                      {type !== 'clubes' && (
                        <td className="hide-mobile">
                          <Badge tone="muted">Nv {e.level}</Badge>
                        </td>
                      )}
                      {type !== 'clubes' ? (
                        <td className="num hide-mobile t-small t-muted">
                          {e.wins}V · {e.games}P · {e.winRate}%
                        </td>
                      ) : (
                        <td className="num">{e.members}</td>
                      )}
                      <td className="num">
                        <b className="t-gold">{fmt(type === 'clubes' ? e.points : e.value)}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
