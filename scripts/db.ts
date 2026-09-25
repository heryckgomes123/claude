import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";

export function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida.");
  const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  return { db: drizzle(client, { schema }), client };
}

export { schema };
