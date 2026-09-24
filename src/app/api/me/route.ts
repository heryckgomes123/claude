import { authedRoute } from "@/lib/server/http";
import { claudeEnabled } from "@/lib/server/ai/claude";
import type { Me } from "@/lib/types";

export const GET = authedRoute(async (_req, { auth }): Promise<Me> => ({
  user: auth.user,
  workspace: { id: auth.workspace.id, name: auth.workspace.name, settings: auth.workspace.settings },
  ai: { provider: claudeEnabled() ? "claude" : "local" },
}));
