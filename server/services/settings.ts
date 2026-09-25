import type { Queryable } from '../db';
import { DEFAULT_SETTINGS, type GlobalSettings } from '../../shared/catalog';

let cache: { at: number; value: GlobalSettings } | null = null;

export async function getSettings(q: Queryable): Promise<GlobalSettings> {
  if (cache && Date.now() - cache.at < 5000) return cache.value;
  const row = await q.one<{ value: Partial<GlobalSettings> }>(`SELECT value FROM settings WHERE key = 'global'`);
  const value = { ...DEFAULT_SETTINGS, ...(row?.value ?? {}) };
  cache = { at: Date.now(), value };
  return value;
}

export async function saveSettings(q: Queryable, patch: Partial<GlobalSettings>): Promise<GlobalSettings> {
  const current = await getSettings(q);
  const value = { ...current, ...patch };
  await q.query(
    `INSERT INTO settings (key, value, updated_at) VALUES ('global', $1, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify(value)],
  );
  cache = null;
  return value;
}

export function clearSettingsCache() {
  cache = null;
}

export async function getMeta<T>(q: Queryable, key: string): Promise<T | null> {
  const row = await q.one<{ value: T }>('SELECT value FROM settings WHERE key = $1', [key]);
  return row?.value ?? null;
}

export async function setMeta(q: Queryable, key: string, value: unknown) {
  await q.query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, JSON.stringify(value)],
  );
}
