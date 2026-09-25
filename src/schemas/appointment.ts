import { z } from "zod";
import { APPOINTMENT_STATUSES } from "@/config/domain";
import { cents, dateKey, id, optionalText, time } from "./common";

export const appointmentInput = z.object({
  clientId: id,
  serviceId: id,
  professionalId: id,
  date: dateKey,
  time,
  durationMinutes: z.number().int().min(5).max(600).optional(),
  priceCents: cents.optional(),
  notes: optionalText(1000),
});
export type AppointmentInput = z.input<typeof appointmentInput>;

export const rescheduleInput = appointmentInput.extend({ appointmentId: id });

export const availabilityQuery = z.object({
  serviceId: id,
  professionalId: id,
  date: dateKey,
  durationMinutes: z.number().int().min(5).max(600).optional(),
  excludeAppointmentId: id.optional(),
});

export const statusChangeInput = z.object({
  appointmentId: id,
  status: z.enum(APPOINTMENT_STATUSES),
  reason: optionalText(300),
});

export const scheduleBlockInput = z
  .object({
    professionalId: id.nullable(),
    date: dateKey,
    startTime: time,
    endTime: time,
    reason: z.string().trim().min(1, { error: "Informe o motivo." }).max(200),
  })
  .refine((b) => b.startTime < b.endTime, { error: "O início deve ser antes do fim.", path: ["endTime"] });
