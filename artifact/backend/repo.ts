/**
 * Browser port of src/lib/server/repo.ts — same validation (zod entity schemas),
 * same reference checks and the same context-engine rules, over the local store.
 */
import { entitySchemas, REFERENCES, ENTITY_LABEL, LIVE_CHECKLIST_DEFAULT, type EntityName } from "@/lib/entities";
import { newId } from "@/lib/id";
import { storage, type Row } from "./storage";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** zod coerces dates to Date objects; the store keeps JSON (ISO strings). */
function toJson(data: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(data));
}

function assertReferences(data: Record<string, unknown>) {
  for (const [key, target] of Object.entries(REFERENCES)) {
    const v = data[key];
    if (v && !storage.get(target, String(v))) throw new HttpError(400, `Referência inválida: ${key}`);
  }
}

function findOwned(entity: EntityName, id: string): Row {
  const row = storage.get(entity, id);
  if (!row) throw new HttpError(404, `${ENTITY_LABEL[entity]}: item não encontrado`);
  return row;
}

export function listEntity(entity: EntityName) {
  return storage.list(entity).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function createEntity(entity: EntityName, input: unknown, opts: { id?: string } = {}) {
  const data = toJson(entitySchemas[entity].parse(input) as Record<string, unknown>);
  assertReferences(data);
  const now = new Date().toISOString();
  applyCreateDefaults(entity, data, now);
  const id = opts.id ?? newId();
  if (storage.get(entity, id)) throw new HttpError(409, "Este item já existe");
  const row: Row = { ...defaultsFor(entity), ...data, id, workspaceId: "local", createdAt: now, ...(entity === "captures" || HAS_UPDATED.has(entity) ? { updatedAt: now } : {}) };
  storage.put(entity, row);
  const extra = afterWrite(entity, null, row);
  return { row, extra };
}

export function updateEntity(entity: EntityName, id: string, input: unknown) {
  const before = findOwned(entity, id);
  const schema = entitySchemas[entity] as unknown as { partial(): { parse(v: unknown): Record<string, unknown> } };
  const data = toJson(schema.partial().parse(input));
  assertReferences(data);
  applyUpdateDefaults(entity, before, data);
  const row: Row = { ...before, ...data, id, updatedAt: new Date().toISOString() };
  storage.put(entity, row);
  const extra = afterWrite(entity, before, row);
  return { row, extra };
}

export function deleteEntity(entity: EntityName, id: string) {
  const before = findOwned(entity, id);
  storage.remove(entity, id);
  // No orphans: clear every reference that pointed at the deleted row.
  for (const [field, target] of Object.entries(REFERENCES)) {
    if (target !== entity) continue;
    for (const other of Object.keys(entitySchemas) as EntityName[]) {
      for (const r of storage.list(other)) if (r[field] === id) storage.put(other, { ...r, [field]: null });
    }
  }
  if (entity === "tasks") {
    for (const t of storage.list("tasks")) {
      const deps = (t.dependsOn as string[] | undefined) ?? [];
      if (deps.includes(id)) storage.put("tasks", { ...t, dependsOn: deps.filter((d) => d !== id) });
    }
  }
  return { deleted: before };
}

export function snapshot() {
  const out: Record<string, Row[]> = {};
  for (const e of Object.keys(entitySchemas) as EntityName[]) out[e] = listEntity(e);
  out.notifications = storage
    .list("notifications")
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 50);
  return JSON.parse(JSON.stringify(out));
}

/* ------------------------------------------------------------------ */

const HAS_UPDATED = new Set<EntityName>(Object.keys(entitySchemas).filter((e) => e !== "captures") as EntityName[]);

