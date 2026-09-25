/**
 * Peças compartilhadas de jogo: cartas de mesa, feed da Toca e os modais de
 * Jogar contra Bot, Sala Privada e Entrar com Código.
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, Hash, Lock, Users, Swords, Crown, Coins, Flame, Shield, UserPlus, Trophy, Hourglass, Megaphone } from 'lucide-react';
import { post } from '../lib/api';
import { useSession } from '../lib/session';
import { Badge, Button, Countdown, Emblem, Field, Input, Lives, Miudas, Modal, Segmented, Slider } from './ui';
import { Portrait } from './Portrait';
import { useErrorToast, useToast } from './Toast';
import { timeAgo } from '../lib/format';
import { BOT_DIFFICULTIES } from '../../../shared/bot';
import { BOT_REWARDS, TABLE_CATEGORIES } from '../../../shared/catalog';
import type { TableDto } from '../lib/types';
import { sfx } from '../lib/sound';

const CAT_TONE: Record<string, 'muted' | 'gold' | 'ember' | 'blue'> = { taverna: 'muted', bronze: 'ember', ouro: 'gold', lendaria: 'blue' };

export function TableCard({ t, compact }: { t: TableDto; compact?: boolean }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const [busy, setBusy] = useState(false);
  const cat = TABLE_CATEGORIES.find((c) => c.id === t.category);
  const join = async () => {
    setBusy(true);
    try {
      await post(`/rooms/${t.code}/join`);
      sfx.coin();
      qc.invalidateQueries({ queryKey: ['tables'] });
      nav(`/sala/${t.code}`);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const live = t.status === 'playing';
  return (
    <article className={`table-card cat-${t.category} ${compact ? 'is-compact' : ''}`}>
      <div className="table-card-top">
        <Badge tone={CAT_TONE[t.category]}>{cat?.label ?? t.category}</Badge>
        {live ? (
          <Badge tone="ember" live>
            Rodada {t.round}/{t.rounds}
          </Badge>
        ) : t.startsAt ? (
          <Badge tone="green">
            <Hourglass size={11} /> <Countdown to={t.startsAt} format="s" />s
          </Badge>
        ) : (
          <Badge tone="green">Aguardando</Badge>
        )}
      </div>
      <h3 className="table-card-name">{t.name}</h3>
      <div className="table-card-club">
        {t.club ? (
          <>
            <Emblem icon={t.club.emblem} color={t.club.color} size={18} />
            <span className="truncate">{t.club.name}</span>
          </>
        ) : (
          <>
            <Flame size={14} color="var(--c-ember)" /> <span>Mesa da Toca</span>
          </>
        )}
      </div>
      <div className="table-card-seats" aria-label={`${t.players} de ${t.capacity} jogadores`}>
        {Array.from({ length: t.capacity }).map((_, i) => (
          <span key={i} className={`seat-dot ${i < t.players ? 'is-taken' : ''}`} />
        ))}
        <span className="t-small t-muted" style={{ marginLeft: 6 }}>
          <b className="t-num">
            {t.players}/{t.capacity}
          </b>{' '}
          jogadores
        </span>
        {t.spectators > 0 && (
          <span className="t-xs t-dim row gap-1" style={{ marginLeft: 'auto' }}>
            <Eye size={13} /> {t.spectators}
          </span>
        )}
      </div>
      <div className="table-card-money">
        <div>
          <span className="t-xs t-dim t-up">Entrada</span>
          <Miudas value={t.entryFee} />
        </div>
        <div>
          <span className="t-xs t-dim t-up">Prêmio</span>
          <Miudas value={t.prize} className="t-gold" />
        </div>
        <div className="hide-mobile">
          <span className="t-xs t-dim t-up">Rodadas</span>
          <b>{t.rounds}</b>
        </div>
      </div>
      {live ? (
        <Button variant="iron" block icon={<Eye size={16} />} onClick={() => nav(`/partida/${t.gameId}`)}>
          Assistir
        </Button>
      ) : t.canJoin ? (
        <Button variant="primary" block loading={busy} onClick={join}>
          Entrar
        </Button>
      ) : (
        <Button variant="ghost" block icon={<Lock size={15} />} onClick={() => nav(`/clubes/${t.club?.id}`)}>
          Só membros
        </Button>
      )}
    </article>
  );
}

const ACT_ICON: Record<string, React.ReactElement> = {
  game_win: <Trophy size={14} />,
  club_join: <UserPlus size={14} />,
  club_create: <Shield size={14} />,
  achievement: <Crown size={14} />,
  level: <Crown size={14} />,
  transfer: <Coins size={14} />,
  bot_win: <Swords size={14} />,
  admin: <Megaphone size={14} />,
};

export function ActivityFeed({ items, empty = 'A Toca está quieta… por enquanto.' }: { items: { id: number; kind: string; message: string; actor: { name: string; avatar: string } | null; createdAt: string }[]; empty?: string }) {
  if (!items.length) return <p className="t-dim t-small">{empty}</p>;
  return (
    <ul className="feed">
      {items.map((a) => (
        <li key={a.id} className="feed-item">
          {a.actor ? <Portrait avatar={a.actor.avatar} size={30} /> : <span className="feed-ico">{ACT_ICON[a.kind] ?? <Flame size={14} />}</span>}
          <div className="grow">
            <p className="t-small">{a.message}</p>
            <span className="t-xs t-dim row gap-1">
              {ACT_ICON[a.kind]} {timeAgo(a.createdAt)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------ Jogar contra Bot */
