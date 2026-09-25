import { describe, expect, it } from 'vitest';
import { bestSelection, hasScoring, minimalSelection, scoreSelection } from '../shared/dice';

describe('pontuação dos dados', () => {
  it('pontua dados soltos', () => {
    expect(scoreSelection([1])).toBe(100);
    expect(scoreSelection([5])).toBe(50);
    expect(scoreSelection([1, 5, 5])).toBe(200);
  });
  it('pontua trincas e múltiplos', () => {
    expect(scoreSelection([2, 2, 2])).toBe(200);
    expect(scoreSelection([1, 1, 1])).toBe(1000);
    expect(scoreSelection([4, 4, 4, 4])).toBe(800);
    expect(scoreSelection([6, 6, 6, 6, 6])).toBe(1800);
    expect(scoreSelection([3, 3, 3, 3, 3, 3])).toBe(1200);
  });
  it('pontua sequência e três pares', () => {
    expect(scoreSelection([1, 2, 3, 4, 5, 6])).toBe(1500);
    expect(scoreSelection([2, 2, 3, 3, 6, 6])).toBe(750);
  });
  it('rejeita seleções com dados que não pontuam', () => {
    expect(scoreSelection([2])).toBeNull();
    expect(scoreSelection([1, 3])).toBeNull();
    expect(scoreSelection([])).toBeNull();
  });
  it('detecta rolagens sem pontuação (JAVALI)', () => {
    expect(hasScoring([2, 3, 4, 6, 2, 3])).toBe(false);
    expect(hasScoring([2, 3, 4, 6, 2, 5])).toBe(true);
    expect(hasScoring([2, 2, 3, 3, 4, 4])).toBe(true);
  });
  it('escolhe a melhor e a mínima seleção', () => {
    expect(bestSelection([1, 1, 1, 5, 2, 3]).score).toBe(1050);
    expect(minimalSelection([1, 5, 2, 3, 4, 6]).indices).toEqual([0]);
    expect(minimalSelection([4, 4, 4, 1, 2, 3]).score).toBe(400);
  });
});
