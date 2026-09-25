import { Hono } from 'hono';
import { z } from 'zod';
import { body, clientIp, issueToken, rateLimit, requireAuth, tx, type AppEnv } from '../http';
import { hashPassword, verifyPassword } from '../lib/crypto';
import { badRequest, conflict, forbidden, unauthorized } from '../lib/errors';
import { createUser, findUserByUsername, getUserRow, meDto, USERNAME_RE } from '../services/users';
import { demoMode } from '../bootstrap';
import { DEMO_ACCOUNTS } from '../seed';
import { randomInt } from 'node:crypto';

export const auth = new Hono<AppEnv>();

const credentials = z.object({
  username: z.string().trim().toLowerCase().min(3).max(20),
  password: z.string().min(6, 'a senha deve ter ao menos 6 caracteres').max(100),
});

auth.post('/register', async (c) => {
  const input = await body(c, credentials.extend({ displayName: z.string().trim().min(2).max(24), avatar: z.string().optional() }));
  rateLimit(`register:${clientIp(c)}`, 10, 60 * 60_000);
  if (!USERNAME_RE.test(input.username)) throw badRequest('Nome de usuário: 3–20 caracteres (a–z, 0–9, _).');
  const hash = await hashPassword(input.password);
  const settings = c.get('settings');
  const id = await tx(c, (q) => createUser(q, { username: input.username, displayName: input.displayName, passwordHash: hash, avatar: input.avatar }, settings));
  const token = await issueToken(c.get('db'), id, 0);
  return c.json({ token, me: await meDto(c.get('db'), id, settings) });
});

auth.post('/login', async (c) => {
  const input = await body(c, credentials.extend({ password: z.string().min(1).max(100) }));
  rateLimit(`login:${clientIp(c)}:${input.username}`, 8, 10 * 60_000);
  const db = c.get('db');
  const user = await findUserByUsername(db, input.username);
  if (!user || user.is_demo || !(await verifyPassword(input.password, user.password_hash))) {
    throw unauthorized('Usuário ou senha incorretos.');
  }
  if (user.status === 'banned') throw forbidden('Sua conta foi suspensa pela administração da Toca.');
  const token = await issueToken(db, user.id, user.token_version);
  return c.json({ token, me: await meDto(db, user.id, c.get('settings')) });
});

/** Entrada rápida como convidado (conta real, pode ser "reivindicada" depois). */
auth.post('/guest', async (c) => {
  const input = await body(c, z.object({ displayName: z.string().trim().min(2).max(24).optional(), avatar: z.string().optional() }));
  rateLimit(`guest:${clientIp(c)}`, 20, 60 * 60_000);
  const settings = c.get('settings');
  const id = await tx(c, async (q) => {
    let username = '';
    for (let i = 0; i < 5; i++) {
      username = `viajante_${randomInt(10000, 99999)}`;
      if (!(await findUserByUsername(q, username))) break;
    }
    return createUser(q, { username, displayName: input.displayName || `Viajante ${username.slice(-4)}`, passwordHash: null, isGuest: true, avatar: input.avatar }, settings);
  });
  const token = await issueToken(c.get('db'), id, 0);
  return c.json({ token, me: await meDto(c.get('db'), id, settings) });
});

/** Modo de desenvolvimento: entrar como um dos papéis de demonstração. */
auth.get('/demo-accounts', (c) => {
  if (!demoMode()) return c.json({ enabled: false, accounts: [] });
  return c.json({ enabled: true, accounts: DEMO_ACCOUNTS.map(({ role, username, displayName, avatar, label, description }) => ({ role, username, displayName, avatar, label, description })) });
});

auth.post('/demo', async (c) => {
  if (!demoMode()) throw forbidden('O modo de demonstração está desativado.');
  const { role } = await body(c, z.object({ role: z.enum(['PLAYER', 'CLUB_ADMIN', 'AGENT', 'SUPER_ADMIN']) }));
  const acc = DEMO_ACCOUNTS.find((a) => a.role === role)!;
  const db = c.get('db');
  const user = await findUserByUsername(db, acc.username);
  if (!user) throw conflict('Conta de demonstração não encontrada. Resete os dados.');
  const token = await issueToken(db, user.id, user.token_version);
  return c.json({ token, me: await meDto(db, user.id, c.get('settings')) });
});

/** Convidado cria usuário e senha, mantendo todo o progresso. */
auth.post('/claim', requireAuth, async (c) => {
  const input = await body(c, credentials);
  if (!USERNAME_RE.test(input.username)) throw badRequest('Nome de usuário: 3–20 caracteres (a–z, 0–9, _).');
  const uid = c.get('userId');
  const hash = await hashPassword(input.password);
  await tx(c, async (q) => {
    const u = await getUserRow(q, uid, true);
    if (!u.is_guest) throw conflict('Sua conta já está registrada.');
    const other = await findUserByUsername(q, input.username);
    if (other && other.id !== uid) throw conflict('Este nome de usuário já está em uso.');
    await q.query('UPDATE users SET username = $2, password_hash = $3, is_guest = false WHERE id = $1', [uid, input.username, hash]);
  });
  return c.json({ me: await meDto(c.get('db'), uid, c.get('settings')) });
});

auth.post('/password', requireAuth, async (c) => {
  const input = await body(c, z.object({ current: z.string().min(1), next: z.string().min(6).max(100) }));
  const uid = c.get('userId');
  const db = c.get('db');
  const u = await getUserRow(db, uid);
  if (!(await verifyPassword(input.current, u.password_hash))) throw badRequest('Senha atual incorreta.');
  const hash = await hashPassword(input.next);
  await db.query('UPDATE users SET password_hash = $2, token_version = token_version + 1 WHERE id = $1', [uid, hash]);
  const token = await issueToken(db, uid, u.token_version + 1);
  return c.json({ token });
});

/** Encerra todas as sessões do usuário. */
auth.post('/logout-all', requireAuth, async (c) => {
  await c.get('db').query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [c.get('userId')]);
  return c.json({ ok: true });
});
