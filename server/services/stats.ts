import { ACHIEVEMENTS, levelFromPoints, type Achievement, type StatKey } from '../../shared/catalog';

export interface PlayerStats {
  games: number;
  wins: number;
  losses: number;
  busts: number;
  hotDice: number;
  bestTurn: number;
  winStreak: number;
  maxWinStreak: number;
  bigTableWins: number;
  tableWins: number;
  hardBotWins: number;
  botGames: number;
  clubsJoined: number;
  clubsCreated: number;
  transfers: number;
  miudasWon: number;
}

export const emptyStats = (): PlayerStats => ({
  games: 0, wins: 0, losses: 0, busts: 0, hotDice: 0, bestTurn: 0, winStreak: 0, maxWinStreak: 0,
  bigTableWins: 0, tableWins: 0, hardBotWins: 0, botGames: 0, clubsJoined: 0, clubsCreated: 0, transfers: 0, miudasWon: 0,
});

export function normalizeStats(raw: unknown): PlayerStats {
  return { ...emptyStats(), ...((raw as object) ?? {}) };
}

export interface GameStatsDelta {
  won: boolean;
  busts: number;
  hotDice: number;
  bestTurn: number;
  bigTableWin: boolean;
  tableWin: boolean;
  hardBotWin: boolean;
  botGame: boolean;
  miudasWon: number;
}

export function applyGameStats(s: PlayerStats, d: GameStatsDelta): PlayerStats {
  const out = { ...s };
  out.games += 1;
  if (d.won) {
    out.wins += 1;
    out.winStreak += 1;
    out.maxWinStreak = Math.max(out.maxWinStreak, out.winStreak);
  } else {
    out.losses += 1;
    out.winStreak = 0;
  }
  out.busts += d.busts;
  out.hotDice += d.hotDice;
  out.bestTurn = Math.max(out.bestTurn, d.bestTurn);
  if (d.bigTableWin) out.bigTableWins += 1;
  if (d.tableWin) out.tableWins += 1;
  if (d.hardBotWin) out.hardBotWins += 1;
  if (d.botGame) out.botGames += 1;
  out.miudasWon += d.miudasWon;
  return out;
}

export function statValue(stats: PlayerStats, key: StatKey, ctx: { points: number; avatarsUnlocked: number }): number {
  if (key === 'level') return levelFromPoints(ctx.points);
  if (key === 'avatarsUnlocked') return ctx.avatarsUnlocked;
  return (stats as unknown as Record<string, number>)[key] ?? 0;
}

export function earnedAchievements(stats: PlayerStats, ctx: { points: number; avatarsUnlocked: number }): Achievement[] {
  return ACHIEVEMENTS.filter((a) => statValue(stats, a.stat, ctx) >= a.target);
}
