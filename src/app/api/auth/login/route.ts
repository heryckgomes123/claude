import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { createSession, verifyPassword } from "@/lib/server/auth";
import { clientIp, HttpError, publicRoute, rateLimit, readJson } from "@/lib/server/http";

const body = z.object({ email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(1).max(200) });

// Constant-time-ish failure path for unknown users.
const DUMMY_HASH = "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");

export const POST = publicRoute(async (req) => {
  const input = body.parse(await readJson(req));
  rateLimit(`login:${clientIp(req)}`, 20, 15 * 60_000);
  rateLimit(`login:${input.email}`, 8, 15 * 60_000);
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, input.email)).limit(1);
  const ok = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, "E-mail ou senha incorretos");
  await createSession(user.id);
  return { ok: true };
});
