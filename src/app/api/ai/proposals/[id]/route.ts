import { z } from "zod";
import { authedRoute, HttpError, readJson } from "@/lib/server/http";
import { resolveProposal } from "@/lib/server/ai/execute";

const body = z.object({ decision: z.enum(["confirm", "cancel"]) });

export const POST = authedRoute<{ id: string }>(async (req, { auth, params }) => {
  if (!z.string().uuid().safeParse(params.id).success) throw new HttpError(404, "Proposta não encontrada");
  const { decision } = body.parse(await readJson(req));
  return resolveProposal(auth, params.id, decision);
});
