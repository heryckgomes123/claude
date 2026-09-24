/**
 * Browser port of src/lib/server/ai/execute.ts — same action protocol,
 * "$ref:" resolution and confirmation rules; proposals are kept in memory.
 */
import { aiActionListSchema, actionCode, describeAction, isDestructive, type AiAction } from "@/lib/ai/actions";
import type { EntityName } from "@/lib/entities";
import { newId } from "@/lib/id";
import { createEntity, deleteEntity, updateEntity, HttpError } from "./repo";

export type ExecutedAction = { code: string; label: string; entity: EntityName; id: string; title: string; op: AiAction["type"] };
export type Change = { entity: EntityName; row: Record<string, unknown> } | { entity: EntityName; deletedId: string };
export type ExecResult = { executed: ExecutedAction[]; changes: Change[]; errors: string[] };

export async function executeActions(_auth: unknown, input: unknown, opts: { allowDestructive?: boolean; conversationId?: string | null; stopOnError?: boolean } = {}): Promise<ExecResult> {
  const actions = aiActionListSchema.parse(input);
  const refs = new Map<string, string>();
  const out: ExecResult = { executed: [], changes: [], errors: [] };
  const resolve = (data: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(data).map(([k, v]) => [k, typeof v === "string" && v.startsWith("$ref:") ? (refs.get(v.slice(5)) ?? null) : v]));

  for (const action of actions) {
    if (isDestructive(action) && !opts.allowDestructive) {
      out.errors.push(`${describeAction(action)} precisa de confirmação.`);
      continue;
    }
    try {
      let row: Record<string, unknown>;
      if (action.type === "create") {
        const res = createEntity(action.entity, resolve(action.data));
        row = res.row;
        if (action.ref) refs.set(action.ref, String(row.id));
        out.changes.push({ entity: action.entity, row }, ...res.extra);
      } else if (action.type === "update") {
        const res = updateEntity(action.entity, action.id, resolve(action.data));
        row = res.row;
        out.changes.push({ entity: action.entity, row }, ...res.extra);
      } else {
        row = deleteEntity(action.entity, action.id).deleted;
        out.changes.push({ entity: action.entity, deletedId: action.id });
      }
      out.executed.push({ code: actionCode(action), label: describeAction(action), entity: action.entity, id: String(row.id), title: String(row.title ?? row.name ?? row.text ?? ""), op: action.type });
    } catch (err) {
      const msg = err instanceof HttpError ? err.message : err instanceof Error && "issues" in err ? "dados inválidos" : "erro inesperado";
      out.errors.push(`${describeAction(action)}: ${msg}`);
      if (opts.stopOnError) break;
    }
  }
  return out;
}

const proposals = new Map<string, { actions: AiAction[]; status: "proposed" | "done" }>();

export async function proposeActions(_auth: unknown, actions: AiAction[], label: string, _conversationId?: string | null) {
  aiActionListSchema.parse(actions);
  const id = newId();
  proposals.set(id, { actions, status: "proposed" });
  return { id, label, count: actions.length, destructive: actions.some(isDestructive) };
}

export async function resolveProposal(id: string, decision: "confirm" | "cancel"): Promise<ExecResult> {
  const p = proposals.get(id);
  if (!p) throw new HttpError(404, "Proposta não encontrada (recarregue e peça de novo)");
  if (p.status !== "proposed") throw new HttpError(409, "Esta proposta já foi resolvida");
  p.status = "done";
  if (decision === "cancel") return { executed: [], changes: [], errors: [] };
  return executeActions(null, p.actions, { allowDestructive: true });
}
