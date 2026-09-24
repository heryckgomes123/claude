"use client";

import { createContext, useContext } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import type { EntityName } from "@/lib/entities";
import type { EntityMap, Me, Snapshot, WorkspaceSettings } from "@/lib/types";
import { api, tzOffset } from "@/lib/client-api";
import { newId } from "@/lib/id";

export type Toast = {
  id: string;
  message: string;
  tone?: "default" | "success" | "error" | "ai";
  action?: { label: string; onClick: () => void };
  duration?: number;
};

export type Change = { entity: EntityName; row: Record<string, unknown> } | { entity: EntityName; deletedId: string };

type Row = Record<string, unknown> & { id: string };

type UI = {
  captureOpen: boolean;
  captureMode?: EntityName | "text";
  captureText?: string;
  /** Entity detail sheet currently open (task, event, content, …). */
  detail?: { entity: EntityName; id: string } | null;
  voiceOpen: boolean;
  searchOpen: boolean;
  notificationsOpen: boolean;
};

type State = {
  me: Me | null;
  data: Snapshot | null;
  lastSync: number;
  ui: UI;
  toasts: Toast[];
  hydrate: (me: Me, data: Snapshot) => void;
  sync: () => Promise<void>;
  setUI: (patch: Partial<UI>) => void;
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  applyChanges: (changes: Change[]) => void;
  create: <E extends EntityName>(entity: E, data: Partial<EntityMap[E]> & Record<string, unknown>, opts?: { silent?: boolean }) => Promise<EntityMap[E] | null>;
  update: <E extends EntityName>(entity: E, id: string, patch: Partial<EntityMap[E]> & Record<string, unknown>) => Promise<void>;
  remove: (entity: EntityName, id: string, opts?: { label?: string }) => void;
  saveSettings: (patch: Partial<WorkspaceSettings>) => Promise<void>;
};

/** Minimal defaults so optimistic rows render before the server confirms. */
const DEFAULTS: Partial<Record<EntityName, Record<string, unknown>>> = {
  tasks: { status: "todo", priority: "none", hasTime: false, tags: [], checklist: [], dependsOn: [], position: 0, dueAt: null, completedAt: null, projectId: null, clientId: null, contentId: null, campaignId: null, goalId: null, category: null, description: null, recurrence: null },
  projects: { status: "active", description: null, dueAt: null, emoji: null, color: null },
  events: { allDay: false, kind: "appointment", endAt: null, description: null, location: null, contentId: null, projectId: null },
  goals: { horizon: "month", category: "personal", current: 0, target: null, unit: null, status: "active", dueAt: null },
  habits: { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], log: [], archived: false, emoji: null, timeOfDay: "any" },
  notes: { kind: "note", pinned: false, tags: [], body: null, url: null, projectId: null },
  captures: { status: "pending", source: "text" },
  ideas: { status: "raw", potential: 3, hook: null, platform: null, format: null, category: null, description: null },
  contents: { stage: "idea", metrics: {}, position: 0, platform: null, format: null, hook: null, script: null, caption: null, scheduledAt: null, publishedAt: null, campaignId: null },
  lives: { status: "planned", durationMin: 60, checklist: [], metrics: {}, startAt: null },
  brands: {},
  campaigns: { stage: "contact", deliverables: [], approved: false, paid: false, value: null, dueAt: null, brandId: null },
  clients: { kind: "lead", stage: "new", tags: [], value: null, nextFollowUpAt: null },
  transactions: { category: "other", status: "pending", dueAt: null, paidAt: null },
};

function serialize(obj: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v instanceof Date ? v.toISOString() : v;
  return out;
}

/**
 * The store is created per AppShell instance (never module-global) so server
 * rendering can't leak one user's data into another user's request.
 */
