/**
 * A MESA — partida de Dados do Javali.
 *
 * O servidor é a autoridade (rolagens, regras, bots, tempo). O cliente
 * consulta o estado em intervalos curtos, anima os eventos novos (rolagens,
 * "JAVALI!", dados quentes, pontos guardados, reações) e envia as ações.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, LogOut, MessageCircle, RotateCcw, ScrollText, Smile, Sparkles, Trophy, Wand2, X, Home as HomeIcon, Flame } from 'lucide-react';
import { get, post } from '../lib/api';
import { useMe, useSession } from '../lib/session';
import { Portrait } from '../components/Portrait';
import { Button, Confirm, Countdown, Loader, Miudas, Empty, Points, Badge } from '../components/ui';
import { BOT_REWARDS } from '../../../shared/catalog';
import { useErrorToast } from '../components/Toast';
import { bestSelection, describeSelection, scoreSelection } from '../../../shared/dice';
import { EMOTES, type GameEvent } from '../../../shared/game';
import { fmt } from '../lib/format';
import { sfx } from '../lib/sound';
import type { GameView } from '../lib/types';

/* ---------------------------------------------------------------- Dado */
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

export function Die({ value, selected, dim, rolling, onClick, size, delay = 0, label }: { value: number; selected?: boolean; dim?: boolean; rolling?: boolean; onClick?: () => void; size?: number; delay?: number; label?: string }) {
  const [face, setFace] = useState(value);
  useEffect(() => {
    if (!rolling) {
      setFace(value);
      return;
    }
    const t = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 70);
    const stop = setTimeout(() => (clearInterval(t), setFace(value)), 560 + delay);
    return () => (clearInterval(t), clearTimeout(stop));
  }, [rolling, value, delay]);
  const El = onClick ? 'button' : 'div';
  return (
    <El
      className={`die ${selected ? 'is-selected' : ''} ${dim ? 'is-dim' : ''} ${rolling ? 'is-rolling' : ''} ${onClick ? 'is-clickable' : ''}`}
      style={{ ...(size ? { ['--die' as any]: `${size}px` } : {}), animationDelay: `${delay}ms` }}
      onClick={onClick}
      aria-pressed={onClick ? !!selected : undefined}
      aria-label={label ?? `Dado ${face}`}
      type={onClick ? 'button' : undefined}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className={PIPS[face]?.includes(i) ? 'pip' : 'pip is-off'} />
      ))}
    </El>
  );
}

/* ---------------------------------------------------------------- Página */
type Fx = { id: number; kind: 'bust' | 'hot' | 'bank' | 'turn' | 'mine'; text: string; sub?: string; p?: number };

