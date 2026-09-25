import "server-only";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { commissions, payments, products, professionals } from "@/db/schema";
import { can, type SessionUser } from "@/lib/auth/session";
import { addDays, dayRange, minutesOfDay, minutesToTime, startOfMonth, todayKey } from "@/utils/dates";
import { listAppointments, listRecentCancellations, type AppointmentView } from "./appointments";
import { countAwaitingPayment } from "./attendance";
import { getBusyIntervals, getDayWindow } from "./availability";
import { getOpenRegisterStatus } from "./cash";
import { revenueByDay } from "./finance";

export type DashboardAlert = {
  id: string;
  tone: "info" | "warning" | "danger" | "success";
  title: string;
  description: string;
  href?: string;
};

type Interval = { start: number; end: number };

/** Subtrai intervalos ocupados de uma janela, retornando os blocos livres. */
function freeBlocks(window: Interval, busy: Interval[]): Interval[] {
  const sorted = busy
    .map((b) => ({ start: Math.max(b.start, window.start), end: Math.min(b.end, window.end) }))
    .filter((b) => b.start < b.end)
    .sort((a, b) => a.start - b.start);
  const free: Interval[] = [];
  let cursor = window.start;
  for (const b of sorted) {
    if (b.start > cursor) free.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < window.end) free.push({ start: cursor, end: window.end });
  return free;
}

/** Ocupação do dia e maiores janelas livres por profissional. */
async function dayCapacity(date: string, professionalIds: { id: string; name: string }[]) {
  let available = 0;
  let booked = 0;
  const freeFromNow: { name: string; start: number; end: number }[] = [];
  const nowMinute = date === todayKey() ? minutesOfDay(new Date()) : 0;

  await Promise.all(
    professionalIds.map(async (p) => {
      const { window } = await getDayWindow(p.id, date);
      if (!window) return;
      const busy = await getBusyIntervals(p.id, date);
      const appointmentsBusy = busy.filter((b) => b.label === "Agendamento");
      const blocksBusy = busy.filter((b) => b.label !== "Agendamento");
      const workable = freeBlocks(window, [...window.breaks, ...blocksBusy]);
      const workMinutes = workable.reduce((s, b) => s + (b.end - b.start), 0);
      const bookedMinutes = workable.reduce(
        (s, w) => s + appointmentsBusy.reduce((acc, a) => acc + Math.max(0, Math.min(a.end, w.end) - Math.max(a.start, w.start)), 0),
        0,
      );
      available += workMinutes;
      booked += bookedMinutes;

      const free = freeBlocks({ start: Math.max(window.start, nowMinute), end: window.end }, [...window.breaks, ...busy]);
      const largest = free.sort((a, b) => b.end - b.start - (a.end - a.start))[0];
      if (largest && largest.end - largest.start >= 90) freeFromNow.push({ name: p.name, ...largest });
    }),
  );
  return {
    occupancy: available > 0 ? Math.min(1, booked / available) : 0,
    availableMinutes: available,
    bookedMinutes: booked,
    freeFromNow,
  };
}

export async function getDashboard(actor: SessionUser) {
  const today = todayKey();
  const { start: todayStart, end: todayEnd } = dayRange(today);
  const { start: monthStart } = dayRange(startOfMonth(today));
  const financial = can(actor, "dashboard.financial");
  const isProfessional = actor.role === "PROFESSIONAL";

  const activeProfessionals = await db
    .select({ id: professionals.id, name: professionals.name })
    .from(professionals)
    .where(isProfessional ? eq(professionals.id, actor.professionalId!) : eq(professionals.isActive, true));

  const [agenda, capacity, awaiting] = await Promise.all([
    listAppointments(actor, { from: today, includeCancelled: true }),
    dayCapacity(today, activeProfessionals),
    countAwaitingPayment(actor),
  ]);

  const activeToday = agenda.filter((a) => !["CANCELLED", "NO_SHOW"].includes(a.status));
  const completedToday = agenda.filter((a) => a.status === "COMPLETED");

  const [[todayRevenue], [monthRevenue], chart] = await Promise.all([
    financial
      ? db
          .select({
            total: sql<number>`coalesce(sum(${payments.amountCents}),0)::int`,
            clients: sql<number>`count(distinct ${payments.clientId})::int`,
          })
          .from(payments)
          .where(and(gte(payments.paidAt, todayStart), lt(payments.paidAt, todayEnd)))
      : db
          .select({ total: sql<number>`0::int`, clients: sql<number>`count(distinct ${payments.clientId})::int` })
          .from(payments)
          .where(and(gte(payments.paidAt, todayStart), lt(payments.paidAt, todayEnd))),
    financial
      ? db
          .select({
            total: sql<number>`coalesce(sum(${payments.amountCents}),0)::int`,
            count: sql<number>`count(*)::int`,
          })
          .from(payments)
          .where(gte(payments.paidAt, monthStart))
      : Promise.resolve([{ total: 0, count: 0 }]),
    financial ? revenueByDay(addDays(today, -6), today) : Promise.resolve([]),
  ]);

  // Produção da profissional logada.
  let production: { revenueCents: number; commissionCents: number; pendingCents: number; services: number } | null = null;
  if (isProfessional) {
    const [row] = await db
      .select({
        revenueCents: sql<number>`coalesce(sum(${commissions.baseCents}),0)::int`,
        commissionCents: sql<number>`coalesce(sum(${commissions.amountCents}),0)::int`,
        pendingCents: sql<number>`coalesce(sum(${commissions.amountCents}) filter (where ${commissions.status}='PENDING'),0)::int`,
        services: sql<number>`count(*)::int`,
      })
      .from(commissions)
      .where(and(eq(commissions.professionalId, actor.professionalId!), gte(commissions.createdAt, monthStart)));
    production = row;
  }

  const alerts = await buildAlerts(actor, agenda, capacity.freeFromNow, awaiting);
  const cash = can(actor, "cash.view") ? await getOpenRegisterStatus() : null;

  return {
    today,
    financial,
    metrics: {
      revenueTodayCents: todayRevenue.total,
      revenueMonthCents: monthRevenue.total,
      averageTicketCents: monthRevenue.count ? Math.round(monthRevenue.total / monthRevenue.count) : 0,
      appointmentsToday: activeToday.length,
      completedToday: completedToday.length,
      clientsServedToday: isProfessional ? completedToday.length : todayRevenue.clients,
      occupancy: capacity.occupancy,
      bookedMinutes: capacity.bookedMinutes,
      availableMinutes: capacity.availableMinutes,
      awaitingPayment: awaiting.count,
      awaitingPaymentCents: awaiting.total,
    },
    production,
    chart,
    agenda,
    alerts,
    cashOpen: cash !== null,
    canSeeCash: can(actor, "cash.view"),
  };
}

