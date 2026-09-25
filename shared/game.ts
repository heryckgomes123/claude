/**
 * Motor de partida do DADOS DO JAVALI.
 *
 * Máquina de estados pura e determinística (dado um RNG). O servidor é a
 * autoridade: recebe ações, valida com `applyAction` e persiste o estado.
 * Bots e jogadores ausentes são conduzidos por `advance`, que aplica as ações
 * pendentes com um ritmo "humano" (tempos de espera) para a mesa ficar viva.
 */
import { DICE_COUNT, hasScoring, scoreSelection, bestSelection } from './dice';
import { decideBotAction, type BotDifficulty } from './bot';

export type Rng = () => number;

export interface GamePlayerState {
  userId: string | null;
  name: string;
  avatar: string;
  bot: BotDifficulty | null;
  score: number;
  busts: number;
  bestTurn: number;
  hotDice: number;
  timeouts: number;
  left: boolean;
}

export interface TurnState {
  player: number;
  roll: number[];
  rolled: boolean;
  kept: number[];
  turnPoints: number;
  diceLeft: number;
  rollCount: number;
  lastActionAt: number;
}

export type GameEventBody =
  | { t: 'start' }
  | { t: 'turn'; round: number }
  | { t: 'roll'; dice: number[] }
  | { t: 'keep'; dice: number[]; points: number; turnPoints: number }
  | { t: 'hot' }
  | { t: 'bust'; lost: number }
  | { t: 'bank'; points: number; total: number }
  | { t: 'timeout' }
  | { t: 'left' }
  | { t: 'emote'; key: string }
  | { t: 'end'; winners: number[] };

export type GameEvent = GameEventBody & { seq: number; at: number; p: number };

export interface GameState {
  v: 1;
  status: 'playing' | 'finished';
  rounds: number;
  round: number;
  players: GamePlayerState[];
  turn: TurnState;
  log: GameEvent[];
  seq: number;
  winners: number[];
  startedAt: number;
  finishedAt: number | null;
  nextAutoAt: number;
}

export type GameAction =
  | { type: 'roll' }
  | { type: 'keep'; indices: number[]; then: 'roll' | 'bank' };

export const TURN_TIMEOUT_MS = 35_000;
const LOG_LIMIT = 90;

export const PACE = {
  turnStart: 1300,
  afterRoll: 1500,
  afterBust: 2300,
  afterBank: 1600,
  leftPlayer: 700,
};

export class GameRuleError extends Error {}

export interface NewPlayer {
  userId: string | null;
  name: string;
  avatar: string;
  bot: BotDifficulty | null;
}

export function createGame(players: NewPlayer[], rounds: number, now: number): GameState {
  if (players.length < 2) throw new GameRuleError('São necessários pelo menos 2 jogadores.');
  const state: GameState = {
    v: 1,
    status: 'playing',
    rounds,
    round: 1,
    players: players.map((p) => ({
      ...p,
      score: 0,
      busts: 0,
      bestTurn: 0,
      hotDice: 0,
      timeouts: 0,
      left: false,
    })),
    turn: freshTurn(0, now),
    log: [],
    seq: 0,
    winners: [],
    startedAt: now,
    finishedAt: null,
    nextAutoAt: now + PACE.turnStart,
  };
  push(state, { t: 'start' }, now, 0);
  push(state, { t: 'turn', round: 1 }, now, 0);
  return state;
}

function freshTurn(player: number, now: number): TurnState {
  return { player, roll: [], rolled: false, kept: [], turnPoints: 0, diceLeft: DICE_COUNT, rollCount: 0, lastActionAt: now };
}

function push(state: GameState, body: GameEventBody, at: number, p: number) {
  state.seq += 1;
  state.log.push({ ...body, seq: state.seq, at, p } as GameEvent);
  if (state.log.length > LOG_LIMIT) state.log.splice(0, state.log.length - LOG_LIMIT);
}

function rollDice(n: number, rng: Rng): number[] {
  return Array.from({ length: n }, () => 1 + Math.floor(rng() * 6));
}

function doRoll(state: GameState, rng: Rng, now: number) {
  const t = state.turn;
  const dice = rollDice(t.diceLeft, rng);
  t.roll = dice;
  t.rollCount += 1;
  t.lastActionAt = now;
  push(state, { t: 'roll', dice }, now, t.player);
  if (!hasScoring(dice)) {
    const lost = t.turnPoints;
    state.players[t.player].busts += 1;
    push(state, { t: 'bust', lost }, now, t.player);
    nextTurn(state, now, PACE.afterBust);
  } else {
    t.rolled = true;
    state.nextAutoAt = now + PACE.afterRoll;
  }
}

function nextTurn(state: GameState, now: number, delay: number) {
  let next = state.turn.player + 1;
  if (next >= state.players.length) {
    next = 0;
    state.round += 1;
  }
  if (state.round > state.rounds) {
    finish(state, now);
    return;
  }
  state.turn = freshTurn(next, now);
  state.nextAutoAt = now + delay;
  push(state, { t: 'turn', round: state.round }, now, next);
}

function finish(state: GameState, now: number) {
  const best = Math.max(...state.players.map((p) => p.score));
  state.winners = state.players.map((p, i) => (p.score === best ? i : -1)).filter((i) => i >= 0);
  state.status = 'finished';
  state.finishedAt = now;
  push(state, { t: 'end', winners: state.winners }, now, state.winners[0] ?? 0);
}

