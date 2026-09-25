import "server-only";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import { professionals, users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";
import { assertCan, revokeUserSessions, type SessionUser } from "@/lib/auth/session";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import type { userCreateInput, userUpdateInput } from "@/schemas/settings";

export async function listUsers(actor: SessionUser) {
  assertCan(actor, "users.manage");
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      professionalId: users.professionalId,
      professionalName: professionals.name,
    })
    .from(users)
    .leftJoin(professionals, eq(professionals.id, users.professionalId))
    .orderBy(asc(users.role), asc(users.name));
}

async function assertEmailFree(email: string, exceptId?: string) {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(sql`lower(${users.email}) = ${email.toLowerCase()}`, exceptId ? ne(users.id, exceptId) : undefined))
    .limit(1);
  if (row) throw new ConflictError("Já existe um usuário com este e-mail.");
}

export async function createUser(actor: SessionUser, input: z.output<typeof userCreateInput>) {
  assertCan(actor, "users.manage");
  await assertEmailFree(input.email);
  const [created] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email,
      role: input.role,
      professionalId: input.role === "PROFESSIONAL" ? input.professionalId : null,
      passwordHash: await hashPassword(input.password),
    })
    .returning({ id: users.id });
  await audit({ userId: actor.id, action: "create", entity: "user", entityId: created.id, metadata: { role: input.role } });
  return created;
}

export async function updateUser(actor: SessionUser, input: z.output<typeof userUpdateInput>) {
  assertCan(actor, "users.manage");
  const [current] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
  if (!current) throw new NotFoundError("Usuário não encontrado.");
  if (current.id === actor.id && (!input.isActive || input.role !== "OWNER")) {
    throw new ValidationError("Você não pode desativar nem rebaixar a sua própria conta.");
  }
  if (current.role === "OWNER" && (input.role !== "OWNER" || !input.isActive)) {
    const [{ owners }] = await db
      .select({ owners: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.role, "OWNER"), eq(users.isActive, true)));
    if (owners <= 1) throw new ValidationError("É necessário manter ao menos uma proprietária ativa.");
  }

  await db
    .update(users)
    .set({
      name: input.name,
      role: input.role,
      professionalId: input.role === "PROFESSIONAL" ? input.professionalId : null,
      isActive: input.isActive,
      ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
    })
    .where(eq(users.id, input.userId));

  // Mudança de perfil, desativação ou troca de senha encerram as sessões ativas.
  if (!input.isActive || input.role !== current.role || input.password) await revokeUserSessions(input.userId);
  await audit({
    userId: actor.id,
    action: input.password ? "password_reset" : "update",
    entity: "user",
    entityId: input.userId,
    metadata: { role: input.role, isActive: input.isActive },
  });
}
