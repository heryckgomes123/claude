/** Preferências locais do jogador (por aparelho). */
import { useSyncExternalStore } from 'react';

export interface Prefs {
  sound: boolean;
  ambience: boolean;
  volume: number;
  reduceMotion: boolean;
  embers: boolean;
  autoFullscreen: boolean;
  fastBots: boolean;
}
const KEY = 'miuda.prefs';
const defaults: Prefs = { sound: true, ambience: false, volume: 0.7, reduceMotion: false, embers: true, autoFullscreen: true, fastBots: false };

let state: Prefs = (() => {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return defaults;
  }
})();
const subs = new Set<() => void>();

export function getPrefs() {
  return state;
}
export function setPrefs(patch: Partial<Prefs>) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  applyPrefs();
  subs.forEach((s) => s());
}
export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => state,
  );
}
export function applyPrefs() {
  document.documentElement.classList.toggle('reduce-motion', state.reduceMotion);
}
