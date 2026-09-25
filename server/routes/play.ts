import { Hono } from 'hono';
import { z } from 'zod';
import { body, requireAuth, tx, type AppEnv } from '../http';
import {
  createPrivateRoom, getRoom, inviteToRoom, joinRoom, leaveRoom, listTables, roomDto, startRoom, tickRoom, tickWorld,
  updatePrivateRoom, watchRoom,
} from '../services/rooms';
import { gameAction, gameView, forfeitGame, startBotGame } from '../services/games';

export const play = new Hono<AppEnv>();
play.use('*', requireAuth);

const roomConfig = z.object({
  name: z.string().max(32).optional(),
  rounds: z.number().int().optional(),
  entryFee: z.number().int().min(0).optional(),
  maxPlayers: z.number().int().min(2).max(6).optional(),
  bots: z.number().int().min(0).max(5).optional(),
  botDifficulty: z.enum(['facil', 'medio', 'dificil']).optional(),
  clubId: z.string().nullable().optional(),
});

play.get('/tables', async (c) => {
  const db = c.get('db');
  await tickWorld(db, c.get('settings'));
  return c.json({ items: await listTables(db, c.get('userId'), { clubId: c.req.query('clubId') || undefined }) });
});

play.post('/rooms', async (c) => {
  const input = await body(c, roomConfig);
  const code = await tx(c, (q) => createPrivateRoom(q, c.get('userId'), input));
  const db = c.get('db');
  return c.json(await roomDto(db, await getRoom(db, code), c.get('userId')));
});

play.get('/rooms/:code', async (c) => {
  const db = c.get('db');
  const room = await getRoom(db, c.req.param('code'));
  if (room.kind === 'table' || room.status === 'playing') await tx(c, (q) => tickRoom(q, room.id, c.get('settings')));
  return c.json(await roomDto(db, await getRoom(db, room.id), c.get('userId')));
});

play.patch('/rooms/:code', async (c) => {
  const input = await body(c, roomConfig);
  await tx(c, (q) => updatePrivateRoom(q, c.req.param('code'), c.get('userId'), input));
  const db = c.get('db');
  return c.json(await roomDto(db, await getRoom(db, c.req.param('code')), c.get('userId')));
});

play.post('/rooms/:code/join', async (c) => {
  const room = await tx(c, (q) => joinRoom(q, c.req.param('code'), c.get('userId')));
  const db = c.get('db');
  return c.json(await roomDto(db, await getRoom(db, room.id), c.get('userId')));
});

play.post('/rooms/:code/leave', async (c) => {
  await tx(c, (q) => leaveRoom(q, c.req.param('code'), c.get('userId'), c.get('settings')));
  return c.json({ ok: true });
});

play.post('/rooms/:code/start', async (c) => {
  const gameId = await tx(c, (q) => startRoom(q, c.req.param('code'), c.get('userId')));
  return c.json({ gameId });
});

play.post('/rooms/:code/invite', async (c) => {
  const { username } = await body(c, z.object({ username: z.string().min(3) }));
  return c.json(await tx(c, (q) => inviteToRoom(q, c.req.param('code'), c.get('userId'), username)));
});

play.post('/rooms/:code/watch', async (c) => {
  await watchRoom(c.get('db'), c.req.param('code'), c.get('userId'));
  return c.json({ ok: true });
});

play.post('/games/bot', async (c) => {
  const input = await body(c, z.object({ difficulty: z.enum(['facil', 'medio', 'dificil']), rounds: z.number().int(), opponents: z.number().int().min(1).max(3) }));
  const gameId = await tx(c, (q) => startBotGame(q, c.get('userId'), input, c.get('settings')));
  return c.json({ gameId });
});

play.get('/games/:id', async (c) => {
  const since = Number(c.req.query('since') ?? 0) || 0;
  return c.json(await tx(c, (q) => gameView(q, c.req.param('id'), c.get('userId'), since, c.get('settings'))));
});

const action = z.discriminatedUnion('type', [
  z.object({ type: z.literal('roll') }),
  z.object({ type: z.literal('keep'), indices: z.array(z.number().int().min(0).max(5)).min(1).max(6), then: z.enum(['roll', 'bank']) }),
  z.object({ type: z.literal('emote'), key: z.string().max(20) }),
]);

play.post('/games/:id/action', async (c) => {
  const input = await body(c, action);
  const id = c.req.param('id');
  await tx(c, (q) => gameAction(q, id, c.get('userId'), input, c.get('settings')));
  const since = Number(c.req.query('since') ?? 0) || 0;
  return c.json(await tx(c, (q) => gameView(q, id, c.get('userId'), since, c.get('settings'))));
});

play.post('/games/:id/leave', async (c) => {
  await tx(c, (q) => forfeitGame(q, c.req.param('id'), c.get('userId'), c.get('settings')));
  return c.json({ ok: true });
});
