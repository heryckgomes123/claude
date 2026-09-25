import "server-only";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import { appointments, attendanceItems, attendances, clients, payments, professionals, services } from "@/db/schema";
import { audit } from "@/lib/audit";
import { assertCan, can, type SessionUser } from "@/lib/auth/session";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { clientInput } from "@/schemas/client";
import { onlyDigits } from "@/utils/phone";
import { escapeLike } from "@/utils/text";
import { ownProfessionalScope } from "./scope";

/** Filtro de busca por nome, telefone ou WhatsApp. */
function searchFilter(q: string): SQL | undefined {
  const term = q.trim();
  if (!term) return undefined;
  const digits = onlyDigits(term);
  const conditions: SQL[] = [ilike(clients.name, `%${escapeLike(term)}%`)];
  if (digits.length >= 3) {
    conditions.push(sql`${clients.phone} like ${`%${digits}%`}`, sql`${clients.whatsapp} like ${`%${digits}%`}`);
  }
  return or(...conditions);
}

/** Profissional só enxerga clientes que já atendeu ou tem agendadas com ela. */
function professionalClientFilter(professionalId: string): SQL {
  return sql`exists (select 1 from ${appointments} a where a.client_id = ${clients.id} and a.professional_id = ${professionalId})`;
}

export async function listClients(
  actor: SessionUser,
  params: { q?: string; status?: "active" | "inactive" | "all"; page?: number; pageSize?: number },
) {
  assertCan(actor, "clients.view");
  const scope = ownProfessionalScope(actor, "clients.view_all");
  const pageSize = Math.min(params.pageSize ?? 30, 100);
  const page = Math.max(params.page ?? 1, 1);

  const filters: SQL[] = [];
  const search = params.q ? searchFilter(params.q) : undefined;
  if (search) filters.push(search);
  if (params.status !== "all") filters.push(eq(clients.isActive, params.status !== "inactive"));
  if (scope) filters.push(professionalClientFilter(scope));
  const where = filters.length ? and(...filters) : undefined;

  const orderBy = params.q ? [sql`similarity(${clients.name}, ${params.q}) desc`, asc(clients.name)] : [asc(clients.name)];

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: clients.id,
        name: clients.name,
        phone: clients.phone,
        whatsapp: clients.whatsapp,
        email: clients.email,
        birthDate: clients.birthDate,
        isActive: clients.isActive,
        createdAt: clients.createdAt,
        lastVisitAt: sql<Date | null>`(select max(p.paid_at) from ${payments} p where p.client_id = ${clients.id})`.mapWith((v) =>
          v ? new Date(v) : null,
        ),
        visits: sql<number>`(select count(*)::int from ${payments} p where p.client_id = ${clients.id})`,
      })
      .from(clients)
      .where(where)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(clients)
      .where(where),
  ]);
  return { rows, total, page, pageSize };
}

/** Busca rápida (combobox / Ctrl+K). */
export async function quickSearchClients(actor: SessionUser, q: string, limit = 8) {
  assertCan(actor, "clients.view");
  const scope = ownProfessionalScope(actor, "clients.view_all");
  const filters: SQL[] = [eq(clients.isActive, true)];
  const search = searchFilter(q);
  if (search) filters.push(search);
  if (scope) filters.push(professionalClientFilter(scope));
  return db
    .select({ id: clients.id, name: clients.name, phone: clients.phone, whatsapp: clients.whatsapp })
    .from(clients)
    .where(and(...filters))
    .orderBy(q.trim() ? sql`similarity(${clients.name}, ${q}) desc` : asc(clients.name), asc(clients.name))
    .limit(limit);
}

