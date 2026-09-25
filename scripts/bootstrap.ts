/**
 * Bootstrap de PRODUÇÃO: cria configurações, categorias e a primeira conta OWNER,
 * sem nenhum dado de demonstração. Idempotente.
 */
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { connect, schema as s } from "./db";

async function main() {
  const name = process.env.BOOTSTRAP_OWNER_NAME || "Proprietária";
  const email = process.env.BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_OWNER_PASSWORD;
  if (!email || !password) throw new Error("Defina BOOTSTRAP_OWNER_EMAIL e BOOTSTRAP_OWNER_PASSWORD.");
  if (password.length < 10) throw new Error("Use uma senha com pelo menos 10 caracteres.");

  const { db, client } = connect();
  await db.insert(s.businessSettings).values({ id: 1 }).onConflictDoNothing();
  await db
    .insert(s.businessHours)
    .values(
      Array.from({ length: 7 }, (_, weekday) => ({
        weekday,
        isOpen: weekday !== 0,
        openMinute: 9 * 60,
        closeMinute: weekday === 6 ? 17 * 60 : 19 * 60,
      })),
    )
    .onConflictDoNothing();
  await db
    .insert(s.serviceCategories)
    .values([
      { slug: "cabelo", name: "Cabelo", sortOrder: 1 },
      { slug: "unhas", name: "Unhas", sortOrder: 2 },
      { slug: "cilios", name: "Cílios", sortOrder: 3 },
      { slug: "sobrancelhas", name: "Sobrancelhas", sortOrder: 4 },
    ])
    .onConflictDoNothing();

  const [existing] = await db
    .select({ id: s.users.id })
    .from(s.users)
    .where(sql`lower(${s.users.email}) = ${email}`);
  if (existing) {
    console.log("• Usuária OWNER já existe. Nada a fazer.");
  } else {
    await db.insert(s.users).values({ name, email, role: "OWNER", passwordHash: await bcrypt.hash(password, 11) });
    console.log(`✓ OWNER criada: ${email}`);
  }
  await client.end();
}

main().catch((e) => {
  console.error("✗", e.message ?? e);
  process.exit(1);
});