export function createAivaStore(me: Me, initial: Snapshot) {
  const deleteTimers = new Map<string, ReturnType<typeof setTimeout>>();
  return createStore<State>((set, get) => {
  const list = (entity: EntityName) => ((get().data?.[entity] ?? []) as unknown as Row[]);
  const setList = (entity: EntityName, rows: Row[]) =>
    set((s) => (s.data ? { data: { ...s.data, [entity]: rows } as Snapshot } : s));
  const upsert = (entity: EntityName, row: Row) => {
    const rows = list(entity);
    const i = rows.findIndex((r) => r.id === row.id);
    setList(entity, i === -1 ? [row, ...rows] : rows.map((r) => (r.id === row.id ? { ...r, ...row } : r)));
  };
  const drop = (entity: EntityName, id: string) => setList(entity, list(entity).filter((r) => r.id !== id));
  const fail = (err: unknown) =>
    get().toast({ message: err instanceof Error ? err.message : "Não foi possível salvar", tone: "error" });

  return {
    me,
    data: initial,
    lastSync: Date.now(),
    ui: { captureOpen: false, voiceOpen: false, searchOpen: false, notificationsOpen: false },
    toasts: [],

    hydrate: (me, data) => set({ me, data, lastSync: Date.now() }),

    sync: async () => {
      try {
        const data = await api<Snapshot>(`/api/sync?tz=${tzOffset()}`);
        // Keep rows whose deletion is still pending (undo window).
        for (const key of deleteTimers.keys()) {
          const [entity, id] = key.split(":") as [EntityName, string];
          (data as unknown as Record<string, Row[]>)[entity] = (data[entity] as unknown as Row[]).filter((r) => r.id !== id);
        }
        set({ data, lastSync: Date.now() });
      } catch {
        /* offline: keep current data */
      }
    },

    setUI: (patch) => set((s) => ({ ui: { ...s.ui, ...patch } })),

    toast: (t) => {
      const id = newId();
      set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
      setTimeout(() => get().dismissToast(id), t.duration ?? (t.action ? 5000 : 3000));
    },
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    applyChanges: (changes) => {
      for (const c of changes) {
        if ("deletedId" in c) drop(c.entity, c.deletedId);
        else upsert(c.entity, c.row as Row);
      }
    },

    create: async (entity, data, opts) => {
      const id = newId();
      const now = new Date().toISOString();
      const optimistic = { ...DEFAULTS[entity], ...serialize(data), id, createdAt: now, updatedAt: now } as Row;
      upsert(entity, optimistic);
      try {
        const res = await api<{ row: Row; extra: Change[] }>(`/api/data/${entity}`, { body: { ...data, id } });
        upsert(entity, res.row);
        get().applyChanges(res.extra ?? []);
        if (!opts?.silent) get().toast({ message: "Salvo", tone: "success" });
        return res.row as unknown as EntityMap[typeof entity];
      } catch (err) {
        drop(entity, id);
        fail(err);
        return null;
      }
    },

    update: async (entity, id, patch) => {
      const before = list(entity).find((r) => r.id === id);
      if (before) upsert(entity, { ...before, ...serialize(patch), updatedAt: new Date().toISOString() });
      try {
        const res = await api<{ row: Row; extra: Change[] }>(`/api/data/${entity}/${id}`, { method: "PATCH", body: patch });
        upsert(entity, res.row);
        get().applyChanges(res.extra ?? []);
      } catch (err) {
        if (before) upsert(entity, before);
        fail(err);
      }
    },

    remove: (entity, id, opts) => {
      const before = list(entity).find((r) => r.id === id);
      if (!before) return;
      drop(entity, id);
      const key = `${entity}:${id}`;
      const timer = setTimeout(async () => {
        deleteTimers.delete(key);
        try {
          await api(`/api/data/${entity}/${id}`, { method: "DELETE" });
          // Referencing rows had their links cleared server-side; refresh quietly.
          get().sync();
        } catch (err) {
          upsert(entity, before);
          fail(err);
        }
      }, 4500);
      deleteTimers.set(key, timer);
      get().toast({
        message: `${opts?.label ?? "Item"} excluído`,
        action: {
          label: "Desfazer",
          onClick: () => {
            clearTimeout(timer);
            deleteTimers.delete(key);
            upsert(entity, before);
          },
        },
      });
    },

    saveSettings: async (patch) => {
      const me = get().me;
      if (!me) return;
      const prev = me.workspace.settings;
      set({ me: { ...me, workspace: { ...me.workspace, settings: { ...prev, ...patch } } } });
      try {
        const res = await api<{ settings: WorkspaceSettings }>("/api/workspace", { method: "PATCH", body: patch });
        set((s) => (s.me ? { me: { ...s.me, workspace: { ...s.me.workspace, settings: res.settings } } } : s));
      } catch (err) {
        set((s) => (s.me ? { me: { ...s.me, workspace: { ...s.me.workspace, settings: prev } } } : s));
        fail(err);
      }
    },
  };
  });
}

export type AivaStore = StoreApi<State>;
export const AivaContext = createContext<AivaStore | null>(null);

export function useAiva<T>(selector: (s: State) => T): T {
  const store = useContext(AivaContext);
  if (!store) throw new Error("useAiva must be used inside <AppShell>");
  return useStore(store, selector);
}

export function useAivaStore(): AivaStore {
  const store = useContext(AivaContext);
  if (!store) throw new Error("useAivaStore must be used inside <AppShell>");
  return store;
}

/** Typed selector for one collection. */
export function useList<E extends EntityName>(entity: E): EntityMap[E][] {
  return useAiva((s) => (s.data?.[entity] ?? EMPTY) as EntityMap[E][]);
}
const EMPTY: never[] = [];
