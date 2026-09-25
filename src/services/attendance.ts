import "server-only";
import { and, asc, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import type { z } from "zod";
import type { AttendanceStatus } from "@/config/domain";
import { db, type Tx } from "@/db";
import { appointments, attendanceItems, attendances, clients, payments, professionalServices, professionals, services } from "@/db/schema";
import { audit } from "@/lib/audit";
import { assertCan, type SessionUser } from "@/lib/auth/session";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import type { addItemInput, updateItemInput, walkInInput } from "@/schemas/attendance";
import { dayRange, todayKey } from "@/utils/dates";
import { validateInterval } from "./availability";
import { assertProfessionalAccess, ownProfessionalScope } from "./scope";

/* ─── Leitura ─── */

export async function getAttendance(actor: SessionUser, attendanceId: string) {
  assertCan(actor, "attendance.view");
  const row = await db.query.attendances.findFirst({
    where: eq(attendances.id, attendanceId),
    with: {
      client: { columns: { id: true, name: true, phone: true, whatsapp: true, notes: true } },
      professional: { columns: { id: true, name: true, color: true } },
      appointment: { columns: { id: true, startsAt: true, endsAt: true, notes: true, status: true } },
      items: {
        orderBy: asc(attendanceItems.createdAt),
        with: {
          service: { columns: { id: true, name: true, durationMinutes: true } },
          professional: { columns: { id: true, name: true } },
        },
      },
      payment: { with: { receivedBy: { columns: { name: true } } } },
      commissions: true,
    },
  });
  if (!row) throw new NotFoundError("Atendimento não encontrado.");
  const involvesActor = row.professionalId === actor.professionalId || row.items.some((i) => i.professionalId === actor.professionalId);
  if (!involvesActor) assertProfessionalAccess(actor, row.professionalId, "attendance.view_all");
  return row;
}

export type AttendanceDetail = Awaited<ReturnType<typeof getAttendance>>;

/** Fila de atendimento: em andamento, aguardando pagamento e finalizados de hoje. */
export async function listAttendanceBoard(actor: SessionUser) {
  assertCan(actor, "attendance.view");
  const scope = ownProfessionalScope(actor, "attendance.view_all");
  const { start } = dayRange(todayKey());
  const filters = [
    or(inArray(attendances.status, ["IN_PROGRESS", "AWAITING_PAYMENT"] as AttendanceStatus[]), gte(attendances.startedAt, start))!,
  ];
  if (scope) filters.push(eq(attendances.professionalId, scope));
  return db
    .select({
      id: attendances.id,
      status: attendances.status,
      startedAt: attendances.startedAt,
      finishedAt: attendances.finishedAt,
      totalCents: attendances.totalCents,
      clientId: clients.id,
      clientName: clients.name,
      professionalName: professionals.name,
      professionalColor: professionals.color,
      services: sql<string>`(select string_agg(s.name, ' + ' order by ai.created_at) from ${attendanceItems} ai join ${services} s on s.id = ai.service_id where ai.attendance_id = ${attendances.id})`,
      paymentMethod: payments.method,
    })
    .from(attendances)
    .innerJoin(clients, eq(clients.id, attendances.clientId))
    .innerJoin(professionals, eq(professionals.id, attendances.professionalId))
    .leftJoin(payments, eq(payments.attendanceId, attendances.id))
    .where(and(...filters))
    .orderBy(desc(attendances.startedAt))
    .limit(100);
}

/* ─── Helpers internos ─── */

async function lockAttendance(tx: Tx, attendanceId: string) {
  const [row] = await tx.select().from(attendances).where(eq(attendances.id, attendanceId)).for("update").limit(1);
  if (!row) throw new NotFoundError("Atendimento não encontrado.");
  return row;
}

function assertStatus(current: AttendanceStatus, allowed: AttendanceStatus[], message: string) {
  if (!allowed.includes(current)) throw new ValidationError(message);
}

/** Recalcula subtotal/total a partir dos itens (fonte da verdade = banco). */
async function recomputeTotals(tx: Tx, attendanceId: string, discountCents?: number) {
  const [{ subtotal }] = await tx
    .select({ subtotal: sql<number>`coalesce(sum(${attendanceItems.totalCents}), 0)::int` })
    .from(attendanceItems)
    .where(eq(attendanceItems.attendanceId, attendanceId));
  const [current] = await tx.select({ discountCents: attendances.discountCents }).from(attendances).where(eq(attendances.id, attendanceId));
  const discount = Math.min(discountCents ?? current.discountCents, subtotal);
  await tx
    .update(attendances)
    .set({ subtotalCents: subtotal, discountCents: discount, totalCents: subtotal - discount })
    .where(eq(attendances.id, attendanceId));
}

async function resolveCommissionRate(tx: Tx, serviceId: string, professionalId: string) {
  const [row] = await tx
    .select({
      serviceRate: services.commissionRate,
      defaultRate: professionals.defaultCommissionRate,
      price: services.priceCents,
      isActive: services.isActive,
    })
    .from(services)
    .innerJoin(professionals, eq(professionals.id, professionalId))
    .where(eq(services.id, serviceId))
    .limit(1);
  if (!row) throw new NotFoundError("Serviço ou profissional não encontrado.");
  return { rate: row.serviceRate ?? row.defaultRate, price: row.price, isActive: row.isActive };
}

async function assertEnabled(tx: Tx, professionalId: string, serviceId: string) {
  const [row] = await tx
    .select({ ok: professionalServices.serviceId })
    .from(professionalServices)
    .where(and(eq(professionalServices.professionalId, professionalId), eq(professionalServices.serviceId, serviceId)))
    .limit(1);
  if (!row) throw new ValidationError("A profissional não está habilitada para este serviço.");
}

/* ─── Fluxo ─── */

/** Cliente chegou → iniciar atendimento a partir do agendamento. */
export async function startAttendance(actor: SessionUser, appointmentId: string) {
  assertCan(actor, "attendance.create");
  return db.transaction(async (tx) => {
    const [appt] = await tx.select().from(appointments).where(eq(appointments.id, appointmentId)).for("update").limit(1);
    if (!appt) throw new NotFoundError("Agendamento não encontrado.");
    assertProfessionalAccess(actor, appt.professionalId, "attendance.view_all");

    const [existing] = await tx.select({ id: attendances.id }).from(attendances).where(eq(attendances.appointmentId, appt.id)).limit(1);
    if (existing) return { id: existing.id };

    if (!["SCHEDULED", "CONFIRMED", "ARRIVED"].includes(appt.status)) {
      throw new ValidationError("Este agendamento não pode ser iniciado.");
    }

    const now = new Date();
    const { rate } = await resolveCommissionRate(tx, appt.serviceId, appt.professionalId);
    const [created] = await tx
      .insert(attendances)
      .values({
        appointmentId: appt.id,
        clientId: appt.clientId,
        professionalId: appt.professionalId,
        startedAt: now,
        createdById: actor.id,
        notes: appt.notes,
      })
      .returning({ id: attendances.id });

    await tx.insert(attendanceItems).values({
      attendanceId: created.id,
      serviceId: appt.serviceId,
      professionalId: appt.professionalId,
      quantity: 1,
      unitPriceCents: appt.priceCents,
      totalCents: appt.priceCents,
      commissionRate: rate,
    });
    await recomputeTotals(tx, created.id);
    await tx
      .update(appointments)
      .set({ status: "IN_SERVICE", arrivedAt: appt.arrivedAt ?? now })
      .where(eq(appointments.id, appt.id));

    await audit({ userId: actor.id, action: "attendance_start", entity: "attendance", entityId: created.id }, tx);
    return created;
  });
}

/** Atendimento sem agendamento prévio (encaixe): ocupa a agenda a partir de agora. */
export async function startWalkIn(actor: SessionUser, input: z.output<typeof walkInInput>) {
  assertCan(actor, "appointments.create");
  assertCan(actor, "attendance.create");
  const appointmentId = await db.transaction(async (tx) => {
    const [professional] = await tx
      .select({ isActive: professionals.isActive })
      .from(professionals)
      .where(eq(professionals.id, input.professionalId))
      .for("update")
      .limit(1);
    if (!professional?.isActive) throw new ValidationError("Profissional inativa ou inexistente.");
    const [client] = await tx.select({ isActive: clients.isActive }).from(clients).where(eq(clients.id, input.clientId)).limit(1);
    if (!client?.isActive) throw new ValidationError("Cliente inativa ou inexistente.");
    const [service] = await tx.select().from(services).where(eq(services.id, input.serviceId)).limit(1);
    if (!service?.isActive) throw new ValidationError("Serviço inativo ou inexistente.");
    await assertEnabled(tx, input.professionalId, input.serviceId);

    const startsAt = new Date(Math.floor(Date.now() / 60_000) * 60_000);
    const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
    const problem = await validateInterval({ professionalId: input.professionalId, startsAt, endsAt, enforceHours: false }, tx);
    if (problem) throw new ConflictError(problem);

    const [appt] = await tx
      .insert(appointments)
      .values({
        clientId: input.clientId,
        professionalId: input.professionalId,
        serviceId: input.serviceId,
        startsAt,
        endsAt,
        durationMinutes: service.durationMinutes,
        priceCents: service.priceCents,
        status: "ARRIVED",
        source: "WALK_IN",
        arrivedAt: startsAt,
        createdById: actor.id,
      })
      .returning({ id: appointments.id });
    await audit({ userId: actor.id, action: "create", entity: "appointment", entityId: appt.id, metadata: { walkIn: true } }, tx);
    return appt.id;
  });
  return startAttendance(actor, appointmentId);
}

async function loadEditable(tx: Tx, actor: SessionUser, attendanceId: string) {
  const att = await lockAttendance(tx, attendanceId);
  assertProfessionalAccess(actor, att.professionalId, "attendance.view_all");
  assertStatus(att.status, ["IN_PROGRESS"], "O atendimento não está em andamento. Reabra-o para editar.");
  return att;
}

export async function addAttendanceItem(actor: SessionUser, input: z.output<typeof addItemInput>) {
  assertCan(actor, "attendance.create");
  return db.transaction(async (tx) => {
    const att = await loadEditable(tx, actor, input.attendanceId);
    const professionalId = input.professionalId ?? att.professionalId;
    if (professionalId !== att.professionalId) assertProfessionalAccess(actor, professionalId, "attendance.view_all");
    await assertEnabled(tx, professionalId, input.serviceId);
    const { rate, price, isActive } = await resolveCommissionRate(tx, input.serviceId, professionalId);
    if (!isActive) throw new ValidationError("Serviço inativo.");
    await tx.insert(attendanceItems).values({
      attendanceId: att.id,
      serviceId: input.serviceId,
      professionalId,
      quantity: input.quantity,
      unitPriceCents: price,
      totalCents: price * input.quantity,
      commissionRate: rate,
    });
    await recomputeTotals(tx, att.id);
    await audit(
      { userId: actor.id, action: "update", entity: "attendance", entityId: att.id, metadata: { addService: input.serviceId } },
      tx,
    );
  });
}

async function lockItem(tx: Tx, itemId: string) {
  const [item] = await tx.select().from(attendanceItems).where(eq(attendanceItems.id, itemId)).limit(1);
  if (!item) throw new NotFoundError("Item não encontrado.");
  return item;
}

export async function updateAttendanceItem(actor: SessionUser, input: z.output<typeof updateItemInput>) {
  assertCan(actor, "attendance.create");
  return db.transaction(async (tx) => {
    const item = await lockItem(tx, input.itemId);
    await loadEditable(tx, actor, item.attendanceId);
    await tx
      .update(attendanceItems)
      .set({ quantity: input.quantity, totalCents: item.unitPriceCents * input.quantity })
      .where(eq(attendanceItems.id, item.id));
    await recomputeTotals(tx, item.attendanceId);
  });
}

export async function removeAttendanceItem(actor: SessionUser, itemId: string) {
  assertCan(actor, "attendance.create");
  return db.transaction(async (tx) => {
    const item = await lockItem(tx, itemId);
    await loadEditable(tx, actor, item.attendanceId);
    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(attendanceItems)
      .where(eq(attendanceItems.attendanceId, item.attendanceId));
    if (count <= 1) throw new ValidationError("O atendimento precisa de pelo menos um serviço.");
    await tx.delete(attendanceItems).where(eq(attendanceItems.id, item.id));
    await recomputeTotals(tx, item.attendanceId);
    await audit(
      { userId: actor.id, action: "update", entity: "attendance", entityId: item.attendanceId, metadata: { removeItem: item.id } },
      tx,
    );
  });
}

export async function setAttendanceDiscount(actor: SessionUser, attendanceId: string, discountCents: number) {
  assertCan(actor, "attendance.discount");
  return db.transaction(async (tx) => {
    const att = await lockAttendance(tx, attendanceId);
    assertStatus(att.status, ["IN_PROGRESS", "AWAITING_PAYMENT"], "Não é possível alterar o desconto deste atendimento.");
    if (discountCents > att.subtotalCents) throw new ValidationError("O desconto não pode ser maior que o subtotal.");
    await recomputeTotals(tx, att.id, discountCents);
    await audit({ userId: actor.id, action: "update", entity: "attendance", entityId: att.id, metadata: { discountCents } }, tx);
  });
}

export async function finishAttendance(actor: SessionUser, attendanceId: string) {
  assertCan(actor, "attendance.finish");
  return db.transaction(async (tx) => {
    const att = await lockAttendance(tx, attendanceId);
    assertProfessionalAccess(actor, att.professionalId, "attendance.view_all");
    assertStatus(att.status, ["IN_PROGRESS"], "Este atendimento não está em andamento.");
    await recomputeTotals(tx, att.id);
    await tx.update(attendances).set({ status: "AWAITING_PAYMENT", finishedAt: new Date() }).where(eq(attendances.id, att.id));
    await audit({ userId: actor.id, action: "attendance_finish", entity: "attendance", entityId: att.id }, tx);
  });
}

export async function reopenAttendance(actor: SessionUser, attendanceId: string) {
  assertCan(actor, "attendance.view_all");
  return db.transaction(async (tx) => {
    const att = await lockAttendance(tx, attendanceId);
    assertStatus(att.status, ["AWAITING_PAYMENT"], "Apenas atendimentos aguardando pagamento podem ser reabertos.");
    await tx.update(attendances).set({ status: "IN_PROGRESS", finishedAt: null }).where(eq(attendances.id, att.id));
    await audit({ userId: actor.id, action: "attendance_reopen", entity: "attendance", entityId: att.id }, tx);
  });
}

export async function countAwaitingPayment(actor: SessionUser) {
  assertCan(actor, "attendance.view");
  const scope = ownProfessionalScope(actor, "attendance.view_all");
  const filters = [inArray(attendances.status, ["AWAITING_PAYMENT"] as AttendanceStatus[])];
  if (scope) filters.push(eq(attendances.professionalId, scope));
  const [row] = await db
    .select({ count: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${attendances.totalCents}),0)::int` })
    .from(attendances)
    .where(and(...filters));
  return row;
}
