import { randomBytes } from 'node:crypto';
import type { Rng } from '../../shared/game';

/** RNG criptográfico para rolagens do servidor. */
export const secureRng: Rng = () => randomBytes(4).readUInt32BE(0) / 0x1_0000_0000;

/** RNG determinístico (mulberry32) — usado no seed e em testes. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
