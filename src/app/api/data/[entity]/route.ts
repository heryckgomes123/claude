import { z } from "zod";
import { authedRoute, HttpError, readJson } from "@/lib/server/http";
import { isEntityName } from "@/lib/entities";
import { createEntity, listEntity } from "@/lib/server/repo";

function entityOf(params: { entity: string }) {
  if (!isEntityName(params.entity)) throw new HttpError(404, "Recurso desconhecido");
  return params.entity;
}

export const GET = authedRoute<{ entity: string }>(async (_req, { params, auth }) => listEntity(auth.workspace.id, entityOf(params)));

export const POST = authedRoute<{ entity: string }>(async (req, { params, auth }) => {
  const body = (await readJson(req)) as Record<string, unknown>;
  // Clients may pre-generate the UUID so optimistic UI rows keep a stable id.
  const id = z.string().uuid().safeParse(body?.id).success ? String(body.id) : undefined;
  const { row, extra } = await createEntity(auth, entityOf(params), body, { id });
  return { row, extra };
});
