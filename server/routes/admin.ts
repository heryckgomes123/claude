import { Hono } from 'hono';
import { z } from 'zod';
import { body, requireAuth, requireSuperAdmin, tx, type AppEnv } from '../http';
import {
  adjustPlayer, economy, listAgents, listAllTables, listClubsAdmin, listPlayers, overview, playerDetail, setClubStatus, updateGlobalSettings,
} from '../services/admin';
import { listActivities } from '../services/activity';
import { createTable, updateTable, tickWorld } from '../services/rooms';
import { resetAllData } from '../bootstrap';
import { getSettings } from '../services/settings';
import { tableInput } from './clubs';

export const admin = new Hono<AppEnv>();
admin.use('*', requireAuth, requireSuperAdmin);

admin.get('/overview', async (c) => {
  await tickWorld(c.get('db'), c.get('settings'));
  return c.json({ ...(await overview(c.get('db'))), database: { driver: c.get('db').driver, persistent: c.get('db').persistent } });
});

admin.get('/players', async (c) =>
  c.json(await listPlayers(c.get('db'), { search: c.req.query('q'), filter: (c.req.query('filter') as any) || 'humanos', page: Number(c.req.query('page') ?? 0) })),
);
admin.get('/players/:id', async (c) => c.json(await playerDetail(c.get('db'), c.req.param('id'))));
admin.patch('/players/:id', async (c) => {
  const input = await body(
    c,
    z.object({
      currency: z.enum(['MIUDA', 'DIAMOND']).optional(),
      amount: z.number().int().optional(),
      reason: z.string().max(80).optional(),
      status: z.enum(['active', 'banned']).optional(),
      superAdmin: z.boolean().optional(),
    }),
  );
  await tx(c, (q) => adjustPlayer(q, c.get('userId'), c.req.param('id'), input));
  return c.json(await playerDetail(c.get('db'), c.req.param('id')));
});

admin.get('/clubs', async (c) => c.json({ items: await listClubsAdmin(c.get('db')) }));
admin.patch('/clubs/:id', async (c) => {
  const { status } = await body(c, z.object({ status: z.enum(['active', 'suspended']) }));
  await tx(c, (q) => setClubStatus(q, c.get('userId'), c.req.param('id'), status));
  return c.json({ ok: true });
});

admin.get('/agents', async (c) => c.json({ items: await listAgents(c.get('db')) }));
admin.get('/tables', async (c) => c.json({ items: await listAllTables(c.get('db')) }));
admin.post('/tables', async (c) => {
  const input = await body(c, tableInput.extend({ name: z.string().trim().min(3).max(32) }));
  const id = await tx(c, (q) => createTable(q, c.get('userId'), { ...input, clubId: null }));
  return c.json({ id });
});
admin.patch('/tables/:id', async (c) => {
  const input = await body(c, tableInput);
  await tx(c, (q) => updateTable(q, c.req.param('id'), c.get('userId'), input));
  return c.json({ ok: true });
});

admin.get('/economy', async (c) => c.json(await economy(c.get('db'))));
admin.get('/activity', async (c) => c.json({ items: await listActivities(c.get('db'), { limit: 100 }) }));

admin.get('/settings', async (c) => c.json(await getSettings(c.get('db'))));
admin.patch('/settings', async (c) => {
  const input = await body(
    c,
    z.object({
      welcomeBonus: z.number().optional(),
      welcomeDiamonds: z.number().optional(),
      lifeRegenMinutes: z.number().optional(),
      lifeRefillCostDiamonds: z.number().optional(),
      defaultRakePct: z.number().optional(),
      defaultAgentCommissionPct: z.number().optional(),
      levelUpDiamonds: z.number().optional(),
      maxTransfer: z.number().optional(),
      announcement: z.string().max(200).optional(),
      maintenance: z.boolean().optional(),
    }),
  );
  return c.json(await tx(c, (q) => updateGlobalSettings(q, c.get('userId'), input)));
});

/** Ferramenta de desenvolvimento: apaga tudo e recria os dados de demonstração. */
admin.post('/reset', async (c) => {
  const { confirm } = await body(c, z.object({ confirm: z.literal('RESETAR') }));
  void confirm;
  const r = await resetAllData(c.get('db'));
  return c.json({ ok: true, ...r });
});
