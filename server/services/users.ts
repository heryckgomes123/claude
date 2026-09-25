/**
 * Jogadores: criação, perfil, vidas, progressão (pontos → nível → conquistas)
 * e itens do Relicário.
 */
import type { Queryable } from '../db';
import {
  ACHIEVEMENT_MAP, CHARACTERS, CHARACTER_MAP, FRAME_MAP, MAX_LIVES, defaultTitle, isUnlocked,
  levelFromPoints, levelProgress, titlesForLevel, type GlobalSettings, type Role,
} from '../../shared/catalog';
import { badRequest, conflict, notFound } from '../lib/errors';
import { uid } from '../lib/ids';
import { HOUSE } from './settlement';
import { ensureWallet, getBalance, move } from './wallet';
import { notify } from './notifications';
import { logActivity } from './activity';
import { earnedAchievements, normalizeStats, type PlayerStats } from './stats';

export interface UserRow {
  id: string;
  username: string;
  display_name: string;
  password_hash: string | null;
  is_guest: boolean;
  is_super_admin: boolean;
  is_demo: boolean; // residente (NPC) controlado pelo sistema
  status: 'active' | 'banned';
  avatar: string;
  frame: string;
  title: string | null;
  points: number;
  lives: number;
  lives_updated_at: Date;
  owned_items: string[];
  stats: PlayerStats;
  tutorial_done: boolean;
  token_version: number;
  created_at: Date;
  last_seen_at: Date;
}

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export async function getUserRow(q: Queryable, id: string, forUpdate = false): Promise<UserRow> {
  const row = await q.one<UserRow>(`SELECT * FROM users WHERE id = $1${forUpdate ? ' FOR UPDATE' : ''}`, [id]);
  if (!row) throw notFound('Jogador não encontrado.');
  row.stats = normalizeStats(row.stats);
  row.points = Number(row.points);
  return row;
}

export async function findUserByUsername(q: Queryable, username: string): Promise<UserRow | null> {
  const row = await q.one<UserRow>('SELECT * FROM users WHERE username = $1', [username.toLowerCase().trim()]);
  if (row) row.stats = normalizeStats(row.stats);
  return row;
}

export interface NewUser {
  username: string;
  displayName: string;
  passwordHash: string | null;
  avatar?: string;
  isGuest?: boolean;
  isSuperAdmin?: boolean;
  isNpc?: boolean;
}

export async function createUser(q: Queryable, u: NewUser, settings: GlobalSettings, at = new Date()): Promise<string> {
  const username = u.username.toLowerCase().trim();
  if (!USERNAME_RE.test(username)) throw badRequest('Nome de usuário deve ter 3–20 caracteres: letras minúsculas, números ou _.');
  const exists = await q.one('SELECT 1 FROM users WHERE username = $1', [username]);
  if (exists) throw conflict('Este nome de usuário já está em uso.', 'USERNAME_TAKEN');
  const avatar = u.avatar && CHARACTER_MAP[u.avatar]?.unlock.type === 'free' ? u.avatar : 'borg';
  const id = uid('usr');
  await q.query(
    `INSERT INTO users (id, username, display_name, password_hash, is_guest, is_super_admin, is_demo, avatar, title, created_at, last_seen_at, lives_updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$10)`,
    [id, username, u.displayName.trim().slice(0, 24), u.passwordHash, !!u.isGuest, !!u.isSuperAdmin, !!u.isNpc, avatar, defaultTitle(1), at],
  );
  await ensureWallet(q, { type: 'user', id }, 'MIUDA');
  await ensureWallet(q, { type: 'user', id }, 'DIAMOND');
  if (settings.welcomeBonus > 0) {
    await move(q, { from: HOUSE, to: { type: 'user', id }, currency: 'MIUDA', amount: settings.welcomeBonus, kind: 'WELCOME_BONUS', description: 'Bem-vindo à Toca do Javali' }, { at });
  }
  if (settings.welcomeDiamonds > 0) {
    await move(q, { from: HOUSE, to: { type: 'user', id }, currency: 'DIAMOND', amount: settings.welcomeDiamonds, kind: 'WELCOME_BONUS', description: 'Diamantes de boas-vindas' }, { at });
  }
  if (!u.isNpc) {
    await notify(q, id, {
      kind: 'reward',
      title: 'Bem-vindo à Toca do Javali!',
      body: `Você recebeu ${settings.welcomeBonus} Miúdas e ${settings.welcomeDiamonds} diamantes para começar.`,
      link: '/perfil?aba=extrato',
      at,
    });
    await logActivity(q, { kind: 'join', actorId: id, message: `${u.displayName} chegou à Toca pela primeira vez.`, at });
  }
  return id;
}

