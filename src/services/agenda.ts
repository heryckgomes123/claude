import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { professionalSchedules, professionals } from "@/db/schema";
import { assertCan, type SessionUser } from "@/lib/auth/session";
import { addDays, startOfWeek } from "@/utils/dates";
import { listAppointments, listScheduleBlocks } from "./appointments";
import { ownProfessionalScope } from "./scope";
import { getBusinessHours } from "./settings";

export type AgendaView = "day" | "week";

/** Dados da tela de agenda (dia ou semana), já no escopo do perfil. */
export async function getAgendaData(actor: SessionUser, params: { date: string; view: AgendaView; professionalId?: string | null }) {
  assertCan(actor, "appointments.view");
  const scope = ownProfessionalScope(actor, "appointments.view_all");
  const from = params.view === "week" ? startOfWeek(params.date) : params.date;
  const to = params.view === "week" ? addDays(from, 6) : params.date;
  const professionalFilter = scope ?? params.professionalId ?? null;

  const [appointments, blocks, hours, columns] = await Promise.all([
    listAppointments(actor, { from, to, professionalId: professionalFilter, includeCancelled: true }),
    listScheduleBlocks(actor, { from, to }),
    getBusinessHours(),
    db
      .select({ id: professionals.id, name: professionals.name, color: professionals.color, title: professionals.title })
      .from(professionals)
      .where(professionalFilter ? eq(professionals.id, professionalFilter) : and(eq(professionals.isActive, true)))
      .orderBy(asc(professionals.name)),
  ]);

  const schedules = columns.length
    ? await db
        .select()
        .from(professionalSchedules)
        .where(
          inArray(
            professionalSchedules.professionalId,
            columns.map((c) => c.id),
          ),
        )
    : [];

  return {
    from,
    to,
    appointments,
    blocks: blocks.filter((b) => !professionalFilter || b.professionalId === null || b.professionalId === professionalFilter),
    hours,
    columns: columns.map((c) => ({
      ...c,
      schedules: schedules
        .filter((s) => s.professionalId === c.id)
        .map((s) => ({
          weekday: s.weekday,
          startMinute: s.startMinute,
          endMinute: s.endMinute,
          breakStartMinute: s.breakStartMinute,
          breakEndMinute: s.breakEndMinute,
        })),
    })),
  };
}

export type AgendaData = Awaited<ReturnType<typeof getAgendaData>>;
