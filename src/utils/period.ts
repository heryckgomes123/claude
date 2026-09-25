import { addDays, diffDays, formatDateKey, isValidDateKey, startOfMonth, todayKey } from "./dates";

export const PERIODS = ["today", "7d", "month", "custom"] as const;
export type PeriodKey = (typeof PERIODS)[number];
export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Hoje",
  "7d": "Últimos 7 dias",
  month: "Mês atual",
  custom: "Personalizado",
};

export type ResolvedPeriod = { key: PeriodKey; from: string; to: string; label: string; days: number };

/** Resolve o filtro de período vindo da URL (sempre validado). Máximo de 366 dias. */
export function resolvePeriod(params: { period?: string; from?: string; to?: string }): ResolvedPeriod {
  const today = todayKey();
  const key = (PERIODS as readonly string[]).includes(params.period ?? "") ? (params.period as PeriodKey) : "month";
  let from = today;
  let to = today;
  if (key === "7d") from = addDays(today, -6);
  if (key === "month") from = startOfMonth(today);
  if (key === "custom") {
    from = params.from && isValidDateKey(params.from) ? params.from : startOfMonth(today);
    to = params.to && isValidDateKey(params.to) ? params.to : today;
    if (from > to) [from, to] = [to, from];
    if (diffDays(from, to) > 366) from = addDays(to, -366);
  }
  const label = key === "custom" ? `${formatDateKey(from)} – ${formatDateKey(to)}` : PERIOD_LABELS[key];
  return { key, from, to, label, days: diffDays(from, to) + 1 };
}
