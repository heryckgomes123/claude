/**
 * Drop-in replacement for src/lib/client-api.ts in the standalone build:
 * the same `api(path, init)` calls, answered in the browser instead of by the server.
 */
import { z } from "zod";
import { isEntityName, type EntityName } from "@/lib/entities";
import { interpret } from "@/lib/nlp/interpret";
import { newId } from "@/lib/id";
import { calibrationSchema, settingsSchema, CREATOR_ROLES } from "@/lib/settings-schema";
import { localRespond } from "@/lib/server/ai/local";
import { computeNotifications } from "@/lib/server/notify";
import type { AiReply } from "@/lib/ai/reply";
import type { Snapshot } from "@/lib/types";
import { storage, type Row } from "./storage";
import { createEntity, deleteEntity, listEntity, snapshot, updateEntity, HttpError } from "./repo";
import { executeActions, resolveProposal } from "./execute";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const tzOffset = () => new Date().getTimezoneOffset();

const auth = () => ({
  user: { id: "me", email: "", name: storage.settings.displayName ?? "Você", avatarColor: "#7c5cff" },
  workspace: { id: "local", ownerId: "me", name: "AIVA", settings: storage.settings, createdAt: new Date(0) },
});

type Init = { method?: string; body?: unknown };

export async function api<T = unknown>(path: string, init?: Init): Promise<T> {
  try {
    const result = await route(path, init?.method ?? (init?.body ? "POST" : "GET"), (init?.body ?? {}) as Record<string, unknown>);
    return JSON.parse(JSON.stringify(result ?? { ok: true })) as T;
  } catch (err) {
    if (err instanceof HttpError) throw new ApiError(err.status, err.message);
    if (err instanceof z.ZodError) throw new ApiError(400, "Dados inválidos");
    console.error("[aiva]", err);
    throw new ApiError(500, "Algo deu errado. Tente novamente.");
  }
}

function clock(body: Record<string, unknown>) {
  const n = Number(body.tzOffset);
  return { now: new Date(), tzOffset: Number.isFinite(n) ? n : tzOffset() };
}

function persistNotifications() {
  const snap = snapshot() as Snapshot;
  const existing = new Set(storage.list("notifications").map((n) => n.dedupeKey));
  for (const n of computeNotifications(snap, { now: new Date(), tzOffset: tzOffset() })) {
    if (existing.has(n.key)) continue;
    storage.put("notifications", { id: newId(), workspaceId: "local", title: n.title, body: n.body ?? null, kind: n.kind, href: n.href ?? null, dedupeKey: n.key, readAt: null, createdAt: new Date().toISOString() });
  }
  // Keep the collection small (the store caps documents per artifact).
  const all = storage.list("notifications").sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  for (const old of all.slice(60)) storage.remove("notifications", old.id);
}

async function route(path: string, method: string, body: Record<string, unknown>): Promise<unknown> {
  const url = path.split("?")[0];
  let m: RegExpExecArray | null;

  if (url === "/api/sync") {
    persistNotifications();
    return snapshot();
  }
  if (url === "/api/me") return { user: auth().user, workspace: { id: "local", name: "AIVA", settings: storage.settings }, ai: { provider: "local" } };
  if (url.startsWith("/api/auth/")) return { ok: true };

  if (url === "/api/workspace" && method === "PATCH") {
    const patch = settingsSchema.parse(body);
    storage.saveSettings({ ...storage.settings, ...patch });
    return { settings: storage.settings };
  }
  if (url === "/api/workspace/calibrate") return calibrate(body);

  if ((m = /^\/api\/data\/([a-z]+)$/.exec(url))) {
    const entity = asEntity(m[1]);
    if (method === "GET") return listEntity(entity);
    const id = z.string().uuid().safeParse(body.id).success ? String(body.id) : undefined;
    return createEntity(entity, body, { id });
  }
  if ((m = /^\/api\/data\/([a-z]+)\/([\w-]+)$/.exec(url))) {
    const entity = asEntity(m[1]);
    if (method === "PATCH") return updateEntity(entity, m[2], body);
    if (method === "DELETE") {
      deleteEntity(entity, m[2]);
      return { ok: true };
    }
    const row = listEntity(entity).find((r) => r.id === m![2]);
    if (!row) throw new HttpError(404, "Não encontrado");
    return row;
  }

  if (url === "/api/capture") {
    const text = z.string().trim().min(1).max(2000).parse(body.text);
    const it = interpret(text, clock(body));
    if (it.kind !== "create") return { kind: "ask" };
    const result = await executeActions(null, it.actions);
    const primary = result.executed.find((e) => e.entity === it.primary) ?? result.executed[0];
    const capture = createEntity("captures", { text, source: body.source === "voice" ? "voice" : "text", entityType: primary?.entity ?? null, entityId: primary?.id ?? null, status: "pending" });
    return { kind: "create", primary: it.primary, confirm: it.confirm, suggestions: it.suggestions, executed: result.executed, errors: result.errors, changes: [...result.changes, { entity: "captures", row: capture.row }] };
  }

  if (url === "/api/ai/execute") {
    const result = await executeActions(null, body.actions, { allowDestructive: false });
    if (typeof body.captureText === "string" && result.executed[0]) {
      const cap = createEntity("captures", { text: body.captureText, source: "voice", entityType: result.executed[0].entity, entityId: result.executed[0].id, status: "organized" });
      result.changes.push({ entity: "captures", row: cap.row });
    }
    return result;
  }
  if ((m = /^\/api\/ai\/proposals\/([\w-]+)$/.exec(url))) return resolveProposal(m[1], body.decision === "confirm" ? "confirm" : "cancel");

  if (url === "/api/ai/chat" && method === "GET") {
    return storage
      .list("conversations")
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .map((c) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt }));
  }
  if (url === "/api/ai/chat") return chat(body);
  if ((m = /^\/api\/ai\/conversations\/([\w-]+)$/.exec(url))) {
    const conv = storage.get("conversations", m[1]);
    if (!conv) throw new HttpError(404, "Conversa não encontrada");
    if (method === "DELETE") {
      storage.remove("conversations", conv.id);
      return { ok: true };
    }
    return { conversation: conv, messages: conv.messages ?? [] };
  }

  if ((m = /^\/api\/notifications\/([\w-]+)$/.exec(url))) {
    const now = new Date().toISOString();
    for (const n of storage.list("notifications")) if ((m[1] === "all" || n.id === m[1]) && !n.readAt) storage.put("notifications", { ...n, readAt: now });
    return { ok: true };
  }

  throw new HttpError(404, "Recurso indisponível nesta versão");
}

