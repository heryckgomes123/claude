import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { authedRoute, HttpError } from "@/lib/server/http";

async function owned(wsId: string, id: string) {
  const db = await getDb();
  const [conv] = await db
    .select()
    .from(schema.aiConversations)
    .where(and(eq(schema.aiConversations.id, id), eq(schema.aiConversations.workspaceId, wsId)))
    .limit(1);
  if (!conv) throw new HttpError(404, "Conversa não encontrada");
  return conv;
}

export const GET = authedRoute<{ id: string }>(async (_req, { auth, params }) => {
  const conv = await owned(auth.workspace.id, params.id);
  const db = await getDb();
  const messages = await db
    .select()
    .from(schema.aiMessages)
    .where(eq(schema.aiMessages.conversationId, conv.id))
    .orderBy(asc(schema.aiMessages.createdAt))
    .limit(200);
  return { conversation: conv, messages };
});

export const DELETE = authedRoute<{ id: string }>(async (_req, { auth, params }) => {
  const conv = await owned(auth.workspace.id, params.id);
  const db = await getDb();
  await db.delete(schema.aiConversations).where(eq(schema.aiConversations.id, conv.id));
  return { ok: true };
});
