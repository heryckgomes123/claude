import "server-only";
import path from "node:path";
import * as schema from "./schema";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

/**
 * Database access.
 *
 * - With DATABASE_URL set → real PostgreSQL via node-postgres (production).
 * - Without it → embedded PGlite (Postgres compiled to WASM) persisted in .data/pglite,
 *   so the app runs with zero setup in development.
 *
 * Migrations in ./drizzle are applied automatically on first use.
 */
export type DB = NodePgDatabase<typeof schema>;

type Holder = { db?: DB; ready?: Promise<DB> };
const g = globalThis as unknown as { __aivaDb?: Holder };
const holder: Holder = (g.__aivaDb ??= {});

const migrationsFolder = path.join(process.cwd(), "drizzle");

async function init(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = new Pool({
      connectionString: url,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    });
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder });
    return db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  const { mkdir } = await import("node:fs/promises");
  await mkdir(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  // PGlite and node-postgres drizzle instances share the same query API.
  return db as unknown as DB;
}

export async function getDb(): Promise<DB> {
  if (holder.db) return holder.db;
  holder.ready ??= init().then((db) => (holder.db = db));
  try {
    return await holder.ready;
  } catch (err) {
    holder.ready = undefined;
    throw err;
  }
}

export { schema };