function asEntity(name: string): EntityName {
  if (!isEntityName(name)) throw new HttpError(404, "Recurso desconhecido");
  return name;
}

async function chat(body: Record<string, unknown>): Promise<AiReply> {
  const message = z.string().trim().min(1).max(4000).parse(body.message);
  let conv: Row | undefined = typeof body.conversationId === "string" ? storage.get("conversations", body.conversationId) : undefined;
  const now = new Date().toISOString();
  conv ??= { id: newId(), title: message.slice(0, 60), createdAt: now, updatedAt: now, messages: [] };
  const snap = snapshot() as Snapshot;
  const out = await localRespond(auth() as never, message, snap, clock(body), conv.id);
  // One document per conversation, capped, so the store never grows unbounded.
  const messages = [
    ...((conv.messages as unknown[]) ?? []),
    { id: newId(), role: "user", content: message, actions: [], createdAt: now },
    { id: newId(), role: "assistant", content: out.message, actions: [{ executed: out.executed, items: out.items, plan: out.plan }], createdAt: now },
  ].slice(-40);
  storage.put("conversations", { ...conv, updatedAt: now, messages });
  const convs = storage.list("conversations").sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  for (const old of convs.slice(30)) storage.remove("conversations", old.id);
  return { ...out, conversationId: conv.id, provider: "local" };
}

function calibrate(body: Record<string, unknown>) {
  const { habits, ...answers } = calibrationSchema.parse(body);
  const firstTime = !storage.settings.calibratedAt;
  const creatorMode = answers.creatorMode ?? (CREATOR_ROLES.has(answers.role) || answers.focus.includes("content") || answers.focus.includes("all"));
  const settings = { ...storage.settings, ...answers, creatorMode, calibratedAt: storage.settings.calibratedAt ?? new Date().toISOString() };
  storage.saveSettings(settings);
  if (firstTime) {
    if (answers.mainFocus) {
      createEntity("goals", {
        title: answers.mainFocus,
        horizon: "month",
        category: creatorMode && answers.focus.includes("content") ? "content" : answers.focus.includes("work") || answers.focus.includes("clients") ? "work" : "personal",
      });
    }
    if (creatorMode && answers.postsPerWeek) createEntity("goals", { title: `Publicar ${answers.postsPerWeek} conteúdos por semana`, horizon: "week", category: "content", target: answers.postsPerWeek, unit: "conteúdos" });
    for (const title of habits) createEntity("habits", { title, timeOfDay: "any" });
    const steps = [
      "Capture 3 coisas que estão na sua cabeça (botão +)",
      "Pergunte algo para a AIVA (orb no centro da barra)",
      "Abra este mesmo link no celular — seus dados sincronizam",
      ...(creatorMode ? ["Salve sua primeira ideia no Idea Vault"] : []),
      ...(answers.focus.includes("clients") || answers.focus.includes("all") ? ["Cadastre seu primeiro cliente"] : []),
    ];
    createEntity("tasks", { title: "Primeiros passos com a AIVA", status: "todo", priority: "medium", category: "AIVA", dueAt: new Date(), checklist: steps.map((text) => ({ id: newId(), text, done: false })) });
  }
  return { settings };
}
