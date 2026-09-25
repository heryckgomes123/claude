/**
 * Utilidades HTTP compartilhadas pelas rotas: autenticação, validação,
 * transações e erros.
 */
import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';
import type { Db, Queryable } from './db';
import { ensureReady, sessionSecret } from './bootstrap';
import { signToken, verifyToken } from './lib/crypto';
import { ApiError, badRequest, forbidden, unauthorized } from './lib/errors';
import { getSettings } from './services/settings';
import type { GlobalSettings } from '../shared/catalog';

export type AppEnv = {
  Variables: {
    db: Db;
    userId: string;
    isSuperAdmin: boolean;
    settings: GlobalSettings;
  };
};
export type Ctx = Context<AppEnv>;

export const TOKEN_TTL_DAYS = 30;

export async function issueToken(db: Db, userId: string, tokenVersion: number) {
  const secret = await sessionSecret(db);
  return signToken({ uid: userId, tv: tokenVersion, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_DAYS * 86400 }, secret);
}

/** Injeta o banco e as configurações em todas as rotas. */
export const withDb: MiddlewareHandler<AppEnv> = async (c, next) => {
  const db = await ensureReady();
  c.set('db', db);
  c.set('settings', await getSettings(db));
  await next();
};

const lastSeenWrites = new Map<string, number>();

/** Exige sessão válida (Bearer token). */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const db = c.get('db');
  const header = c.req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw unauthorized('Entre na Toca para continuar.');
  const payload = verifyToken(token, await sessionSecret(db));
  if (!payload) throw unauthorized();
  const user = await db.one<{ id: string; status: string; token_version: number; is_super_admin: boolean }>(
    'SELECT id, status, token_version, is_super_admin FROM users WHERE id = $1',
    [payload.uid],
  );
  if (!user || user.token_version !== payload.tv) throw unauthorized();
  if (user.status === 'banned') throw new ApiError(403, 'BANNED', 'Sua conta foi suspensa pela administração da Toca.');
  const settings = c.get('settings');
  if (settings.maintenance && !user.is_super_admin) throw new ApiError(503, 'MAINTENANCE', 'A Toca está em manutenção. Volte em instantes.');
  c.set('userId', user.id);
  c.set('isSuperAdmin', user.is_super_admin);
  const last = lastSeenWrites.get(user.id) ?? 0;
  if (Date.now() - last > 60_000) {
    lastSeenWrites.set(user.id, Date.now());
    await db.query('UPDATE users SET last_seen_at = now() WHERE id = $1', [user.id]);
  }
  await next();
};

export const requireSuperAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.get('isSuperAdmin')) throw forbidden('Área exclusiva do Super Admin.');
  await next();
};

export async function body<T extends z.ZodTypeAny>(c: Ctx, schema: T): Promise<z.infer<T>> {
  let raw: unknown = {};
  try {
    raw = await c.req.json();
  } catch {
    raw = {};
  }
  const r = schema.safeParse(raw);
  if (!r.success) {
    const first = r.error.issues[0];
    throw badRequest(first ? `${first.path.join('.') || 'dados'}: ${first.message}` : 'Dados inválidos.', 'VALIDATION');
  }
  return r.data;
}

export const tx = <T>(c: Ctx, fn: (q: Queryable) => Promise<T>) => c.get('db').tx(fn);

/** Limitador simples em memória (melhor esforço em ambiente serverless). */
const buckets = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return;
  }
  b.n += 1;
  if (b.n > max) throw new ApiError(429, 'RATE_LIMIT', 'Muitas tentativas. Aguarde um instante.');
}

export function clientIp(c: Ctx) {
  return c.req.header('x-nf-client-connection-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
}
