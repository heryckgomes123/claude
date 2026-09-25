import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __rbeautyDb?: Database };

function createDb(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida. Veja .env.example.");
  const client = postgres(url, {
    // Serverless (Netlify Functions): poucas conexões por instância e compatível com poolers (PgBouncer).
    max: process.env.NODE_ENV === "production" ? 3 : 10,
    prepare: false,
    idle_timeout: 20,
    onnotice: () => {},
  });
  return drizzle(client, { schema, casing: undefined });
}

export const db: Database = globalForDb.__rbeautyDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__rbeautyDb = db;

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DbOrTx = Database | Tx;
export { schema };
