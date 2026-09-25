const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Todo valor monetário do sistema trafega em centavos (inteiro). */
export function formatMoney(cents: number | null | undefined): string {
  return brl.format((cents ?? 0) / 100);
}

export function formatMoneyCompact(cents: number): string {
  return Math.abs(cents) >= 1_000_000 ? brlCompact.format(cents / 100) : formatMoney(cents);
}

/** "1.234,56" | "1234.56" | "R$ 50" → centavos. Retorna null se inválido. */
export function parseMoneyToCents(input: string): number | null {
  const cleaned = input.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return null;
  let normalized = cleaned;
  if (cleaned.includes(",")) normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: 0 })}%`;
}

/** Aplica percentual com arredondamento bancário simples (meio para cima). */
export function applyRate(cents: number, rate: number): number {
  return Math.round((cents * rate) / 100);
}

/**
 * Distribui um valor (ex.: desconto) proporcionalmente entre partes,
 * garantindo que a soma final seja exata (método do maior resto).
 */
export function allocateProportionally(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || total <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const floored = raw.map(Math.floor);
  let remainder = total - floored.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floored[i] += 1;
    remainder -= 1;
  }
  return floored;
}
