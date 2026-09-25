import "server-only";
import { and, asc, desc, eq, gt, gte, inArray, lt, sql } from "drizzle-orm";
import type { z } from "zod";
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_TRANSITIONS, EDITABLE_APPOINTMENT_STATUSES, type AppointmentStatus } from "@/config/domain";
import { db, type Tx } from "@/db";
import {
  appointments,
  attendances,
  clients,
  professionalServices,
  professionals,
  scheduleBlocks,
  serviceCategories,
  services,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { assertCan, type SessionUser } from "@/lib/auth/session";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import type { appointmentInput, availabilityQuery, rescheduleInput, scheduleBlockInput } from "@/schemas/appointment";
import { dayRange, todayKey } from "@/utils/dates";
import { computeSlots, toInstant, validateInterval } from "./availability";
import { assertProfessionalAccess, ownProfessionalScope } from "./scope";

export const appointmentSelect = {
  id: appointments.id,
  startsAt: appointments.startsAt,
  endsAt: appointments.endsAt,
  durationMinutes: appointments.durationMinutes,
  priceCents: appointments.priceCents,
  status: appointments.status,
  notes: appointments.notes,
  source: appointments.source,
  cancelReason: appointments.cancelReason,
  clientId: clients.id,
  clientName: clients.name,
  clientPhone: clients.phone,
  clientWhatsapp: clients.whatsapp,
  professionalId: professionals.id,
  professionalName: professionals.name,
  professionalColor: professionals.color,
  serviceId: services.id,
  serviceName: services.name,
  categoryName: serviceCategories.name,
  attendanceId: attendances.id,
  attendanceStatus: attendances.status,
};

function baseAppointmentQuery() {
  return db
    .select(appointmentSelect)
    .from(appointments)
    .innerJoin(clients, eq(clients.id, appointments.clientId))
    .innerJoin(professionals, eq(professionals.id, appointments.professionalId))
    .innerJoin(services, eq(services.id, appointments.serviceId))
    .innerJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
    .leftJoin(attendances, eq(attendances.appointmentId, appointments.id));
}

export type AppointmentView = Awaited<ReturnType<typeof listAppointments>>[number];

/** Agendamentos de um período (dias civis, fim inclusivo), respeitando o escopo do perfil. */
export async function listAppointments(
  actor: SessionUser,
  params: { from: string; to?: string; professionalId?: string | null; includeCancelled?: boolean },
) {
  assertCan(actor, "appointments.view");
  const scope = ownProfessionalScope(actor, "appointments.view_all");
  const { start, end } = dayRange(params.from, params.to ?? params.from);
  const filters = [gte(appointments.startsAt, start), lt(appointments.startsAt, end)];
  const professionalId = scope ?? params.professionalId;
  if (professionalId) filters.push(eq(appointments.professionalId, professionalId));
  if (!params.includeCancelled) filters.push(sql`${appointments.status} not in ('CANCELLED')`);
  return baseAppointmentQuery()
    .where(and(...filters))
    .orderBy(asc(appointments.startsAt));
}

export async function getAppointment(actor: SessionUser, appointmentId: string) {
  assertCan(actor, "appointments.view");
  const [row] = await baseAppointmentQuery().where(eq(appointments.id, appointmentId)).limit(1);
  if (!row) throw new NotFoundError("Agendamento não encontrado.");
  assertProfessionalAccess(actor, row.professionalId, "appointments.view_all");
  return row;
}

/** Horários livres para o formulário de agendamento. */
export async function getAvailability(actor: SessionUser, query: z.output<typeof availabilityQuery>) {
  assertCan(actor, "appointments.create", "appointments.edit");
  const [service] = await db
    .select({ durationMinutes: services.durationMinutes })
    .from(services)
    .where(eq(services.id, query.serviceId))
    .limit(1);
  if (!service) throw new NotFoundError("Serviço não encontrado.");
  return computeSlots(query.professionalId, query.date, query.durationMinutes ?? service.durationMinutes, {
    excludeAppointmentId: query.excludeAppointmentId,
  });
}

/** Carrega e valida cliente/serviço/profissional para um agendamento. */
async function resolveBookingRefs(tx: Tx, input: { clientId: string; serviceId: string; professionalId: string }) {
  // Trava a linha da profissional: serializa agendamentos concorrentes para a mesma agenda.
  const [professional] = await tx
    .select({ id: professionals.id, isActive: professionals.isActive, name: professionals.name })
    .from(professionals)
    .where(eq(professionals.id, input.professionalId))
    .for("update")
    .limit(1);
  if (!professional?.isActive) throw new ValidationError("Profissional inativa ou inexistente.");

  const [client] = await tx
    .select({ id: clients.id, isActive: clients.isActive })
    .from(clients)
    .where(eq(clients.id, input.clientId))
    .limit(1);
  if (!client?.isActive) throw new ValidationError("Cliente inativa ou inexistente.");

  const [service] = await tx.select().from(services).where(eq(services.id, input.serviceId)).limit(1);
  if (!service?.isActive) throw new ValidationError("Serviço inativo ou inexistente.");

  const [enabled] = await tx
    .select({ serviceId: professionalServices.serviceId })
    .from(professionalServices)
    .where(and(eq(professionalServices.professionalId, input.professionalId), eq(professionalServices.serviceId, input.serviceId)))
    .limit(1);
  if (!enabled) throw new ValidationError(`${professional.name} não está habilitada para este serviço.`);

  return { professional, client, service };
}

export async function createAppointment(actor: SessionUser, input: z.output<typeof appointmentInput>) {
  assertCan(actor, "appointments.create");
  if (input.date < todayKey()) throw new ValidationError("Não é possível agendar em data passada.");

  return db.transaction(async (tx) => {
    const { service } = await resolveBookingRefs(tx, input);
    const duration = input.durationMinutes ?? service.durationMinutes;
    const startsAt = toInstant(input.date, input.time);
    const endsAt = new Date(startsAt.getTime() + duration * 60_000);
    if (startsAt.getTime() < Date.now() - 5 * 60_000) throw new ValidationError("Este horário já passou.");

    const problem = await validateInterval({ professionalId: input.professionalId, startsAt, endsAt }, tx);
    if (problem) throw new ConflictError(problem);

    const [created] = await tx
      .insert(appointments)
      .values({
        clientId: input.clientId,
        serviceId: input.serviceId,
        professionalId: input.professionalId,
        startsAt,
        endsAt,
        durationMinutes: duration,
        priceCents: input.priceCents ?? service.priceCents,
        notes: input.notes,
        createdById: actor.id,
      })
      .returning({ id: appointments.id });

    await audit({ userId: actor.id, action: "create", entity: "appointment", entityId: created.id }, tx);
    return created;
  });
}

export async function rescheduleAppointment(actor: SessionUser, input: z.output<typeof rescheduleInput>) {
  assertCan(actor, "appointments.edit");
  if (input.date < todayKey()) throw new ValidationError("Não é possível remarcar para data passada.");

  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(appointments).where(eq(appointments.id, input.appointmentId)).for("update").limit(1);
    if (!current) throw new NotFoundError("Agendamento não encontrado.");
    if (!EDITABLE_APPOINTMENT_STATUSES.includes(current.status)) {
      throw new ValidationError(`Agendamento "${APPOINTMENT_STATUS_LABELS[current.status]}" não pode ser remarcado.`);
    }

    const { service } = await resolveBookingRefs(tx, input);
    const serviceChanged = current.serviceId !== input.serviceId;
    const duration = input.durationMinutes ?? (serviceChanged ? service.durationMinutes : current.durationMinutes);
    const startsAt = toInstant(input.date, input.time);
    const endsAt = new Date(startsAt.getTime() + duration * 60_000);
    if (startsAt.getTime() < Date.now() - 5 * 60_000) throw new ValidationError("Este horário já passou.");

    const problem = await validateInterval(
      { professionalId: input.professionalId, startsAt, endsAt, excludeAppointmentId: current.id },
      tx,
    );
    if (problem) throw new ConflictError(problem);

    await tx
      .update(appointments)
      .set({
        clientId: input.clientId,
        serviceId: input.serviceId,
        professionalId: input.professionalId,
        startsAt,
        endsAt,
        durationMinutes: duration,
        priceCents: input.priceCents ?? (serviceChanged ? service.priceCents : current.priceCents),
        notes: input.notes,
      })
      .where(eq(appointments.id, current.id));

    await audit(
      {
        userId: actor.id,
        action: "appointment_reschedule",
        entity: "appointment",
        entityId: current.id,
        metadata: { from: current.startsAt.toISOString(), to: startsAt.toISOString() },
      },
      tx,
    );
    return { id: current.id };
  });
}

