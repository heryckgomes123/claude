import "server-only";
import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import {
  appointments,
  attendanceItems,
  commissions,
  professionalSchedules,
  professionalServices,
  professionalSpecialties,
  professionals,
  serviceCategories,
  services,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { assertCan, can, type SessionUser } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import type { professionalInput } from "@/schemas/professional";
import { dayRange, startOfMonth, todayKey } from "@/utils/dates";
import { assertProfessionalAccess, ownProfessionalScope } from "./scope";

export async function listProfessionals(actor: SessionUser, options: { includeInactive?: boolean } = {}) {
  assertCan(actor, "professionals.view");
  const scope = ownProfessionalScope(actor, "professionals.view_all");
  const filters = [];
  if (!options.includeInactive) filters.push(eq(professionals.isActive, true));
  if (scope) filters.push(eq(professionals.id, scope));

  const rows = await db.query.professionals.findMany({
    where: filters.length ? and(...filters) : undefined,
    orderBy: [desc(professionals.isActive), asc(professionals.name)],
    with: {
      specialties: { with: { category: true } },
      services: { columns: { serviceId: true } },
      schedules: true,
    },
  });
  return rows.map((p) => ({
    ...p,
    specialtyNames: p.specialties.map((s) => s.category.name),
    serviceCount: p.services.length,
  }));
}

/** Opções leves para selects (agenda, atendimento). */
export async function listProfessionalOptions(actor: SessionUser) {
  assertCan(actor, "appointments.view", "attendance.view", "professionals.view");
  const scope = can(actor, "appointments.view_all") ? null : actor.professionalId;
  const rows = await db.query.professionals.findMany({
    where: scope ? and(eq(professionals.isActive, true), eq(professionals.id, scope)) : eq(professionals.isActive, true),
    columns: { id: true, name: true, color: true, title: true, photoUrl: true },
    orderBy: asc(professionals.name),
    with: { services: { columns: { serviceId: true } } },
  });
  return rows.map((p) => ({ ...p, serviceIds: p.services.map((s) => s.serviceId) }));
}

export type ProfessionalOption = Awaited<ReturnType<typeof listProfessionalOptions>>[number];

export async function getProfessionalProfile(actor: SessionUser, professionalId: string) {
  assertCan(actor, "professionals.view");
  assertProfessionalAccess(actor, professionalId, "professionals.view_all");

  const professional = await db.query.professionals.findFirst({
    where: eq(professionals.id, professionalId),
    with: {
      specialties: { with: { category: true } },
      services: { with: { service: { columns: { id: true, name: true, priceCents: true, durationMinutes: true } } } },
      schedules: { orderBy: asc(professionalSchedules.weekday) },
    },
  });
  if (!professional) throw new NotFoundError("Profissional não encontrada.");

  const today = todayKey();
  const { start: monthStart } = dayRange(startOfMonth(today));
  const { start: todayStart, end: todayEnd } = dayRange(today);

  const [production] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${commissions.baseCents}),0)::int`,
      commission: sql<number>`coalesce(sum(${commissions.amountCents}),0)::int`,
      pending: sql<number>`coalesce(sum(${commissions.amountCents}) filter (where ${commissions.status} = 'PENDING'),0)::int`,
      services: sql<number>`count(*)::int`,
    })
    .from(commissions)
    .where(and(eq(commissions.professionalId, professionalId), gte(commissions.createdAt, monthStart)));

  const topServices = await db
    .select({
      name: services.name,
      count: sql<number>`sum(${attendanceItems.quantity})::int`,
      revenue: sql<number>`coalesce(sum(${commissions.baseCents}),0)::int`,
    })
    .from(commissions)
    .innerJoin(attendanceItems, eq(attendanceItems.id, commissions.attendanceItemId))
    .innerJoin(services, eq(services.id, commissions.serviceId))
    .where(and(eq(commissions.professionalId, professionalId), gte(commissions.createdAt, monthStart)))
    .groupBy(services.name)
    .orderBy(desc(sql`count(*)`))
    .limit(6);

  const todayAppointments = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      serviceName: services.name,
      clientName: sql<string>`(select name from clients c where c.id = ${appointments.clientId})`,
    })
    .from(appointments)
    .innerJoin(services, eq(services.id, appointments.serviceId))
    .where(
      and(
        eq(appointments.professionalId, professionalId),
        gte(appointments.startsAt, todayStart),
        lt(appointments.startsAt, todayEnd),
        sql`${appointments.status} <> 'CANCELLED'`,
      ),
    )
    .orderBy(asc(appointments.startsAt));

  const [{ attendancesMonth }] = await db
    .select({ attendancesMonth: sql<number>`count(distinct ${commissions.attendanceId})::int` })
    .from(commissions)
    .where(and(eq(commissions.professionalId, professionalId), gte(commissions.createdAt, monthStart)));

  return {
    professional,
    month: { ...production, attendances: attendancesMonth },
    topServices,
    todayAppointments,
    canManage: can(actor, "professionals.manage"),
    canSeeCommissions: can(actor, "commissions.view") || actor.professionalId === professionalId,
  };
}

export async function saveProfessional(actor: SessionUser, professionalId: string | null, input: z.output<typeof professionalInput>) {
  assertCan(actor, "professionals.manage");
  return db.transaction(async (tx) => {
    const data = {
      name: input.name,
      title: input.title,
      photoUrl: input.photoUrl,
      phone: input.phone,
      color: input.color,
      defaultCommissionRate: input.defaultCommissionRate,
    };
    let id = professionalId;
    if (id) {
      const [updated] = await tx.update(professionals).set(data).where(eq(professionals.id, id)).returning({ id: professionals.id });
      if (!updated) throw new NotFoundError("Profissional não encontrada.");
    } else {
      const [created] = await tx.insert(professionals).values(data).returning({ id: professionals.id });
      id = created.id;
    }

    await tx.delete(professionalSpecialties).where(eq(professionalSpecialties.professionalId, id));
    if (input.categoryIds.length) {
      await tx.insert(professionalSpecialties).values(input.categoryIds.map((categoryId) => ({ professionalId: id!, categoryId })));
    }
    await tx.delete(professionalServices).where(eq(professionalServices.professionalId, id));
    if (input.serviceIds.length) {
      await tx.insert(professionalServices).values(input.serviceIds.map((serviceId) => ({ professionalId: id!, serviceId })));
    }
    await tx.delete(professionalSchedules).where(eq(professionalSchedules.professionalId, id));
    if (input.schedule.length) {
      await tx.insert(professionalSchedules).values(input.schedule.map((d) => ({ ...d, professionalId: id! })));
    }

    await audit({ userId: actor.id, action: professionalId ? "update" : "create", entity: "professional", entityId: id }, tx);
    return { id };
  });
}

export async function setProfessionalActive(actor: SessionUser, professionalId: string, isActive: boolean) {
  assertCan(actor, "professionals.manage");
  const [updated] = await db
    .update(professionals)
    .set({ isActive })
    .where(eq(professionals.id, professionalId))
    .returning({ id: professionals.id });
  if (!updated) throw new NotFoundError("Profissional não encontrada.");
  await audit({ userId: actor.id, action: isActive ? "activate" : "deactivate", entity: "professional", entityId: professionalId });
}

export async function listCategories() {
  return db.select().from(serviceCategories).orderBy(asc(serviceCategories.sortOrder));
}
