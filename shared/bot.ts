/**
 * Inteligência dos bots da Toca.
 *  - fácil  (Aprendiz): guarda tudo que pontua, para cedo.
 *  - médio  (Veterano): limiares por dados restantes.
 *  - difícil (Mestre): seleção mínima para manter dados, lê o placar e
 *    arrisca mais quando está atrás na última rodada.
 */
import type { GameAction, GameState } from './game';
import { bestSelection, minimalSelection, scoreSelection } from './dice';

export type BotDifficulty = 'facil' | 'medio' | 'dificil';

export const BOT_DIFFICULTIES: { id: BotDifficulty; label: string; title: string; description: string }[] = [
  { id: 'facil', label: 'Fácil', title: 'Aprendiz', description: 'Joga com cautela e para cedo.' },
  { id: 'medio', label: 'Médio', title: 'Veterano', description: 'Conhece os riscos e sabe a hora de guardar.' },
  { id: 'dificil', label: 'Difícil', title: 'Mestre da Toca', description: 'Lê o placar e arrisca na hora certa.' },
];

// pontos do turno a partir dos quais o bot guarda, indexado por dados restantes (após separar)
const THRESHOLDS: Record<BotDifficulty, number[]> = {
  //         0     1    2    3    4    5     6
  facil: [9999, 150, 200, 300, 350, 500, 9999],
  medio: [9999, 250, 300, 400, 550, 1000, 9999],
  dificil: [9999, 300, 350, 400, 700, 2000, 9999],
};

export function decideBotAction(state: GameState, difficulty: BotDifficulty): GameAction {
  const t = state.turn;
  if (!t.rolled) return { type: 'roll' };

  const best = bestSelection(t.roll);
  let sel = best;
  if (difficulty === 'dificil') {
    const min = minimalSelection(t.roll);
    // se usar tudo gera hot dice, prefira tudo; senão mantenha dados
    const leftAfterBest = t.diceLeft - best.indices.length;
    if (leftAfterBest !== 0 && min.indices.length < best.indices.length && t.turnPoints + min.score < 300) sel = min;
  } else if (difficulty === 'medio') {
    const min = minimalSelection(t.roll);
    const leftAfterBest = t.diceLeft - best.indices.length;
    if (leftAfterBest > 0 && leftAfterBest <= 2 && min.indices.length < best.indices.length) sel = min;
  }
  if (sel.indices.length === 0 || scoreSelection(sel.indices.map((i) => t.roll[i])) === null) sel = best;

  const turnPoints = t.turnPoints + sel.score;
  let diceAfter = t.diceLeft - sel.indices.length;
  if (diceAfter === 0) diceAfter = 6; // hot dice

  const me = state.players[t.player];
  const leader = Math.max(...state.players.filter((_, i) => i !== t.player).map((p) => p.score));
  const isLastRound = state.round === state.rounds;
  const isLastPlayerOfGame = isLastRound && t.player === state.players.length - 1;

  let threshold = THRESHOLDS[difficulty][diceAfter];

  if (difficulty !== 'facil') {
    const deficit = leader - me.score;
    if (isLastRound && deficit > 0) {
      // precisa passar o líder: continua até ultrapassar
      if (me.score + turnPoints <= leader) threshold = 9999;
      else if (isLastPlayerOfGame) threshold = 0; // já ganhou, guarda
    } else if (deficit > 1500 && difficulty === 'dificil') {
      threshold += 150;
    } else if (deficit < -1200) {
      threshold -= 100;
    }
  }
  if (difficulty === 'facil' && Math.random() < 0.15) threshold -= 100;

  const then: 'roll' | 'bank' = turnPoints >= threshold ? 'bank' : 'roll';
  return { type: 'keep', indices: sel.indices, then };
}
