import { Hono } from 'hono';
import { z } from 'zod';
import { body, requireAuth, tx, type AppEnv } from '../http';
import {
  adminInbox, clubMetrics, createClub, decideRequest, deposit, getClub, getClubRow, inviteToClub, joinClub, leaveClub, listClubs,
  listMembers, payout, removeMember, requireClubRole, respondInvite, treasury, unbanMember, updateClub, updateMember,
} from '../services/clubs';
import { createTable, listTables, updateTable } from '../services/rooms';
import { agentDashboard } from '../services/social';
import { forbidden } from '../lib/errors';
import { CLUB_EMBLEMS } from '../../shared/catalog';

export const clubs = new Hono<AppEnv>();
clubs.use('*', requireAuth);

const settingsSchema = z
  .object({
    maxMembers: z.number().int().optional(),
    minLevel: z.number().int().optional(),
    rakePct: z.number().int().optional(),
    agentCommissionPct: z.number().int().optional(),
    membersCanInvite: z.boolean().optional(),
    allowBots: z.boolean().optional(),
    tableLimit: z.number().int().optional(),
    maxEntry: z.number().int().optional(),
  })
  .optional();

const clubInput = z.object({
  name: z.string().trim().min(3).max(32),
  description: z.string().max(280).default(''),
  emblem: z.enum(CLUB_EMBLEMS as [string, ...string[]]),
  color: z.string(),
  type: z.enum(['aberto', 'solicitacao', 'convite']),
  rules: z.string().max(1200).default(''),
  settings: settingsSchema,
});

clubs.get('/', async (c) => c.json({ items: await listClubs(c.get('db'), c.get('userId'), { search: c.req.query('q') || undefined, mine: c.req.query('mine') === '1' }) }));

clubs.post('/', async (c) => {
  const input = await body(c, clubInput);
  const id = await tx(c, (q) => createClub(q, c.get('userId'), input, c.get('settings')));
  return c.json(await getClub(c.get('db'), id, c.get('userId')));
});

clubs.get('/:id', async (c) => {
  const db = c.get('db');
  const data = await getClub(db, c.req.param('id'), c.get('userId'));
  const tables = await listTables(db, c.get('userId'), { clubId: data.club.id });
  return c.json({ ...data, tables });
});

clubs.post('/:id/join', async (c) => {
  const { message } = await body(c, z.object({ message: z.string().max(140).optional() }));
  const r = await tx(c, (q) => joinClub(q, c.req.param('id'), c.get('userId'), c.get('settings'), message));
  return c.json(r);
});

clubs.post('/:id/leave', async (c) => {
  await tx(c, (q) => leaveClub(q, c.req.param('id'), c.get('userId')));
  return c.json({ ok: true });
});

clubs.post('/:id/invite/respond', async (c) => {
  const { accept } = await body(c, z.object({ accept: z.boolean() }));
  await tx(c, (q) => respondInvite(q, c.req.param('id'), c.get('userId'), accept, c.get('settings')));
  return c.json({ ok: true });
});

clubs.post('/:id/invite', async (c) => {
  const { username } = await body(c, z.object({ username: z.string().min(3) }));
  return c.json(await tx(c, (q) => inviteToClub(q, c.req.param('id'), c.get('userId'), username)));
});

clubs.post('/:id/deposit', async (c) => {
  const { amount } = await body(c, z.object({ amount: z.number().int().positive() }));
  await tx(c, (q) => deposit(q, c.req.param('id'), c.get('userId'), amount));
  return c.json({ ok: true });
});

/* --------------------------- Administração --------------------------- */

const admin = new Hono<AppEnv>();

admin.use('*', async (c, next) => {
  const club = await getClubRow(c.get('db'), c.req.param('id')!);
  await requireClubRole(c.get('db'), club.id, c.get('userId'), ['owner', 'admin']);
  await next();
});

admin.get('/overview', async (c) => {
  const db = c.get('db');
  const id = (await getClubRow(db, c.req.param('id')!)).id;
  const [data, metrics, inbox, cash] = await Promise.all([
    getClub(db, id, c.get('userId')),
    clubMetrics(db, id),
    adminInbox(db, id, c.get('userId')),
    treasury(db, id, c.get('userId')),
  ]);
  return c.json({ club: data.club, metrics, inbox, treasury: { balance: cash.balance, inflowWeek: cash.inflowWeek, rake: cash.rake } });
});

admin.get('/inbox', async (c) => c.json(await adminInbox(c.get('db'), (await getClubRow(c.get('db'), c.req.param('id')!)).id, c.get('userId'))));