/** Transições manuais: confirmar, chegou, cancelar, não compareceu, voltar para agendado. */
export async function changeAppointmentStatus(
  actor: SessionUser,
  input: { appointmentId: string; status: AppointmentStatus; reason?: string | null },
) {
  assertCan(actor, input.status === "CANCELLED" ? "appointments.cancel" : "appointments.status");

  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(appointments).where(eq(appointments.id, input.appointmentId)).for("update").limit(1);
    if (!current) throw new NotFoundError("Agendamento não encontrado.");

    const allowed = APPOINTMENT_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(input.status)) {
      throw new ValidationError(
        `Não é possível mudar de "${APPOINTMENT_STATUS_LABELS[current.status]}" para "${APPOINTMENT_STATUS_LABELS[input.status]}".`,
      );
    }
    if (input.status === "CANCELLED" && !input.reason) throw new ValidationError("Informe o motivo do cancelamento.");

    const now = new Date();
    const patch: Partial<typeof appointments.$inferInsert> = { status: input.status };
    if (input.status === "CONFIRMED") patch.confirmedAt = current.confirmedAt ?? now;
    if (input.status === "ARRIVED") patch.arrivedAt = now;
    if (input.status === "CANCELLED") {
      patch.cancelledAt = now;
      patch.cancelReason = input.reason;
    }
    if (input.status === "NO_SHOW" && current.startsAt > now) {
      throw new ValidationError("Só é possível marcar falta após o horário do agendamento.");
    }

    await tx.update(appointments).set(patch).where(eq(appointments.id, current.id));
    await audit(
      {
        userId: actor.id,
        action: input.status === "CANCELLED" ? "appointment_cancel" : "appointment_status",
        entity: "appointment",
        entityId: current.id,
        metadata: { from: current.status, to: input.status, reason: input.reason ?? undefined },
      },
      tx,
    );
    return { id: current.id, status: input.status };
  });
}

