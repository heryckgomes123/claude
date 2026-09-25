import { sql } from "drizzle-orm";
import { connect } from "./db";

/** Apaga TODAS as tabelas do schema public (inclusive dados reais). Uso: desenvolvimento. */
async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Reset bloqueado em produção. Defina ALLOW_DEMO_SEED=true se tiver certeza.");
  }
  const { db, client } = connect();
  await db.execute(sql`drop schema if exists public cascade`);
  await db.execute(sql`drop schema if exists drizzle cascade`);
  await db.execute(sql`create schema public`);
  await client.end();
  console.log("✓ Banco limpo.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
