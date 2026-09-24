import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { createSession, createUserWithWorkspace } from "@/lib/server/auth";
import { clientIp, HttpError, publicRoute, rateLimit, readJson } from "@/lib/server/http";

const body = z.object({
  name: z.string().trim().min(1, "Informe seu nome").max(80),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(200),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres").max(200),
});

export const POST = publicRoute(async (req) => {
  rateLimit(`signup:${clientIp(req)}`, 10, 60 * 60_000);
  const input = body.parse(await readJson(req));
  const db = await getDb();
  const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, input.email)).limit(1);
  if (existing.length) throw new HttpError(409, "Já existe uma conta com este e-mail");
  const userId = await createUserWithWorkspace(input);
  await createSession(userId);
  return { ok: true };
});
