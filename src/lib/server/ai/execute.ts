import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { aiActionListSchema, actionCode, describeAction, isDestructive, type AiAction } from "@/lib/ai/actions";
import { newId } from "@/lib/id";
import type { AuthContext } from "../auth";
import { createEntity, deleteEntity, updateEntity } from "../repo";
import { HttpError } from "../http";
import type { EntityName } from "@/lib/entities";

export type ExecutedAction = { code: string; label: string; entity: EntityName; id: string; title: string; op: AiAction["type"] };
export type Change = { entity: EntityName; row: Record<string, unknown> } | { entity: EntityName; deletedId: string };

export type ExecResult = { executed: ExecutedAction[]; changes: Change[]; errors: string[] };

/**
 * Executes a batch of AI actions. "$ref:<name>" values are resolved to ids
 * created earlier in the same batch. Destructive actions require `allowDestructive`
 * (i.e. an explicit user confirmation).
 */
export async function executeActions(
  auth: AuthContext,
  input: unknown,
  opts: { allowDestructive?: boolean; conversationId?: string | null; stopOnError?: boolean } = {},
): Promise<ExecResult> {
  const actions = aiActionListSchema.parse(input);
  const refs = new Map<string, string>();
  const executed: ExecutedAction[] = [];
  const changes: Change[] = [];
  const errors: string[] = [];
  const db = await getDb();

  const resolve = (data: Record<string, unknown>) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === "string" && v.startsWith("$ref:")) {
        const id = refs.get(v.slice(5));
        out[k] = id ?? null;
      } else out[k] = v;
    }
    return out;
  };

  for (const action of actions) {
    if (isDestructive(action) && !opts.allowDestructive) {
      errors.push(`${describeAction(action)} precisa de confirmação.`);
      continue;
    }
    try {
      let row: Record<string, unknown>;
      if (action.type === "create") {
        const res = await createEntity(auth, action.entity, resolve(action.data));
        row = res.row;
        if (action.ref) refs.set(action.ref, String(row.id));
        changes.push({ entity: action.entity, row }, ...res.extra);
      } else if (action.type === "update") {
        const res = await updateEntity(auth, action.entity, action.id, resolve(action.data));
        row = res.row;
        changes.push({ entity: action.entity, row }, ...res.extra);
      } else {
        const res = await deleteEntity(auth, action.entity, action.id);
        row = res.deleted;
        changes.push({ entity: action.entity, deletedId: action.id });
      }
      const title = String(row.title ?? row.name ?? row.text ?? "");
      executed.push({ code: actionCode(action), label: describeAction(action), entity: action.entity, id: String(row.id), title, op: action.type });
      await db.insert(schema.aiActions).values({
        id: newId(),
        workspaceId: auth.workspace.id,
        conversationId: opts.conversationId ?? null,
        type: actionCode(action),
        payload: action as unknown as Record<string, unknown>,
        status: "executed",
        result: { id: row.id },
      });
    } catch (err) {
      const msg = err instanceof HttpError ? err.message : err instanceof Error && "issues" in err ? "dados inválidos" : "erro inesperado";
      errors.push(`${describeAction(action)}: ${msg}`);
      if (!(err instanceof HttpError) && !(err instanceof Error && "issues" in err)) console.error("[ai.execute]", err);
      if (opts.stopOnError) break;
    }
  }
  return { executed, changes, errors };
}

/** Stores actions that need user confirmation; returns the proposal id. */
export async function proposeActions(auth: AuthContext, actions: AiAction[], label: string, conversationId?: string | null) {
  aiActionListSchema.parse(actions);
  const db = await getDb();
  const id = newId();
  await db.insert(schema.aiActions).values({
    id,
    workspaceId: auth.workspace.id,
    conversationId: conversationId ?? null,
    type: actions.length === 1 ? actionCode(actions[0]) : "BATCH",
    payload: { label, actions } as unknown as Record<string, unknown>,
    status: "proposed",
  });
  return { id, label, count: actions.length, destructive: actions.some(isDestructive) };
}

export async function resolveProposal(auth: AuthContext, proposalId: string, decision: "confirm" | "cancel") {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.aiActions)
    .where(and(eq(schema.aiActions.id, proposalId), eq(schema.aiActions.workspaceId, auth.workspace.id)))
    .limit(1);
  if (!row) throw new HttpError(404, "Proposta não encontrada");
  if (row.status !== "proposed") throw new HttpError(409, "Esta proposta já foi resolvida");
  if (decision === "cancel") {
    await db.update(schema.aiActions).set({ status: "cancelled" }).where(eq(schema.aiActions.id, proposalId));
    return { executed: [], changes: [], errors: [] } satisfies ExecResult;
  }
  // Claim the proposal first so a double-click can't execute it twice.
  const claimed = await db
    .update(schema.aiActions)
    .set({ status: "executed" })
    .where(and(eq(schema.aiActions.id, proposalId), eq(schema.aiActions.status, "proposed")))
    .returning({ id: schema.aiActions.id });
  if (!claimed.length) throw new HttpError(409, "Esta proposta já foi resolvida");
  const payload = row.payload as { actions: AiAction[] };
  const result = await executeActions(auth, payload.actions, { allowDestructive: true, conversationId: row.conversationId });
  await db
    .update(schema.aiActions)
    .set({ status: result.errors.length && !result.executed.length ? "failed" : "executed", result: { executed: result.executed.length, errors: result.errors } })
    .where(eq(schema.aiActions.id, proposalId));
  return result;
}
