import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { getDb, schema } from "@/db";
import { entitySchemas, REFERENCES, ENTITY_LABEL, type EntityName, LIVE_CHECKLIST_DEFAULT } from "@/lib/entities";
import { newId } from "@/lib/id";
import type { AuthContext } from "./auth";
import { HttpError } from "./http";

/* eslint-disable @typescript-eslint/no-explicit-any */
// The registry is intentionally dynamic (entity name → table); every value
// entering it has already been validated by the zod schema of that entity.

export const TABLES: Record<EntityName, PgTable & Record<string, any>> = {
  tasks: schema.tasks,
  projects: schema.projects,
  events: schema.events,
  goals: schema.goals,
  habits: schema.habits,
  notes: schema.notes,
  captures: schema.captures,
  ideas: schema.ideas,
  contents: schema.contents,
  lives: schema.lives,
  brands: schema.brands,
  campaigns: schema.campaigns,
  clients: schema.clients,
  transactions: schema.transactions,
};

const LIST_LIMIT = 3000;

type Row = Record<string, any>;

function titleOf(row: Row) {
  return String(row.title ?? row.name ?? row.text ?? "").slice(0, 120);
}

async function log(auth: AuthContext, action: string, entity: EntityName, id: string, summary: string) {
  const db = await getDb();
  await db.insert(schema.activityLog).values({
    id: newId(),
    workspaceId: auth.workspace.id,
    userId: auth.user.id,
    action,
    entityType: entity,
    entityId: id,
    summary: summary.slice(0, 300),
  });
}

/** Postgres error code, whether thrown by node-postgres or PGlite (possibly wrapped by drizzle). */
function pgCode(err: unknown): string | undefined {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
}

/** Every *Id reference must point to a row inside the caller's workspace. */
async function assertReferences(wsId: string, data: Row) {
  const db = await getDb();
  for (const [key, target] of Object.entries(REFERENCES)) {
    const value = data[key];
    if (!value) continue;
    const table = TABLES[target];
    const found = await db
      .select({ id: table.id })
      .from(table)
      .where(and(eq(table.id, value), eq(table.workspaceId, wsId)))
      .limit(1);
    if (!found.length) throw new HttpError(400, `Referência inválida: ${key}`);
  }
}

async function findOwned(wsId: string, entity: EntityName, id: string): Promise<Row> {
  const db = await getDb();
  const table = TABLES[entity];
  const [row] = await db
    .select()
    .from(table)
    .where(and(eq(table.id, id), eq(table.workspaceId, wsId)))
    .limit(1);
  if (!row) throw new HttpError(404, `${ENTITY_LABEL[entity]}: item não encontrado`);
  return row as Row;
}

export async function listEntity(wsId: string, entity: EntityName) {
  const db = await getDb();
  const table = TABLES[entity];
  return db.select().from(table).where(eq(table.workspaceId, wsId)).orderBy(desc(table.createdAt)).limit(LIST_LIMIT);
}

export async function getEntity(auth: AuthContext, entity: EntityName, id: string) {
  return findOwned(auth.workspace.id, entity, id);
}

export async function createEntity(auth: AuthContext, entity: EntityName, input: unknown, opts: { log?: boolean; id?: string } = {}) {
  const data: Row = entitySchemas[entity].parse(input);
  await assertReferences(auth.workspace.id, data);
  applyCreateDefaults(entity, data);
  const db = await getDb();
  const table = TABLES[entity];
  let row: Row;
  try {
    [row] = await db
      .insert(table)
      .values({ ...data, id: opts.id ?? newId(), workspaceId: auth.workspace.id })
      .returning();
  } catch (err) {
    if (pgCode(err) === "23505") throw new HttpError(409, "Este item já existe");
    throw err;
  }
  if (opts.log !== false) await log(auth, "create", entity, String(row.id), `${ENTITY_LABEL[entity]}: ${titleOf(row)}`);
  const extra = await afterWrite(auth, entity, null, row as Row);
  return { row: row as Row, extra };
}

export async function updateEntity(auth: AuthContext, entity: EntityName, id: string, input: unknown) {
  const before = await findOwned(auth.workspace.id, entity, id);
  const data: Row = (entitySchemas[entity] as any).partial().parse(input);
  await assertReferences(auth.workspace.id, data);
  applyUpdateDefaults(entity, before, data);
  const db = await getDb();
  const table = TABLES[entity];
  const [row] = await db
    .update(table)
    .set({ ...data, ...("updatedAt" in table ? { updatedAt: new Date() } : {}) })
    .where(and(eq(table.id, id), eq(table.workspaceId, auth.workspace.id)))
    .returning();
  const action = entity === "tasks" && data.status === "done" && before.status !== "done" ? "complete" : "update";
  await log(auth, action, entity, id, `${ENTITY_LABEL[entity]}: ${titleOf(row)}`);
  const extra = await afterWrite(auth, entity, before, row as Row);
  return { row: row as Row, extra };
}