export function BotSetupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { me, refresh } = useSession();
  const nav = useNavigate();
  const onError = useErrorToast();
  const [difficulty, setDifficulty] = useState<'facil' | 'medio' | 'dificil'>('medio');
  const [rounds, setRounds] = useState(5);
  const [opponents, setOpponents] = useState(2);
  const [busy, setBusy] = useState(false);
  const noLives = (me?.lives ?? 0) <= 0;
  const start = async () => {
    setBusy(true);
    try {
      const r = await post<{ gameId: string }>('/games/bot', { difficulty, rounds, opponents });
      onClose();
      nav(`/partida/${r.gameId}`);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const refill = async () => {
    try {
      await post('/lives/refill');
      sfx.coins();
      refresh();
    } catch (e) {
      onError(e);
    }
  };
  const d = BOT_DIFFICULTIES.find((x) => x.id === difficulty)!;
  const reward = BOT_REWARDS[difficulty];
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Jogar contra Bot"
      footer={
        noLives ? (
          <Button variant="primary" onClick={refill}>
            Recarregar vidas ({me?.lifeRefillCost ?? 5} 💎 cada)
          </Button>
        ) : (
          <Button variant="primary" size="lg" loading={busy} onClick={start} icon={<Swords size={18} />}>
            Começar partida
          </Button>
        )
      }
    >
      <div className="col gap-4">
        <div className="row row-between callout callout--info">
          <span>Treino sem entrada. Vitória rende pontos, Miúdas e às vezes diamantes. Derrota custa 1 vida.</span>
          {me && <Lives lives={me.lives} />}
        </div>
        {noLives && (
          <div className="callout callout--danger">
            Você está sem vidas. {me?.nextLifeAt && <>Próxima vida em <Countdown to={me.nextLifeAt} />.</>}
          </div>
        )}
        <Field label="Dificuldade">
          <Segmented block value={difficulty} onChange={setDifficulty} options={BOT_DIFFICULTIES.map((b) => ({ value: b.id, label: b.label }))} />
        </Field>
        <p className="t-small t-muted">
          <b className="t-gold t-title">{d.title}:</b> {d.description}
        </p>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <Field label="Rodadas">
            <Segmented block value={rounds} onChange={setRounds} options={[3, 5, 7].map((n) => ({ value: n, label: n }))} />
          </Field>
          <Field label={`Adversários: ${opponents}`}>
            <Slider min={1} max={3} value={opponents} onChange={setOpponents} label="Adversários" />
          </Field>
        </div>
        <div className="reward-preview">
          <span className="t-xs t-up t-dim">Vitória</span>
          <span>+{reward.win.points} pontos</span>
          <Miudas value={reward.win.miudas} signed />
          <span className="t-dim t-small">{Math.round(reward.win.diamondChance * 100)}% chance de 💎</span>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------ Sala privada */
export function CreateRoomModal({ open, onClose, clubId }: { open: boolean; onClose: () => void; clubId?: string }) {
  const nav = useNavigate();
  const { me } = useSession();
  const onError = useErrorToast();
  const [name, setName] = useState('');
  const [rounds, setRounds] = useState(5);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [entryFee, setEntryFee] = useState(0);
  const [bots, setBots] = useState(0);
  const [botDifficulty, setBotDifficulty] = useState<'facil' | 'medio' | 'dificil'>('medio');
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    try {
      const r = await post<{ code: string }>('/rooms', { name: name || undefined, rounds, maxPlayers, entryFee, bots: Math.min(bots, maxPlayers - 1), botDifficulty, clubId: clubId ?? null });
      sfx.coin();
      onClose();
      nav(`/sala/${r.code}`);
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
      title="Sala Privada"
      footer={
        <Button variant="primary" size="lg" loading={busy} onClick={create} icon={<Hash size={18} />}>
          Criar sala e gerar código
        </Button>
      }
    >
      <div className="col gap-4">
        <Field label="Nome da sala">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Sala de ${me?.displayName ?? 'viajante'}`} maxLength={32} />
        </Field>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <Field label="Rodadas">
            <Segmented block value={rounds} onChange={setRounds} options={[3, 5, 7, 9].map((n) => ({ value: n, label: n }))} />
          </Field>
          <Field label={`Lugares: ${maxPlayers}`}>
            <Slider min={2} max={6} value={maxPlayers} onChange={(v) => (setMaxPlayers(v), setBots((b) => Math.min(b, v - 1)))} label="Lugares" />
          </Field>
        </div>
        <Field label="Entrada (Miúdas)" hint={entryFee ? `Pote para ${maxPlayers} jogadores: ${entryFee * maxPlayers} Miúdas` : 'Partida amistosa, sem entrada.'}>
          <Segmented block value={entryFee} onChange={setEntryFee} options={[0, 10, 50, 100, 250].map((n) => ({ value: n, label: n === 0 ? 'Grátis' : n }))} />
        </Field>
        <Field label={`Bots da casa: ${bots}`} hint="Bots completam a mesa quando você iniciar.">
          <Slider min={0} max={maxPlayers - 1} value={Math.min(bots, maxPlayers - 1)} onChange={setBots} label="Bots" />
        </Field>
        {bots > 0 && (
          <Field label="Dificuldade dos bots">
            <Segmented block value={botDifficulty} onChange={setBotDifficulty} options={BOT_DIFFICULTIES.map((b) => ({ value: b.id, label: b.label }))} />
          </Field>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------ Código */
export function JoinCodeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length < 4) return setError('O código tem 6 caracteres.');
    setBusy(true);
    setError(null);
    try {
      await post(`/rooms/${c}/join`);
      sfx.coin();
      toast('Você entrou na sala!', 'success');
      onClose();
      nav(`/sala/${c}`);
    } catch (err: any) {
      if (err?.code === 'IN_PROGRESS') {
        onClose();
        nav(`/sala/${c}`);
        return;
      }
      setError(err.message);
      sfx.bust();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Entrar com código">
      <form onSubmit={submit} className="col gap-4">
        <p className="t-muted t-center">Digite o código que seu amigo compartilhou.</p>
        <Input
          className="input--code"
          value={code}
          onChange={(e) => (setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)), setError(null))}
          placeholder="______"
          aria-label="Código da sala"
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          inputMode="text"
        />
        {error && <div className="callout callout--danger">{error}</div>}
        <Button variant="primary" size="lg" block loading={busy} type="submit" disabled={code.length < 6}>
          Entrar
        </Button>
      </form>
    </Modal>
  );
}

export function PlayerChip({ name, avatar, frame, level, sub }: { name: string; avatar: string; frame?: string; level?: number; sub?: React.ReactNode }) {
  return (
    <div className="row gap-2" style={{ minWidth: 0 }}>
      <Portrait avatar={avatar} frame={frame} size={36} level={level} />
      <div style={{ minWidth: 0 }}>
        <div className="truncate" style={{ fontWeight: 700 }}>
          {name}
        </div>
        {sub && <div className="t-xs t-dim">{sub}</div>}
      </div>
    </div>
  );
}

export { Users, Link };
