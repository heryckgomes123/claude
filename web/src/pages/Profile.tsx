/**
 * Perfil do jogador: visão geral e evolução, personagens, relicário
 * (molduras e títulos), histórico de partidas e extrato com transferências.
 */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Check, Crown, Lock, Send, Swords, Trophy, Skull, Flame, Target, Bot, Medal, BookOpen, Bell, Settings, Handshake, LayoutDashboard } from 'lucide-react';
import { get, patch, post } from '../lib/api';
import { useMe, useSession } from '../lib/session';
import { CharacterArt, Portrait } from '../components/Portrait';
import { Badge, Button, Diamonds, Emblem, Empty, Field, Input, Lives, Miudas, Modal, Panel, PanelTitle, Progress, Segmented, Skeleton, Stat, Tabs, Countdown } from '../components/ui';
import { DiamondGem } from '../components/Icon';
import { useErrorToast, useToast } from '../components/Toast';
import { CHARACTERS, FRAMES, isUnlocked, type Unlock } from '../../../shared/catalog';
import { dateTime, fmt, fmtSigned, timeAgo } from '../lib/format';
import { sfx } from '../lib/sound';
import type { TxRow } from '../lib/types';

type Tab = 'visao' | 'personagens' | 'relicario' | 'historico' | 'extrato';

function unlockLabel(u: Unlock) {
  if (u.type === 'level') return `Nível ${u.level}`;
  if (u.type === 'diamonds') return `${u.cost} 💎`;
  return 'Livre';
}

