/**
 * Persistence for the standalone build.
 *
 * Preferred: the artifact `db` capability, under the viewer's private subtree
 * (data/users/<id>/ws/<entity>/<row>) — the same data on desktop and phone, live.
 * Fallback: localStorage on this device only (outside the viewer, or without an id).
 */
import { ENTITY_NAMES, type EntityName } from "@/lib/entities";
import type { WorkspaceSettings } from "@/lib/types";

export type Row = Record<string, unknown> & { id: string };
export type Collection = EntityName | "notifications" | "conversations";
export const COLLECTIONS: Collection[] = [...ENTITY_NAMES, "notifications", "conversations"];

/* Minimal shapes of the capability we use (full types live in the platform contract). */
type Snap = { id: string; exists: boolean; data(): Record<string, unknown> | undefined };
type QSnap = { docs: Snap[] };
type DocRef = {
  get(): Promise<Snap>;
  set(d: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
  onSnapshot(next: (s: Snap) => void, err?: (e: unknown) => void): () => void;
  collection(p: string): ColRef;
};
type ColRef = { doc(id: string): DocRef; get(): Promise<QSnap>; limit(n: number): ColRef; onSnapshot(next: (s: QSnap) => void, err?: (e: unknown) => void): () => void };
type DB = { doc(p: string): DocRef };
type ClaudeGlobal = { use(name: string): Promise<unknown> };

export type StorageMode = "cloud" | "device";

const LS_KEY = "aiva:standalone:v1";

class Storage {
  mode: StorageMode = "device";
  /** Viewer's first name from the platform, used to prefill calibration. */
  viewerName = "";
  settings: WorkspaceSettings = {};
  tables = new Map<Collection, Map<string, Row>>(COLLECTIONS.map((c) => [c, new Map()]));
  private ws: DocRef | null = null;
  private queues = new Map<string, Promise<void>>();
  private listeners = new Set<() => void>();
  private lsTimer: ReturnType<typeof setTimeout> | null = null;

  onRemoteChange(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    this.listeners.forEach((l) => l());
  }

  async init() {
    const claude = (window as unknown as { claude?: ClaudeGlobal }).claude;
    let db: DB | null = null;
    let uid: string | null = null;
    if (claude?.use) {
      try {
        const [dbNs, userNs] = await Promise.all([claude.use("db"), claude.use("user")]);
        db = dbNs as DB | null;
        const u = userNs as { id(): Promise<string | null>; me(): Promise<{ name: string }> } | null;
        uid = u ? await u.id() : null;
        this.viewerName = u ? ((await u.me().catch(() => null))?.name ?? "").split(" ")[0] : "";
      } catch {
        db = null;
      }
    }
    if (db && uid) {
      try {
        await this.initCloud(db, uid);
        this.mode = "cloud";
        return;
      } catch (err) {
        console.warn("[aiva] cloud storage unavailable, using this device", err);
      }
    }
    this.loadLocal();
  }

  private async initCloud(db: DB, uid: string) {
    const ws = db.doc(`data/users/${uid}/ws`);
    this.ws = ws;
    const [wsSnap, ...cols] = await Promise.all([ws.get(), ...COLLECTIONS.map((c) => ws.collection(c).limit(1000).get())]);
    this.settings = ((wsSnap.exists ? wsSnap.data()?.settings : undefined) ?? {}) as WorkspaceSettings;
    COLLECTIONS.forEach((c, i) => {
      const map = this.tables.get(c)!;
      for (const d of cols[i].docs) if (d.exists) map.set(d.id, { ...(d.data() as Row), id: d.id });
    });
    // Live updates from the user's other devices.
    ws.onSnapshot((s) => {
      const next = (s.exists ? s.data()?.settings : undefined) as WorkspaceSettings | undefined;
      if (next && JSON.stringify(next) !== JSON.stringify(this.settings)) {
        this.settings = next;
        this.emit();
      }
    });
    for (const c of COLLECTIONS) {
      ws.collection(c)
        .limit(1000)
        .onSnapshot((snap) => {
          const map = this.tables.get(c)!;
          let changed = snap.docs.length !== map.size;
          const seen = new Set<string>();
          for (const d of snap.docs) {
            if (!d.exists) continue;
            seen.add(d.id);
            const row = { ...(d.data() as Row), id: d.id };
            const cur = map.get(d.id);
            if (!cur || JSON.stringify(cur) !== JSON.stringify(row)) {
              map.set(d.id, row);
              changed = true;
            }
          }
          for (const id of [...map.keys()]) if (!seen.has(id) && !this.queues.has(`${c}/${id}`)) map.delete(id);
          if (changed) this.emit();
        });
    }
  }

  private loadLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as { settings?: WorkspaceSettings; tables?: Record<string, Row[]> };
      this.settings = data.settings ?? {};
      for (const c of COLLECTIONS) for (const r of data.tables?.[c] ?? []) this.tables.get(c)!.set(r.id, r);
    } catch {
      /* storage blocked or corrupt: start empty */
    }
  }

  private saveLocalSoon() {
    if (this.mode !== "device") return;
    if (this.lsTimer) clearTimeout(this.lsTimer);
    this.lsTimer = setTimeout(() => {
      try {
        const tables: Record<string, Row[]> = {};
        for (const [c, m] of this.tables) tables[c] = [...m.values()];
        localStorage.setItem(LS_KEY, JSON.stringify({ settings: this.settings, tables }));
      } catch {
        /* quota or blocked storage: data stays for this session */
      }
    }, 250);
  }

  /** One write at a time per document (the store's contract). */
  private enqueue(key: string, op: () => Promise<void>) {
    const prev = this.queues.get(key) ?? Promise.resolve();
    const next = prev
      .catch(() => {})
      .then(op)
      .catch((err) => console.error("[aiva] save failed", key, err))
      .finally(() => {
        if (this.queues.get(key) === next) this.queues.delete(key);
      });
    this.queues.set(key, next);
  }

  list(c: Collection): Row[] {
    return [...this.tables.get(c)!.values()];
  }
  get(c: Collection, id: string): Row | undefined {
    return this.tables.get(c)!.get(id);
  }

  put(c: Collection, row: Row) {
    const clean = JSON.parse(JSON.stringify(row)) as Row;
    this.tables.get(c)!.set(row.id, clean);
    this.saveLocalSoon();
    const ws = this.ws;
    if (ws) this.enqueue(`${c}/${row.id}`, () => ws.collection(c).doc(row.id).set(clean));
  }

  remove(c: Collection, id: string) {
    this.tables.get(c)!.delete(id);
    this.saveLocalSoon();
    const ws = this.ws;
    if (ws) this.enqueue(`${c}/${id}`, () => ws.collection(c).doc(id).delete());
  }

  saveSettings(settings: WorkspaceSettings) {
    this.settings = JSON.parse(JSON.stringify(settings));
    this.saveLocalSoon();
    const ws = this.ws;
    if (ws) this.enqueue("ws", () => ws.set({ settings: this.settings }));
  }

  exportAll() {
    const tables: Record<string, Row[]> = {};
    for (const [c, m] of this.tables) if (c !== "conversations") tables[c] = [...m.values()];
    return { exportedAt: new Date().toISOString(), settings: this.settings, data: tables };
  }
}

export const storage = new Storage();
