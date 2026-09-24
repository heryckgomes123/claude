import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { authedRoute, HttpError, rateLimit, readJson } from "@/lib/server/http";
import { clockFrom } from "@/lib/server/clock";
import { snapshot } from "@/lib/server/repo";
import { newId } from "@/lib/id";
import { localRespond } from "@/lib/server/ai/local";
import { claudeEnabled, claudeRespond } from "@/lib/server/ai/claude";
import type { AiReply } from "@/lib/ai/reply";
import type { Snapshot } from "@/lib/types";

const body = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationId: z.string().uuid().nullish(),
  tzOffset: z.number().optional(),
  source: z.enum(["text", "voice", "studio"]).default("text"),
});

export const POST = authedRoute(async (req, { auth }): Promise<AiReply> => {
  rateLimit(`ai:${auth.user.id}`, 30, 60_000);
  const input = body.parse(await readJson(req));
  const clock = clockFrom(req, input);
  const db = await getDb();

  let conversationId = input.conversationId ?? null;
  if (conversationId) {
    const [conv] = await db
      .select({ id: schema.aiConversations.id })
      .from(schema.aiConversations)
      .where(and(eq(schema.aiConversations.id, conversationId), eq(schema.aiConversations.workspaceId, auth.workspace.id)))
      .limit(1);
    if (!conv) throw new HttpError(404, "Conversa não encontrada");
    await db.update(schema.aiConversations).set({ updatedAt: new Date() }).where(eq(schema.aiConversations.id, conversationId));
  } else {
    conversationId = newId();
    await db.insert(schema.aiConversations).values({ id: conversationId, workspaceId: auth.workspace.id, title: input.message.slice(0, 60) });
  }

  const history = (
    await db
      .select({ role: schema.aiMessages.role, content: schema.aiMessages.content })
      .from(schema.aiMessages)
      .where(eq(schema.aiMessages.conversationId, conversationId))
      .orderBy(desc(schema.aiMessages.createdAt))
      .limit(12)
  )
    .reverse()
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  await db.insert(schema.aiMessages).values({ id: newId(), conversationId, role: "user", content: input.message });

  const snap = (await snapshot(auth.workspace.id)) as unknown as Snapshot;
  let provider: AiReply["provider"] = "local";
  let out;
  if (claudeEnabled()) {
    try {
      out = await claudeRespond(auth, input.message, snap, clock, conversationId, history);
      provider = "claude";
    } catch (err) {
      console.error("[ai.claude] falling back to local engine:", err instanceof Error ? err.message : err);
    }
  }
  out ??= await localRespond(auth, input.message, snap, clock, conversationId);

  await db.insert(schema.aiMessages).values({
    id: newId(),
    conversationId,
    role: "assistant",
    content: out.message,
    actions: [{ executed: out.executed, proposals: out.proposals, items: out.items, plan: out.plan, followups: out.followups }],
  });
  return { ...out, conversationId, provider };
});

export const GET = authedRoute(async (_req, { auth }) => {
  const db = await getDb();
  return db
    .select()
    .from(schema.aiConversations)
    .where(eq(schema.aiConversations.workspaceId, auth.workspace.id))
    .orderBy(desc(schema.aiConversations.updatedAt))
    .limit(30);
});

