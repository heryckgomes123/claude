import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { get } from '../lib/api';
import { Badge, PageHead, Progress, Skeleton } from '../components/ui';
import { ThemeIcon, DiamondGem, PointsSeal } from '../components/Icon';
import { fmt, timeAgo } from '../lib/format';
import type { Achievement } from '../../../shared/catalog';

type Item = Achievement & { progress: number; unlockedAt: string | null };
const TIER: Record<string, string> = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro', lenda: 'Lendária' };

export default function Achievements() {
  const q = useQuery({ queryKey: ['achievements'], queryFn: () => get<{ items: Item[] }>('/me/achievements') });
  const items = q.data?.items ?? [];
  const done = items.filter((i) => i.unlockedAt).length;
  const sorted = [...items].sort((a, b) => Number(!!b.unlockedAt) - Number(!!a.unlockedAt) || b.progress / b.target - a.progress / a.target);
  return (
    <div className="page">
      <PageHead kicker="Feitos" title="Conquistas" subtitle={`${done} de ${items.length} desbloqueadas. Cada feito rende diamantes e reputação.`} />
      {items.length > 0 && (
        <div style={{ maxWidth: 520, marginBottom: 20 }}>
          <Progress value={done / items.length} gold label="Conquistas" />
        </div>
      )}
      {q.isLoading ? (
        <Skeleton h={300} />
      ) : (
        <div className="grid grid-3">
          {sorted.map((a) => {
            const unlocked = !!a.unlockedAt;
            return (
              <article key={a.id} className={`ach-card tier-${a.tier} ${unlocked ? 'is-unlocked' : ''}`}>
                <div className="ach-medal">{unlocked ? <ThemeIcon name={a.icon} size={30} /> : <Lock size={24} />}</div>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row gap-2 row-between">
                    <h3>{a.name}</h3>
                    <Badge tone={a.tier === 'ouro' ? 'gold' : a.tier === 'lenda' ? 'ember' : 'muted'}>{TIER[a.tier]}</Badge>
                  </div>
                  <p className="t-small t-muted">{a.description}</p>
                  {!unlocked && (
                    <div className="col gap-1 mt-2">
                      <Progress value={a.progress / a.target} />
                      <span className="t-xs t-dim t-num">
                        {fmt(a.progress)} / {fmt(a.target)}
                      </span>
                    </div>
                  )}
                  <div className="row gap-3 mt-2 t-small">
                    {a.reward.diamonds > 0 && (
                      <span className="coin">
                        <DiamondGem size={14} /> {a.reward.diamonds}
                      </span>
                    )}
                    {a.reward.points > 0 && (
                      <span className="coin">
                        <PointsSeal size={14} /> {a.reward.points}
                      </span>
                    )}
                    {unlocked && <span className="t-xs t-success" style={{ marginLeft: 'auto' }}>✓ {timeAgo(a.unlockedAt!)}</span>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
