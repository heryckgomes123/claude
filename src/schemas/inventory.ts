import { z } from "zod";
import { cents, optionalText, requiredText } from "./common";
import { id } from "./common";

const qty = z.number({ error: "Quantidade inválida." }).min(0, { error: "Não pode ser negativo." }).max(1_000_000);

export const productInput = z.object({
  name: requiredText("Nome", 120),
  category: requiredText("Categoria", 60),
  unit: z.string().trim().min(1).max(10),
  minQuantity: qty,
  costCents: cents,
  initialQuantity: qty.optional(),
});

export const movementInput = z
  .object({
    productId: id,
    type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
    quantity: qty,
    reason: optionalText(200),
  })
  .refine((m) => m.type === "ADJUSTMENT" || m.quantity > 0, {
    error: "Informe uma quantidade maior que zero.",
    path: ["quantity"],
  });
