import { z } from "zod";
import { ENTITY_NAMES, ENTITY_LABEL, type EntityName } from "@/lib/entities";

/**
 * AIVA action protocol — the only way the AI (Claude or the local engine) changes data.
 * Actions are validated here and again, field by field, by the entity schemas on the server.
 */
const entityEnum = z.enum(ENTITY_NAMES as [EntityName, ...EntityName[]]);

export const aiActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create"),
    entity: entityEnum,
    data: z.record(z.string(), z.unknown()),
    /** Name other actions in the same batch can reference as "$ref:<name>". */
    ref: z.string().max(40).optional(),
  }),
  z.object({
    type: z.literal("update"),
    entity: entityEnum,
    id: z.string().uuid(),
    data: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal("delete"),
    entity: entityEnum,
    id: z.string().uuid(),
  }),
]);

export type AiAction = z.infer<typeof aiActionSchema>;
export const aiActionListSchema = z.array(aiActionSchema).min(1).max(20);

const SINGULAR: Record<EntityName, string> = {
  tasks: "TASK",
  projects: "PROJECT",
  events: "EVENT",
  goals: "GOAL",
  habits: "HABIT",
  notes: "NOTE",
  captures: "CAPTURE",
  ideas: "IDEA",
  contents: "CONTENT",
  lives: "LIVE",
  brands: "BRAND",
  campaigns: "CAMPAIGN",
  clients: "CLIENT",
  transactions: "TRANSACTION",
};

/** Canonical action code (CREATE_TASK, COMPLETE_TASK, SET_PRIORITY, …) for logs and UI. */
export function actionCode(a: AiAction): string {
  if (a.type === "create") {
    if (a.entity === "contents" && a.data.script) return "CREATE_SCRIPT";
    return `CREATE_${SINGULAR[a.entity]}`;
  }
  if (a.type === "delete") return `DELETE_${SINGULAR[a.entity]}`;
  const keys = Object.keys(a.data);
  if (a.entity === "tasks" && a.data.status === "done") return "COMPLETE_TASK";
  if (keys.length === 1 && keys[0] === "priority") return "SET_PRIORITY";
  if (keys.every((k) => k === "dueAt" || k === "hasTime")) return "SET_DEADLINE";
  if (a.entity === "contents" && keys.includes("script")) return "CREATE_SCRIPT";
  return `UPDATE_${SINGULAR[a.entity]}`;
}

export function isDestructive(a: AiAction) {
  return a.type === "delete";
}

export function describeAction(a: AiAction): string {
  const label = ENTITY_LABEL[a.entity];
  const name = String(a.type === "create" ? (a.data.title ?? a.data.name ?? "") : "");
  if (a.type === "create") return `Criar ${label.toLowerCase()}${name ? `: ${name}` : ""}`;
  if (a.type === "delete") return `Excluir ${label.toLowerCase()}`;
  if (actionCode(a) === "COMPLETE_TASK") return "Concluir tarefa";
  return `Atualizar ${label.toLowerCase()}`;
}
