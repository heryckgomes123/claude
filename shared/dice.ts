/**
 * DADOS DO JAVALI — regras de pontuação.
 *
 * Jogo de dados de taverna (família Farkle): o jogador rola 6 dados, separa
 * combinações que pontuam e decide entre arriscar a rolagem dos dados
 * restantes ou guardar os pontos do turno. Se uma rolagem não tiver nenhuma
 * combinação válida, é "JAVALI!" — perde tudo o que acumulou no turno.
 *
 * Este módulo é puro (sem I/O) e é usado igualmente pelo servidor (autoridade)
 * e pelo cliente (pré-visualização da seleção).
 */

export type Face = 1 | 2 | 3 | 4 | 5 | 6;

export const DICE_COUNT = 6;

export const SCORING_TABLE = [
  { label: 'Um (1)', value: '100' },
  { label: 'Cinco (5)', value: '50' },
  { label: 'Trinca de 1', value: '1.000' },
  { label: 'Trinca de N', value: 'N × 100' },
  { label: 'Quadra', value: 'Trinca × 2' },
  { label: 'Quina', value: 'Trinca × 3' },
  { label: 'Sena', value: 'Trinca × 4' },
  { label: 'Sequência 1–6', value: '1.500' },
  { label: 'Três pares', value: '750' },
] as const;

function counts(values: number[]): number[] {
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (const v of values) c[v]++;
  return c;
}

function kindScore(face: number, n: number): number {
  const base = face === 1 ? 1000 : face * 100;
  return base * (n - 2); // 3 → ×1, 4 → ×2, 5 → ×3, 6 → ×4
}

/**
 * Pontua uma seleção de dados. Retorna `null` se algum dado da seleção não
 * contribuir para a pontuação (seleção inválida).
 */
export function scoreSelection(values: number[]): number | null {
  if (values.length === 0) return null;
  const c = counts(values);
  if (values.length === 6) {
    if (c.slice(1).every((n) => n === 1)) return 1500;
    if (c.slice(1).filter((n) => n === 2).length === 3) return 750;
  }
  let total = 0;
  for (let face = 1; face <= 6; face++) {
    const n = c[face];
    if (n === 0) continue;
    if (n >= 3) total += kindScore(face, n);
    else if (face === 1) total += 100 * n;
    else if (face === 5) total += 50 * n;
    else return null;
  }
  return total;
}

/** Existe alguma combinação pontuável nesta rolagem? */
export function hasScoring(values: number[]): boolean {
  const c = counts(values);
  if (c[1] > 0 || c[5] > 0) return true;
  if (c.some((n, i) => i > 0 && n >= 3)) return true;
  if (values.length === 6 && c.slice(1).filter((n) => n === 2).length === 3) return true;
  return false;
}

/**
 * Melhor seleção (máximo de pontos, usando o máximo de dados pontuáveis).
 * Retorna índices da rolagem.
 */
export function bestSelection(values: number[]): { indices: number[]; score: number } {
  const all = values.map((_, i) => i);
  const full = scoreSelection(values);
  if (full !== null) return { indices: all, score: full };
  const c = counts(values);
  const pick: number[] = [];
  for (let face = 1; face <= 6; face++) {
    const n = c[face];
    if (n >= 3 || face === 1 || face === 5) {
      values.forEach((v, i) => {
        if (v === face) pick.push(i);
      });
    }
  }
  const score = scoreSelection(pick.map((i) => values[i]));
  return score === null ? { indices: [], score: 0 } : { indices: pick, score };
}

/**
 * Seleção mínima que ainda pontua — mantém mais dados para rolar.
 * Prefere trincas (valem mais que um dado solto) e, se não houver, um único 1 ou 5.
 */
export function minimalSelection(values: number[]): { indices: number[]; score: number } {
  const c = counts(values);
  // trinca de maior valor primeiro
  let bestKind: { face: number; score: number } | null = null;
  for (let face = 1; face <= 6; face++) {
    if (c[face] >= 3) {
      const s = kindScore(face, 3);
      if (!bestKind || s > bestKind.score) bestKind = { face, score: s };
    }
  }
  if (bestKind && bestKind.score >= 300) {
    const idx = values.map((v, i) => (v === bestKind!.face ? i : -1)).filter((i) => i >= 0).slice(0, 3);
    return { indices: idx, score: bestKind.score };
  }
  const one = values.indexOf(1);
  if (one >= 0) return { indices: [one], score: 100 };
  const five = values.indexOf(5);
  if (five >= 0) return { indices: [five], score: 50 };
  return bestSelection(values);
}

export function describeSelection(values: number[]): string {
  const c = counts(values);
  if (values.length === 6 && c.slice(1).every((n) => n === 1)) return 'Sequência completa!';
  if (values.length === 6 && c.slice(1).filter((n) => n === 2).length === 3) return 'Três pares!';
  const max = Math.max(...c);
  if (max === 6) return 'Sena!';
  if (max === 5) return 'Quina!';
  if (max === 4) return 'Quadra!';
  if (max === 3) return 'Trinca!';
  return '';
}