/* ------------------------------- Vidas ------------------------------- */

export function effectiveLives(row: Pick<UserRow, 'lives' | 'lives_updated_at'>, settings: GlobalSettings, now = Date.now()) {
  const regenMs = settings.lifeRegenMinutes * 60_000;
  const updated = new Date(row.lives_updated_at).getTime();
  if (row.lives >= MAX_LIVES) return { lives: MAX_LIVES, nextLifeAt: null as number | null, anchor: now };
  const gained = Math.max(0, Math.floor((now - updated) / regenMs));
  const lives = Math.min(MAX_LIVES, row.lives + gained);
  if (lives >= MAX_LIVES) return { lives, nextLifeAt: null, anchor: now };
  const anchor = updated + gained * regenMs;
  return { lives, nextLifeAt: anchor + regenMs, anchor };
}

export async function consumeLife(q: Queryable, userId: string, settings: GlobalSettings, now = Date.now()) {
  const row = await getUserRow(q, userId, true);
  const eff = effectiveLives(row, settings, now);
  if (eff.lives <= 0) return 0;
  const lives = eff.lives - 1;
  const anchor = eff.lives >= MAX_LIVES ? now : eff.anchor;
  await q.query('UPDATE users SET lives = $2, lives_updated_at = $3 WHERE id = $1', [userId, lives, new Date(anchor)]);
  return lives;
}

export async function refillLives(q: Queryable, userId: string, settings: GlobalSettings) {
  const row = await getUserRow(q, userId, true);
  const eff = effectiveLives(row, settings);
  const missing = MAX_LIVES - eff.lives;
  if (missing <= 0) throw badRequest('Suas vidas já estão completas.');
  const cost = missing * settings.lifeRefillCostDiamonds;
  await move(q, { from: { type: 'user', id: userId }, to: HOUSE, currency: 'DIAMOND', amount: cost, kind: 'LIFE_REFILL', description: `Recarga de ${missing} vida(s)` }, { actorId: userId });
  await q.query('UPDATE users SET lives = $2, lives_updated_at = now() WHERE id = $1', [userId, MAX_LIVES]);
  return { lives: MAX_LIVES, cost };
}

/* ---------------------------- Progressão ---------------------------- */

export function avatarsUnlocked(row: Pick<UserRow, 'owned_items' | 'points'>): number {
  const level = levelFromPoints(row.points);
  return CHARACTERS.filter((c) => isUnlocked(c.unlock, level, row.owned_items ?? [], c.id)).length;
}

/**
 * Concede pontos e processa as consequências: subida de nível (diamantes +
 * notificação) e conquistas (diamantes + pontos, que podem gerar novo nível).
 */
