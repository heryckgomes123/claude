import { z } from "zod";
import { isValidDateKey } from "@/utils/dates";
import { onlyDigits } from "@/utils/phone";

export const id = z.uuid({ error: "Identificador inválido." });

/** Texto opcional: string vazia vira null. */
export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, { error: `Máximo de ${max} caracteres.` })
    .nullish()
    .transform((v) => (v ? v : null));

export const requiredText = (label: string, max = 120) =>
  z
    .string({ error: `${label} é obrigatório.` })
    .trim()
    .min(1, { error: `${label} é obrigatório.` })
    .max(max, { error: `${label}: máximo de ${max} caracteres.` });

export const phone = z
  .string()
  .nullish()
  .transform((v) => onlyDigits(v) || null)
  .refine((v) => v === null || (v.length >= 10 && v.length <= 13), { error: "Telefone inválido. Use DDD + número." });

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .nullish()
  .transform((v) => v || null)
  .refine((v) => v === null || z.email().safeParse(v).success, { error: "E-mail inválido." });

export const dateKey = z.string().refine(isValidDateKey, { error: "Data inválida." });

export const optionalDateKey = z
  .string()
  .nullish()
  .transform((v) => v || null)
  .refine((v) => v === null || isValidDateKey(v), { error: "Data inválida." });

export const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Horário inválido." });

/** Centavos: inteiro, não negativo, até R$ 1.000.000. */
export const cents = z
  .number({ error: "Valor inválido." })
  .int({ error: "Valor inválido." })
  .min(0, { error: "O valor não pode ser negativo." })
  .max(100_000_000, { error: "Valor acima do permitido." });

export const positiveCents = cents.refine((v) => v > 0, { error: "Informe um valor maior que zero." });

export const percent = z
  .number({ error: "Percentual inválido." })
  .min(0, { error: "O percentual não pode ser negativo." })
  .max(100, { error: "O percentual máximo é 100%." });

export const minuteOfDay = z
  .number()
  .int()
  .min(0)
  .max(24 * 60);
