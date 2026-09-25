/**
 * Prepara o banco durante o build (Netlify) ou manualmente:
 * aplica migrações e popula dados de demonstração se o banco estiver vazio.
 * Sem DATABASE_URL/NETLIFY_DATABASE_URL não faz nada (o app usará o fallback).
 */
import { databaseUrl } from '../server/db';
import { ensureReady } from '../server/bootstrap';

if (!databaseUrl()) {
  console.log('[db:setup] Nenhum DATABASE_URL definido — pulando (o app usará o banco embutido).');
  process.exit(0);
}
ensureReady()
  .then(async (db) => {
    console.log(`[db:setup] Banco pronto (${db.driver}).`);
    await db.close();
    process.exit(0);
  })
  .catch((e) => {
    console.error('[db:setup] Falhou:', e);
    process.exit(1);
  });
