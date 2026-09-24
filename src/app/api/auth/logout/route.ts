import { destroySession } from "@/lib/server/auth";
import { publicRoute } from "@/lib/server/http";

export const POST = publicRoute(async () => {
  await destroySession();
  return { ok: true };
});