async function buildAlerts(
  actor: SessionUser,
  agenda: AppointmentView[],
  freeFromNow: { name: string; start: number; end: number }[],
  awaiting: { count: number },
): Promise<DashboardAlert[]> {
  const alerts: DashboardAlert[] = [];
  const now = Date.now();

  const upcoming = agenda.filter(
    (a) => ["SCHEDULED", "CONFIRMED"].includes(a.status) && a.startsAt.getTime() >= now && a.startsAt.getTime() - now <= 60 * 60_000,
  );
  for (const a of upcoming.slice(0, 3)) {
    const minutes = Math.max(0, Math.round((a.startsAt.getTime() - now) / 60_000));
    alerts.push({
      id: `upcoming-${a.id}`,
      tone: a.status === "SCHEDULED" ? "warning" : "info",
      title: `${a.clientName} em ${minutes} min`,
      description: `${a.serviceName} com ${a.professionalName}${a.status === "SCHEDULED" ? " · ainda não confirmado" : ""}`,
      href: `/painel/agenda?appointment=${a.id}`,
    });
  }

  const late = agenda.filter((a) => ["SCHEDULED", "CONFIRMED"].includes(a.status) && a.startsAt.getTime() < now - 15 * 60_000);
  if (late.length) {
    alerts.push({
      id: "late",
      tone: "warning",
      title: `${late.length} cliente(s) atrasada(s)`,
      description: late
        .slice(0, 3)
        .map((a) => a.clientName)
        .join(", "),
      href: "/painel/agenda",
    });
  }

  if (awaiting.count > 0 && can(actor, "payments.create")) {
    alerts.push({
      id: "awaiting",
      tone: "warning",
      title: `${awaiting.count} atendimento(s) aguardando pagamento`,
      description: "Finalize a cobrança para registrar comissão e caixa.",
      href: "/painel/atendimentos",
    });
  }

  if (can(actor, "appointments.view_all")) {
    const cancellations = await listRecentCancellations(actor, 5);
    if (cancellations.length) {
      alerts.push({
        id: "cancellations",
        tone: "danger",
        title: `${cancellations.length} cancelamento(s) hoje`,
        description: cancellations.map((c) => `${c.clientName} (${c.serviceName})`).join(", "),
        href: "/painel/agenda",
      });
    }
  }

  if (can(actor, "inventory.view")) {
    const low = await db
      .select({ name: products.name, quantity: products.quantity, minQuantity: products.minQuantity, unit: products.unit })
      .from(products)
      .where(and(eq(products.isActive, true), sql`${products.quantity} <= ${products.minQuantity}`))
      .limit(5);
    if (low.length) {
      alerts.push({
        id: "low-stock",
        tone: "danger",
        title: `Estoque baixo: ${low.length} produto(s)`,
        description: low.map((p) => `${p.name} (${p.quantity} ${p.unit})`).join(", "),
        href: "/painel/estoque",
      });
    }
  }

  for (const f of freeFromNow.slice(0, 2)) {
    const hours = ((f.end - f.start) / 60).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
    alerts.push({
      id: `free-${f.name}`,
      tone: "success",
      title: `${f.name}: ${hours}h livres hoje`,
      description: `Janela das ${minutesToTime(f.start)} às ${minutesToTime(f.end)} — boa oportunidade para encaixes.`,
      href: "/painel/agenda",
    });
  }

  return alerts;
}
