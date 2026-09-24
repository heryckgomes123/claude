import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { authedRoute } from "@/lib/server/http";

/** Marks one notification (or "all") as read. */
export const POST = authedRoute<{ id: string }>(async (_req, { auth, params }) => {
  const db = await getDb();
  const where =
    params.id === "all"
      ? and(eq(schema.notifications.workspaceId, auth.workspace.id), isNull(schema.notifications.readAt))
      : and(eq(schema.notifications.workspaceId, auth.workspace.id), eq(schema.notifications.id, params.id));
  await db.update(schema.notifications).set({ readAt: new Date() }).where(where);
  return { ok: true };
});
