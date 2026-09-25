import { Hono } from 'hono';
import { z } from 'zod';
import { body, requireAuth, tx, type AppEnv } from '../http';
import { notFound } from '../lib/errors';
import { buyItem, getUserRow, meDto, publicProfile, recentGames, refillLives, updateProfile, achievementTitles } from '../services/users';
import { listTransactions, walletId } from '../services/wallet';
import { listNotifications, mapNotification } from '../services/notifications';
import { homeFeed, ranking, searchPlayers, transfer, type RankingType } from '../services/social';
import { activeGameFor } from '../services/games';
import { listTables, myRooms, tickWorld } from '../services/rooms';
import { ACHIEVEMENTS, titlesForLevel, levelFromPoints } from '../../shared/catalog';
import { normalizeStats, statValue } from '../services/stats';
import { avatarsUnlocked } from '../services/users';

export const player = new Hono<AppEnv>();
player.use('*', requireAuth);

player.get('/me', async (c) => c.json(await meDto(c.get('db'), c.get('userId'), c.get('settings'))));

player.patch('/me', async (c) => {
  const input = await body(
    c,
    z.object({
      displayName: z.string().optional(),
      avatar: z.string().optional(),
      frame: z.string().optional(),
      title: z.string().optional(),
      tutorialDone: z.boolean().optional(),
    }),
  );
  await tx(c, (q) => updateProfile(q, c.get('userId'), input));
  return c.json(await meDto(c.get('db'), c.get('userId'), c.get('settings')));
});

player.get('/me/titles', async (c) => {
  const db = c.get('db');
  const u = await getUserRow(db, c.get('userId'));
  const ach = await db.query('SELECT achievement_id FROM achievements_unlocked WHERE user_id = $1', [u.id]);
  return c.json({ titles: [...titlesForLevel(levelFromPoints(u.points)), ...achievementTitles(ach)] });
});

player.get('/me/transactions', async (c) => {
  const uid = c.get('userId');
  const currency = c.req.query('currency');
  const before = Number(c.req.query('before')) || undefined;
  const wallets = currency === 'DIAMOND' ? [walletId({ type: 'user', id: uid }, 'DIAMOND')] : currency === 'MIUDA' ? [walletId({ type: 'user', id: uid }, 'MIUDA')] : [walletId({ type: 'user', id: uid }, 'MIUDA'), walletId({ type: 'user', id: uid }, 'DIAMOND')];
  const items = await listTransactions(c.get('db'), wallets, { before, limit: 30 });
  return c.json({ items, next: items.length === 30 ? items[items.length - 1].id : null });
});

player.get('/me/games', async (c) => c.json({ items: await recentGames(c.get('db'), c.get('userId'), 40) }));

player.get('/me/achievements', async (c) => {
  const db = c.get('db');
  const u = await getUserRow(db, c.get('userId'));
  const unlocked = await db.query('SELECT achievement_id, unlocked_at FROM achievements_unlocked WHERE user_id = $1', [u.id]);
  const map = new Map(unlocked.map((r: any) => [r.achievement_id, new Date(r.unlocked_at).toISOString()]));
  const stats = normalizeStats(u.stats);
  const ctx = { points: u.points, avatarsUnlocked: avatarsUnlocked(u) };
  return c.json({
    items: ACHIEVEMENTS.map((a) => ({
      ...a,
      progress: Math.min(a.target, statValue(stats, a.stat, ctx)),
      unlockedAt: map.get(a.id) ?? null,
    })),
  });
});

player.post('/shop/buy', async (c) => {
  const { itemId } = await body(c, z.object({ itemId: z.string() }));
  await tx(c, (q) => buyItem(q, c.get('userId'), itemId, c.get('settings')));
  return c.json(await meDto(c.get('db'), c.get('userId'), c.get('settings')));
});

player.post('/lives/refill', async (c) => {
  const r = await tx(c, (q) => refillLives(q, c.get('userId'), c.get('settings')));
  return c.json({ ...r, me: await meDto(c.get('db'), c.get('userId'), c.get('settings')) });
});

player.post('/wallet/transfer', async (c) => {
  const input = await body(c, z.object({ to: z.string().min(3), amount: z.number().int().positive(), note: z.string().max(80).optional() }));
  const r = await tx(c, (q) => transfer(q, c.get('userId'), input.to, input.amount, input.note ?? '', c.get('settings')));
  return c.json({ ...r, me: await meDto(c.get('db'), c.get('userId'), c.get('settings')) });
});

player.get('/players/search', async (c) => c.json({ items: await searchPlayers(c.get('db'), c.req.query('q') ?? '', c.get('userId')) }));
player.get('/players/:username', async (c) => c.json(await publicProfile(c.get('db'), c.req.param('username'))));

player.get('/home', async (c) => {
  const db = c.get('db');
  await tickWorld(db, c.get('settings'));
  const uid = c.get('userId');
  const [feed, active, tables, rooms] = await Promise.all([homeFeed(db), activeGameFor(db, uid), listTables(db, uid), myRooms(db, uid)]);
  return c.json({ ...feed, activeGame: active, tables: tables.slice(0, 6), rooms });
});

player.get('/rankings', async (c) => {
  const t = (c.req.query('type') ?? 'geral') as RankingType;
  const type: RankingType = ['geral', 'semana', 'vitorias', 'clubes'].includes(t) ? t : 'geral';
  return c.json(await ranking(c.get('db'), type, c.get('userId')));
});

/* ---------------------------- Notificações ---------------------------- */

player.get('/notifications', async (c) => c.json({ items: await listNotifications(c.get('db'), c.get('userId'), 80) }));

player.post('/notifications/read-all', async (c) => {
  await c.get('db').query('UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL', [c.get('userId')]);
  return c.json({ ok: true });
});

player.post('/notifications/:id/read', async (c) => {
  const row = await c.get('db').one('UPDATE notifications SET read_at = COALESCE(read_at, now()) WHERE id = $1 AND user_id = $2 RETURNING *', [Number(c.req.param('id')), c.get('userId')]);
  if (!row) throw notFound('Notificação não encontrada.');
  return c.json(mapNotification(row));
});

player.delete('/notifications/:id', async (c) => {
  await c.get('db').query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [Number(c.req.param('id')), c.get('userId')]);
  return c.json({ ok: true });
});

/** Limpar: remove as lidas (ou todas com ?all=1). */
player.delete('/notifications', async (c) => {
  const all = c.req.query('all') === '1';
  await c.get('db').query(`DELETE FROM notifications WHERE user_id = $1 ${all ? '' : 'AND read_at IS NOT NULL'}`, [c.get('userId')]);
  return c.json({ ok: true });
});