export async function grantProgress(
  q: Queryable,
  userId: string,
  points: number,
  settings: GlobalSettings,
  at = new Date(),
): Promise<{ levelUps: number[]; achievements: string[] }> {
  const levelUps: number[] = [];
  const achievements: string[] = [];
  let pending = points;
  for (let guard = 0; guard < 10; guard++) {
    const row = await getUserRow(q, userId, true);
    const quiet = row.is_demo; // residentes não recebem notificações
    if (pending > 0) {
      const oldLevel = levelFromPoints(row.points);
      const newPoints = row.points + pending;
      const newLevel = levelFromPoints(newPoints);
      await q.query('UPDATE users SET points = $2 WHERE id = $1', [userId, newPoints]);
      row.points = newPoints;
      for (let lv = oldLevel + 1; lv <= newLevel; lv++) {
        levelUps.push(lv);
        if (settings.levelUpDiamonds > 0) {
          await move(q, { from: HOUSE, to: { type: 'user', id: userId }, currency: 'DIAMOND', amount: settings.levelUpDiamonds, kind: 'LEVEL_UP', description: `Nível ${lv} alcançado` }, { at });
        }
        const newTitle = titlesForLevel(lv).at(-1);
        if (!quiet) {
          await notify(q, userId, {
            kind: 'level',
            title: `Nível ${lv}!`,
            body: `Sua reputação cresce na Toca. +${settings.levelUpDiamonds} diamantes${newTitle && titlesForLevel(lv - 1).at(-1) !== newTitle ? ` e o título "${newTitle}"` : ''}.`,
            link: '/perfil',
            meta: { level: lv },
            at,
          });
          if (lv % 5 === 0) await logActivity(q, { kind: 'level', actorId: userId, message: `${row.display_name} alcançou o nível ${lv}.`, at });
        }
      }
      pending = 0;
    }
    const unlocked = new Set(
      (await q.query<{ achievement_id: string }>('SELECT achievement_id FROM achievements_unlocked WHERE user_id = $1', [userId])).map((r) => r.achievement_id),
    );
    const fresh = earnedAchievements(row.stats, { points: row.points, avatarsUnlocked: avatarsUnlocked(row) }).filter((a) => !unlocked.has(a.id));
    if (!fresh.length) break;
    for (const a of fresh) {
      await q.query('INSERT INTO achievements_unlocked (user_id, achievement_id, unlocked_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [userId, a.id, at]);
      achievements.push(a.id);
      if (a.reward.diamonds > 0) {
        await move(q, { from: HOUSE, to: { type: 'user', id: userId }, currency: 'DIAMOND', amount: a.reward.diamonds, kind: 'ACHIEVEMENT', description: `Conquista: ${a.name}` }, { at });
      }
      pending += a.reward.points;
      if (!quiet) {
        await notify(q, userId, {
          kind: 'achievement',
          title: `Conquista desbloqueada: ${a.name}`,
          body: `${a.description} +${a.reward.diamonds} diamantes${a.reward.points ? `, +${a.reward.points} pontos` : ''}.`,
          link: '/conquistas',
          meta: { achievementId: a.id },
          at,
        });
        if (a.tier === 'ouro' || a.tier === 'lenda') {
          await logActivity(q, { kind: 'achievement', actorId: userId, message: `${row.display_name} conquistou "${a.name}".`, at });
        }
      }
    }
    if (pending === 0) break;
  }
  return { levelUps, achievements };
}

export async function bumpStat(q: Queryable, userId: string, key: keyof PlayerStats, by = 1) {
  const row = await getUserRow(q, userId, true);
  const stats = { ...row.stats, [key]: (row.stats[key] ?? 0) + by };
  await q.query('UPDATE users SET stats = $2 WHERE id = $1', [userId, JSON.stringify(stats)]);
}

/* ------------------------------ Perfil ------------------------------ */

export async function userRoles(q: Queryable, row: Pick<UserRow, 'id' | 'is_super_admin'>): Promise<Role[]> {
  const rs = await q.query<{ role: string }>(`SELECT DISTINCT role FROM club_members WHERE user_id = $1 AND status = 'active'`, [row.id]);
  const roles: Role[] = ['PLAYER'];
  if (rs.some((r) => r.role === 'owner' || r.role === 'admin')) roles.push('CLUB_ADMIN');
  if (rs.some((r) => r.role === 'agent')) roles.push('AGENT');
  if (row.is_super_admin) roles.push('SUPER_ADMIN');
  return roles;
}

export async function userClubs(q: Queryable, userId: string) {
  const rows = await q.query(
    `SELECT c.id, c.name, c.emblem, c.color, m.role FROM club_members m JOIN clubs c ON c.id = m.club_id
      WHERE m.user_id = $1 AND m.status = 'active' ORDER BY m.joined_at`,
    [userId],
  );
  return rows.map((r: any) => ({ id: r.id, name: r.name, emblem: r.emblem, color: r.color, role: r.role as string }));
}

export async function meDto(q: Queryable, userId: string, settings: GlobalSettings) {
  const row = await getUserRow(q, userId);
  const [miudas, diamonds, roles, clubs, unread, achCount] = await Promise.all([
    getBalance(q, { type: 'user', id: userId }, 'MIUDA'),
    getBalance(q, { type: 'user', id: userId }, 'DIAMOND'),
    userRoles(q, row),
    userClubs(q, userId),
    q.one<{ n: number }>('SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL', [userId]),
    q.one<{ n: number }>('SELECT count(*)::int AS n FROM achievements_unlocked WHERE user_id = $1', [userId]),
  ]);
  const lp = levelProgress(row.points);
  const lives = effectiveLives(row, settings);
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatar: row.avatar,
    frame: row.frame,
    title: row.title ?? defaultTitle(lp.level),
    points: row.points,
    level: lp.level,
    levelProgress: lp,
    isGuest: row.is_guest,
    isSuperAdmin: row.is_super_admin,
    roles,
    miudas,
    diamonds,
    lives: lives.lives,
    maxLives: MAX_LIVES,
    nextLifeAt: lives.nextLifeAt ? new Date(lives.nextLifeAt).toISOString() : null,
    lifeRefillCost: settings.lifeRefillCostDiamonds,
    tutorialDone: row.tutorial_done,
    ownedItems: row.owned_items ?? [],
    stats: row.stats,
    clubs,
    unreadNotifications: Number(unread?.n ?? 0),
    achievementsUnlocked: Number(achCount?.n ?? 0),
    announcement: settings.announcement || null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}
export type MeDto = Awaited<ReturnType<typeof meDto>>;

export async function publicProfile(q: Queryable, username: string) {
  const row = await findUserByUsername(q, username);
  if (!row || row.status === 'banned') throw notFound('Jogador não encontrado.');
  const lp = levelProgress(row.points);
  const [clubs, ach, recent] = await Promise.all([
    userClubs(q, row.id),
    q.query('SELECT achievement_id, unlocked_at FROM achievements_unlocked WHERE user_id = $1 ORDER BY unlocked_at DESC', [row.id]),
    recentGames(q, row.id, 8),
  ]);
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatar: row.avatar,
    frame: row.frame,
    title: row.title ?? defaultTitle(lp.level),
    level: lp.level,
    points: row.points,
    stats: row.stats,
    clubs,
    achievements: ach.map((a: any) => a.achievement_id),
    recentGames: recent,
    resident: row.is_demo,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function recentGames(q: Queryable, userId: string, limit = 20) {
  const rows = await q.query(
    `SELECT g.id, g.kind, g.entry_fee, g.pot, g.player_count, g.bot_difficulty, g.finished_at, g.created_at, g.status,
            r.name AS room_name, gp.score, gp.placement, gp.is_winner, gp.prize, gp.points_earned, gp.entry_paid
       FROM game_players gp JOIN games g ON g.id = gp.game_id LEFT JOIN rooms r ON r.id = g.room_id
      WHERE gp.user_id = $1 AND g.status = 'finished'
      ORDER BY g.finished_at DESC NULLS LAST LIMIT $2`,
    [userId, limit],
  );
  return rows.map((r: any) => ({
    id: r.id,
    kind: r.kind as 'bot' | 'table' | 'private',
    roomName: r.room_name ?? (r.kind === 'bot' ? 'Treino contra bots' : 'Mesa'),
    players: Number(r.player_count),
    botDifficulty: r.bot_difficulty,
    score: Number(r.score),
    placement: Number(r.placement),
    won: r.is_winner,
    prize: Number(r.prize),
    entry: Number(r.entry_paid),
    points: Number(r.points_earned),
    finishedAt: r.finished_at ? new Date(r.finished_at).toISOString() : null,
  }));
}

export interface ProfilePatch {
  displayName?: string;
  avatar?: string;
  frame?: string;
  title?: string;
  tutorialDone?: boolean;
}

export async function updateProfile(q: Queryable, userId: string, patch: ProfilePatch) {
  const row = await getUserRow(q, userId, true);
  const level = levelFromPoints(row.points);
  const sets: string[] = [];
  const params: unknown[] = [userId];
  const set = (col: string, v: unknown) => {
    params.push(v);
    sets.push(`${col} = $${params.length}`);
  };
  if (patch.displayName !== undefined) {
    const name = patch.displayName.trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 24) throw badRequest('O nome deve ter entre 2 e 24 caracteres.');
    set('display_name', name);
  }
  if (patch.avatar !== undefined) {
    const c = CHARACTER_MAP[patch.avatar];
    if (!c) throw badRequest('Personagem desconhecido.');
    if (!isUnlocked(c.unlock, level, row.owned_items, c.id)) throw forbiddenLocked();
    set('avatar', c.id);
  }
  if (patch.frame !== undefined) {
    const f = FRAME_MAP[patch.frame];
    if (!f) throw badRequest('Moldura desconhecida.');
    if (!isUnlocked(f.unlock, level, row.owned_items, f.id)) throw forbiddenLocked();
    set('frame', f.id);
  }
  if (patch.title !== undefined) {
    const allowed = new Set([...titlesForLevel(level), ...achievementTitles(await q.query('SELECT achievement_id FROM achievements_unlocked WHERE user_id = $1', [userId]))]);
    if (!allowed.has(patch.title)) throw badRequest('Título ainda não conquistado.');
    set('title', patch.title);
  }
  if (patch.tutorialDone !== undefined) set('tutorial_done', !!patch.tutorialDone);
  if (sets.length) await q.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $1`, params);
}

function forbiddenLocked() {
  return conflict('Este item ainda está bloqueado.', 'LOCKED');
}

/** Conquistas de nível ouro/lenda também liberam o nome como título. */
export function achievementTitles(rows: { achievement_id: string }[]): string[] {
  return rows
    .map((r) => ACHIEVEMENT_MAP[r.achievement_id])
    .filter((a) => a && (a.tier === 'ouro' || a.tier === 'lenda'))
    .map((a) => a.name);
}

export async function buyItem(q: Queryable, userId: string, itemId: string, settings: GlobalSettings) {
  const row = await getUserRow(q, userId, true);
  const character = CHARACTER_MAP[itemId];
  const item = character ?? FRAME_MAP[itemId];
  if (!item) throw notFound('Item não encontrado no Relicário.');
  if (item.unlock.type !== 'diamonds') throw badRequest('Este item não é vendido por diamantes.');
  if (row.owned_items.includes(itemId)) throw conflict('Você já possui este item.');
  const name = character ? `Personagem ${item.name}` : `Moldura ${item.name}`;
  await move(q, { from: { type: 'user', id: userId }, to: HOUSE, currency: 'DIAMOND', amount: item.unlock.cost, kind: 'PURCHASE', description: name }, { actorId: userId, refType: 'item', refId: itemId });
  await q.query('UPDATE users SET owned_items = $2 WHERE id = $1', [userId, JSON.stringify([...row.owned_items, itemId])]);
  await grantProgress(q, userId, 0, settings);
}

