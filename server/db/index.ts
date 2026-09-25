/**
 * Camada de acesso ao banco.
 *
 *  - Produção: PostgreSQL real via `pg` (Netlify DB / Neon / Supabase / RDS…)
 *    usando DATABASE_URL ou NETLIFY_DATABASE_URL.
 *  - Desenvolvimento/testes: PGlite (Postgres compilado para WASM, embutido),
 *    persistido em disco (.data/pglite) ou em memória.
 *
 * Todo o código de domínio usa apenas a interface `Db`, então trocar o banco
 * não afeta regras de negócio.
 */
import { MIGRATIONS, ALL_TABLES } from './schema';

export interface Queryable {
  query<T = any>(sql: string, params?: unknown[]): Promise<T[]>;
  one<T = any>(sql: string, params?: unknown[]): Promise<T | null>;
}

export interface Db extends Queryable {
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  driver: 'postgres' | 'pglite';
  persistent: boolean;
  close(): Promise<void>;
}

class Mutex {
  private p: Promise<void> = Promise.resolve();
  run<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.p.then(fn, fn);
    this.p = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }
}

async function createPglite(dataDir: string | undefined): Promise<Db> {
  const { PGlite, types } = await import('@electric-sql/pglite');
  if (dataDir) (await import('node:fs')).mkdirSync(dataDir, { recursive: true });
  const intParser = (v: string) => Number(v);
  const pg = new PGlite(dataDir, {
    parsers: { [types.INT8]: intParser, [types.NUMERIC]: intParser },
  } as any);
  await pg.waitReady;
  // PGlite tem uma única conexão: serializamos consultas e transações.
  // Dentro de uma transação use sempre o `q` recebido (nunca `db`), senão há deadlock.
  const lock = new Mutex();
  const raw: Queryable = {
    async query(sql, params) {
      const r = await pg.query(sql, params as any[]);
      return r.rows as any[];
    },
    async one(sql, params) {
      const r = await pg.query(sql, params as any[]);
      return (r.rows[0] as any) ?? null;
    },
  };
  return {
    driver: 'pglite',
    persistent: !!dataDir && !dataDir.startsWith('memory'),
    query: (sql, params) => lock.run(() => raw.query(sql, params)),
    one: (sql, params) => lock.run(() => raw.one(sql, params)),
    tx: (fn) =>
      lock.run(async () => {
        await pg.query('BEGIN');
        try {
          const out = await fn(raw);
          await pg.query('COMMIT');
          return out;
        } catch (e) {
          await pg.query('ROLLBACK');
          throw e;
        }
      }),
    close: () => pg.close(),
  };
}

async function createPostgres(url: string): Promise<Db> {
  const pgMod = await import('pg');
  const pgLib: any = (pgMod as any).default ?? pgMod;
  pgLib.types.setTypeParser(20, (v: string) => Number(v));
  pgLib.types.setTypeParser(1700, (v: string) => Number(v));
  const needsSsl = !/localhost|127\.0\.0\.1/.test(url) && !/sslmode=disable/.test(url);
  const pool = new pgLib.Pool({
    connectionString: url,
    max: Number(process.env.DB_POOL_MAX ?? 5),
    idleTimeoutMillis: 10_000,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
  const wrap = (c: { query: (s: string, p?: unknown[]) => Promise<{ rows: any[] }> }): Queryable => ({
    async query(sql, params) {
      return (await c.query(sql, params)).rows;
    },
    async one(sql, params) {
      return (await c.query(sql, params)).rows[0] ?? null;
    },
  });
  const base = wrap(pool);
  return {
    driver: 'postgres',
    persistent: true,
    ...base,
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const out = await fn(wrap(client));
        await client.query('COMMIT');
        return out;
      } catch (e) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw e;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || undefined;
}

let dbPromise: Promise<Db> | null = null;

export interface DbOptions {
  url?: string;
  pgliteDir?: string; // diretório; 'memory://' para memória
}

export function initDb(opts: DbOptions = {}): Promise<Db> {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    const url = opts.url ?? databaseUrl();
    const db = url ? await createPostgres(url) : await createPglite(opts.pgliteDir ?? defaultPgliteDir());
    await migrate(db);
    return db;
  })();
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

function defaultPgliteDir(): string | undefined {
  if (process.env.PGLITE_DIR) return process.env.PGLITE_DIR === 'memory' ? undefined : process.env.PGLITE_DIR;
  // Em funções serverless sem banco configurado o disco é efêmero: usar memória.
  if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) return undefined;
  return '.data/pglite';
}

export async function getDb(): Promise<Db> {
  return initDb();
}

/** Somente para testes: descarta a instância atual. */
export async function resetDbInstance() {
  if (dbPromise) {
    const db = await dbPromise.catch(() => null);
    await db?.close().catch(() => undefined);
  }
  dbPromise = null;
}

export async function migrate(db: Db) {
  await db.tx(async (q) => {
    await q.query('SELECT pg_advisory_xact_lock(424242)');
    await q.query('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
    const done = new Set((await q.query<{ version: number }>('SELECT version FROM schema_migrations')).map((r) => Number(r.version)));
    for (const m of MIGRATIONS) {
      if (done.has(m.version)) continue;
      for (const stmt of splitSql(m.sql)) await q.query(stmt);
      await q.query('INSERT INTO schema_migrations (version, name) VALUES ($1, $2)', [m.version, m.name]);
    }
  });
}

export async function truncateAll(q: Queryable) {
  await q.query(`TRUNCATE ${ALL_TABLES.join(', ')} RESTART IDENTITY CASCADE`);
}

function splitSql(sql: string): string[] {
  return sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}
