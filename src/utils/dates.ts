import { APP_TIMEZONE } from "@/config/app";

/**
 * Utilitários de data com fuso do salão.
 * O servidor (Netlify) roda em UTC, então toda conversão "dia/horário do salão"
 * passa por aqui. Datas civis são strings "YYYY-MM-DD"; horários, minutos desde 00:00.
 */

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string) {
  let f = partsFormatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    partsFormatterCache.set(timeZone, f);
  }
  return f;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
};

export function zonedParts(date: Date, timeZone = APP_TIMEZONE): ZonedParts {
  const parts = partsFormatter(timeZone).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: WEEKDAYS[get("weekday")] ?? 0,
  };
}

function offsetMs(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Converte data civil + minutos no fuso do salão para um instante UTC. */
export function zonedDateTime(dateKey: string, minutes = 0, timeZone = APP_TIMEZONE): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, minutes, 0);
  let result = guess - offsetMs(new Date(guess), timeZone);
  // Segunda passada cobre transições de horário de verão.
  const second = guess - offsetMs(new Date(result), timeZone);
  if (second !== result) result = second;
  return new Date(result);
}

/** "YYYY-MM-DD" do instante no fuso do salão. */
export function toDateKey(date: Date, timeZone = APP_TIMEZONE): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/** Minutos desde 00:00 do instante no fuso do salão. */
export function minutesOfDay(date: Date, timeZone = APP_TIMEZONE): number {
  const p = zonedParts(date, timeZone);
  return p.hour * 60 + p.minute;
}

/** O instante já passou? (relógio atual) */
export function hasPassed(value: Date | string, marginMinutes = 0): boolean {
  return new Date(value).getTime() <= Date.now() + marginMinutes * 60_000;
}

export function weekdayOf(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Segunda-feira da semana da data. */
export function startOfWeek(dateKey: string): string {
  const wd = weekdayOf(dateKey);
  return addDays(dateKey, wd === 0 ? -6 : 1 - wd);
}

export function startOfMonth(dateKey: string): string {
  return `${dateKey.slice(0, 7)}-01`;
}

export function diffDays(fromKey: string, toKey: string): number {
  const a = Date.parse(`${fromKey}T00:00:00Z`);
  const b = Date.parse(`${toKey}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** Intervalo [início, fim) em UTC que cobre os dias civis informados (fim inclusivo). */
export function dayRange(fromKey: string, toKeyInclusive = fromKey) {
  return { start: zonedDateTime(fromKey, 0), end: zonedDateTime(addDays(toKeyInclusive, 1), 0) };
}

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/* ─── Formatação (pt-BR, fuso do salão) ─── */

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { timeZone: APP_TIMEZONE, ...opts });

const timeFmt = fmt({ hour: "2-digit", minute: "2-digit" });
const dateFmt = fmt({ day: "2-digit", month: "2-digit", year: "numeric" });
const shortDateFmt = fmt({ day: "2-digit", month: "short" });
const dateTimeFmt = fmt({ day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const longDateFmt = fmt({ weekday: "long", day: "numeric", month: "long" });

const toDate = (value: Date | string) => (typeof value === "string" ? new Date(value) : value);

export const formatTime = (value: Date | string) => timeFmt.format(toDate(value));
export const formatDate = (value: Date | string) => dateFmt.format(toDate(value));
export const formatShortDate = (value: Date | string) => shortDateFmt.format(toDate(value)).replace(".", "");
export const formatDateTime = (value: Date | string) => dateTimeFmt.format(toDate(value));
export const formatLongDate = (value: Date | string) => longDateFmt.format(toDate(value));

/** Formata uma data civil "YYYY-MM-DD" sem sofrer com fuso. */
export function formatDateKey(dateKey: string, style: "short" | "long" | "weekday" | "numeric" = "numeric"): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const opts: Intl.DateTimeFormatOptions =
    style === "long"
      ? { weekday: "long", day: "numeric", month: "long" }
      : style === "short"
        ? { day: "2-digit", month: "short" }
        : style === "weekday"
          ? { weekday: "short" }
          : { day: "2-digit", month: "2-digit", year: "numeric" };
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", ...opts }).format(dt).replace(".", "");
}

export const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
