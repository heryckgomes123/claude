/**
 * API da MIÚDA — aplicação Hono única, executada como Netlify Function em
 * produção e como servidor Node em desenvolvimento.
 */
import { Hono } from 'hono';
import { ApiError } from './lib/errors';
import { withDb, type AppEnv } from './http';
import { auth } from './routes/auth';
import { player } from './routes/player';
import { play } from './routes/play';
import { clubs, agent } from './routes/clubs';
import { admin } from './routes/admin';
import { demoMode } from './bootstrap';
import { CHARACTERS, ACHIEVEMENTS, FRAMES, CLUB_COLORS, CLUB_EMBLEMS, CLUB_TYPES, TABLE_CATEGORIES } from '../shared/catalog';

export function createApp() {
  const app = new Hono<AppEnv>().basePath('/api');

  app.onError((err, c) => {
    if (err instanceof ApiError) return c.json({ error: { code: err.code, message: err.message } }, err.status as any);
    const pgCode = (err as { code?: string }).code;
    if (pgCode === '40P01' || pgCode === '40001') {
      return c.json({ error: { code: 'RETRY', message: 'A Toca está movimentada. Tente novamente.' } }, 409);
    }
    console.error('[api]', c.req.method, c.req.path, err);
    return c.json({ error: { code: 'INTERNAL', message: 'Algo deu errado na Toca. Tente novamente.' } }, 500);
  });

  app.use('*', async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store');
    c.header('X-Content-Type-Options', 'nosniff');
  });

  app.get('/health', (c) => c.json({ ok: true, name: 'MIÚDA — Da Toca do Javali', time: new Date().toISOString() }));

  app.use('*', withDb);

  app.get('/config', (c) => {
    const db = c.get('db');
    return c.json({
      demoMode: demoMode(),
      database: { driver: db.driver, persistent: db.persistent },
      catalog: { characters: CHARACTERS, achievements: ACHIEVEMENTS, frames: FRAMES, clubColors: CLUB_COLORS, clubEmblems: CLUB_EMBLEMS, clubTypes: CLUB_TYPES, tableCategories: TABLE_CATEGORIES },
    });
  });

  app.route('/auth', auth);
  app.route('/clubs', clubs);
  app.route('/agent', agent);
  app.route('/admin', admin);
  app.route('/', play);
  app.route('/', player);

  app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } }, 404));
  return app;
}