/* ─── Bloqueios de agenda ─── */

export async function listScheduleBlocks(actor: SessionUser, params: { from: string; to?: string }) {
  assertCan(actor, "appointments.view");
  const scope = ownProfessionalScope(actor, "appointments.view_all");
  const { start, end } = dayRange(params.from, params.to ?? params.from);
  const rows = await db
    .select({
      id: scheduleBlocks.id,
      professionalId: scheduleBlocks.professionalId,
      professionalName: professionals.name,
      startsAt: scheduleBlocks.startsAt,
      endsAt: scheduleBlocks.endsAt,
      reason: scheduleBlocks.reason,
    })
    .from(scheduleBlocks)
    .leftJoin(professionals, eq(professionals.id, scheduleBlocks.professionalId))
    .where(and(lt(scheduleBlocks.startsAt, end), gt(scheduleBlocks.endsAt, start)))
    .orderBy(asc(scheduleBlocks.startsAt));
  return scope ? rows.filter((r) => r.professionalId === null || r.professionalId === scope) : rows;
}

export async function createScheduleBlock(actor: SessionUser, input: z.output<typeof scheduleBlockInput>) {
  assertCan(actor, "schedule_blocks.manage");
  const startsAt = toInstant(input.date, input.startTime);
  const endsAt = toInstant(input.date, input.endTime);
  const [created] = await db
    .insert(scheduleBlocks)
    .values({ professionalId: input.professionalId, startsAt, endsAt, reason: input.reason, createdById: actor.id })
    .returning({ id: scheduleBlocks.id });
  await audit({ userId: actor.id, action: "create", entity: "schedule_block", entityId: created.id });
  return created;
}

export async function deleteScheduleBlock(actor: SessionUser, blockId: string) {
  assertCan(actor, "schedule_blocks.manage");
  const [deleted] = await db.delete(scheduleBlocks).where(eq(scheduleBlocks.id, blockId)).returning({ id: scheduleBlocks.id });
  if (!deleted) throw new NotFoundError("Bloqueio não encontrado.");
  await audit({ userId: actor.id, action: "delete", entity: "schedule_block", entityId: blockId });
}

/** Próximos agendamentos da cliente (perfil). */
export async function listClientUpcoming(actor: SessionUser, clientId: string) {
  assertCan(actor, "appointments.view");
  const scope = ownProfessionalScope(actor, "appointments.view_all");
  const filters = [
    eq(appointments.clientId, clientId),
    gte(appointments.startsAt, dayRange(todayKey()).start),
    inArray(appointments.status, ["SCHEDULED", "CONFIRMED", "ARRIVED", "IN_SERVICE"] as AppointmentStatus[]),
  ];
  if (scope) filters.push(eq(appointments.professionalId, scope));
  return baseAppointmentQuery()
    .where(and(...filters))
    .orderBy(asc(appointments.startsAt))
    .limit(10);
}

export async function listRecentCancellations(actor: SessionUser, limit = 5) {
  assertCan(actor, "appointments.view_all");
  const { start } = dayRange(todayKey());
  return baseAppointmentQuery()
    .where(and(eq(appointments.status, "CANCELLED"), gte(appointments.cancelledAt, start)))
    .orderBy(desc(appointments.cancelledAt))
    .limit(limit);
}

/** Fila da recepção: clientes que chegaram ou confirmadas para a próxima hora. */
export async function listReceptionQueue(actor: SessionUser) {
  const today = await listAppointments(actor, { from: todayKey() });
  const limit = Date.now() + 60 * 60_000;
  return today.filter((a) => a.status === "ARRIVED" || (a.status === "CONFIRMED" && a.startsAt.getTime() < limit));
}
