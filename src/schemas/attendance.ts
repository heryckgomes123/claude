import { z } from "zod";
import { PAYMENT_METHODS } from "@/config/domain";
import { cents, id } from "./common";

export const walkInInput = z.object({ clientId: id, serviceId: id, professionalId: id });

export const addItemInput = z.object({
  attendanceId: id,
  serviceId: id,
  professionalId: id.optional(),
  quantity: z.number().int().min(1).max(20).default(1),
});

export const updateItemInput = z.object({
  itemId: id,
  quantity: z.number().int().min(1, { error: "Quantidade mínima é 1." }).max(20, { error: "Quantidade máxima é 20." }),
});

export const discountInput = z.object({ attendanceId: id, discountCents: cents });

export const paymentInput = z
  .object({
    attendanceId: id,
    method: z.enum(PAYMENT_METHODS, { error: "Forma de pagamento inválida." }),
    installments: z.number().int().min(1).max(12).default(1),
  })
  .refine((p) => (p.method === "CREDIT_INSTALLMENTS" ? p.installments >= 2 : p.installments === 1), {
    error: "Parcelamento válido apenas para crédito parcelado (2 a 12x).",
    path: ["installments"],
  });
export type PaymentInput = z.input<typeof paymentInput>;
