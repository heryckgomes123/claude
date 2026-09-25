import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MINUTES, SESSION_COOKIE, SESSION_TTL_LONG_MS, SESSION_TTL_SHORT_MS } from "@/config/app";
import { roleCan, type Permission, type Role } from "@/config/permissions";
import { db } from "@/db";
import { auditLogs, sessions, users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { fakeVerify, verifyPassword } from "./password";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  professionalId: string | null;
  sessionId: string;
};

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-nf-client-connection-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

/**
 * Usuário autenticado da requisição atual — SEMPRE resolvido no servidor a partir do
 * cookie httpOnly + tabela de sessões. Nunca confiar em role vindo do cliente.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token || token.length < 32) return null;

  const sessionId = hashToken(token);
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      professionalId: users.professionalId,
      isActive: users.isActive,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!row || !row.isActive) return null;
  // Profissional sem vínculo com cadastro de profissional não tem escopo seguro.
  if (row.role === "PROFESSIONAL" && !row.professionalId) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    professionalId: row.professionalId,
    sessionId,
  };
});

/** Para páginas: redireciona para o login se não houver sessão válida. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Para páginas: exige permissão; caso contrário mostra "acesso negado". */
export async function requirePagePermission(permission: Permission | Permission[]): Promise<SessionUser> {
  const user = await requireUser();
  const list = Array.isArray(permission) ? permission : [permission];
  if (!list.some((p) => roleCan(user.role, p))) redirect("/painel/acesso-negado");
  return user;
}

/** Para services/actions: lança erro (vira resposta de erro, nunca dado). */
export async function requireActor(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export function can(user: Pick<SessionUser, "role">, permission: Permission): boolean {
  return roleCan(user.role, permission);
}

export function assertCan(user: Pick<SessionUser, "role">, ...permissions: Permission[]): void {
  if (!permissions.some((p) => roleCan(user.role, p))) throw new ForbiddenError();
}

/* ─── Login / logout ─── */

export type LoginResult = { ok: true; role: Role } | { ok: false; error: string };

export async function login(emailInput: string, password: string, remember: boolean): Promise<LoginResult> {
  const email = emailInput.trim().toLowerCase();
  const ip = await clientIp();

  const windowStart = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60_000);
  const [{ failures }] = await db
    .select({ failures: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(
      and(eq(auditLogs.action, "login_failed"), gt(auditLogs.createdAt, windowStart), sql`${auditLogs.metadata}->>'email' = ${email}`),
    );
  if (failures >= LOGIN_MAX_ATTEMPTS) {
    return {
      ok: false,
      error: `Muitas tentativas. Aguarde ${LOGIN_WINDOW_MINUTES} minutos e tente novamente.`,
    };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  const valid = user ? await verifyPassword(password, user.passwordHash) : await fakeVerify(password);
  if (!user || !valid || !user.isActive) {
    await audit({ action: "login_failed", entity: "user", entityId: user?.id, metadata: { email }, ip });
    return { ok: false, error: "E-mail ou senha inválidos." };
  }

  const token = randomBytes(32).toString("base64url");
  const ttl = remember ? SESSION_TTL_LONG_MS : SESSION_TTL_SHORT_MS;
  const h = await headers();
  await db.insert(sessions).values({
    id: hashToken(token),
    userId: user.id,
    expiresAt: new Date(Date.now() + ttl),
    userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
    ip,
  });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await audit({ userId: user.id, action: "login", entity: "user", entityId: user.id, ip });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: Math.floor(ttl / 1000) } : {}),
  });

  return { ok: true, role: user.role };
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const [deleted] = await db
      .delete(sessions)
      .where(eq(sessions.id, hashToken(token)))
      .returning({ userId: sessions.userId });
    if (deleted) await audit({ userId: deleted.userId, action: "logout", entity: "user", entityId: deleted.userId });
  }
  store.delete(SESSION_COOKIE);
}

/** Encerra todas as sessões de um usuário (desativação / troca de senha). */
export async function revokeUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
