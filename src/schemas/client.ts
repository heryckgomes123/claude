import { z } from "zod";
import { email, optionalDateKey, optionalText, phone, requiredText } from "./common";

export const clientInput = z.object({
  name: requiredText("Nome", 120),
  phone,
  whatsapp: phone,
  email,
  birthDate: optionalDateKey,
  notes: optionalText(2000),
});
export type ClientInput = z.input<typeof clientInput>;