/** Column defaults mirrored from src/db/schema.ts. */
function defaultsFor(entity: EntityName): Record<string, unknown> {
  const d: Partial<Record<EntityName, Record<string, unknown>>> = {
    tasks: { description: null, status: "todo", priority: "none", dueAt: null, hasTime: false, category: null, tags: [], checklist: [], recurrence: null, projectId: null, clientId: null, contentId: null, campaignId: null, goalId: null, dependsOn: [], position: 0, completedAt: null },
    projects: { description: null, status: "active", color: null, emoji: null, area: null, dueAt: null, clientId: null, goalId: null },
    events: { description: null, endAt: null, allDay: false, kind: "appointment", location: null, reminderMinutes: null, projectId: null, clientId: null, contentId: null, campaignId: null },
    goals: { horizon: "month", category: "personal", target: null, current: 0, unit: null, dueAt: null, status: "active" },
    habits: { emoji: null, timeOfDay: null, daysOfWeek: [0, 1, 2, 3, 4, 5, 6], log: [], archived: false },
    notes: { body: null, kind: "note", url: null, pinned: false, tags: [], projectId: null, clientId: null },
    captures: { source: "text", entityType: null, entityId: null, status: "pending" },
    ideas: { hook: null, description: null, platform: null, format: null, category: null, reference: null, potential: 3, status: "raw", contentId: null },
    contents: { platform: null, format: null, stage: "idea", hook: null, script: null, caption: null, scheduledAt: null, publishedAt: null, url: null, metrics: {}, ideaId: null, campaignId: null, projectId: null, position: 0 },
    lives: { platform: null, startAt: null, durationMin: 60, topic: null, agenda: null, guests: null, goals: null, checklist: [], metrics: {}, highlights: null, status: "planned" },
    brands: { contactName: null, contactEmail: null, website: null, notes: null },
    campaigns: { brandId: null, stage: "contact", briefing: null, deliverables: [], dueAt: null, value: null, contractUrl: null, approved: false, paid: false, notes: null },
    clients: { company: null, email: null, phone: null, kind: "lead", stage: "new", value: null, nextFollowUpAt: null, notes: null, tags: [] },
    transactions: { category: "other", status: "pending", dueAt: null, paidAt: null, campaignId: null, clientId: null, projectId: null },
  };
  return d[entity] ?? {};
}

function applyCreateDefaults(entity: EntityName, data: Record<string, unknown>, now: string) {
  if (entity === "tasks") {
    if (data.status === "done") data.completedAt ??= now;
    data.position ??= Date.now();
  }
  if (entity === "lives" && !data.checklist) data.checklist = LIVE_CHECKLIST_DEFAULT.map((text) => ({ id: newId(), text, done: false }));
  if (entity === "contents") {
    data.position ??= Date.now();
    if (data.stage === "published") data.publishedAt ??= now;
  }
  if (entity === "transactions" && data.status === "done") data.paidAt ??= now;
  if (entity === "notes" && data.url === "") data.url = null;
}

function applyUpdateDefaults(entity: EntityName, before: Row, data: Record<string, unknown>) {
  const now = new Date().toISOString();
  if (entity === "tasks" && data.status) {
    if (data.status === "done" && before.status !== "done") data.completedAt = now;
    if (data.status !== "done") data.completedAt = null;
  }
  if (entity === "contents" && data.stage === "published" && !before.publishedAt) data.publishedAt ??= now;
  if (entity === "transactions" && data.status === "done" && !before.paidAt) data.paidAt ??= now;
  if (entity === "transactions" && data.status === "pending") data.paidAt = null;
}

const REVENUE_STAGES = new Set(["approved", "production", "delivery", "payment", "done"]);

function afterWrite(entity: EntityName, before: Row | null, row: Row) {
  const extra: { entity: EntityName; row: Row }[] = [];
  const now = new Date().toISOString();

  if (entity === "tasks" && row.status === "done" && before && before.status !== "done" && row.recurrence) {
    const next = new Date(row.dueAt ? String(row.dueAt) : Date.now());
    if (row.recurrence === "daily") next.setDate(next.getDate() + 1);
    if (row.recurrence === "weekly") next.setDate(next.getDate() + 7);
    if (row.recurrence === "monthly") next.setMonth(next.getMonth() + 1);
    const created: Row = {
      ...row,
      id: newId(),
      status: "todo",
      dueAt: next.toISOString(),
      completedAt: null,
      checklist: ((row.checklist as { done: boolean }[]) ?? []).map((c) => ({ ...c, done: false })),
      createdAt: now,
      updatedAt: now,
    };
    storage.put("tasks", created);
    extra.push({ entity: "tasks", row: created });
  }

  if (entity === "campaigns" && row.value && REVENUE_STAGES.has(String(row.stage))) {
    const existing = storage.list("transactions").filter((t) => t.campaignId === row.id);
    if (!existing.length) {
      const tx: Row = {
        ...defaultsFor("transactions"),
        id: newId(),
        workspaceId: "local",
        kind: "income",
        title: `Campanha · ${row.title}`,
        category: "campaign",
        amount: row.value,
        status: row.paid ? "done" : "pending",
        paidAt: row.paid ? now : null,
        dueAt: row.dueAt ?? null,
        campaignId: row.id,
        createdAt: now,
        updatedAt: now,
      };
      storage.put("transactions", tx);
      extra.push({ entity: "transactions", row: tx });
    } else if (before && (before.paid !== row.paid || before.value !== row.value)) {
      for (const t of existing) {
        const tx: Row = { ...t, status: row.paid ? "done" : "pending", paidAt: row.paid ? now : null, amount: row.value, updatedAt: now };
        storage.put("transactions", tx);
        extra.push({ entity: "transactions", row: tx });
      }
    }
  }
  return extra;
}
