import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { authedRoute, readJson } from "@/lib/server/http";
import { settingsSchema } from "@/lib/settings-schema";

export const PATCH = authedRoute(async (req, { auth }) => {
  const patch = settingsSchema.parse(await readJson(req));
  const db = await getDb();
  const settings = { ...auth.workspace.settings, ...patch };
  await db.update(schema.workspaces).set({ settings }).where(eq(schema.workspaces.id, auth.workspace.id));
  return { settings };
});
