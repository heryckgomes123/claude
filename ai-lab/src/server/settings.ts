import 'server-only'
import { inArray } from 'drizzle-orm'
import { db } from './db'
import { setting } from './db/schema'

/** Configurações editáveis pelo professor no painel. */
export const SETTING_KEYS = ['checkoutUrl', 'supportUrl'] as const
export type SettingKey = (typeof SETTING_KEYS)[number]
export type Settings = Record<SettingKey, string>

export async function getSettings(): Promise<Settings> {
  const rows = await db.select().from(setting).where(inArray(setting.key, [...SETTING_KEYS]))
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  return { checkoutUrl: map.checkoutUrl ?? '', supportUrl: map.supportUrl ?? '' }
}

export async function saveSettings(values: Partial<Settings>) {
  for (const key of SETTING_KEYS) {
    const value = values[key]
    if (value === undefined) continue
    await db
      .insert(setting)
      .values({ key, value })
      .onConflictDoUpdate({ target: setting.key, set: { value } })
  }
}
