import "server-only";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { APP_TIMEZONE } from "@/config/app";
import type { PaymentMethod } from "@/config/domain";
import { db } from "@/db";
import { attendanceItems, cashTransactions, commissions, payments, serviceCategories, services } from "@/db/schema";
import { assertCan, type SessionUser } from "@/lib/auth/session";
import { addDays, dayRange } from "@/utils/dates";
import type { ResolvedPeriod } from "@/utils/period";

/** Série diária de faturamento (dias sem venda aparecem com zero). */
export async function revenueByDay(from: string, to: string) {
  const { start, end } = dayRange(from, to);
  const rows = await db
    .select({
      day: sql<string>`to_char(${payments.paidAt} at time zone ${APP_TIMEZONE}, 'YYYY-MM-DD')`,
      revenue: sql<number>`sum(${payments.amountCents})::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(payments)
    .where(and(gte(payments.paidAt, start), lt(payments.paidAt, end)))
    .groupBy(sql`1`);
  const map = new Map(rows.map((r) => [r.day, r]));
  const series: { date: string; revenueCents: number; count: number }[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const r = map.get(d);
    series.push({ date: d, revenueCents: r?.revenue ?? 0, count: r?.count ?? 0 });
  }
  return series;
}

export async function getFinanceOverview(actor: SessionUser, period: ResolvedPeriod) {
  assertCan(actor, "finance.view");
  const { start, end } = dayRange(period.from, period.to);
  const paidInPeriod = and(gte(payments.paidAt, start), lt(payments.paidAt, end));

  const [[revenue], [expenses], [commission], byDay, byMethod, byService, recentExpenses] = await Promise.all([
    db
      .select({
        totalCents: sql<number>`coalesce(sum(${payments.amountCents}),0)::int`,
        discountCents: sql<number>`coalesce(sum(${payments.discountCents}),0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(payments)
      .where(paidInPeriod),
    db
      .select({ totalCents: sql<number>`coalesce(sum(${cashTransactions.amountCents}),0)::int` })
      .from(cashTransactions)
      .where(and(eq(cashTransactions.type, "EXPENSE"), gte(cashTransactions.createdAt, start), lt(cashTransactions.createdAt, end))),
    db
      .select({ totalCents: sql<number>`coalesce(sum(${commissions.amountCents}),0)::int` })
      .from(commissions)
      .where(and(gte(commissions.createdAt, start), lt(commissions.createdAt, end))),
    revenueByDay(period.from, period.to),
    db
      .select({ method: payments.method, totalCents: sql<number>`sum(${payments.amountCents})::int`, count: sql<number>`count(*)::int` })
      .from(payments)
      .where(paidInPeriod)
      .groupBy(payments.method)
      .orderBy(desc(sql`sum(${payments.amountCents})`)),
    db
      .select({
        name: services.name,
        category: serviceCategories.name,
        totalCents: sql<number>`sum(coalesce(${attendanceItems.netCents}, ${attendanceItems.totalCents}))::int`,
        count: sql<number>`sum(${attendanceItems.quantity})::int`,
      })
      .from(attendanceItems)
      .innerJoin(payments, eq(payments.attendanceId, attendanceItems.attendanceId))
      .innerJoin(services, eq(services.id, attendanceItems.serviceId))
      .innerJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
      .where(paidInPeriod)
      .groupBy(services.name, serviceCategories.name)
      .orderBy(desc(sql`sum(coalesce(${attendanceItems.netCents}, ${attendanceItems.totalCents}))`))
      .limit(10),
    db
      .select({
        id: cashTransactions.id,
        description: cashTransactions.description,
        amountCents: cashTransactions.amountCents,
        method: cashTransactions.method,
        createdAt: cashTransactions.createdAt,
      })
      .from(cashTransactions)
      .where(and(eq(cashTransactions.type, "EXPENSE"), gte(cashTransactions.createdAt, start), lt(cashTransactions.createdAt, end)))
      .orderBy(desc(cashTransactions.createdAt))
      .limit(8),
  ]);

  return {
    revenueCents: revenue.totalCents,
    discountCents: revenue.discountCents,
    paymentsCount: revenue.count,
    averageTicketCents: revenue.count ? Math.round(revenue.totalCents / revenue.count) : 0,
    expensesCents: expenses.totalCents,
    commissionsCents: commission.totalCents,
    resultCents: revenue.totalCents - expenses.totalCents - commission.totalCents,
    byDay,
    byMethod: byMethod as { method: PaymentMethod; totalCents: number; count: number }[],
    byService,
    recentExpenses,
  };
}
