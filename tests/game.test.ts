import { describe, expect, it } from 'vitest';
import { advance, applyAction, createGame, GameRuleError, type GameState } from '../shared/game';
import { seededRng } from '../server/lib/rng';
import { computeSettlement, ESCROW } from '../server/services/settlement';

const players = (n: number, bot: 'facil' | 'medio' | 'dificil' | null = 'medio') =>
  Array.from({ length: n }, (_, i) => ({ userId: `u${i}`, name: `P${i}`, avatar: 'borg', bot }));

/** RNG que devolve uma sequência fixa de faces (1–6). */
const faces = (seq: number[]) => {
  let i = 0;
  return () => (seq[i++ % seq.length] - 1) / 6 + 0.01;
};

describe('motor da partida', () => {
  it('bots jogam uma partida inteira até o fim', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const st = createGame(players(4), 5, 0);
      advance(st, seededRng(seed), 10_000_000);
      expect(st.status).toBe('finished');
      expect(st.winners.length).toBeGreaterThan(0);
      const best = Math.max(...st.players.map((p) => p.score));
      for (const w of st.winners) expect(st.players[w].score).toBe(best);
    }
  });

  it('valida a vez e a seleção', () => {
    const st = createGame(players(2, null), 3, 0);
    expect(() => applyAction(st, 1, { type: 'roll' }, seededRng(1), 1)).toThrow(GameRuleError);
    applyAction(st, 0, { type: 'roll' }, faces([1, 2, 3, 4, 6, 2]), 1);
    expect(st.turn.rolled).toBe(true);
    expect(() => applyAction(st, 0, { type: 'keep', indices: [1], then: 'bank' }, seededRng(1), 2)).toThrow(/não formam/);
    expect(() => applyAction(st, 0, { type: 'roll' }, seededRng(1), 2)).toThrow(GameRuleError);
    applyAction(st, 0, { type: 'keep', indices: [0], then: 'bank' }, seededRng(1), 3);
    expect(st.players[0].score).toBe(100);
    expect(st.turn.player).toBe(1);
  });

  it('JAVALI zera os pontos do turno', () => {
    const st = createGame(players(2, null), 3, 0);
    applyAction(st, 0, { type: 'roll' }, faces([1, 2, 3, 4, 6, 2]), 1);
    applyAction(st, 0, { type: 'keep', indices: [0], then: 'roll' }, faces([2, 3, 4, 6, 2]), 2);
    expect(st.players[0].score).toBe(0);
    expect(st.players[0].busts).toBe(1);
    expect(st.turn.player).toBe(1);
    expect(st.log.some((e) => e.t === 'bust')).toBe(true);
  });

  it('dados quentes devolvem os seis dados', () => {
    const st = createGame(players(2, null), 3, 0);
    applyAction(st, 0, { type: 'roll' }, faces([1, 2, 3, 4, 5, 6]), 1);
    applyAction(st, 0, { type: 'keep', indices: [0, 1, 2, 3, 4, 5], then: 'roll' }, faces([1, 1, 1, 2, 3, 4]), 2);
    expect(st.players[0].hotDice).toBe(1);
    expect(st.turn.roll.length).toBe(6);
    expect(st.turn.turnPoints).toBe(1500);
  });

  it('tempo esgotado joga automaticamente pelo humano', () => {
    const st = createGame(players(2, null), 1, 0);
    advance(st, seededRng(3), 36_000);
    expect(st.log.some((e) => e.t === 'timeout')).toBe(true);
    expect(st.turn.player === 1 || st.status === 'finished').toBe(true);
  });
});

describe('liquidação', () => {
  it('distribui exatamente o pote (prêmio + taxa + comissões)', () => {
    const st: GameState = createGame(players(4), 3, 0);
    advance(st, seededRng(7), 1e9);
    const s = computeSettlement({
      gameId: 'g', kind: 'table', roomName: 'Mesa', rakePct: 10, clubId: 'c1', botDifficulty: null, state: st, rng: seededRng(1),
      seats: st.players.map((_, i) => ({ userId: `u${i}`, isNpc: false, agentId: i < 2 ? 'agent' : null, agentPct: 30, entryPaid: 100 })),
    });
    expect(s.pot).toBe(400);
    expect(s.rake).toBe(40);
    const fromEscrow = s.movements.filter((m) => m.from === ESCROW).reduce((a, m) => a + m.amount, 0);
    expect(fromEscrow).toBe(400);
    expect(s.movements.filter((m) => m.kind === 'AGENT_COMMISSION').reduce((a, m) => a + m.amount, 0)).toBe(6);
  });
});
