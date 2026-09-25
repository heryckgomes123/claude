import { z } from "zod";
import { id, minuteOfDay, optionalText, percent, phone, requiredText } from "./common";

export const scheduleDayInput = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startMinute: minuteOfDay,
    endMinute: minuteOfDay,
    breakStartMinute: minuteOfDay.nullable(),
    breakEndMinute: minuteOfDay.nullable(),
  })
  .refine((d) => d.startMinute < d.endMinute, { error: "O início da jornada deve ser antes do fim." })
  .refine(
    (d) =>
      (d.breakStartMinute === null && d.breakEndMinute === null) ||
      (d.breakStartMinute !== null &&
        d.breakEndMinute !== null &&
        d.breakStartMinute < d.breakEndMinute &&
        d.breakStartMinute >= d.startMinute &&
        d.breakEndMinute <= d.endMinute),
    { error: "A pausa deve estar dentro da jornada." },
  );

export const professionalInput = z.object({
  name: requiredText("Nome", 120),
  title: requiredText("Cargo", 80),
  photoUrl: optionalText(500).refine((v) => v === null || /^https:\/\//.test(v), {
    error: "Use uma URL https para a foto.",
  }),
  phone,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: "Cor inválida." }),
  defaultCommissionRate: percent,
  categoryIds: z.array(id).max(10),
  serviceIds: z.array(id).max(200),
  schedule: z
    .array(scheduleDayInput)
    .max(7)
    .refine((days) => new Set(days.map((d) => d.weekday)).size === days.length, { error: "Dia repetido na jornada." }),
});
export type ProfessionalInput = z.input<typeof professionalInput>;
