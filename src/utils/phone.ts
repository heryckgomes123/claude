export function onlyDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

/** Formata telefone brasileiro: (11) 98765-4321 */
export function formatPhone(value: string | null | undefined): string {
  const d = onlyDigits(value);
  if (!d) return "";
  const local = d.length > 11 && d.startsWith("55") ? d.slice(2) : d;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return value ?? "";
}

export function whatsappLink(value: string | null | undefined): string | null {
  const d = onlyDigits(value);
  if (d.length < 10) return null;
  return `https://wa.me/${d.startsWith("55") ? d : `55${d}`}`;
}
