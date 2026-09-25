import { z } from "zod";
import { cents, id, optionalText, percent, requiredText } from "./common";

export const serviceInput = z.object({
  name: requiredText("Nome", 120),
  categoryId: id,
  description: optionalText(1000),
  durationMinutes: z
    .number({ error: "Duração inválida." })
    .int()
    .min(5, { error: "Duração mínima de 5 minutos." })
    .max(600, { error: "Duração máxima de 10 horas." }),
  priceCents: cents,
  commissionRate: percent.nullable(),
  professionalIds: z.array(id).max(100),
});
export type ServiceInput = z.input<typeof serviceInput>;
