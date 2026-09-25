import "server-only";
import { and, eq, gt, inArray, isNull, lt, ne, or } from "drizzle-orm";
import { ACTIVE_APPOINTMENT_STATUSES } from "@/config/domain";
import { db, type DbOrTx } from "@/db";
import { appointments, professionalSchedules, scheduleBlocks } from "@/db/schema";
import { dayRange, minutesOfDay, minutesToTime, todayKey, toDateKey, weekdayOf, zonedDateTime } from "@/utils/dates";
import { getBusinessHours, getBusinessSettings } from "./settings";

type Interval = { start: number; end: number; label: string };

export type DayWindow = {
  /** Janela de trabalho [start, end) em minutos do dia, já intersectada com o funcionamento do salão. */
  start: number;
  end: number;
  breaks: Interval[];
};

export type DayAvailability = {
  window: DayWindow | null;
  /** Motivo quando não há expediente (salão fechado, folga...). */
  closedReason: string | null;
  busy: Interval[];
};

export type Slot = { time: string; startMinute: number };

/** Jornada efetiva da profissional no dia (salão ∩ profissional, com pausas). */
export async function getDayWindow(
  professionalId: string,
  date: string,
  executor: DbOrTx = db,
): Promise<{ window: DayWindow | null; closedReason: string | null }> {
  const weekday = weekdayOf(date);
  const hours = await getBusinessHours(executor);
  const business = hours.find((h) => h.weekday === weekday);
  if (!business?.isOpen) return { window: null, closedReason: "Salão fechado neste dia." };

  const [schedule] = await executor
    .select()
    .from(professionalSchedules)
    .where(and(eq(professionalSchedules.professionalId, professionalId), eq(professionalSchedules.weekday, weekday)))
    .limit(1);
  if (!schedule) return { window: null, closedReason: "Folga da profissional neste dia." };

  const start = Math.max(business.openMinute, schedule.startMinute);
  const end = Math.min(business.closeMinute, schedule.endMinute);
  if (start >= end) return { window: null, closedReason: "Sem expediente compatível neste dia." };

  const breaks: Interval[] = [];
  if (business.breakStartMinute != null && business.breakEndMinute != null) {
    breaks.push({ start: business.breakStartMinute, end: business.breakEndMinute, label: "Pausa do salão" });
  }
  if (schedule.breakStartMinute != null && schedule.breakEndMinute != null) {
    breaks.push({ start: schedule.breakStartMinute, end: schedule.breakEndMinute, label: "Pausa" });
  }
  return { window: { start, end, breaks }, closedReason: null };
}

/** Intervalos ocupados (agendamentos ativos + bloqueios) da profissional no dia. */
export async function getBusyIntervals(
  professionalId: string,
  date: string,
  options: { excludeAppointmentId?: string } = {},
  executor: DbOrTx = db,
): Promise<Interval[]> {
  const { start, end } = dayRange(date);
  const clip = (s: Date, e: Date, label: string): Interval => ({
    start: s < start ? 0 : minutesOfDay(s),
    end: e >= end ? 24 * 60 : minutesOfDay(e),
    label,
  });

  const appointmentFilters = [
    eq(appointments.professionalId, professionalId),
    inArray(appointments.status, ACTIVE_APPOINTMENT_STATUSES),
    lt(appointments.startsAt, end),
    gt(appointments.endsAt, start),
  ];
  if (options.excludeAppointmentId) appointmentFilters.push(ne(appointments.id, options.excludeAppointmentId));

  const [appts, blocks] = await Promise.all([
    executor
      .select({ startsAt: appointments.startsAt, endsAt: appointments.endsAt })
      .from(appointments)
      .where(and(...appointmentFilters)),
    executor
      .select({ startsAt: scheduleBlocks.startsAt, endsAt: scheduleBlocks.endsAt, reason: scheduleBlocks.reason })
      .from(scheduleBlocks)
      .where(
        and(
          or(eq(scheduleBlocks.professionalId, professionalId), isNull(scheduleBlocks.professionalId)),
          lt(scheduleBlocks.startsAt, end),
          gt(scheduleBlocks.endsAt, start),
        ),
      ),
  ]);

  return [...appts.map((a) => clip(a.startsAt, a.endsAt, "Agendamento")), ...blocks.map((b) => clip(b.startsAt, b.endsAt, b.reason))];
}

const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) => a.start < b.end && b.start < a.end;

/** Horários livres para um serviço de `duration` minutos. */
export async function computeSlots(
  professionalId: string,
  date: string,
  duration: number,
  options: { excludeAppointmentId?: string } = {},
  executor: DbOrTx = db,
): Promise<{ slots: Slot[]; closedReason: string | null }> {
  const { window, closedReason } = await getDayWindow(professionalId, date, executor);
  if (!window) return { slots: [], closedReason };

  const [busy, settings] = await Promise.all([getBusyIntervals(professionalId, date, options, executor), getBusinessSettings(executor)]);
  const blocked = [...window.breaks, ...busy];
  const step = settings.slotIntervalMinutes;

  const today = todayKey();
  if (date < today) return { slots: [], closedReason: "Data no passado." };
  const nowMinute = date === today ? minutesOfDay(new Date()) : -1;

  const slots: Slot[] = [];
  const first = Math.ceil(window.start / step) * step;
  for (let t = first; t + duration <= window.end; t += step) {
    if (t <= nowMinute) continue;
    const candidate = { start: t, end: t + duration };
    if (blocked.some((b) => overlaps(candidate, b))) continue;
    slots.push({ time: minutesToTime(t), startMinute: t });
  }
  return { slots, closedReason: slots.length ? null : "Sem horários livres nesta data." };
}

/**
 * Validação de servidor para um intervalo específico (criação/remarcação).
 * Retorna mensagem de erro ou null se o horário é válido.
 */
export async function validateInterval(
  params: { professionalId: string; startsAt: Date; endsAt: Date; excludeAppointmentId?: string; enforceHours?: boolean },
  executor: DbOrTx,
): Promise<string | null> {
  const date = toDateKey(params.startsAt);
  if (toDateKey(new Date(params.endsAt.getTime() - 1)) !== date) return "O atendimento precisa terminar no mesmo dia.";

  const start = minutesOfDay(params.startsAt);
  const end = start + Math.round((params.endsAt.getTime() - params.startsAt.getTime()) / 60_000);
  const candidate = { start, end };

  if (params.enforceHours !== false) {
    const { window, closedReason } = await getDayWindow(params.professionalId, date, executor);
    if (!window) return closedReason;
    if (start < window.start || end > window.end) {
      return `Fora do expediente (${minutesToTime(window.start)}–${minutesToTime(window.end)}).`;
    }
    const pause = window.breaks.find((b) => overlaps(candidate, b));
    if (pause) return `O horário coincide com a pausa (${minutesToTime(pause.start)}–${minutesToTime(pause.end)}).`;
  }

  const busy = await getBusyIntervals(params.professionalId, date, { excludeAppointmentId: params.excludeAppointmentId }, executor);
  const hit = busy.find((b) => overlaps(candidate, b));
  if (hit) {
    return hit.label === "Agendamento"
      ? `Conflito de horário: a profissional já tem atendimento entre ${minutesToTime(hit.start)} e ${minutesToTime(hit.end)}.`
      : `Horário bloqueado: ${hit.label} (${minutesToTime(hit.start)}–${minutesToTime(Math.min(hit.end, 1440))}).`;
  }
  return null;
}

export function toInstant(date: string, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  return zonedDateTime(date, h * 60 + m);
}