export default function Game() {
  const { id = '' } = useParams();
  const me = useMe();
  const { refresh } = useSession();
  const nav = useNavigate();
  const qc = useQueryClient();
  const onError = useErrorToast();

  const [view, setView] = useState<GameView | null>(null);
  const [log, setLog] = useState<GameEvent[]>([]);
  const seqRef = useRef(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [rollingSeq, setRollingSeq] = useState(0);
  const [fx, setFx] = useState<Fx | null>(null);
  const [bubbles, setBubbles] = useState<{ p: number; key: string; id: number }[]>([]);
  const [sending, setSending] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showEmotes, setShowEmotes] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [bankFloat, setBankFloat] = useState<{ p: number; v: number; id: number } | null>(null);
  const fxTimer = useRef<number>(0);
  const firstLoad = useRef(true);

  const showFx = useCallback((f: Omit<Fx, 'id'>, ms = 1600) => {
    window.clearTimeout(fxTimer.current);
    setFx({ ...f, id: Date.now() });
    fxTimer.current = window.setTimeout(() => setFx(null), ms);
  }, []);

  /** Processa eventos novos: sons, efeitos e reações. */
  const ingest = useCallback(
    (v: GameView) => {
      const events = v.state.log.filter((e) => e.seq > seqRef.current);
      if (!events.length) return;
      seqRef.current = Math.max(seqRef.current, ...events.map((e) => e.seq));
      setLog((l) => [...l, ...events].slice(-120));
      if (firstLoad.current) {
        firstLoad.current = false;
        return; // não reanima o histórico ao abrir a mesa
      }
      const players = v.state.players;
      for (const e of events) {
        const name = players[e.p]?.name ?? '';
        if (e.t === 'roll') {
          setRollingSeq(e.seq);
          sfx.roll(e.dice.length);
        } else if (e.t === 'bust') {
          sfx.bust();
          showFx({ kind: 'bust', text: 'JAVALI!', sub: e.lost ? `${name} perdeu ${fmt(e.lost)} pontos` : `${name} não pontuou`, p: e.p }, 2000);
        } else if (e.t === 'hot') {
          sfx.hot();
          showFx({ kind: 'hot', text: 'Dados quentes!', sub: 'Os seis dados voltam para a mão', p: e.p });
        } else if (e.t === 'bank') {
          sfx.bank();
          setBankFloat({ p: e.p, v: e.points, id: e.seq });
        } else if (e.t === 'turn' && e.p === v.mySeat && v.state.status === 'playing') {
          sfx.turn();
          showFx({ kind: 'mine', text: 'Sua vez!', sub: `Rodada ${e.round} de ${v.state.rounds}` }, 1300);
          if (navigator.vibrate) navigator.vibrate(60);
        } else if (e.t === 'emote') {
          const b = { p: e.p, key: e.key, id: e.seq };
          setBubbles((s) => [...s.filter((x) => x.p !== e.p), b]);
          setTimeout(() => setBubbles((s) => s.filter((x) => x.id !== b.id)), 2800);
        } else if (e.t === 'end') {
          const won = e.winners.includes(v.mySeat);
          if (v.mySeat >= 0) (won ? sfx.win : sfx.lose)();
        }
      }
    },
    [showFx],
  );

  const apply = useCallback(
    (v: GameView) => {
      ingest(v);
      setView(v);
    },
    [ingest],
  );

  const playing = view?.status === 'playing';
  const q = useQuery({
    queryKey: ['game', id],
    queryFn: () => get<GameView>(`/games/${id}?since=${seqRef.current}`),
    refetchInterval: playing === false ? false : 750,
    refetchIntervalInBackground: false,
    gcTime: 0,
  });
  useEffect(() => {
    if (q.data) apply(q.data);
  }, [q.data, apply]);

  // ao terminar: atualiza saldo/perfil
  useEffect(() => {
    if (view?.status === 'finished') {
      refresh();
      qc.invalidateQueries({ queryKey: ['home'] });
    }
  }, [view?.status, refresh, qc]);

  const st = view?.state;
  const myTurn = !!st && st.status === 'playing' && view!.mySeat >= 0 && st.turn.player === view!.mySeat;
  const turnKey = st ? `${st.turn.player}-${st.round}-${st.turn.rollCount}` : '';
  useEffect(() => setSelected([]), [turnKey]);

  const lastRoll = useMemo(() => [...log].reverse().find((e) => e.t === 'roll') as Extract<GameEvent, { t: 'roll' }> | undefined, [log]);

  if (q.isLoading && !view) return <Loader label="Arrumando a mesa…" />;
  if (q.error && !view) {
    return (
      <div className="page">
        <Empty icon={<Flame size={40} />} title="Partida indisponível" action={<Button onClick={() => nav('/jogar')}>Voltar</Button>}>
          {(q.error as Error).message}
        </Empty>
      </div>
    );
  }
  if (!view || !st) return null;

  const n = st.players.length;
  const anchor = view.mySeat >= 0 ? view.mySeat : 0;
  const current = st.players[st.turn.player];
  const offset = view.serverTime - Date.now();

  // dados exibidos
  const liveRoll = st.turn.rolled ? st.turn.roll : [];
  const showingBust = fx?.kind === 'bust' && lastRoll;
  const diceShown = liveRoll.length ? liveRoll : showingBust ? lastRoll!.dice : [];
  const selValues = selected.map((i) => liveRoll[i]);
  const selScore = selected.length ? scoreSelection(selValues) : null;
  const remainingAfter = st.turn.diceLeft - selected.length;
  const rollNext = remainingAfter === 0 ? 6 : remainingAfter;

  const send = async (action: object) => {
    if (sending) return;
    setSending(true);
    try {
      const v = await post<GameView>(`/games/${id}/action?since=${seqRef.current}`, action);
      apply(v);
      setSelected([]);
    } catch (e: any) {
      onError(e);
      if (e?.code === 'GAME_RULE') qc.invalidateQueries({ queryKey: ['game', id] });
    } finally {
      setSending(false);
    }
  };

  const toggle = (i: number) => {
    if (!myTurn || !st.turn.rolled) return;
    sfx.select();
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  };

  const leave = async () => {
    try {
      if (st.status === 'playing' && view.mySeat >= 0) await post(`/games/${id}/leave`);
      nav(view.room?.kind === 'private' ? `/sala/${view.room.code}` : '/jogar');
    } catch (e) {
      onError(e);
    }
  };

  const playAgain = async () => {
    try {
      if (view.kind === 'bot') {
        const r = await post<{ gameId: string }>('/games/bot', { difficulty: view.botDifficulty ?? 'medio', rounds: st.rounds, opponents: n - 1 });
        nav(`/partida/${r.gameId}`, { replace: true });
      } else if (view.room) {
        if (view.kind === 'table') await post(`/rooms/${view.room.code}/join`);
        nav(`/sala/${view.room.code}`);
      }
    } catch (e) {
      onError(e);
    }
  };

  const recentLog = log.filter((e) => ['roll', 'bust', 'bank', 'hot', 'timeout', 'left', 'turn', 'keep'].includes(e.t)).slice(-40).reverse();

  return (
    <div className={`game ${myTurn ? 'is-my-turn' : ''}`}>
      {/* Cabeçalho da mesa */}
      <header className="game-head">
        <button className="icon-btn" onClick={() => (st.status === 'playing' && view.mySeat >= 0 ? setConfirmLeave(true) : leave())} aria-label="Sair da mesa">
          {st.status === 'playing' && view.mySeat >= 0 ? <LogOut size={18} /> : <X size={18} />}
        </button>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="game-title truncate">{view.room?.name ?? 'Partida'}</div>
          <div className="game-sub">
            <span>
              Rodada <b>{Math.min(st.round, st.rounds)}</b>/{st.rounds}
            </span>
            {view.entryFee > 0 && (
              <span className="row gap-1">
                Pote <Miudas value={view.pot} size={14} />
              </span>
            )}
            {view.spectators > 0 && (
              <span className="row gap-1">
                <Eye size={13} /> {view.spectators}
              </span>
            )}
            {view.mySeat < 0 && <Badge tone="blue">Espectador</Badge>}
          </div>
        </div>
        <button className="icon-btn" onClick={() => setShowLog((s) => !s)} aria-label="Histórico da partida">
          <ScrollText size={18} />
        </button>
      </header>

      <div className="game-body">
        {/* Arena */}
        <section className="arena" aria-label="Mesa de jogo">
          <div className="table-oval">
            <div className="table-felt" />
            {st.players.map((p, i) => {
              const rel = (i - anchor + n) % n;
              const theta = Math.PI / 2 + (rel * 2 * Math.PI) / n;
              const x = 50 + 46 * Math.cos(theta);
              const y = 50 + 44 * Math.sin(theta);
              const isTurn = st.status === 'playing' && st.turn.player === i;
              const isWinner = st.status === 'finished' && st.winners.includes(i);
              const bubble = bubbles.find((b) => b.p === i);
              return (
                <div key={i} className={`seat ${isTurn ? 'is-turn' : ''} ${i === view.mySeat ? 'is-me' : ''} ${p.left ? 'is-left' : ''} ${isWinner ? 'is-winner' : ''}`} style={{ left: `${x}%`, top: `${y}%` }}>
                  {bubble && <div className="bubble">{EMOTES[bubble.key]}</div>}
                  {bankFloat?.p === i && (
                    <div key={bankFloat.id} className="float-points">
                      +{fmt(bankFloat.v)}
                    </div>
                  )}
                  <Portrait avatar={p.avatar} size={56} active={isTurn} />
                  <div className="seat-plate">
                    <span className="seat-name truncate">
                      {i === view.mySeat ? 'Você' : p.name}
                      {p.bot && !p.userId && <span className="seat-bot">bot</span>}
                    </span>
                    <span className="seat-score t-num">{fmt(p.score)}</span>
                  </div>
                  {isTurn && st.turn.turnPoints > 0 && <div className="seat-turn t-num">+{fmt(st.turn.turnPoints)}</div>}
                  {isWinner && <Trophy size={18} className="seat-crown" />}
                </div>
              );
            })}

            {/* Centro: dados */}
            <div className="table-center">
              <div className="turn-label">
                {st.status === 'finished' ? (
                  'Fim de jogo'
                ) : myTurn ? (
                  <span className="t-gold">Sua vez</span>
                ) : (
                  <>
                    Vez de <b>{current.name}</b>
                  </>
                )}
                {view.state.turnDeadline && st.status === 'playing' && !current.bot && (
                  <span className={`turn-timer ${view.state.turnDeadline - (Date.now() + offset) < 10000 ? 'is-low' : ''}`}>
                    <Countdown to={view.state.turnDeadline} serverOffset={offset} format="s" />s
                  </span>
                )}
              </div>
              <div className={`dice-tray ${showingBust ? 'is-bust' : ''}`}>
                {diceShown.length ? (
                  diceShown.map((v, i) => (
                    <Die
                      key={`${rollingSeq}-${i}`}
                      value={v}
                      rolling={lastRoll?.seq === rollingSeq && rollingSeq > 0 && !showingBust && Date.now() - (lastRoll?.at ?? 0) < 4000}
                      delay={i * 40}
                      selected={selected.includes(i)}
                      dim={!!showingBust}
                      onClick={myTurn && st.turn.rolled ? () => toggle(i) : undefined}
                    />
                  ))
                ) : (
                  <div className="dice-empty t-dim t-small">{st.status === 'finished' ? '' : myTurn ? 'Role os dados!' : `${current.name} vai rolar…`}</div>
                )}
              </div>
              {st.turn.kept.length > 0 && st.status === 'playing' && (
                <div className="kept-tray" aria-label="Dados separados neste turno">
                  {st.turn.kept.map((v, i) => (
                    <Die key={i} value={v} size={24} />
                  ))}
                  <span className="t-num">{fmt(st.turn.turnPoints)}</span>
                </div>
              )}
            </div>

            {fx && (
              <div key={fx.id} className={`fx fx--${fx.kind}`}>
                <div className="fx-text">{fx.text}</div>
                {fx.sub && <div className="fx-sub">{fx.sub}</div>}
              </div>
            )}
          </div>
        </section>

        {/* Placar + histórico (desktop lateral / mobile gaveta) */}
        <aside className={`game-side ${showLog ? 'is-open' : ''}`}>
          <div className="scoreboard">
            <h3>Placar</h3>
            {[...st.players]
              .map((p, i) => ({ p, i }))
              .sort((a, b) => b.p.score - a.p.score)
              .map(({ p, i }, k) => (
                <div key={i} className={`score-row ${st.turn.player === i && st.status === 'playing' ? 'is-turn' : ''} ${i === view.mySeat ? 'is-me' : ''}`}>
                  <span className="score-pos">{k + 1}</span>
                  <Portrait avatar={p.avatar} size={28} />
                  <span className="grow truncate">{i === view.mySeat ? 'Você' : p.name}</span>
                  <b className="t-num">{fmt(p.score)}</b>
                </div>
              ))}
          </div>
          <div className="game-log">
            <h3>Histórico</h3>
            <ul>
              {recentLog.map((e) => (
                <li key={e.seq} className={`log-${e.t}`}>
                  <LogLine e={e} name={e.p === view.mySeat ? 'Você' : st.players[e.p]?.name ?? ''} />
                </li>
              ))}
            </ul>
          </div>
          <button className="game-side-close hide-desktop btn btn--ghost btn--sm" onClick={() => setShowLog(false)}>
            Fechar
          </button>
        </aside>
      </div>

      {/* Barra de ações */}
      {st.status === 'playing' && view.mySeat >= 0 && (
        <footer className="game-actions">
          {showEmotes && (
            <div className="emote-picker">
              {Object.entries(EMOTES).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => {
                    setShowEmotes(false);
                    send({ type: 'emote', key: k });
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <button className="icon-btn" onClick={() => setShowEmotes((s) => !s)} aria-label="Reações">
            {showEmotes ? <X size={18} /> : <Smile size={18} />}
          </button>
          {myTurn && !st.turn.rolled && (
            <Button variant="primary" size="lg" className="grow" loading={sending} onClick={() => send({ type: 'roll' })} pulse>
              Rolar {st.turn.diceLeft} dados
            </Button>
          )}
          {myTurn && st.turn.rolled && (
            <div className="grow action-split">
              <div className="sel-info">
                {selected.length === 0 ? (
                  <span className="t-dim t-small">Toque nos dados que pontuam</span>
                ) : selScore === null ? (
                  <span className="t-danger t-small">Seleção não pontua</span>
                ) : (
                  <span>
                    <b className="t-gold t-num">+{fmt(selScore)}</b> <span className="t-xs t-dim">{describeSelection(selValues)}</span>
                    <span className="t-xs t-muted"> · turno {fmt(st.turn.turnPoints + selScore)}</span>
                  </span>
                )}
                <button
                  className="auto-pick"
                  onClick={() => {
                    sfx.select();
                    setSelected(bestSelection(liveRoll).indices);
                  }}
                >
                  <Wand2 size={13} /> melhor
                </button>
              </div>
              <div className="row gap-2">
                <Button variant="ember" className="grow" disabled={selScore === null || sending} onClick={() => send({ type: 'keep', indices: selected, then: 'roll' })} icon={<RotateCcw size={16} />}>
                  Rolar {rollNext}
                </Button>
                <Button variant="primary" className="grow" disabled={selScore === null || sending} onClick={() => send({ type: 'keep', indices: selected, then: 'bank' })}>
                  Guardar {selScore !== null ? fmt(st.turn.turnPoints + selScore) : ''}
                </Button>
              </div>
            </div>
          )}
          {!myTurn && (
            <div className="grow waiting-bar t-small t-muted">
              <MessageCircle size={16} /> Aguarde sua vez — {current.name} está jogando
            </div>
          )}
        </footer>
      )}

      {st.status === 'finished' && view.results && <Results view={view} meId={me.id} onAgain={playAgain} />}

      <Confirm
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title="Abandonar a mesa?"
        message={view.entryFee > 0 ? 'Sua entrada não será devolvida e a casa jogará por você até o fim.' : 'A casa jogará por você até o fim da partida (uma derrota custa 1 vida).'}
        confirmLabel="Abandonar"
        danger
        onConfirm={leave}
      />
    </div>
  );
}

function LogLine({ e, name }: { e: GameEvent; name: string }) {
  switch (e.t) {
    case 'roll':
      return (
        <span className="row gap-1">
          {name} rolou <span className="log-dice">{e.dice.join(' ')}</span>
        </span>
      );
    case 'keep':
      return (
        <>
          {name} separou {e.dice.join(' ')} <b>+{e.points}</b>
        </>
      );
    case 'bust':
      return (
        <>
          <b className="t-danger">JAVALI!</b> {name} perdeu {fmt(e.lost)}
        </>
      );
    case 'bank':
      return (
        <>
          {name} guardou <b className="t-gold">{fmt(e.points)}</b> (total {fmt(e.total)})
        </>
      );
    case 'hot':
      return <>🔥 Dados quentes para {name}!</>;
    case 'timeout':
      return <>⌛ Tempo esgotado para {name}</>;
    case 'left':
      return <>{name} deixou a mesa (a casa joga por ele)</>;
    case 'turn':
      return (
        <span className="t-dim">
          — Rodada {e.round}: vez de {name}
        </span>
      );
    default:
      return null;
  }
}

function Results({ view, meId, onAgain }: { view: GameView; meId: string; onAgain: () => void }) {
  const results = view.results!;
  const mine = results.find((r) => r.userId === meId && !r.bot);
  const won = !!mine?.isWinner;
  const spectator = !mine;
  return (
    <div className={`results ${won ? 'is-win' : spectator ? '' : 'is-loss'}`} role="dialog" aria-modal="true" aria-label="Resultado da partida">
      {won && (
        <div className="coin-rain" aria-hidden="true">
          {Array.from({ length: 26 }).map((_, i) => (
            <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 9) * 0.18}s`, animationDuration: `${2.2 + (i % 5) * 0.4}s` }} />
          ))}
        </div>
      )}
      <div className="results-card panel panel--rivets">
        <div className="results-banner">
          {spectator ? (
            <>
              <Trophy size={40} />
              <h2>Fim de jogo</h2>
            </>
          ) : won ? (
            <>
              <Sparkles size={40} />
              <h2 className="t-gold">Vitória!</h2>
            </>
          ) : (
            <>
              <Flame size={40} />
              <h2>{mine!.placement}º lugar</h2>
            </>
          )}
          <p className="t-muted t-small">{view.room?.name}</p>
        </div>
        <ol className="results-list">
          {results.map((r) => (
            <li key={r.seat} className={`${r.isWinner ? 'is-winner' : ''} ${r.userId === meId && !r.bot ? 'is-me' : ''}`}>
              <span className="score-pos">{r.placement}</span>
              <Portrait avatar={r.avatar} size={38} />
              <span className="grow truncate">
                {r.userId === meId && !r.bot ? 'Você' : r.name}
                {r.bot && !r.userId && <span className="seat-bot">bot</span>}
              </span>
              <b className="t-num">{fmt(r.score)}</b>
              {r.prize > 0 && <Miudas value={r.prize} signed size={15} />}
            </li>
          ))}
        </ol>
        {mine && (
          <div className="results-rewards">
            <span className="t-xs t-up t-dim">Suas recompensas</span>
            <div className="row row-wrap gap-4" style={{ justifyContent: 'center' }}>
              {mine.prize > 0 && <Miudas value={mine.prize} signed size={22} />}
              {view.kind === 'bot' && won && <Miudas value={BOT_REWARDS[(view.botDifficulty ?? 'medio') as 'medio'].win.miudas} signed size={22} />}
              <Points value={mine.points} signed size={22} />
              {view.kind === 'bot' && !won && <span className="t-danger t-small">−1 vida</span>}
              {view.entryFee > 0 && !won && <span className="t-dim t-small">Entrada: −{fmt(mine.entry)}</span>}
            </div>
          </div>
        )}
        <div className="row gap-2 row-wrap" style={{ justifyContent: 'center' }}>
          {mine && (
            <Button variant="primary" size="lg" onClick={onAgain} icon={<RotateCcw size={18} />}>
              Jogar de novo
            </Button>
          )}
          <Link to="/" className="btn btn--ghost btn--lg">
            <HomeIcon size={18} /> Voltar à Toca
          </Link>
        </div>
      </div>
    </div>
  );
}
