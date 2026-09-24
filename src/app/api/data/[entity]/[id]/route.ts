import { z } from "zod";
import { authedRoute, HttpError, readJson } from "@/lib/server/http";
import { isEntityName } from "@/lib/entities";
import { deleteEntity, getEntity, updateEntity } from "@/lib/server/repo";

type P = { entity: string; id: string };

function parse(params: P) {
  if (!isEntityName(params.entity)) throw new HttpError(404, "Recurso desconhecido");
  if (!z.string().uuid().safeParse(params.id).success) throw new HttpError(404, "Não encontrado");
  return { entity: params.entity, id: params.id };
}

export const GET = authedRoute<P>(async (_req, { params, auth }) => {
  const { entity, id } = parse(params);
  return getEntity(auth, entity, id);
});

export const PATCH = authedRoute<P>(async (req, { params, auth }) => {
  const { entity, id } = parse(params);
  return updateEntity(auth, entity, id, await readJson(req));
});

export const DELETE = authedRoute<P>(async (_req, { params, auth }) => {
  const { entity, id } = parse(params);
  const res = await deleteEntity(auth, entity, id);
  return { ok: true, touched: res.touched };
});