/** Aplica uma ação do jogador da vez. Lança GameRuleError se inválida. */
export function applyAction(state: GameState, playerIndex: number, action: GameAction, rng: Rng, now: number): void {
  if (state.status !== 'playing') throw new GameRuleError('A partida já terminou.');
  const t = state.turn;
  if (t.player !== playerIndex) throw new GameRuleError('Não é a sua vez.');

  if (action.type === 'roll') {
    if (t.rolled) throw new GameRuleError('Separe os dados que pontuam antes de rolar novamente.');
    doRoll(state, rng, now);
    return;
  }

  if (action.type === 'keep') {
    if (!t.rolled) throw new GameRuleError('Role os dados primeiro.');
    const idx = [...new Set(action.indices)];
    if (idx.length === 0 || idx.some((i) => !Number.isInteger(i) || i < 0 || i >= t.roll.length)) {
      throw new GameRuleError('Seleção de dados inválida.');
    }
    const values = idx.map((i) => t.roll[i]);
    const points = scoreSelection(values);
    if (points === null) throw new GameRuleError('Esses dados não formam uma combinação que pontua.');
    t.kept.push(...values);
    t.turnPoints += points;
    t.diceLeft -= values.length;
    t.rolled = false;
    t.roll = t.roll.filter((_, i) => !idx.includes(i));
    t.lastActionAt = now;
    push(state, { t: 'keep', dice: values, points, turnPoints: t.turnPoints }, now, t.player);
    if (t.diceLeft === 0) {
      t.diceLeft = DICE_COUNT;
      t.kept = [];
      t.roll = [];
      state.players[t.player].hotDice += 1;
      push(state, { t: 'hot' }, now, t.player);
    }
    if (action.then === 'bank') {
      const pl = state.players[t.player];
      pl.score += t.turnPoints;
      pl.bestTurn = Math.max(pl.bestTurn, t.turnPoints);
      push(state, { t: 'bank', points: t.turnPoints, total: pl.score }, now, t.player);
      nextTurn(state, now, PACE.afterBank);
    } else {
      doRoll(state, rng, now);
    }
    return;
  }
  throw new GameRuleError('Ação desconhecida.');
}

/** Quem está na vez é controlado automaticamente (bot ou jogador ausente)? */
export function isAutoTurn(state: GameState): boolean {
  const p = state.players[state.turn.player];
  return !!p.bot || p.left;
}

/**
 * Avança a partida até `now`: executa ações de bots, de jogadores que
 * saíram e aplica o tempo limite de turno de humanos. Retorna true se
 * o estado mudou.
 */
export function advance(state: GameState, rng: Rng, now: number): boolean {
  let changed = false;
  let guard = 0;
  while (state.status === 'playing' && guard++ < 5000) {
    const t = state.turn;
    const p = state.players[t.player];
    if (isAutoTurn(state)) {
      if (now < state.nextAutoAt) break;
      const at = state.nextAutoAt;
      const who = t.player;
      const action = decideBotAction(state, p.bot ?? 'facil');
      applyAction(state, who, action, rng, at);
      if (p.left && state.status === 'playing' && state.turn.player === who) {
        state.nextAutoAt = Math.min(state.nextAutoAt, at + PACE.leftPlayer);
      }
      changed = true;
      continue;
    }
    // humano: tempo limite de turno
    const deadline = t.lastActionAt + TURN_TIMEOUT_MS;
    if (now < deadline) break;
    p.timeouts += 1;
    push(state, { t: 'timeout' }, deadline, t.player);
    if (!t.rolled) {
      applyAction(state, t.player, { type: 'roll' }, rng, deadline);
      if (state.status === 'playing' && state.turn.player === t.player && t.rolled) {
        const sel = bestSelection(t.roll);
        applyAction(state, t.player, { type: 'keep', indices: sel.indices, then: 'bank' }, rng, deadline);
      }
    } else {
      const sel = bestSelection(t.roll);
      applyAction(state, t.player, { type: 'keep', indices: sel.indices, then: 'bank' }, rng, deadline);
    }
    // três tempos esgotados seguidos: considerado ausente
    if (p.timeouts >= 3 && !p.left) {
      p.left = true;
      push(state, { t: 'left' }, deadline, state.players.indexOf(p));
    }
    changed = true;
  }
  return changed;
}

/** Marca um jogador como ausente (saiu da mesa); o sistema joga por ele. */
export function markLeft(state: GameState, playerIndex: number, now: number) {
  const p = state.players[playerIndex];
  if (!p || p.left) return;
  p.left = true;
  push(state, { t: 'left' }, now, playerIndex);
  if (state.turn.player === playerIndex) state.nextAutoAt = now + PACE.leftPlayer;
}

export const EMOTES: Record<string, string> = {
  saude: 'Saúde! 🍺',
  boa: 'Boa rolagem!',
  javali: 'Javaliii! 🐗',
  sorte: 'Que sorte...',
  medo: 'Tô com medo!',
  gg: 'Bom jogo!',
};

/** Reação rápida na mesa (não altera o turno). Limitada a 1 a cada 2,5s por jogador. */
export function pushEmote(state: GameState, playerIndex: number, key: string, now: number): boolean {
  if (!EMOTES[key] || !state.players[playerIndex]) return false;
  const last = [...state.log].reverse().find((e) => e.t === 'emote' && e.p === playerIndex);
  if (last && now - last.at < 2500) return false;
  push(state, { t: 'emote', key }, now, playerIndex);
  return true;
}

/** Visão pública do estado (limita o log para o cliente). */
export function publicState(state: GameState, sinceSeq = 0) {
  return {
    ...state,
    log: state.log.filter((e) => e.seq > sinceSeq),
    turnDeadline: state.status === 'playing' && !isAutoTurn(state) ? state.turn.lastActionAt + TURN_TIMEOUT_MS : null,
  };
}
export type PublicGameState = ReturnType<typeof publicState>;
