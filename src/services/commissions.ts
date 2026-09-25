import "server-only";
import { and, desc, eq, gte, inArray, lt, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { attendances, clients, commissions, professionals, services } from "@/db/schema";
import { audit } from "@/lib/audit";
import { assertCan, can, type SessionUser } from "@/lib/auth/session";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { dayRange } from "@/utils/dates";

type Filters = { from: string; to: string; professionalId?: string | null; status?: "PENDING" | "PAID" | null };

function scopeFor(actor: SessionUser): string | null {
  if (can(actor, "commissions.view")) return null;
  if (can(actor, "commissions.view_own") && actor.professionalId) return actor.professionalId;
  throw new ForbiddenError();
}

function buildWhere(actor: SessionUser, filters: Filters) {
  const scope = scopeFor(actor);
  const { start, end } = dayRange(filters.from, filters.to);
  const conditions: SQL[] = [gte(commissions.createdAt, start), lt(commissions.createdAt, end)];
  const professionalId = scope ?? filters.professionalId;
  if (professionalId) conditions.push(eq(commissions.professionalId, professionalId));
  if (filters.status) conditions.push(eq(commissions.status, filters.status));
  return and(...conditions);
}

export async function listCommissions(actor: SessionUser, filters: Filters) {
  const where = buildWhere(actor, filters);
  const [rows, byProfessional] = await Promise.all([
    db
      .select({
        id: commissions.id,
        createdAt: commissions.createdAt,
        baseCents: commissions.baseCents,
        rate: commissions.rate,
        amountCents: commissions.amountCents,
        status: commissions.status,
        paidAt: commissions.paidAt,
        attendanceId: commissions.attendanceId,
        professionalId: professionals.id,
        professionalName: professionals.name,
        professionalColor: professionals.color,
        serviceName: services.name,
        clientName: clients.name,
      })
      .from(commissions)
      .innerJoin(professionals, eq(professionals.id, commissions.professionalId))
      .innerJoin(services, eq(services.id, commissions.serviceId))
      .innerJoin(attendances, eq(attendances.id, commissions.attendanceId))
      .innerJoin(clients, eq(clients.id, attendances.clientId))
      .where(where)
      .orderBy(desc(commissions.createdAt))
      .limit(500),
    db
      .select({
        professionalId: professionals.id,
        professionalName: professionals.name,
        professionalColor: professionals.color,
        baseCents: sql<number>`coalesce(sum(${commissions.baseCents}),0)::int`,
        amountCents: sql<number>`coalesce(sum(${commissions.amountCents}),0)::int`,
        pendingCents: sql<number>`coalesce(sum(${commissions.amountCents}) filter (where ${commissions.status} = 'PENDING'),0)::int`,
        paidCents: sql<number>`coalesce(sum(${commissions.amountCents}) filter (where ${commissions.status} = 'PAID'),0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(commissions)
      .innerJoin(professionals, eq(professionals.id, commissions.professionalId))
      .where(where)
      .groupBy(professionals.id, professionals.name, professionals.color)
      .orderBy(desc(sql`sum(${commissions.amountCents})`)),
  ]);
  const totals = byProfessional.reduce(
    (acc, p) => ({
      baseCents: acc.baseCents + p.baseCents,
      amountCents: acc.amountCents + p.amountCents,
      pendingCents: acc.pendingCents + p.pendingCents,
      paidCents: acc.paidCents + p.paidCents,
    }),
    { baseCents: 0, amountCents: 0, pendingCents: 0, paidCents: 0 },
  );
  return { rows, byProfessional, totals };
}

/**
 * Fecha (marca como pagas) comissões pendentes. Ação explícita de OWNER/MANAGER.
 * Comissões pagas nunca são recalculadas.
 */
export async function markCommissionsPaid(actor: SessionUser, commissionIds: string[]) {
  assertCan(actor, "commissions.manage");
  if (commissionIds.length === 0) throw new ValidationError("Selecione ao menos uma comissão.");
  const updated = await db
    .update(commissions)
    .set({ status: "PAID", paidAt: new Date(), paidById: actor.id })
    .where(and(inArray(commissions.id, commissionIds), eq(commissions.status, "PENDING")))
    .returning({ id: commissions.id, amountCents: commissions.amountCents });
  if (updated.length === 0) throw new ValidationError("Nenhuma comissão pendente selecionada.");
  const total = updated.reduce((s, c) => s + c.amountCents, 0);
  await audit({
    userId: actor.id,
    action: "commission_paid",
    entity: "commission",
    metadata: { ids: updated.map((c) => c.id), totalCents: total },
  });
  return { count: updated.length, totalCents: total };
}