admin.get('/members', async (c) => {
  const db = c.get('db');
  const id = (await getClubRow(db, c.req.param('id')!)).id;
  const status = c.req.query('status');
  return c.json({ items: await listMembers(db, id, { status: status || undefined }) });
});

admin.patch('/members/:userId', async (c) => {
  const input = await body(c, z.object({ role: z.enum(['admin', 'agent', 'member']).optional(), agentId: z.string().nullable().optional(), commissionPct: z.number().int().nullable().optional() }));
  await tx(c, async (q) => updateMember(q, (await getClubRow(q, c.req.param('id')!)).id, c.get('userId'), c.req.param('userId'), input));
  return c.json({ ok: true });
});

admin.delete('/members/:userId', async (c) => {
  const ban = c.req.query('ban') === '1';
  await tx(c, async (q) => removeMember(q, (await getClubRow(q, c.req.param('id')!)).id, c.get('userId'), c.req.param('userId'), ban));
  return c.json({ ok: true });
});

admin.post('/members/:userId/unban', async (c) => {
  await tx(c, async (q) => unbanMember(q, (await getClubRow(q, c.req.param('id')!)).id, c.get('userId'), c.req.param('userId')));
  return c.json({ ok: true });
});

admin.post('/requests/:userId', async (c) => {
  const { approve } = await body(c, z.object({ approve: z.boolean() }));
  await tx(c, async (q) => decideRequest(q, (await getClubRow(q, c.req.param('id')!)).id, c.get('userId'), c.req.param('userId'), approve, c.get('settings')));
  return c.json({ ok: true });
});

admin.get('/treasury', async (c) => {
  const db = c.get('db');
  return c.json(await treasury(db, (await getClubRow(db, c.req.param('id')!)).id, c.get('userId'), { before: Number(c.req.query('before')) || undefined }));
});

admin.post('/treasury/payout', async (c) => {
  const input = await body(c, z.object({ username: z.string().min(3), amount: z.number().int().positive(), note: z.string().max(80).default('') }));
  await tx(c, async (q) => payout(q, (await getClubRow(q, c.req.param('id')!)).id, c.get('userId'), input.username, input.amount, input.note));
  return c.json({ ok: true });
});

admin.get('/metrics', async (c) => {
  const db = c.get('db');
  return c.json(await clubMetrics(db, (await getClubRow(db, c.req.param('id')!)).id));
});

admin.get('/tables', async (c) => {
  const db = c.get('db');
  return c.json({ items: await listTables(db, c.get('userId'), { clubId: (await getClubRow(db, c.req.param('id')!)).id, includeClosed: true }) });
});

const tableInput = z.object({
  name: z.string().trim().min(3).max(32).optional(),
  rounds: z.number().int().optional(),
  entryFee: z.number().int().min(0).optional(),
  maxPlayers: z.number().int().min(2).max(6).optional(),
  botFill: z.boolean().optional(),
  botDifficulty: z.enum(['facil', 'medio', 'dificil']).optional(),
  category: z.string().optional(),
  rakePct: z.number().int().optional(),
  countdownSec: z.number().int().optional(),
  description: z.string().max(140).optional(),
  status: z.enum(['open', 'closed']).optional(),
});

admin.post('/tables', async (c) => {
  const input = await body(c, tableInput.extend({ name: z.string().trim().min(3).max(32) }));
  const id = await tx(c, async (q) => createTable(q, c.get('userId'), { ...input, clubId: (await getClubRow(q, c.req.param('id')!)).id }));
  return c.json({ id });
});

admin.patch('/tables/:roomId', async (c) => {
  const input = await body(c, tableInput);
  await tx(c, async (q) => {
    const club = await getClubRow(q, c.req.param('id')!);
    const room = await q.one('SELECT club_id FROM rooms WHERE id = $1', [c.req.param('roomId')]);
    if (!room || room.club_id !== club.id) throw forbidden('Mesa de outro clube.');
    await updateTable(q, c.req.param('roomId'), c.get('userId'), input);
  });
  return c.json({ ok: true });
});

admin.patch('/settings', async (c) => {
  const input = await body(c, clubInput.partial());
  await tx(c, async (q) => updateClub(q, (await getClubRow(q, c.req.param('id')!)).id, c.get('userId'), input, c.get('settings')));
  return c.json({ ok: true });
});

clubs.route('/:id/admin', admin);

/* ------------------------------- Agente ------------------------------- */

export const agent = new Hono<AppEnv>();
agent.use('*', requireAuth);
agent.get('/', async (c) => c.json(await agentDashboard(c.get('db'), c.get('userId'))));

export { tableInput };
