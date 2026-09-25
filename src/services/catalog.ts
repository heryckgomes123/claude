import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import { professionalServices, serviceCategories, services } from "@/db/schema";
import { audit } from "@/lib/audit";
import { assertCan, type SessionUser } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import type { serviceInput } from "@/schemas/service";

export async function listServices(actor: SessionUser, options: { includeInactive?: boolean } = {}) {
  assertCan(actor, "services.view");
  const rows = await db.query.services.findMany({
    where: options.includeInactive ? undefined : eq(services.isActive, true),
    orderBy: [desc(services.isActive), asc(services.name)],
    with: {
      category: true,
      professionals: { with: { professional: { columns: { id: true, name: true, color: true, isActive: true } } } },
    },
  });
  return rows
    .map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMinutes: s.durationMinutes,
      priceCents: s.priceCents,
      commissionRate: s.commissionRate,
      isActive: s.isActive,
      categoryId: s.categoryId,
      categoryName: s.category.name,
      categorySort: s.category.sortOrder,
      professionals: s.professionals.map((p) => p.professional).filter((p) => p.isActive),
    }))
    .sort((a, b) => a.categorySort - b.categorySort || a.name.localeCompare(b.name, "pt-BR"));
}

export type ServiceRow = Awaited<ReturnType<typeof listServices>>[number];

export async function saveService(actor: SessionUser, serviceId: string | null, input: z.output<typeof serviceInput>) {
  assertCan(actor, serviceId ? "services.edit" : "services.create");
  return db.transaction(async (tx) => {
    const [category] = await tx
      .select({ id: serviceCategories.id })
      .from(serviceCategories)
      .where(eq(serviceCategories.id, input.categoryId))
      .limit(1);
    if (!category) throw new NotFoundError("Categoria não encontrada.");

    const data = {
      name: input.name,
      categoryId: input.categoryId,
      description: input.description,
      durationMinutes: input.durationMinutes,
      priceCents: input.priceCents,
      commissionRate: input.commissionRate,
    };
    let id = serviceId;
    if (id) {
      const [updated] = await tx.update(services).set(data).where(eq(services.id, id)).returning({ id: services.id });
      if (!updated) throw new NotFoundError("Serviço não encontrado.");
    } else {
      const [created] = await tx.insert(services).values(data).returning({ id: services.id });
      id = created.id;
    }
    await tx.delete(professionalServices).where(eq(professionalServices.serviceId, id));
    if (input.professionalIds.length) {
      await tx.insert(professionalServices).values(input.professionalIds.map((professionalId) => ({ professionalId, serviceId: id! })));
    }
    await audit({ userId: actor.id, action: serviceId ? "update" : "create", entity: "service", entityId: id }, tx);
    return { id };
  });
}

export async function setServiceActive(actor: SessionUser, serviceId: string, isActive: boolean) {
  assertCan(actor, "services.edit");
  const [updated] = await db.update(services).set({ isActive }).where(eq(services.id, serviceId)).returning({ id: services.id });
  if (!updated) throw new NotFoundError("Serviço não encontrado.");
  await audit({ userId: actor.id, action: isActive ? "activate" : "deactivate", entity: "service", entityId: serviceId });
}
