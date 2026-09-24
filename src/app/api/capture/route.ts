import { z } from "zod";
import { authedRoute, rateLimit, readJson } from "@/lib/server/http";
import { clockFrom } from "@/lib/server/clock";
import { interpret } from "@/lib/nlp/interpret";
import { executeActions } from "@/lib/server/ai/execute";
import { createEntity } from "@/lib/server/repo";

const body = z.object({
  text: z.string().trim().min(1).max(2000),
  source: z.enum(["text", "voice", "share"]).default("text"),
  tzOffset: z.number().optional(),
});

/**
 * Universal capture: "capture agora, organize depois".
 * The text is understood locally, turned into the right entity immediately,
 * and kept in the Inbox (captures) until the user or the AI marks it organized.
 */
export const POST = authedRoute(async (req, { auth }) => {
  rateLimit(`capture:${auth.user.id}`, 60, 60_000);
  const input = body.parse(await readJson(req));
  const clock = clockFrom(req, input);
  const it = interpret(input.text, clock);
  if (it.kind !== "create") return { kind: "ask" as const };

  const result = await executeActions(auth, it.actions);
  const primary = result.executed.find((e) => e.entity === it.primary) ?? result.executed[0];
  const capture = await createEntity(
    auth,
    "captures",
    { text: input.text, source: input.source, entityType: primary?.entity ?? null, entityId: primary?.id ?? null, status: "pending" },
    { log: false },
  );
  return {
    kind: "create" as const,
    primary: it.primary,
    confirm: it.confirm,
    suggestions: it.suggestions,
    executed: result.executed,
    errors: result.errors,
    changes: [...result.changes, { entity: "captures", row: capture.row }],
  };
});
