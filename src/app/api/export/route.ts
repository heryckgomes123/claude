import { authedRoute } from "@/lib/server/http";
import { snapshot } from "@/lib/server/repo";

/** Full data export of the caller's workspace (portability / backup). */
export const GET = authedRoute(async (_req, { auth }) => {
  const data = await snapshot(auth.workspace.id);
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), workspace: { name: auth.workspace.name, settings: auth.workspace.settings }, data }, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="aiva-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
});
