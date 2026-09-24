import { z } from "zod";
import { authedRoute, rateLimit, readJson } from "@/lib/server/http";
import { executeActions } from "@/lib/server/ai/execute";
import { createEntity } from "@/lib/server/repo";

const body = z.object({ actions: z.array(z.unknown()).min(1).max(20), captureText: z.string().max(2000).optional() });

/** Executes non-destructive actions the user just confirmed (voice confirmation card). */
export const POST = authedRoute(async (req, { auth }) => {
  rateLimit(`exec:${auth.user.id}`, 60, 60_000);
  const input = body.parse(await readJson(req));
  const result = await executeActions(auth, input.actions, { allowDestructive: false });
  if (input.captureText && result.executed[0]) {
    const cap = await createEntity(
      auth,
      "captures",
      { text: input.captureText, source: "voice", entityType: result.executed[0].entity, entityId: result.executed[0].id, status: "organized" },
      { log: false },
    );
    result.changes.push({ entity: "captures", row: cap.row });
  }
  return result;
});