export async function deleteEntity(auth: AuthContext, entity: EntityName, id: string) {
  const before = await findOwned(auth.workspace.id, entity, id);
  const db = await getDb();
  const table = TABLES[entity];
  await db.delete(table).where(and(eq(table.id, id), eq(table.workspaceId, auth.workspace.id)));
  // Clear dangling references so nothing points at a deleted row (no orphans).
  const touched: { entity: EntityName; ids: string[]; field: string }[] = [];
  for (const [field, target] of Object.entries(REFERENCES)) {
    if (target !== entity) continue;
    for (const [name, t] of Object.entries(TABLES) as [EntityName, any][]) {
      if (!(field in t)) continue;
      const rows = await db
        .update(t)
        .set({ [field]: null })
        .where(and(eq(t[field], id), eq(t.workspaceId, auth.workspace.id)))
        .returning({ id: t.id });
      if (rows.length) touched.push({ entity: name, ids: rows.map((r: Row) => r.id), field });
    }
  }
  if (entity === "tasks") {
    // Remove from other tasks' dependency lists.
    const dependents = await db
      .select({ id: schema.tasks.id, dependsOn: schema.tasks.dependsOn })
      .from(schema.tasks)
      .where(eq(schema.tasks.workspaceId, auth.workspace.id));
    for (const t of dependents) {
      if (t.dependsOn.includes(id)) {
        await db
          .update(schema.tasks)
          .set({ dependsOn: t.dependsOn.filter((d) => d !== id) })
          .where(eq(schema.tasks.id, t.id));
      }
    }
  }
  await log(auth, "delete", entity, id, `${ENTITY_LABEL[entity]}: ${titleOf(before)}`);
  return { deleted: before, touched };
}

/* ------------------------------------------------------------------ */
/* Domain rules                                                        */
/* ------------------------------------------------------------------ */

function applyCreateDefaults(entity: EntityName, data: Row) {
  if (entity === "tasks") {
    if (data.status === "done") data.completedAt ??= new Date();
    data.position ??= Date.now();
  }
  if (entity === "lives" && !data.checklist) {
    data.checklist = LIVE_CHECKLIST_DEFAULT.map((text) => ({ id: newId(), text, done: false }));
  }
  if (entity === "contents") {
    data.position ??= Date.now();
    if (data.stage === "published") data.publishedAt ??= new Date();
  }
  if (entity === "transactions" && data.status === "done") data.paidAt ??= new Date();
  if (entity === "notes" && data.url === "") data.url = null;
}

function applyUpdateDefaults(entity: EntityName, before: Row, data: Row) {
  if (entity === "tasks" && data.status) {
    if (data.status === "done" && before.status !== "done") data.completedAt = new Date();
    if (data.status !== "done") data.completedAt = null;
  }
  if (entity === "contents" && data.stage === "published" && !before.publishedAt) data.publishedAt ??= new Date();
  if (entity === "transactions" && data.status === "done" && !before.paidAt) data.paidAt ??= new Date();
  if (entity === "transactions" && data.status === "pending") data.paidAt = null;
}

const REVENUE_STAGES = new Set(["approved", "production", "delivery", "payment", "done"]);

/**
 * Context engine side effects: keeps connected entities consistent.
 * Returns extra rows created/updated so the client can merge them.
 */
async function afterWrite(auth: AuthContext, entity: EntityName, before: Row | null, row: Row) {
  const db = await getDb();
  const extra: { entity: EntityName; row: Row }[] = [];
  const ws = auth.workspace.id;

  // Recurring task: completing it schedules the next occurrence.
  if (entity === "tasks" && row.status === "done" && before && before.status !== "done" && row.recurrence) {
    const base = row.dueAt ? new Date(row.dueAt) : new Date();
    const next = new Date(base);
    if (row.recurrence === "daily") next.setDate(next.getDate() + 1);
    if (row.recurrence === "weekly") next.setDate(next.getDate() + 7);
    if (row.recurrence === "monthly") next.setMonth(next.getMonth() + 1);
    const rest: Row = { ...row };
    for (const k of ["id", "createdAt", "updatedAt", "completedAt", "workspaceId"]) delete rest[k];
    const [created] = await db
      .insert(schema.tasks)
      .values({
        ...(rest as typeof schema.tasks.$inferInsert),
        id: newId(),
        workspaceId: ws,
        status: "todo",
        dueAt: next,
        completedAt: null,
        checklist: (row.checklist ?? []).map((c: Row) => ({ ...c, done: false })),
      })
      .returning();
    extra.push({ entity: "tasks", row: created as Row });
  }

  // Campaign approved with a value → expected revenue appears in Finance.
  if (entity === "campaigns" && row.value && REVENUE_STAGES.has(row.stage)) {
    const existing = await db
      .select()
      .from(schema.transactions)
      .where(and(eq(schema.transactions.workspaceId, ws), eq(schema.transactions.campaignId, row.id)));
    if (!existing.length) {
      const [tx] = await db
        .insert(schema.transactions)
        .values({
          id: newId(),
          workspaceId: ws,
          kind: "income",
          title: `Campanha · ${row.title}`,
          category: "campaign",
          amount: row.value,
          status: row.paid ? "done" : "pending",
          paidAt: row.paid ? new Date() : null,
          dueAt: row.dueAt,
          campaignId: row.id,
        })
        .returning();
      extra.push({ entity: "transactions", row: tx as Row });
    } else if (before && (before.paid !== row.paid || before.value !== row.value)) {
      const updated = await db
        .update(schema.transactions)
        .set({
          status: row.paid ? "done" : "pending",
          paidAt: row.paid ? new Date() : null,
          amount: row.value,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.transactions.workspaceId, ws),
            inArray(
              schema.transactions.id,
              existing.map((e) => e.id),
            ),
          ),
        )
        .returning();
      for (const tx of updated) extra.push({ entity: "transactions", row: tx as Row });
    }
  }
  return extra;
}

export async function snapshot(wsId: string) {
  const entries = await Promise.all(
    (Object.keys(TABLES) as EntityName[]).map(async (e) => [e, await listEntity(wsId, e)] as const),
  );
  const db = await getDb();
  const notifications = await db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.workspaceId, wsId))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(50);
  return { ...Object.fromEntries(entries), notifications } as unknown as Record<EntityName, Row[]> & { notifications: Row[] };
}
