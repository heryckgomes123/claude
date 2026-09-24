import { authedRoute } from "@/lib/server/http";
import { snapshot } from "@/lib/server/repo";
import { clockFrom } from "@/lib/server/clock";
import { computeNotifications, persistNotifications } from "@/lib/server/notify";
import type { Snapshot } from "@/lib/types";

export const GET = authedRoute(async (req, { auth }) => {
  const clock = clockFrom(req);
  const first = (await snapshot(auth.workspace.id)) as unknown as Snapshot;
  const pending = computeNotifications(first, clock);
  if (!pending.length) return first;
  await persistNotifications(auth.workspace.id, pending);
  return snapshot(auth.workspace.id);
});
