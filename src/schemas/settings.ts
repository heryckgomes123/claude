import { z } from "zod";
import { ROLES } from "@/config/permissions";
import { id, minuteOfDay, optionalText, phone, requiredText } from "./common";

export const companyInput = z.object({
  name: requiredText("Nome", 120),
  logoUrl: optionalText(500).refine((v) => v === null || /^https:\/\//.test(v), { error: "Use uma URL https." }),
  phone,
  whatsapp: phone,
  instagram: optionalText(60).transform((v) => (v ? v.replace(/^@/, "") : null)),
  address: optionalText(300),
});

export const businessHoursInput = z.object({
  slotIntervalMinutes: z.union([z.literal(10), z.literal(15), z.literal(20), z.literal(30)]),
  days: z
    .array(
      z
        .object({
          weekday: z.number().int().min(0).max(6),
          isOpen: z.boolean(),
          openMinute: minuteOfDay,
          closeMinute: minuteOfDay,
          breakStartMinute: minuteOfDay.nullable(),
          breakEndMinute: minuteOfDay.nullable(),
        })
        .refine((d) => !d.isOpen || d.openMinute < d.closeMinute, { error: "Abertura deve ser antes do fechamento." })
        .refine(
          (d) =>
            (d.breakStartMinute === null && d.breakEndMinute === null) ||
            (d.breakStartMinute !== null && d.breakEndMinute !== null && d.breakStartMinute < d.breakEndMinute),
          { error: "Pausa inválida." },
        ),
    )
    .length(7),
});

const password = z.string().min(8, { error: "A senha deve ter ao menos 8 caracteres." }).max(72, { error: "Senha muito longa." });

export const userCreateInput = z
  .object({
    name: requiredText("Nome", 120),
    email: z.email({ error: "E-mail inválido." }).trim().toLowerCase(),
    role: z.enum(ROLES),
    professionalId: id.nullable(),
    password,
  })
  .refine((u) => u.role !== "PROFESSIONAL" || u.professionalId, {
    error: "Vincule o usuário a um cadastro de profissional.",
    path: ["professionalId"],
  });

export const userUpdateInput = z
  .object({
    userId: id,
    name: requiredText("Nome", 120),
    role: z.enum(ROLES),
    professionalId: id.nullable(),
    isActive: z.boolean(),
    password: password.optional().or(z.literal("").transform(() => undefined)),
  })
  .refine((u) => u.role !== "PROFESSIONAL" || u.professionalId, {
    error: "Vincule o usuário a um cadastro de profissional.",
    path: ["professionalId"],
  });

export const loginInput = z.object({
  email: z.string().trim().min(1, { error: "Informe seu e-mail." }).max(200),
  password: z.string().min(1, { error: "Informe sua senha." }).max(200),
  remember: z.boolean().default(false),
});