export default function Profile() {
  const me = useMe();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('aba') as Tab) || 'visao';
  const setTab = (t: Tab) => setParams({ aba: t }, { replace: true });
  const winRate = me.stats.games ? Math.round((me.stats.wins / me.stats.games) * 100) : 0;

  return (
    <div className="page">
      <Panel variant="leather" rivets glow className="profile-hero">
        <Portrait avatar={me.avatar} frame={me.frame} size={120} square />
        <div className="grow col gap-2" style={{ minWidth: 0 }}>
          <span className="t-xs t-up" style={{ color: 'var(--c-ember)' }}>
            {me.title}
          </span>
          <h1 className="t-gold profile-name">{me.displayName}</h1>
          <span className="t-small t-dim">
            @{me.username} · na Toca desde {new Date(me.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            {me.isGuest && (
              <>
                {' '}
                · <Badge tone="ember">Convidado</Badge>
              </>
            )}
          </span>
          <div className="row gap-3 row-wrap">
            <Badge tone="gold">Nível {me.level}</Badge>
            <Lives lives={me.lives} />
            {me.nextLifeAt && (
              <span className="t-xs t-dim">
                +1 vida em <Countdown to={me.nextLifeAt} />
              </span>
            )}
          </div>
          <div style={{ maxWidth: 420 }}>
            <Progress value={me.levelProgress.pct} />
            <span className="t-xs t-dim">
              {fmt(me.levelProgress.current)}/{fmt(me.levelProgress.needed)} para o nível {me.level + 1}
            </span>
          </div>
        </div>
        <div className="profile-wallet">
          <Miudas value={me.miudas} size={26} />
          <Diamonds value={me.diamonds} size={24} />
        </div>
      </Panel>

      <div className="profile-links">
        <Link to="/conquistas" className="manage-link"><Medal size={16} /> Conquistas</Link>
        <Link to="/tutorial" className="manage-link"><BookOpen size={16} /> Tutorial</Link>
        <Link to="/notificacoes" className="manage-link"><Bell size={16} /> Notificações</Link>
        <Link to="/configuracoes" className="manage-link"><Settings size={16} /> Configurações</Link>
        {me.clubs.filter((c) => c.role === 'owner' || c.role === 'admin').map((c) => (
          <Link key={c.id} to={`/clubes/${c.id}/admin`} className="manage-link"><Crown size={16} /> Admin · {c.name}</Link>
        ))}
        {me.roles.includes('AGENT') && <Link to="/agente" className="manage-link"><Handshake size={16} /> Agente</Link>}
        {me.roles.includes('SUPER_ADMIN') && <Link to="/admin" className="manage-link manage-link--gold"><LayoutDashboard size={16} /> Central de Comando</Link>}
      </div>

      <div className="mt-4">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'visao', label: 'Visão geral' },
            { id: 'personagens', label: 'Personagens' },
            { id: 'relicario', label: 'Relicário' },
            { id: 'historico', label: 'Histórico' },
            { id: 'extrato', label: 'Carteira' },
          ]}
        />
      </div>

      {tab === 'visao' && (
        <div className="split">
          <div className="col gap-4">
            <div className="grid grid-4">
              <Stat label="Partidas" value={fmt(me.stats.games)} icon={<Swords size={13} />} />
              <Stat label="Vitórias" value={fmt(me.stats.wins)} icon={<Trophy size={13} />} sub={`${winRate}% de aproveitamento`} />
              <Stat label="Derrotas" value={fmt(me.stats.losses)} icon={<Skull size={13} />} />
              <Stat label="Melhor turno" value={fmt(me.stats.bestTurn)} icon={<Flame size={13} />} />
              <Stat label="Sequência máx." value={me.stats.maxWinStreak} icon={<Target size={13} />} />
              <Stat label="Dados quentes" value={me.stats.hotDice} icon={<Flame size={13} />} />
              <Stat label="Javalis levados" value={me.stats.busts} icon={<Skull size={13} />} />
              <Stat label="Miúdas ganhas" value={fmt(me.stats.miudasWon)} icon={<Crown size={13} />} />
            </div>
            <RecentGames limit={6} />
          </div>
          <aside className="col gap-4">
            <Panel>
              <PanelTitle>Clubes</PanelTitle>
              {me.clubs.length ? (
                <div className="list">
                  {me.clubs.map((c) => (
                    <Link key={c.id} to={`/clubes/${c.id}`} className="list-item list-item--button" style={{ color: 'inherit' }}>
                      <Emblem icon={c.emblem} color={c.color} size={34} />
                      <b className="grow truncate">{c.name}</b>
                      <Badge tone="muted">{{ owner: 'Fundador', admin: 'Admin', agent: 'Agente', member: 'Membro' }[c.role]}</Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <Empty title="Sem clube" action={<Link className="btn btn--sm" to="/clubes">Descobrir clubes</Link>} />
              )}
            </Panel>
            <Panel>
              <PanelTitle action={<Link to="/conquistas" className="t-xs t-up">Ver</Link>}>Conquistas</PanelTitle>
              <p className="t-muted">
                <b className="t-gold t-title" style={{ fontSize: '1.6rem' }}>
                  {me.achievementsUnlocked}
                </b>{' '}
                desbloqueadas
              </p>
            </Panel>
          </aside>
        </div>
      )}
      {tab === 'personagens' && <Characters />}
      {tab === 'relicario' && <Relicario />}
      {tab === 'historico' && <RecentGames limit={40} />}
      {tab === 'extrato' && <Statement />}
    </div>
  );
}

function Characters() {
  const me = useMe();
  const { setMe } = useSession();
  const onError = useErrorToast();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const choose = async (id: string) => {
    setBusy(id);
    try {
      setMe(await patch('/me', { avatar: id }));
      sfx.select();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(null);
    }
  };
  const buy = async (id: string) => {
    setBusy(id);
    try {
      setMe(await post('/shop/buy', { itemId: id }));
      sfx.coins();
      toast('Personagem desbloqueado!', 'reward');
    } catch (e) {
      onError(e);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="grid grid-3">
      {CHARACTERS.map((c) => {
        const unlocked = isUnlocked(c.unlock, me.level, me.ownedItems, c.id);
        const selected = me.avatar === c.id;
        return (
          <article key={c.id} className={`char-card ${selected ? 'is-selected' : ''} ${unlocked ? '' : 'is-locked'}`}>
            <div className="char-art">
              <CharacterArt id={c.id} />
              {!unlocked && (
                <span className="char-lock">
                  <Lock size={22} />
                  {unlockLabel(c.unlock)}
                </span>
              )}
              {selected && (
                <span className="char-selected">
                  <Check size={14} /> Em uso
                </span>
              )}
            </div>
            <div className="char-body">
              <h3>{c.name}</h3>
              <span className="char-role">{c.role}</span>
              <p className="t-small t-muted">{c.lore}</p>
              {selected ? null : unlocked ? (
                <Button size="sm" block loading={busy === c.id} onClick={() => choose(c.id)}>
                  Escolher
                </Button>
              ) : c.unlock.type === 'diamonds' ? (
                <Button size="sm" variant="primary" block loading={busy === c.id} disabled={me.diamonds < c.unlock.cost} onClick={() => buy(c.id)} icon={<DiamondGem size={14} />}>
                  Desbloquear · {c.unlock.cost}
                </Button>
              ) : (
                <Button size="sm" variant="ghost" block disabled>
                  Alcance o nível {c.unlock.type === 'level' ? c.unlock.level : ''}
                </Button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function Relicario() {
  const me = useMe();
  const { setMe } = useSession();
  const onError = useErrorToast();
  const toast = useToast();
  const titles = useQuery({ queryKey: ['titles'], queryFn: () => get<{ titles: string[] }>('/me/titles') });
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (id: string, fn: () => Promise<any>, ok?: string) => {
    setBusy(id);
    try {
      setMe(await fn());
      if (ok) {
        sfx.coins();
        toast(ok, 'reward');
      } else sfx.select();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="col gap-4">
      <Panel>
        <PanelTitle icon={<DiamondGem size={18} />} action={<Diamonds value={me.diamonds} />}>
          Molduras
        </PanelTitle>
        <div className="grid grid-4">
          {FRAMES.map((f) => {
            const unlocked = isUnlocked(f.unlock, me.level, me.ownedItems, f.id);
            const sel = me.frame === f.id;
            return (
              <div key={f.id} className={`frame-card ${sel ? 'is-selected' : ''}`}>
                <Portrait avatar={me.avatar} frame={f.id} size={72} />
                <b>{f.name}</b>
                {sel ? (
                  <Badge tone="gold">Em uso</Badge>
                ) : unlocked ? (
                  <Button size="sm" loading={busy === f.id} onClick={() => act(f.id, () => patch('/me', { frame: f.id }))}>
                    Usar
                  </Button>
                ) : f.unlock.type === 'diamonds' ? (
                  <Button size="sm" variant="primary" loading={busy === f.id} disabled={me.diamonds < f.unlock.cost} onClick={() => act(f.id, () => post('/shop/buy', { itemId: f.id }), 'Moldura adquirida!')}>
                    {f.unlock.cost} 💎
                  </Button>
                ) : (
                  <span className="t-xs t-dim">
                    <Lock size={11} /> {unlockLabel(f.unlock)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel>
        <PanelTitle icon={<Crown size={18} />}>Títulos</PanelTitle>
        <p className="t-small t-dim" style={{ marginBottom: 12 }}>
          Títulos vêm com o nível e com conquistas de ouro e lendárias.
        </p>
        <div className="row row-wrap gap-2">
          {titles.data?.titles.map((t) => (
            <button key={t} className="pick title-pick" aria-pressed={me.title === t} onClick={() => act(t, () => patch('/me', { title: t }))}>
              {t}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function RecentGames({ limit }: { limit: number }) {
  const q = useQuery({ queryKey: ['my-games'], queryFn: () => get<{ items: any[] }>('/me/games') });
  const items = (q.data?.items ?? []).slice(0, limit);
  return (
    <Panel>
      <PanelTitle>Histórico de partidas</PanelTitle>
      {q.isLoading ? (
        <Skeleton h={160} />
      ) : !items.length ? (
        <Empty icon={<Swords size={36} />} title="Nenhuma partida ainda" action={<Link to="/jogar" className="btn btn--primary btn--sm">Jogar agora</Link>} />
      ) : (
        <div className="list">
          {items.map((g) => (
            <Link key={g.id} to={`/partida/${g.id}`} className="list-item list-item--button history-item" style={{ color: 'inherit' }}>
              <span className={`history-badge ${g.won ? 'is-win' : ''}`}>{g.won ? <Trophy size={16} /> : `${g.placement}º`}</span>
              <div className="grow" style={{ minWidth: 0 }}>
                <b className="truncate" style={{ display: 'block' }}>
                  {g.kind === 'bot' && <Bot size={13} style={{ display: 'inline', marginRight: 4 }} />}
                  {g.roomName}
                </b>
                <span className="t-xs t-dim">
                  {g.players} jogadores · {fmt(g.score)} pontos na mesa · {g.finishedAt ? timeAgo(g.finishedAt) : ''}
                </span>
              </div>
              <div className="col gap-1" style={{ alignItems: 'flex-end' }}>
                {g.prize > 0 ? <Miudas value={g.prize} signed size={14} /> : g.entry > 0 ? <Miudas value={-g.entry} size={14} className="t-dim" /> : null}
                <span className="t-xs" style={{ color: 'var(--c-gold-300)' }}>
                  +{g.points} pts
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
}

function Statement() {
  const me = useMe();
  const [currency, setCurrency] = useState<'MIUDA' | 'DIAMOND' | 'ALL'>('MIUDA');
  const [open, setOpen] = useState(false);
  const q = useInfiniteQuery({
    queryKey: ['tx', currency],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => get<{ items: TxRow[]; next: number | null }>(`/me/transactions?${currency !== 'ALL' ? `currency=${currency}&` : ''}${pageParam ? `before=${pageParam}` : ''}`),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <div className="split">
      <Panel>
        <PanelTitle action={<Segmented value={currency} onChange={setCurrency} options={[{ value: 'MIUDA', label: 'Miúdas' }, { value: 'DIAMOND', label: 'Diamantes' }, { value: 'ALL', label: 'Tudo' }]} />}>Extrato</PanelTitle>
        {q.isLoading ? (
          <Skeleton h={240} />
        ) : !items.length ? (
          <Empty title="Nenhuma movimentação" />
        ) : (
          <div className="list">
            {items.map((t) => (
              <div key={t.id} className="list-item tx-item">
                <span className={`tx-ico ${t.amount > 0 ? 'is-in' : 'is-out'}`}>{t.amount > 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <b className="truncate" style={{ display: 'block' }}>
                    {t.description}
                  </b>
                  <span className="t-xs t-dim">
                    {t.label} · {dateTime(t.createdAt)}
                  </span>
                </div>
                <div className="col gap-1" style={{ alignItems: 'flex-end' }}>
                  <b className={`t-num ${t.amount > 0 ? 't-success' : ''}`}>
                    {fmtSigned(t.amount)} {t.currency === 'DIAMOND' ? '💎' : ''}
                  </b>
                  <span className="t-xs t-dim t-num">saldo {fmt(t.balanceAfter)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {q.hasNextPage && (
          <Button block variant="ghost" className="mt-4" loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
            Carregar mais
          </Button>
        )}
      </Panel>
      <aside className="col gap-4">
        <Panel glow>
          <PanelTitle>Bolsa</PanelTitle>
          <div className="col gap-2">
            <Miudas value={me.miudas} size={28} />
            <Diamonds value={me.diamonds} size={24} />
            <span className="t-xs t-dim">1 Miúda = R$ 1 (economia de referência)</span>
          </div>
          <Button block variant="primary" className="mt-4" icon={<Send size={16} />} onClick={() => setOpen(true)} disabled={me.isGuest}>
            Transferir Miúdas
          </Button>
          {me.isGuest && <p className="t-xs t-dim mt-2">Crie seu usuário e senha em Ajustes para transferir.</p>}
        </Panel>
      </aside>
      <TransferModal open={open} onClose={() => setOpen(false)} onDone={() => q.refetch()} />
    </div>
  );
}

export function TransferModal({ open, onClose, onDone, to = '' }: { open: boolean; onClose: () => void; onDone?: () => void; to?: string }) {
  const { setMe, me } = useSession();
  const toast = useToast();
  const onError = useErrorToast();
  const [user, setUser] = useState(to);
  const [amount, setAmount] = useState(100);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const search = useQuery({ queryKey: ['psearch', user], queryFn: () => get<{ items: any[] }>(`/players/search?q=${encodeURIComponent(user)}`), enabled: user.length >= 2 && open });
  const send = async () => {
    setBusy(true);
    try {
      const r = await post<{ to: string; amount: number; me: any }>('/wallet/transfer', { to: user.trim().toLowerCase(), amount, note: note || undefined });
      setMe(r.me);
      sfx.coins();
      toast(`${fmt(r.amount)} Miúdas enviadas para ${r.to}.`, 'success');
      onDone?.();
      onClose();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transferir Miúdas"
      footer={
        <Button variant="primary" loading={busy} disabled={user.length < 3 || amount <= 0} onClick={send} icon={<Send size={16} />}>
          Enviar {fmt(amount)}
        </Button>
      }
    >
      <div className="col gap-4">
        <Field label="Para (usuário)">
          <Input value={user} onChange={(e) => setUser(e.target.value.toLowerCase())} placeholder="usuário" autoFocus />
        </Field>
        {search.data?.items?.length ? (
          <div className="row row-wrap gap-2">
            {search.data.items.slice(0, 5).map((p) => (
              <button key={p.id} className="pick player-pick" aria-pressed={user === p.username} onClick={() => setUser(p.username)}>
                <Portrait avatar={p.avatar} size={24} /> {p.displayName}
              </button>
            ))}
          </div>
        ) : null}
        <Field label="Valor" hint={`Saldo: ${fmt(me?.miudas ?? 0)} Miúdas`}>
          <Input type="number" min={1} value={amount} onChange={(e) => setAmount(Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
        </Field>
        <Field label="Mensagem (opcional)">
          <Input value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} placeholder="Pela rodada de ontem!" />
        </Field>
      </div>
    </Modal>
  );
}

