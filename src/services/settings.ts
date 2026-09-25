import "server-only";
import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import type { z } from "zod";
import { db, type DbOrTx } from "@/db";
import { businessHours, businessSettings } from "@/db/schema";
import { audit } from "@/lib/audit";
import { assertCan, type SessionUser } from "@/lib/auth/session";
import type { businessHoursInput, companyInput } from "@/schemas/settings";

export type BusinessDay = typeof businessHours.$inferSelect;

const DEFAULT_DAYS: BusinessDay[] = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  isOpen: weekday !== 0,
  openMinute: 9 * 60,
  closeMinute: weekday === 6 ? 17 * 60 : 19 * 60,
  breakStartMinute: null,
  breakEndMinute: null,
}));

export const getBusinessSettings = cache(async (executor: DbOrTx = db) => {
  const [row] = await executor.select().from(businessSettings).where(eq(businessSettings.id, 1)).limit(1);
  return (
    row ?? {
      id: 1,
      name: "R Beauty",
      logoUrl: null,
      phone: null,
      whatsapp: null,
      instagram: null,
      address: null,
      slotIntervalMinutes: 15,
      isDemo: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  );
});

export const getBusinessHours = cache(async (executor: DbOrTx = db): Promise<BusinessDay[]> => {
  const rows = await executor.select().from(businessHours).orderBy(asc(businessHours.weekday));
  return DEFAULT_DAYS.map((d) => rows.find((r) => r.weekday === d.weekday) ?? d);
});

export async function updateCompany(actor: SessionUser, input: z.output<typeof companyInput>) {
  assertCan(actor, "settings.company");
  await db
    .insert(businessSettings)
    .values({ id: 1, ...input })
    .onConflictDoUpdate({ target: businessSettings.id, set: input });
  await audit({ userId: actor.id, action: "update", entity: "business_settings", entityId: "1" });
}

export async function updateBusinessHours(actor: SessionUser, input: z.output<typeof businessHoursInput>) {
  assertCan(actor, "settings.schedule");
  await db.transaction(async (tx) => {
    await tx
      .insert(businessSettings)
      .values({ id: 1, slotIntervalMinutes: input.slotIntervalMinutes })
      .onConflictDoUpdate({ target: businessSettings.id, set: { slotIntervalMinutes: input.slotIntervalMinutes } });
    for (const day of input.days) {
      await tx.insert(businessHours).values(day).onConflictDoUpdate({ target: businessHours.weekday, set: day });
    }
    await audit({ userId: actor.id, action: "update", entity: "business_hours" }, tx);
  });
}
