import "server-only";
import { cookies, headers } from "next/headers";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt, lt } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { newId } from "@/lib/id";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = "aiva_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const RENEW_AFTER_MS = 1000 * 60 * 60 * 24; // slide expiry at most once a day

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, saltB64, keyB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length);
  return key.length === expected.length && timingSafeEqual(key, expected);
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const ua = (await headers()).get("user-agent")?.slice(0, 200) ?? null;
  await db.insert(schema.sessions).values({ id: hashToken(token), userId, expiresAt, userAgent: ua });
  // Opportunistic cleanup of expired sessions for this user.
  await db
    .delete(schema.sessions)
    .where(and(eq(schema.sessions.userId, userId), lt(schema.sessions.expiresAt, new Date())));
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.id, hashToken(token)));
  }
  jar.delete(SESSION_COOKIE);
}

export type AuthContext = {
  user: { id: string; email: string; name: string; avatarColor: string | null };
  workspace: typeof schema.workspaces.$inferSelect;
};

/** Resolves the current user + workspace from the session cookie, or null. */
export async function getAuth(): Promise<AuthContext | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const db = await getDb();
  const sid = hashToken(token);
  const rows = await db
    .select({ session: schema.sessions, user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, sid), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  if (row.session.expiresAt.getTime() - Date.now() < SESSION_TTL_MS - RENEW_AFTER_MS) {
    await db
      .update(schema.sessions)
      .set({ expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
      .where(eq(schema.sessions.id, sid));
  }

  const [workspace] = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.ownerId, row.user.id))
    .limit(1);
  if (!workspace) return null;
  const { id, email, name, avatarColor } = row.user;
  return { user: { id, email, name, avatarColor }, workspace };
}

export async function createUserWithWorkspace(input: { email: string; name: string; password: string }) {
  const db = await getDb();
  const userId = newId();
  const colors = ["#7c5cff", "#ff4fb0", "#3aa7ff", "#16c79a", "#ffb547"];
  await db.insert(schema.users).values({
    id: userId,
    email: input.email,
    name: input.name,
    passwordHash: await hashPassword(input.password),
    avatarColor: colors[Math.floor(Math.random() * colors.length)],
  });
  await db.insert(schema.workspaces).values({
    id: newId(),
    ownerId: userId,
    name: `${input.name.split(" ")[0]} · AIVA`,
    settings: { displayName: input.name.split(" ")[0] },
  });
  return userId;
}
