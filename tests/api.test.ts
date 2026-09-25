/**
 * Testes de integração da API contra um PostgreSQL embutido (PGlite em memória).
 * Cobrem autenticação, papéis/permissões, partida contra bot do início ao fim,
 * salas privadas, clubes, economia (conservação das Miúdas), notificações e reset.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

process.env.PGLITE_DIR = 'memory';
process.env.SESSION_SECRET = 'test-secret';

const { createApp } = await import('../server/app');
const { getDb } = await import('../server/db');
const app = createApp();

async function call(method: string, path: string, body?: unknown, token?: string) {
  const res = await app.fetch(
    new Request(`http://t/api${path}`, {
      method,
      headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  );
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}
const get = (p: string, t?: string) => call('GET', p, undefined, t);
const post = (p: string, b: unknown, t?: string) => call('POST', p, b, t);

async function conservation() {
  const db = await getDb();
  const total = await db.one<{ s: number }>(`SELECT COALESCE(sum(balance),0)::bigint AS s FROM wallets WHERE currency = 'MIUDA'`);
  const genesis = await db.one<{ s: number }>(`SELECT COALESCE(sum(amount),0)::bigint AS s FROM transactions WHERE currency = 'MIUDA' AND kind = 'GENESIS'`);
  const mismatched = await db.one<{ n: number }>(`SELECT count(*)::int AS n FROM wallets w WHERE w.balance <> (SELECT COALESCE(sum(amount),0) FROM transactions t WHERE t.wallet_id = w.id)`);
  return { total: Number(total!.s), genesis: Number(genesis!.s), mismatched: Number(mismatched!.n) };
}

let player: string;
let admin: string;
let superAdmin: string;
let fresh: string;
let freshName: string;

beforeAll(async () => {
  expect((await get('/health')).status).toBe(200);
  player = (await post('/auth/demo', { role: 'PLAYER' })).data.token;
  admin = (await post('/auth/demo', { role: 'CLUB_ADMIN' })).data.token;
  superAdmin = (await post('/auth/demo', { role: 'SUPER_ADMIN' })).data.token;
});

afterAll(() => vi.useRealTimers());

describe('autenticação e perfil', () => {
  it('registra, entra e bloqueia sessão inválida', async () => {
    freshName = `teste_${Date.now() % 100000}`;
    const r = await post('/auth/register', { username: freshName, password: 'segredo1', displayName: 'Novato', avatar: 'kael' });
    expect(r.status).toBe(200);
    expect(r.data.me.miudas).toBe(1000);
    expect(r.data.me.avatar).toBe('kael');
    fresh = r.data.token;
    expect((await post('/auth/login', { username: freshName, password: 'errada' })).status).toBe(401);
    expect((await post('/auth/login', { username: freshName, password: 'segredo1' })).status).toBe(200);
    expect((await get('/me', 'lixo.token')).status).toBe(401);
    expect((await get('/me')).status).toBe(401);
    expect((await post('/auth/register', { username: freshName, password: 'segredo1', displayName: 'Xy' })).status).toBe(409);
  });

  it('não permite equipar personagem bloqueado', async () => {
    const r = await call('PATCH', '/me', { avatar: 'corvin' }, fresh);
    expect(r.status).toBe(409);
    expect((await call('PATCH', '/me', { avatar: 'lynx', tutorialDone: true }, fresh)).data.avatar).toBe('lynx');
  });
});

describe('permissões', () => {
  it('jogador comum não acessa Super Admin nem admin de clube alheio', async () => {
    expect((await get('/admin/overview', player)).status).toBe(403);
    const clubs = (await get('/clubs', player)).data.items;
    const javali = clubs.find((c: any) => c.name === 'Clube do Javali');
    expect((await get(`/clubs/${javali.id}/admin/overview`, player)).status).toBe(403);
    expect((await get(`/clubs/${javali.id}/admin/overview`, admin)).status).toBe(200);
    expect((await get('/admin/overview', superAdmin)).status).toBe(200);
  });
});

describe('partida contra bot', () => {
  it('joga do início ao fim com recompensas e histórico', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now());
    const before = (await get('/me', fresh)).data;
    const start = await post('/games/bot', { difficulty: 'facil', rounds: 3, opponents: 1 }, fresh);
    expect(start.status).toBe(200);
    const id = start.data.gameId;
    let view = (await get(`/games/${id}`, fresh)).data;
    let guard = 0;
    while (view.status === 'playing' && guard++ < 300) {
      const t = view.state.turn;
      if (t.player === view.mySeat) {
        if (!t.rolled) view = (await post(`/games/${id}/action`, { type: 'roll' }, fresh)).data;
        else {
          const { bestSelection } = await import('../shared/dice');
          view = (await post(`/games/${id}/action`, { type: 'keep', indices: bestSelection(t.roll).indices, then: 'bank' }, fresh)).data;
        }
      } else {
        vi.setSystemTime(Date.now() + 5000);
        view = (await get(`/games/${id}`, fresh)).data;
      }
    }
    vi.useRealTimers();
    expect(view.status).toBe('finished');
    expect(view.results).toHaveLength(2);
    const after = (await get('/me', fresh)).data;
    expect(after.stats.games).toBe(before.stats.games + 1);
    expect(after.points).toBeGreaterThan(before.points);
    const won = view.results.find((r: any) => r.userId === after.id).isWinner;
    if (won) expect(after.miudas).toBeGreaterThanOrEqual(before.miudas + 10);
    else expect(after.lives).toBe(before.lives - 1);
    const history = (await get('/me/games', fresh)).data.items;
    expect(history[0].id).toBe(id);
    const ach = (await get('/me/achievements', fresh)).data.items.find((a: any) => a.id === 'primeira_partida');
    expect(ach.unlockedAt).not.toBeNull();
  });

  it('ações inválidas são recusadas pelo servidor', async () => {
    const id = (await post('/games/bot', { difficulty: 'medio', rounds: 3, opponents: 1 }, player)).data.gameId;
    const view = (await get(`/games/${id}`, player)).data;
    if (view.state.turn.player === view.mySeat && !view.state.turn.rolled) {
      const bad = await post(`/games/${id}/action`, { type: 'keep', indices: [0], then: 'bank' }, player);
      expect(bad.status).toBe(400);
    }
    expect((await post(`/games/${id}/action`, { type: 'roll' }, fresh)).status).toBe(403);
    await post(`/games/${id}/leave`, {}, player);
  });
});

describe('salas privadas e código', () => {
  it('cria, entra pelo código, inicia e cobra entradas', async () => {
    const room = await post('/rooms', { name: 'Sala de Teste', rounds: 3, maxPlayers: 3, entryFee: 10, bots: 1 }, fresh);
    expect(room.status).toBe(200);
    const code = room.data.code;
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
    expect((await post('/rooms/ZZZZZZ/join', {}, player)).status).toBe(404);
    const joined = await post(`/rooms/${code}/join`, {}, player);
    expect(joined.data.members).toHaveLength(2);
    expect((await post(`/rooms/${code}/start`, {}, player)).status).toBe(403);
    const started = await post(`/rooms/${code}/start`, {}, fresh);
    expect(started.status).toBe(200);
    const g = (await get(`/games/${started.data.gameId}`, fresh)).data;
    expect(g.state.players).toHaveLength(3);
    expect(g.pot).toBe(30);
  });
});

describe('clubes', () => {
  it('cria clube, recebe solicitação e aprova', async () => {
    const c = await post('/clubs', { name: `Clube Teste ${Date.now() % 1000}`, description: 'x', emblem: 'wolf', color: 'noite', type: 'solicitacao', rules: '' }, fresh);
    expect(c.status).toBe(200);
    const id = c.data.club.id;
    const me = (await get('/me', fresh)).data;
    expect(me.roles).toContain('CLUB_ADMIN');
    const req = await post(`/clubs/${id}/join`, {}, player);
    expect(req.data.status).toBe('pending');
    const aric = (await get('/me', player)).data;
    expect((await post(`/clubs/${id}/admin/requests/${aric.id}`, { approve: true }, player)).status).toBe(403);
    expect((await post(`/clubs/${id}/admin/requests/${aric.id}`, { approve: true }, fresh)).status).toBe(200);
    const detail = (await get(`/clubs/${id}`, player)).data;
    expect(detail.club.myStatus).toBe('active');
    const t = await post(`/clubs/${id}/admin/tables`, { name: 'Mesa Teste', entryFee: 20, maxPlayers: 4 }, fresh);
    expect(t.status).toBe(200);
  });
});

describe('economia', () => {
  it('transfere e registra no extrato de ambos', async () => {
    const before = (await get('/me', player)).data.miudas;
    const r = await post('/wallet/transfer', { to: freshName, amount: 25, note: 'rodada' }, player);
    expect(r.status).toBe(200);
    expect(r.data.me.miudas).toBe(before - 25);
    const tx = (await get('/me/transactions?currency=MIUDA', fresh)).data.items[0];
    expect(tx.kind).toBe('TRANSFER_IN');
    expect(tx.amount).toBe(25);
    expect((await post('/wallet/transfer', { to: freshName, amount: 999999999 }, player)).status).toBe(400);
  });

  it('Miúdas são conservadas e saldos batem com o livro-razão', async () => {
    const c = await conservation();
    expect(c.total).toBe(c.genesis);
    expect(c.mismatched).toBe(0);
  });
});

describe('notificações', () => {
  it('lista, marca como lida e limpa', async () => {
    const list = (await get('/notifications', player)).data.items;
    expect(list.length).toBeGreaterThan(0);
    await post('/notifications/read-all', {}, player);
    expect((await get('/me', player)).data.unreadNotifications).toBe(0);
    await call('DELETE', '/notifications', undefined, player);
    expect((await get('/notifications', player)).data.items.length).toBe(0);
  });
});

describe('super admin', () => {
  it('ajusta saldo e reseta os dados', async () => {
    const target = (await get('/me', fresh)).data;
    const r = await call('PATCH', `/admin/players/${target.id}`, { currency: 'MIUDA', amount: 500, reason: 'teste' }, superAdmin);
    expect(r.status).toBe(200);
    expect((await post('/admin/reset', { confirm: 'nao' }, superAdmin)).status).toBe(400);
    const reset = await post('/admin/reset', { confirm: 'RESETAR' }, superAdmin);
    expect(reset.status).toBe(200);
    expect((await get('/me', fresh)).status).toBe(401);
    const c = await conservation();
    expect(c.total).toBe(c.genesis);
  });
});
