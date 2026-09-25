/**
 * Inicialização preguiçosa: conecta, migra e popula o banco na primeira
 * requisição (idempotente e protegida por advisory lock entre instâncias).
 */
import { getDb, truncateAll, type Db } from './db';
import { seed } from './seed';
import { getMeta, setMeta, clearSettingsCache } from './services/settings';
import { randomSecret } from './lib/crypto';

let ready: Promise<Db> | null = null;

export function demoMode(): boolean {
  return (process.env.DEMO_MODE ?? 'true').toLowerCase() !== 'false';
}

export async function ensureReady(): Promise<Db> {
  if (!ready) {
    ready = (async () => {
      const db = await getDb();
      await db.tx(async (q) => {
        await q.query('SELECT pg_advisory_xact_lock(424243)');
        const seeded = await getMeta(q, 'seeded');
        if (!seeded && (process.env.SEED_ON_START ?? 'true') !== 'false') {
          const r = await seed(q);
          console.log(`[miuda] banco populado com dados de demonstração: ${JSON.stringify(r)}`);
        }
      });
      return db;
    })();
    ready.catch(() => {
      ready = null;
    });
  }
  return ready;
}

let secretCache: string | null = null;
/** Segredo das sessões: SESSION_SECRET ou gerado e guardado no banco. */
export async function sessionSecret(db: Db): Promise<string> {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (secretCache) return secretCache;
  const s = await db.tx(async (q) => {
    const existing = await getMeta<string>(q, 'session_secret');
    if (existing) return existing;
    const fresh = randomSecret();
    await setMeta(q, 'session_secret', fresh);
    return fresh;
  });
  secretCache = s;
  return s;
}

/** Apaga tudo e recria os dados de demonstração (mantém o segredo de sessão). */
export async function resetAllData(db: Db) {
  const r = await db.tx(async (q) => {
    const secret = await getMeta<string>(q, 'session_secret');
    await truncateAll(q);
    if (secret) await setMeta(q, 'session_secret', secret);
    return seed(q);
  });
  clearSettingsCache();
  return r;
}
