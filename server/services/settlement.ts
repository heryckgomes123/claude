/**
 * Liquidação de partidas — cálculo PURO (sem banco).
 *
 * Recebe o estado final e produz: movimentações financeiras (sempre
 * wallet → wallet, partidas dobradas), pontos, alterações de estatísticas e
 * efeitos de progressão. É usado tanto pelo servidor ao vivo quanto pelo
 * seed de dados, garantindo que histórico e saldos sejam coerentes.
 */
import type { GameState, Rng } from '../../shared/game';
import type { BotDifficulty } from '../../shared/bot';
import { BOT_REWARDS, TABLE_POINTS, type Currency, type TxKind } from '../../shared/catalog';
import type { GameStatsDelta } from './stats';

export type WalletRef = { type: 'user' | 'club' | 'house'; id: string };
export const HOUSE: WalletRef = { type: 'house', id: 'toca' };
export const ESCROW: WalletRef = { type: 'house', id: 'escrow' };

export interface Movement {
  from: WalletRef;
  to: WalletRef;
  currency: Currency;
  amount: number;
  kind: TxKind; // lançamento no débito
  toKind?: TxKind; // lançamento no crédito (padrão = kind)
  description: string;
  toDescription?: string;
}

export interface SeatInfo {
  userId: string | null;
  isNpc: boolean;
  agentId: string | null;
  agentPct: number | null;
  entryPaid: number;
}

export interface SettlementInput {
  gameId: string;
  kind: 'bot' | 'table' | 'private';
  roomName: string;
  rakePct: number;
  clubId: string | null;
  botDifficulty: BotDifficulty | null;
  state: GameState;
  seats: SeatInfo[];
  rng: Rng;
}

export interface SeatResult {
  seat: number;
  userId: string | null;
  placement: number;
  isWinner: boolean;
  prize: number;
  pointsEarned: number;
  loseLife: boolean;
  diamonds: number;
  miudaReward: number;
  stats: GameStatsDelta | null;
}

export interface Settlement {
  pot: number;
  rake: number;
  prize: number;
  movements: Movement[];
  seats: SeatResult[];
}

export function computeSettlement(input: SettlementInput): Settlement {
  const { state, seats } = input;
  const n = state.players.length;
  const pot = seats.reduce((s, x) => s + x.entryPaid, 0);
  const rake = Math.floor((pot * input.rakePct) / 100);
  const prize = pot - rake;
  const winners = state.winners;
  const movements: Movement[] = [];

  // placements (empates dividem a posição)
  const order = state.players.map((p, i) => ({ i, score: p.score })).sort((a, b) => b.score - a.score);
  const placement: number[] = new Array(n).fill(0);
  order.forEach((o, k) => {
    placement[o.i] = k > 0 && order[k - 1].score === o.score ? placement[order[k - 1].i] : k + 1;
  });

  // prêmio
  const prizeEach = winners.length ? Math.floor(prize / winners.length) : 0;
  const prizeBySeat: number[] = new Array(n).fill(0);
  winners.forEach((w, k) => {
    prizeBySeat[w] = prizeEach + (k === 0 ? prize - prizeEach * winners.length : 0);
  });
  for (let i = 0; i < n; i++) {
    if (prizeBySeat[i] <= 0) continue;
    const seat = seats[i];
    movements.push({
      from: ESCROW,
      to: seat.userId ? { type: 'user', id: seat.userId } : HOUSE,
      currency: 'MIUDA',
      amount: prizeBySeat[i],
      kind: 'PRIZE',
      toKind: seat.userId ? 'PRIZE' : 'HOUSE_PRIZE',
      description: `Prêmio — ${input.roomName}`,
    });
  }

  // taxa da mesa → comissões de agentes → caixa do clube / tesouro da Toca
  if (rake > 0) {
    let remaining = rake;
    for (const seat of seats) {
      if (!seat.agentId || !seat.agentPct || seat.entryPaid <= 0) continue;
      const c = Math.floor((((seat.entryPaid * input.rakePct) / 100) * seat.agentPct) / 100);
      if (c <= 0 || c > remaining) continue;
      remaining -= c;
      movements.push({
        from: ESCROW,
        to: { type: 'user', id: seat.agentId },
        currency: 'MIUDA',
        amount: c,
        kind: 'AGENT_COMMISSION',
        description: `Comissão — ${input.roomName}`,
      });
    }
    if (remaining > 0) {
      movements.push({
        from: ESCROW,
        to: input.clubId ? { type: 'club', id: input.clubId } : HOUSE,
        currency: 'MIUDA',
        amount: remaining,
        kind: 'RAKE',
        description: `Taxa da mesa — ${input.roomName}`,
      });
    }
  }

  const results: SeatResult[] = state.players.map((p, i) => {
    const seat = seats[i];
    const won = winners.includes(i);
    let points = 0;
    let loseLife = false;
    let diamonds = 0;
    let miudaReward = 0;
    if (seat.userId) {
      if (input.kind === 'bot') {
        const r = BOT_REWARDS[input.botDifficulty ?? 'facil'];
        if (won) {
          points = r.win.points;
          miudaReward = r.win.miudas;
          if (input.rng() < r.win.diamondChance) diamonds = 1 + Math.floor(input.rng() * 3);
        } else {
          points = r.loss.points;
          loseLife = !seat.isNpc;
        }
      } else {
        points = won ? TABLE_POINTS.winBase + TABLE_POINTS.winPerPlayer * n : TABLE_POINTS.loss;
      }
      if (miudaReward > 0) {
        movements.push({ from: HOUSE, to: { type: 'user', id: seat.userId }, currency: 'MIUDA', amount: miudaReward, kind: 'BOT_REWARD', description: 'Vitória contra bot' });
      }
      if (diamonds > 0) {
        movements.push({ from: HOUSE, to: { type: 'user', id: seat.userId }, currency: 'DIAMOND', amount: diamonds, kind: 'BOT_REWARD', description: 'Diamantes encontrados na mesa' });
      }
    }
    return {
      seat: i,
      userId: seat.userId,
      placement: placement[i],
      isWinner: won,
      prize: prizeBySeat[i],
      pointsEarned: points,
      loseLife,
      diamonds,
      miudaReward,
      stats: seat.userId
        ? {
            won,
            busts: p.busts,
            hotDice: p.hotDice,
            bestTurn: p.bestTurn,
            bigTableWin: won && input.kind !== 'bot' && n >= 5,
            tableWin: won && input.kind === 'table' && seat.entryPaid > 0,
            hardBotWin: won && input.kind === 'bot' && input.botDifficulty === 'dificil',
            botGame: input.kind === 'bot',
            miudasWon: prizeBySeat[i] + miudaReward,
          }
        : null,
    };
  });

  return { pot, rake, prize, movements, seats: results };
}