export async function getClientProfile(actor: SessionUser, clientId: string) {
  assertCan(actor, "clients.view");
  const scope = ownProfessionalScope(actor, "clients.view_all");
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client) throw new NotFoundError("Cliente não encontrada.");
  if (scope) {
    const [link] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(and(eq(appointments.clientId, clientId), eq(appointments.professionalId, scope)))
      .limit(1);
    if (!link) throw new ForbiddenError("Esta cliente não está na sua carteira.");
  }

  const statsFilter = scope
    ? and(
        eq(payments.clientId, clientId),
        sql`exists (select 1 from ${attendances} at where at.id = ${payments.attendanceId} and at.professional_id = ${scope})`,
      )
    : eq(payments.clientId, clientId);

  const [stats] = await db
    .select({
      visits: sql<number>`count(*)::int`,
      totalSpent: sql<number>`coalesce(sum(${payments.amountCents}),0)::int`,
      lastVisit: sql<string | null>`max(${payments.paidAt})`,
    })
    .from(payments)
    .where(statsFilter);

  // Histórico por serviço realizado (atendimentos) + agendamentos cancelados/faltas.
  const historyFilters: SQL[] = [eq(appointments.clientId, clientId)];
  if (scope) historyFilters.push(eq(appointments.professionalId, scope));
  const history = await db
    .select({
      appointmentId: appointments.id,
      attendanceId: attendances.id,
      date: appointments.startsAt,
      status: appointments.status,
      professionalName: professionals.name,
      services: sql<string>`coalesce((select string_agg(s.name, ' + ' order by ai.created_at) from ${attendanceItems} ai join ${services} s on s.id = ai.service_id where ai.attendance_id = ${attendances.id}), ${services.name})`,
      valueCents: sql<number>`coalesce(${payments.amountCents}, ${attendances.totalCents}, ${appointments.priceCents})::int`,
      paid: sql<boolean>`${payments.id} is not null`,
    })
    .from(appointments)
    .innerJoin(professionals, eq(professionals.id, appointments.professionalId))
    .innerJoin(services, eq(services.id, appointments.serviceId))
    .leftJoin(attendances, eq(attendances.appointmentId, appointments.id))
    .leftJoin(payments, eq(payments.attendanceId, attendances.id))
    .where(and(...historyFilters))
    .orderBy(desc(appointments.startsAt))
    .limit(100);

  return {
    client,
    stats: {
      visits: stats.visits,
      totalSpentCents: stats.totalSpent,
      averageTicketCents: stats.visits ? Math.round(stats.totalSpent / stats.visits) : 0,
      lastVisitAt: stats.lastVisit ? new Date(stats.lastVisit) : null,
    },
    history,
    canEdit: can(actor, "clients.edit"),
  };
}

export async function createClient(actor: SessionUser, input: z.output<typeof clientInput>) {
  assertCan(actor, "clients.create");
  const [created] = await db
    .insert(clients)
    .values({ ...input, whatsapp: input.whatsapp ?? input.phone })
    .returning({ id: clients.id, name: clients.name, phone: clients.phone, whatsapp: clients.whatsapp });
  await audit({ userId: actor.id, action: "create", entity: "client", entityId: created.id });
  return created;
}

export async function updateClient(actor: SessionUser, clientId: string, input: z.output<typeof clientInput>) {
  assertCan(actor, "clients.edit");
  const [updated] = await db.update(clients).set(input).where(eq(clients.id, clientId)).returning({ id: clients.id });
  if (!updated) throw new NotFoundError("Cliente não encontrada.");
  await audit({ userId: actor.id, action: "update", entity: "client", entityId: clientId });
  return updated;
}

export async function setClientActive(actor: SessionUser, clientId: string, isActive: boolean) {
  assertCan(actor, "clients.deactivate");
  const [updated] = await db.update(clients).set({ isActive }).where(eq(clients.id, clientId)).returning({ id: clients.id });
  if (!updated) throw new NotFoundError("Cliente não encontrada.");
  await audit({ userId: actor.id, action: isActive ? "activate" : "deactivate", entity: "client", entityId: clientId });
}

/** Aniversariantes do mês (base para CRM futuro). */
export async function birthdaysThisMonth(actor: SessionUser, month: number) {
  assertCan(actor, "clients.view_all");
  return db
    .select({ id: clients.id, name: clients.name, birthDate: clients.birthDate })
    .from(clients)
    .where(and(eq(clients.isActive, true), sql`extract(month from ${clients.birthDate}) = ${month}`))
    .orderBy(sql`extract(day from ${clients.birthDate})`)
    .limit(20);
}
